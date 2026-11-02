"""ASGI + unit tests for Sprint 3 serving / Friction-Gate (Jamie round-2)."""
from __future__ import annotations

import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import pytest
import xgboost as xgb
from fastapi.testclient import TestClient
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder

from src.genai.drafter import sanitize_llm_draft
from src.genai.pii_scrubber import scrub_mapping, scrub_text
from src.serving.draft_store import PendingCapError, TerminalDraftError, insert_draft
from src.serving.model import reset_ops_model
from src.serving.schemas import RetentionDraftBody, normalize_review_key

AGENT = {"X-Demo-Role": "retention_agent"}
COMPLIANCE = {"X-Demo-Role": "compliance_viewer"}


@pytest.fixture()
def tiny_ops_dir(tmp_path: Path) -> Path:
    """Minimal portable ops export for isolated tests (no MLflow)."""
    cat_cols = ["state"]
    num_cols = ["x"]
    raw_cols = cat_cols + num_cols
    df = pd.DataFrame({"state": ["CA", "NY", "CA", "TX"], "x": [0.0, 1.0, 0.5, 2.0]})
    y = np.array([0, 1, 0, 1])
    preprocess = ColumnTransformer(
        [
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), cat_cols),
            ("num", "passthrough", num_cols),
        ]
    )
    X = preprocess.fit_transform(df)
    ohe = preprocess.named_transformers_["cat"]
    names = list(ohe.get_feature_names_out(cat_cols)) + num_cols
    dtrain = xgb.DMatrix(X, label=y, feature_names=names)
    booster = xgb.train(
        {"max_depth": 2, "eta": 0.5, "objective": "binary:logistic", "verbosity": 0},
        dtrain,
        num_boost_round=20,
    )
    threshold = 0.3
    meta = {
        "run_id": "test-run-tiny",
        "threshold": threshold,
        "threshold_rule": "test_threshold",
        "model_feature_names": names,
        "raw_feature_cols": raw_cols,
        "num_cols": num_cols,
        "cat_cols": cat_cols,
        "top_shap": {"x": 1.0},
    }
    ops = tmp_path / "ops"
    ops.mkdir()
    booster.save_model(str(ops / "booster.json"))
    joblib.dump(preprocess, ops / "preprocessor.joblib")
    (ops / "serving_meta.json").write_text(json.dumps(meta), encoding="utf-8")
    return ops


@pytest.fixture()
def client(tiny_ops_dir: Path, tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    """FastAPI TestClient with tiny model + isolated draft DB."""
    reset_ops_model()
    monkeypatch.setenv("MODELS_OPS_DIR", str(tiny_ops_dir))
    monkeypatch.setenv("DRAFT_DB_PATH", str(tmp_path / "drafts.db"))
    from src.core import config as cfg_mod

    monkeypatch.setattr(cfg_mod.config, "models_ops_dir", str(tiny_ops_dir))
    monkeypatch.setattr(cfg_mod.config, "draft_db_path", str(tmp_path / "drafts.db"))
    monkeypatch.setattr(cfg_mod.config, "azure_openai_endpoint", None)

    from src.serving.paths import load_serving_meta

    load_serving_meta.cache_clear()

    from src.serving.app import app
    from src.serving.model import load_ops_model

    app.state.ops_model = load_ops_model(tiny_ops_dir, force=True)

    with TestClient(app) as c:
        yield c
    reset_ops_model()
    load_serving_meta.cache_clear()


def _flagged_create(client: TestClient, review_key: str = "agent-1") -> dict:
    import src.serving.app as serving_app

    orig = serving_app.score_raw_features
    serving_app.score_raw_features = lambda model, row: (0.9, True)
    try:
        r = client.post(
            "/drafts",
            json={"features": {"state": "NY", "x": 2.0}, "review_key": review_key},
            headers=AGENT,
        )
        assert r.status_code == 201, r.text
        return r.json()
    finally:
        serving_app.score_raw_features = orig


def test_scrub_email_and_blocked_keys():
    assert "[REDACTED_EMAIL]" in scrub_text("write me at a@b.com please")
    clean = scrub_mapping({"customer_id": 99, "state": "CA", "email": "x@y.com"})
    assert "customer_id" not in clean
    assert "email" not in clean
    assert clean["state"] == "CA"


def test_rate_cap_rejects_above_3_5():
    with pytest.raises(Exception):
        RetentionDraftBody(
            subject="Hi",
            body="Body text here",
            offered_interest_rate=0.10,
            drivers=[],
        )


def test_review_key_rejects_email_pii():
    with pytest.raises(ValueError):
        normalize_review_key("agent@bank.com")
    assert normalize_review_key("demo-agent") == "demo-agent"
    assert normalize_review_key(None) is None


def test_sanitize_ignores_llm_drivers():
    draft = sanitize_llm_draft(
        {
            "subject": "Hi",
            "body": "Body text here for retention.",
            "offered_interest_rate": 0.02,
            "drivers": ["leak@evil.com", "Customer_Name"],
        },
        fallback_drivers=["Running_Balance_Rounded", "gone_this_month"],
    )
    assert draft.drivers == ["Running_Balance_Rounded", "gone_this_month"]


def test_health(client: TestClient):
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["model_loaded"] is True
    assert body["run_id"] == "test-run-tiny"
    assert body["azure_configured"] is False


def test_score_requires_role_and_permission(client: TestClient):
    missing = client.post("/score", json={"features": {"state": "CA", "x": 0.0}})
    assert missing.status_code == 400

    denied = client.post(
        "/score",
        json={"features": {"state": "CA", "x": 0.0}},
        headers=COMPLIANCE,
    )
    assert denied.status_code == 403

    ok = client.post(
        "/score",
        json={"features": {"state": "NY", "x": 2.0}},
        headers=AGENT,
    )
    assert ok.status_code == 200
    assert "flagged" in ok.json()
    assert ok.json()["threshold"] == pytest.approx(0.3)


def test_draft_blocked_when_below_threshold(client: TestClient):
    import src.serving.app as serving_app

    orig = serving_app.score_raw_features
    serving_app.score_raw_features = lambda model, row: (0.01, False)
    try:
        r = client.post(
            "/drafts",
            json={"features": {"state": "CA", "x": 0.0}, "review_key": "t1"},
            headers=AGENT,
        )
        assert r.status_code == 422
        detail = str(r.json()["detail"]).lower()
        assert "contact queue" in detail or "threshold" in detail
    finally:
        serving_app.score_raw_features = orig


def test_draft_create_approve_reject_and_no_send(client: TestClient):
    draft = _flagged_create(client, "agent-1")
    assert draft["status"] == "pending_review"
    assert draft["drafter_source"] in {"stub", "stub_fallback", "azure"}
    assert draft["draft"]["offered_interest_rate"] <= 0.035
    draft_id = draft["id"]

    listed = client.get(
        "/drafts", params={"status": "pending_review"}, headers=AGENT
    )
    assert listed.status_code == 200
    assert any(d["id"] == draft_id for d in listed.json())

    patched = client.patch(
        f"/drafts/{draft_id}",
        json={
            "status": "approved",
            "subject": "Updated subject",
            "attention_ack": True,
        },
        headers=AGENT,
    )
    assert patched.status_code == 200
    assert patched.json()["status"] == "approved"

    # Terminal immutability — cannot reject after approve
    reopen = client.patch(
        f"/drafts/{draft_id}",
        json={"status": "rejected"},
        headers=AGENT,
    )
    assert reopen.status_code == 422

    # Separate draft for reject path
    other = _flagged_create(client, "agent-2")
    rejected = client.patch(
        f"/drafts/{other['id']}",
        json={"status": "rejected"},
        headers=AGENT,
    )
    assert rejected.status_code == 200
    assert rejected.json()["status"] == "rejected"

    bad_rate_pending = _flagged_create(client, "agent-3")
    bad_rate = client.patch(
        f"/drafts/{bad_rate_pending['id']}",
        json={"offered_interest_rate": 0.99},
        headers=AGENT,
    )
    assert bad_rate.status_code == 422

    paths = {getattr(route, "path", None) for route in client.app.routes}
    assert "/send" not in paths
    assert not any(p and "send" in p for p in paths if isinstance(p, str))


def test_missing_features_422(client: TestClient):
    r = client.post("/score", json={"features": {"state": "CA"}}, headers=AGENT)
    assert r.status_code == 422


@pytest.mark.parametrize("patch", [
    {"body": "We promise 9.5% interest."},
    {"subject": "A 9.5 percent loyalty offer"},
    {"body": "We offer 3.5% interest.", "offered_interest_rate": 0.02},
    {"body": "We offer 1,000% interest."},
    {"body": "We offer 9.5e0% interest."},
    {"body": "We offer 1 000% interest."},
    {"body": "We offer nine percent interest."},
    {"body": "We offer 1\u202f000% interest."},
    {"body": "We offer 1\n000% interest."},
])
def test_edit_rejects_text_above_numeric_offer(client: TestClient, patch):
    draft = _flagged_create(client)
    response = client.patch(f"/drafts/{draft['id']}", json=patch, headers=AGENT)
    assert response.status_code == 422
    stored = client.get(f"/drafts/{draft['id']}", headers=AGENT).json()
    assert stored["draft"] == draft["draft"]


def test_edit_accepts_text_matching_offer(client: TestClient):
    draft = _flagged_create(client)
    response = client.patch(f"/drafts/{draft['id']}", headers=AGENT,
                            json={"body": "We can offer 3.5% interest.", "offered_interest_rate": 0.035})
    assert response.status_code == 200


def test_api_compliance_cannot_approve(client: TestClient):
    draft = _flagged_create(client)
    draft_id = draft["id"]

    denied = client.patch(
        f"/drafts/{draft_id}",
        json={"status": "approved", "attention_ack": True},
        headers=COMPLIANCE,
    )
    assert denied.status_code == 403

    ok = client.patch(
        f"/drafts/{draft_id}",
        json={"status": "approved", "attention_ack": True},
        headers=AGENT,
    )
    assert ok.status_code == 200
    assert ok.json()["status"] == "approved"

    audit = client.get("/audit/events", headers=COMPLIANCE)
    assert audit.status_code == 200
    actions = [e["action"] for e in audit.json()]
    assert "create" in actions
    assert "approved" in actions
    assert "denied" in actions
    assert all(e.get("actor_role") for e in audit.json())
    approved_ev = next(e for e in audit.json() if e["action"] == "approved")
    assert approved_ev["detail"].get("attention_ack") is True
    assert approved_ev["detail"].get("anti_rubber_stamp") is True


def test_approve_requires_attention_ack(client: TestClient):
    """JR-REQ-19 — Approve without attention_ack is a rubber-stamp and must 422."""
    draft = _flagged_create(client)
    no_ack = client.patch(
        f"/drafts/{draft['id']}",
        json={"status": "approved"},
        headers=AGENT,
    )
    assert no_ack.status_code == 422
    false_ack = client.patch(
        f"/drafts/{draft['id']}",
        json={"status": "approved", "attention_ack": False},
        headers=AGENT,
    )
    assert false_ack.status_code == 422


def test_api_compliance_cannot_create_draft(client: TestClient):
    denied = client.post(
        "/drafts",
        json={"features": {"state": "NY", "x": 2.0}},
        headers=COMPLIANCE,
    )
    assert denied.status_code == 403


def test_get_drafts_requires_demo_role_and_view_queue(client: TestClient):
    draft = _flagged_create(client)
    draft_id = draft["id"]

    missing = client.get("/drafts")
    assert missing.status_code == 400

    listed = client.get("/drafts", headers=AGENT)
    assert listed.status_code == 200
    assert any(d["id"] == draft_id for d in listed.json())

    one = client.get(f"/drafts/{draft_id}", headers=COMPLIANCE)
    assert one.status_code == 200
    assert one.json()["id"] == draft_id

    bad = client.get("/drafts", headers={"X-Demo-Role": "not_a_role"})
    assert bad.status_code == 400


def test_denied_mutations_are_audited(client: TestClient):
    draft = _flagged_create(client)
    draft_id = draft["id"]

    denied = client.patch(
        f"/drafts/{draft_id}",
        json={"status": "approved", "attention_ack": True},
        headers=COMPLIANCE,
    )
    assert denied.status_code == 403

    audit = client.get("/audit/events", headers=COMPLIANCE)
    denied_events = [e for e in audit.json() if e["action"] == "denied"]
    assert denied_events
    assert denied_events[0]["actor_role"] == "compliance_viewer"
    assert denied_events[0]["draft_id"] == draft_id
    assert denied_events[0]["detail"].get("permission") == "approve_reject"


def test_review_key_pii_rejected_on_create(client: TestClient):
    import src.serving.app as serving_app

    orig = serving_app.score_raw_features
    serving_app.score_raw_features = lambda model, row: (0.9, True)
    try:
        r = client.post(
            "/drafts",
            json={
                "features": {"state": "NY", "x": 2.0},
                "review_key": "alice@bank.com",
            },
            headers=AGENT,
        )
        assert r.status_code == 422
    finally:
        serving_app.score_raw_features = orig


def test_pending_cap_in_store(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("DRAFT_DB_PATH", str(tmp_path / "cap.db"))
    from src.core import config as cfg_mod

    monkeypatch.setattr(cfg_mod.config, "draft_db_path", str(tmp_path / "cap.db"))
    body = RetentionDraftBody(
        subject="Hi",
        body="Body text for a stub retention email.",
        offered_interest_rate=0.03,
        drivers=["x"],
    )
    insert_draft(
        churn_probability=0.9,
        threshold=0.3,
        run_id="r",
        drafter_source="stub",
        draft=body,
        review_key="a1",
        pending_cap=1,
    )
    with pytest.raises(PendingCapError):
        insert_draft(
            churn_probability=0.9,
            threshold=0.3,
            run_id="r",
            drafter_source="stub",
            draft=body,
            review_key="a2",
            pending_cap=1,
        )


def test_terminal_draft_immutable_in_store(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("DRAFT_DB_PATH", str(tmp_path / "term.db"))
    from src.core import config as cfg_mod
    from src.serving import draft_store
    from src.serving.schemas import DraftStatus

    monkeypatch.setattr(cfg_mod.config, "draft_db_path", str(tmp_path / "term.db"))
    body = RetentionDraftBody(
        subject="Hi",
        body="Body text for a stub retention email.",
        offered_interest_rate=0.03,
        drivers=["x"],
    )
    rec = insert_draft(
        churn_probability=0.9,
        threshold=0.3,
        run_id="r",
        drafter_source="stub",
        draft=body,
        review_key="a1",
    )
    approved = draft_store.update_draft(rec.id, status=DraftStatus.approved)
    assert approved.status == DraftStatus.approved
    with pytest.raises(TerminalDraftError):
        draft_store.update_draft(rec.id, status=DraftStatus.rejected)


# --- ADR 015: /model/fairness + /rag/ask (single FastAPI enforcement point) -


def test_fairness_requires_role_and_permission(client: TestClient):
    missing = client.get("/model/fairness")
    assert missing.status_code == 400

    ok = client.get("/model/fairness", headers=COMPLIANCE)
    assert ok.status_code == 200
    body = ok.json()
    assert body["equalized_odds_difference_age"] == pytest.approx(0.15599544740011842)
    assert body["equalized_odds_difference_state"] == pytest.approx(0.3181609195402299)
    assert Path(body["source"]).as_posix() == "Docs/Sprint2/reports/fairlearn_equalized_odds.json"


def test_rag_ask_requires_role_and_permission(client: TestClient, monkeypatch: pytest.MonkeyPatch):
    import src.serving.app as serving_app

    monkeypatch.setattr(
        serving_app.rag_engine,
        "answer_question",
        lambda *a, **k: serving_app.rag_engine.RagAnswer(
            answer="0.701 is the ops threshold.",
            sources=["The operational contact threshold is 0.701."],
            retrieval_mode="tfidf",
            hybrid=False,
            reranked=False,
        ),
    )

    missing = client.post("/rag/ask", json={"query": "What is the ops threshold?"})
    assert missing.status_code == 400

    ok = client.post("/rag/ask", json={"query": "What is the ops threshold?"}, headers=COMPLIANCE)
    assert ok.status_code == 200
    body = ok.json()
    assert "0.701" in body["answer"]
    assert body["sources"]
    assert body["hybrid"] is False
    assert body["reranked"] is False


def test_rag_ask_404s_when_report_missing(client: TestClient, monkeypatch: pytest.MonkeyPatch):
    import src.serving.app as serving_app

    monkeypatch.setattr(serving_app, "_RAG_DOC_PATH", Path("Docs") / "does_not_exist.md")
    r = client.post("/rag/ask", json={"query": "hi"}, headers=AGENT)
    assert r.status_code == 503


_VIVA_BODY = {
    "prompt_id": "v-leakage",
    "prompt": "How did you make sure the model never saw the future?",
    "rubric": ["Label is month t+1", "No shuffling", "Test used once"],
    "answer": " ".join(["word"] * 60),
}


def test_viva_grade_requires_role(client: TestClient):
    assert client.post("/viva/grade", json=_VIVA_BODY).status_code == 400


def test_viva_grade_marks_against_rubric(client: TestClient, monkeypatch: pytest.MonkeyPatch):
    """All three demo roles may use the marker — it is a read-only study aid."""
    import src.serving.app as serving_app
    from src.genai.viva_grader import GradeResult

    monkeypatch.setattr(
        serving_app.viva_grader,
        "grade_answer",
        lambda **kw: GradeResult(
            available=True,
            points=[
                {"index": 0, "point": kw["rubric"][0], "covered": True, "evidence": "word word"},
                {"index": 1, "point": kw["rubric"][1], "covered": True, "evidence": "word"},
                {"index": 2, "point": kw["rubric"][2], "covered": False, "comment": "Not made."},
            ],
            feedback="Two of three.",
        ),
    )

    resp = client.post("/viva/grade", json=_VIVA_BODY, headers=COMPLIANCE)

    assert resp.status_code == 200
    body = resp.json()
    assert body["prompt_id"] == "v-leakage"
    assert body["available"] is True
    assert body["covered_count"] == 2
    assert body["total_points"] == 3
    # 3 points at 0.8 needs all 3 — two covered is not cleared.
    assert body["cleared"] is False
    assert body["points"][2]["comment"] == "Not made."


def test_viva_grade_unavailable_is_200_not_an_error(client: TestClient):
    """Azure is unconfigured in this fixture: the SPA needs a reason, not a 5xx."""
    resp = client.post("/viva/grade", json=_VIVA_BODY, headers=AGENT)

    assert resp.status_code == 200
    body = resp.json()
    assert body["available"] is False
    assert body["cleared"] is False
    assert body["reason"]


def test_viva_grade_rejects_unknown_fields(client: TestClient):
    """The client supplies the answer, never the verdict (extra="forbid")."""
    resp = client.post(
        "/viva/grade",
        json={**_VIVA_BODY, "cleared": True, "covered_count": 99},
        headers=AGENT,
    )
    assert resp.status_code == 422


def test_spa_origin_gets_cors_headers(client: TestClient):
    """The teaching SPA runs on its own Vite origin (ADR-EDU-003)."""
    allowed = client.post(
        "/viva/grade",
        json=_VIVA_BODY,
        headers={**AGENT, "Origin": "http://localhost:3007"},
    )
    assert allowed.headers.get("access-control-allow-origin") == "http://localhost:3007"

    foreign = client.post(
        "/viva/grade",
        json=_VIVA_BODY,
        headers={**AGENT, "Origin": "https://evil.example.com"},
    )
    assert "access-control-allow-origin" not in foreign.headers
