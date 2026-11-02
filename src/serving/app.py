"""FastAPI app: score at ops threshold + GenAI drafts behind Friction-Gate.

Demo Glass-Box RBAC (ADR 007): protected routes require header
``X-Demo-Role`` (``retention_agent`` | ``compliance_viewer`` | ``data_scientist``).
Missing header → 400 (no silent elevation). Not production SSO.

Run (AppLocker-safe):
    py -3.13 -m uvicorn src.serving.app:app --reload

Tests use httpx.ASGITransport — no loopback bind required.
"""
from __future__ import annotations

import hmac
import logging
from contextlib import asynccontextmanager
from typing import Any, Optional

from fastapi import FastAPI, Header, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from src.core.config import config
from src.genai import rag_engine, viva_grader
from src.genai.drafter import create_draft
from src.serving import draft_store
from src.serving.attention_gate import attention_audit_detail, is_high_stakes
from src.serving.cohort import load_cohort
from src.serving.draft_store import PendingCapError, TerminalDraftError
from src.serving.explain import explain_raw_features, json_safe
from src.serving.fairness import load_fairness_report
from src.serving.model import get_ops_model, load_ops_model, reset_ops_model, score_raw_features
from src.serving.paths import REPO_ROOT
from src.serving.rbac import Permission, Role, parse_role, require
from src.serving.schemas import (
    DraftCreateRequest,
    DraftPatchRequest,
    DraftRecord,
    DraftStatus,
    ExplainRequest,
    ExplainResponse,
    FairnessResponse,
    GlassBoxResponse,
    HealthResponse,
    PredictionPage,
    PredictionRow,
    RagAskRequest,
    RagAskResponse,
    ScoreRequest,
    ScoreResponse,
    VivaGradeRequest,
    VivaGradeResponse,
)

logger = logging.getLogger(__name__)

_RAG_DOC_PATH = REPO_ROOT / "Docs" / "Final_Report_Official.md"
_RAG_CACHE_PATH = REPO_ROOT / "Data" / "processed" / "rag_index_cache.json"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load ops model + init draft DB at startup (tests may skip via lazy getters)."""
    try:
        # force=True so MODELS_OPS_DIR overrides from tests take effect
        model = load_ops_model(force=True)
        app.state.ops_model = model
        logger.info(
            "Loaded ops model run_id=%s threshold=%.6f",
            model.run_id,
            model.threshold,
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("Model not loaded at startup: %s", exc)
        app.state.ops_model = None
    draft_store.init_db()
    yield
    reset_ops_model()


app = FastAPI(
    title="Meridian Churn Serving",
    description=(
        "Score with Sprint 2 ops threshold (top-5% / t≈0.701). "
        "GenAI drafts are pending_review only — no autonomous send (ADR 003). "
        "Demo RBAC: required X-Demo-Role header (ADR 007)."
    ),
    version="0.1.0",
    lifespan=lifespan,
)


# The educational SPA runs on its own Vite origin and calls POST /viva/grade
# (ADR-EDU-003). Localhost dev origins only — this is not a public CORS policy,
# and it deliberately does not allow credentials.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^http://(localhost|127\.0\.0\.1):\d+$",
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "X-Demo-Role"],
)


@app.middleware("http")
async def require_api_key(request: Request, call_next):
    """Shared-secret gate for the cloud deploy (ADR 016); a no-op when no key is configured.

    Runs outside CORS, so it sees every request. CORS preflights (OPTIONS) carry
    no custom headers by design and are let through; the real request that
    follows still needs the key. Compared in constant time.
    """
    expected = config.api_access_key
    if expected and request.method != "OPTIONS":
        supplied = request.headers.get("x-api-key", "")
        if not hmac.compare_digest(supplied.encode(), expected.encode()):
            return JSONResponse(status_code=401, content={"detail": "Missing or invalid X-API-Key"})
    return await call_next(request)


def _model():
    """Return the cached ops model, loading from disk on first use.

    Startup may leave ``app.state.ops_model`` as None (missing artifacts);
    endpoints then lazy-load via ``get_ops_model()`` so ``/health`` can still
    report degraded without crashing the process.
    """
    existing = getattr(app.state, "ops_model", None)
    if existing is not None:
        return existing
    model = get_ops_model()
    app.state.ops_model = model
    return model


def _role_from_header(x_demo_role: Optional[str]) -> Role:
    """Require an explicit demo role — missing header is not retention_agent."""
    if x_demo_role is None or str(x_demo_role).strip() == "":
        raise HTTPException(
            status_code=400,
            detail=(
                "X-Demo-Role header required "
                "(retention_agent | compliance_viewer | data_scientist). "
                "Demo Glass-Box RBAC — not production IdP."
            ),
        )
    try:
        return parse_role(x_demo_role)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


def _enforce(
    role: Role,
    permission: Permission,
    *,
    draft_id: Optional[str] = None,
) -> None:
    """Raise 403 when demo RBAC denies; always record a ``denied`` audit row."""
    try:
        require(role, permission)
    except PermissionError as exc:
        draft_store.record_audit(
            action="denied",
            draft_id=draft_id,
            actor_role=role.value,
            detail={"permission": permission.value, "reason": str(exc)},
        )
        raise HTTPException(status_code=403, detail=str(exc)) from exc


@app.get("/")
def root() -> dict:
    """Browser-friendly landing (avoids a bare 404 on http://127.0.0.1:8000/)."""
    return {
        "service": "Meridian Churn Serving",
        "docs": "/docs",
        "health": "/health",
        "score": "POST /score",
        "glass_box": "GET /model/glass-box",
        "fairness": "GET /model/fairness",
        "drafts": "POST|GET|PATCH /drafts",
        "predictions": "GET /predictions, GET /predictions/{customer_id}/explain",
        "explain": "POST /explain",
        "audit": "GET /audit/events",
        "rag_ask": "POST /rag/ask",
        "note": (
            "No autonomous send (ADR 003). "
            "Protected routes require X-Demo-Role (ADR 007)."
        ),
    }


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    """Public demo glass-box liveness (run_id / threshold / azure flag intentional)."""
    try:
        model = _model()
        return HealthResponse(
            status="ok",
            model_loaded=True,
            run_id=model.run_id,
            threshold=model.threshold,
            threshold_rule=model.threshold_rule,
            azure_configured=config.azure_configured,
        )
    except Exception:
        return HealthResponse(
            status="degraded",
            model_loaded=False,
            azure_configured=config.azure_configured,
        )


@app.get("/model/glass-box", response_model=GlassBoxResponse)
def glass_box(x_demo_role: Optional[str] = Header(default=None)) -> GlassBoxResponse:
    """Frozen run / threshold / SHAP evidence — requires ``view_glass_box``."""
    role = _role_from_header(x_demo_role)
    _enforce(role, Permission.view_glass_box)
    try:
        model = _model()
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=503, detail=f"Model not loaded: {exc}") from exc
    return GlassBoxResponse(
        run_id=model.run_id,
        threshold=model.threshold,
        threshold_rule=model.threshold_rule,
        top_shap=dict(model.meta.get("top_shap") or {}),
        top_shap_drivers=model.top_shap_drivers,
    )


@app.get("/model/fairness", response_model=FairnessResponse)
def fairness(x_demo_role: Optional[str] = Header(default=None)) -> FairnessResponse:
    """Equalized Odds disclosure at the ops threshold (ADR 012) — same gate as glass-box.

    Single canonical accessor (``src/serving/fairness.py``, ADR 015) so the API,
    the Streamlit dashboard, and doc-generation scripts can no longer quote
    fairness numbers that have drifted from ``Docs/Sprint2/reports/fairlearn_equalized_odds.json``.
    """
    role = _role_from_header(x_demo_role)
    _enforce(role, Permission.view_glass_box)
    try:
        report = load_fairness_report()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return FairnessResponse(**report.model_dump())


@app.post("/rag/ask", response_model=RagAskResponse)
def rag_ask(
    req: RagAskRequest,
    x_demo_role: Optional[str] = Header(default=None),
) -> RagAskResponse:
    """Methodology Q&A grounded in ``Docs/Final_Report_Official.md`` (ADR 010/015).

    FastAPI is the single enforcement point for this too (F8 follow-up): the
    Streamlit dashboard no longer imports ``rag_engine`` directly, it calls
    this route through ``FrictionGateClient.ask_rag`` like every other action.
    Hybrid dense+BM25 retrieval fused with RRF, then an LLM rerank pass —
    see ``src/genai/rag_engine.answer_question``.
    """
    role = _role_from_header(x_demo_role)
    _enforce(role, Permission.use_rag_assistant)
    if not _RAG_DOC_PATH.exists():
        raise HTTPException(
            status_code=503, detail=f"Methodology report not found: {_RAG_DOC_PATH}"
        )
    result = rag_engine.answer_question(
        req.query,
        str(_RAG_DOC_PATH),
        top_k=req.top_k,
        cache_path=_RAG_CACHE_PATH,
        use_rerank=True,
    )
    return RagAskResponse(**result.model_dump())


@app.post("/viva/grade", response_model=VivaGradeResponse)
def viva_grade(
    req: VivaGradeRequest,
    x_demo_role: Optional[str] = Header(default=None),
) -> VivaGradeResponse:
    """Mark one educational-SPA Explain-it answer against its rubric (ADR-EDU-003).

    Replaces self-grading in the teaching app. Like ``/rag/ask`` this keeps
    FastAPI as the single enforcement point for Azure-touching actions (ADR
    015) — the SPA holds no key and never calls Azure itself.

    Marking that cannot run returns 200 with ``available=False`` and a reason,
    not an error: an unmarked answer is not a failed answer, and the SPA falls
    back to self-grading with a banner rather than inventing a verdict.
    """
    role = _role_from_header(x_demo_role)
    _enforce(role, Permission.use_viva_grader)
    result = viva_grader.grade_answer(
        prompt=req.prompt,
        rubric=req.rubric,
        answer=req.answer,
    )
    return VivaGradeResponse(
        prompt_id=req.prompt_id,
        available=result.available,
        cleared=result.cleared,
        covered_count=result.covered_count,
        total_points=len(result.points),
        points=[p.model_dump() for p in result.points],
        feedback=result.feedback,
        reason=result.reason,
    )


@app.post("/score", response_model=ScoreResponse)
def score(
    req: ScoreRequest,
    x_demo_role: Optional[str] = Header(default=None),
) -> ScoreResponse:
    """Score one customer at the ops threshold (top-5% / t≈0.701).

    ``flagged`` means "in the contact queue" — probability ≥ ops cut — not
    "will churn". Requires ``X-Demo-Role`` with ``score`` permission.
    """
    role = _role_from_header(x_demo_role)
    _enforce(role, Permission.score)

    model = _model()
    try:
        prob, flagged = score_raw_features(model, req.features.model_dump())
    except KeyError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return ScoreResponse(
        churn_probability=prob,
        flagged=flagged,
        threshold=model.threshold,
        threshold_rule=model.threshold_rule,
        run_id=model.run_id,
    )


@app.get("/predictions", response_model=PredictionPage)
def list_predictions(
    flagged_only: bool = Query(default=False),
    min_probability: float = Query(default=0.0, ge=0.0, le=1.0),
    customer_id: Optional[str] = Query(default=None, max_length=64),
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    x_demo_role: Optional[str] = Header(default=None),
) -> PredictionPage:
    """Prediction browser: the scored cohort, highest risk first.

    Scores are recomputed here from raw features with the pinned ops model; the
    cohort file supplies features only (see ``src/serving/cohort.py``).
    """
    role = _role_from_header(x_demo_role)
    _enforce(role, Permission.explain_predictions)
    model = _model()
    try:
        cohort = load_cohort(model)
    except (OSError, ValueError, KeyError) as exc:
        raise HTTPException(status_code=503, detail=f"Cohort unavailable: {exc}") from exc

    rows = [
        r
        for r in cohort.rows
        if (not flagged_only or r.flagged)
        and r.churn_probability >= min_probability
        and (customer_id is None or customer_id in r.customer_id)
    ]
    page = rows[offset : offset + limit]
    return PredictionPage(
        source=cohort.source,
        cohort_is_fixture=cohort.is_fixture,
        month=cohort.month,
        total=len(cohort.rows),
        flagged_total=cohort.flagged_total,
        matched=len(rows),
        threshold=model.threshold,
        run_id=model.run_id,
        rows=[
            PredictionRow(
                customer_id=r.customer_id,
                month=r.month,
                churn_probability=r.churn_probability,
                flagged=r.flagged,
                rank=r.rank,
                actual_churned=r.actual_churned,
                features={k: json_safe(v) for k, v in r.features.items()},
            )
            for r in page
        ],
    )


@app.get("/predictions/{customer_id}/explain", response_model=ExplainResponse)
def explain_customer(
    customer_id: str,
    top_n: int = Query(default=10, ge=1, le=30),
    x_demo_role: Optional[str] = Header(default=None),
) -> ExplainResponse:
    """Per-customer TreeSHAP for one cohort row (log-odds; sums to the score's logit)."""
    role = _role_from_header(x_demo_role)
    _enforce(role, Permission.explain_predictions)
    model = _model()
    try:
        row = load_cohort(model).get(customer_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Customer not in cohort") from exc
    except (OSError, ValueError) as exc:
        raise HTTPException(status_code=503, detail=f"Cohort unavailable: {exc}") from exc
    result = explain_raw_features(model, row.features, top_n=top_n)
    return result.model_copy(update={"customer_id": customer_id})


@app.post("/explain", response_model=ExplainResponse)
def explain_features(
    req: ExplainRequest,
    x_demo_role: Optional[str] = Header(default=None),
) -> ExplainResponse:
    """Per-customer TreeSHAP for a raw feature row (fixtures, what-if edits)."""
    role = _role_from_header(x_demo_role)
    _enforce(role, Permission.explain_predictions)
    model = _model()
    try:
        return explain_raw_features(model, req.features.model_dump(), top_n=req.top_n)
    except KeyError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.post("/drafts", response_model=DraftRecord, status_code=201)
def create_draft_endpoint(
    req: DraftCreateRequest,
    x_demo_role: Optional[str] = Header(default=None),
) -> DraftRecord:
    """Create a retention draft only if **server re-score** flags the row."""
    role = _role_from_header(x_demo_role)
    _enforce(role, Permission.create_draft)

    model = _model()
    feats_dict = req.features.model_dump()
    try:
        prob, flagged = score_raw_features(model, feats_dict)
    except KeyError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    if not flagged:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Not in contact queue: probability {prob:.6f} < "
                f"ops threshold {model.threshold:.6f}. Re-score is server-side."
            ),
        )

    # Non-PII context for drafter: frozen SHAP driver names only (+ optional aggregates).
    drivers = model.top_shap_drivers
    safe_feats = {
        k: feats_dict[k]
        for k in ("Running_Balance_Rounded", "gone_this_month", "Is_Inactive_Month")
        if k in feats_dict
    }
    draft_body, source = create_draft(
        drivers=drivers,
        churn_probability=prob,
        extra_context=safe_feats,
    )
    try:
        return draft_store.insert_draft(
            churn_probability=prob,
            threshold=model.threshold,
            run_id=model.run_id,
            drafter_source=source,
            draft=draft_body,
            review_key=req.review_key,
            actor_role=role.value,
        )
    except PendingCapError as exc:
        raise HTTPException(status_code=429, detail=str(exc)) from exc


@app.get("/drafts", response_model=list[DraftRecord])
def list_drafts_endpoint(
    status: Optional[DraftStatus] = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    x_demo_role: Optional[str] = Header(default=None),
) -> list[DraftRecord]:
    """List drafts — requires ``view_queue`` (same Glass-Box matrix as mutates)."""
    role = _role_from_header(x_demo_role)
    _enforce(role, Permission.view_queue)
    return draft_store.list_drafts(status=status, limit=limit)


@app.get("/drafts/{draft_id}", response_model=DraftRecord)
def get_draft_endpoint(
    draft_id: str,
    x_demo_role: Optional[str] = Header(default=None),
) -> DraftRecord:
    """Fetch one draft — requires ``view_queue``."""
    role = _role_from_header(x_demo_role)
    _enforce(role, Permission.view_queue, draft_id=draft_id)
    try:
        return draft_store.get_draft(draft_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Draft not found") from exc


@app.patch("/drafts/{draft_id}", response_model=DraftRecord)
def patch_draft_endpoint(
    draft_id: str,
    req: DraftPatchRequest,
    x_demo_role: Optional[str] = Header(default=None),
) -> DraftRecord:
    """Edit draft text/rate and/or Approve|Reject (Friction-Gate decide once).

    Dual permission check (demo Glass-Box RBAC):
    - Status change → ``approve_reject`` (retention_agent only in the matrix).
    - Subject/body/rate → ``edit_draft``.
    Empty patches (no fields) are rejected with 422 so clients cannot no-op
    their way past the attention gate. Approves also need ``attention_ack``.
    """
    role = _role_from_header(x_demo_role)
    if req.status is not None:
        _enforce(role, Permission.approve_reject, draft_id=draft_id)
    if (
        req.subject is not None
        or req.body is not None
        or req.offered_interest_rate is not None
    ):
        _enforce(role, Permission.edit_draft, draft_id=draft_id)
    if (
        req.status is None
        and req.subject is None
        and req.body is None
        and req.offered_interest_rate is None
    ):
        raise HTTPException(status_code=422, detail="No patch fields provided")

    audit_extra = None
    if req.status == DraftStatus.approved:
        # JR-REQ-19 — ack already required by DraftPatchRequest; enrich audit.
        try:
            current = draft_store.get_draft(draft_id)
        except KeyError as exc:
            raise HTTPException(status_code=404, detail="Draft not found") from exc
        audit_extra = attention_audit_detail(
            attention_ack=bool(req.attention_ack),
            high_stakes=is_high_stakes(current.churn_probability, current.threshold),
            seconds_open=req.seconds_open,
        )

    try:
        return draft_store.update_draft(
            draft_id,
            status=req.status,
            subject=req.subject,
            body=req.body,
            offered_interest_rate=req.offered_interest_rate,
            actor_role=role.value,
            actor_key=None,
            audit_extra=audit_extra,
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Draft not found") from exc
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail=jsonable_validation(exc)) from exc
    except (TerminalDraftError, ValueError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.get("/audit/events")
def list_audit_endpoint(
    limit: int = Query(default=100, ge=1, le=500),
    draft_id: Optional[str] = Query(default=None),
    x_demo_role: Optional[str] = Header(default=None),
) -> list[dict[str, Any]]:
    """Compliance / glass-box audit trail (demo RBAC)."""
    role = _role_from_header(x_demo_role)
    _enforce(role, Permission.view_audit)
    return draft_store.list_audit_events(draft_id=draft_id, limit=limit)


def jsonable_validation(exc: ValidationError) -> list:
    """Turn Pydantic ``ValidationError`` into a JSON-serializable error list for 422 bodies."""
    return exc.errors(include_context=False)
