"""Friction-Gate UI for Meridian retention drafts (ADR 003 + ADR 007 + ADR 011).

Every score, draft, decision, audit read and RAG question goes through FastAPI
(F8: single enforcement point) via ``FrictionGateClient``. ``FRICTION_GATE_MODE``
picks the transport: ``http`` (default, ``FRICTION_GATE_API_URL``) or
``inprocess`` (TestClient, for machines where AppLocker blocks loopback).

Approved ≠ Sent: approving only marks the draft ready for a human to send
outside this system. There is no send action.

Sprint 5 Glass-Box RBAC: sidebar role picker gates Approve/Edit vs read-only
compliance view vs data-scientist glass-box (threshold + frozen SHAP). Demo
roles only — not corporate SSO. FastAPI uses the same matrix via ``X-Demo-Role``.

JR-REQ-19 anti rubber-stamp: Approve requires attention acknowledgement;
high-stakes scores get a stronger cue; fast decides soft-warn (ADR 003 amendment).

Sam's ML pages (brief): what-if sliders, prediction browser (``GET /predictions``)
and per-customer SHAP (``/predictions/{id}/explain``, ``POST /explain``).

Demo fixtures (Sprint 4): ``Docs/Sprint4/fixtures/*_demo.json``.

Run (API on :8000 first — host uvicorn or ``docker compose up``):
    uv run python -m streamlit run Code\\Sprint3\\friction_gate_app.py
"""
from __future__ import annotations

import json
import sys
import time
from pathlib import Path
from typing import Any

import altair as alt
import streamlit as st

REPO_ROOT = next(
    parent
    for parent in Path(__file__).resolve().parents
    if (parent / "pyproject.toml").is_file()
    and (parent / "src" / "serving" / "schemas.py").is_file()
)
# Put this checkout first so `src` cannot resolve to another project when
# Streamlit runs the app from a nested/generated entry point.
sys.path.insert(0, str(REPO_ROOT))

from src.serving.attention_gate import (  # noqa: E402
    FAST_DECIDE_SECONDS,
    is_high_stakes,
)
from src.serving.client import ApiError, ApiUnavailable, FrictionGateClient  # noqa: E402
from src.serving.rbac import (  # noqa: E402
    PERMISSION_LABELS,
    ROLE_LABELS,
    Permission,
    Role,
    can,
    permissions_for,
)
from src.serving.schemas import (  # noqa: E402
    CustomerFeatures,
    DraftPatchRequest,
    DraftStatus,
    ExplainResponse,
    FixtureData,
)

FIXTURES_DIR = REPO_ROOT / "Docs" / "Sprint4" / "fixtures"


@st.cache_data
def _get_selected_fixture(preset: str) -> FixtureData:
    """Load and parse a demo fixture based on the UI preset.
    
    Args:
        preset: The radio button string selection.
        
    Returns:
        A FixtureData Pydantic model containing metadata and CustomerFeatures.
    """
    if preset.lower().startswith("below"):
        name = "below_threshold_demo.json"
    else:
        name = "flagged_demo.json"
        
    path = FIXTURES_DIR / name
    payload = json.loads(path.read_text(encoding="utf-8"))
    
    features_dict = payload.get("features", payload)
    
    return FixtureData(
        meta=payload,
        features=CustomerFeatures(**features_dict)
    )


BUSINESS_METRICS_PATH = REPO_ROOT / "Data" / "processed" / "business_metrics.json"


@st.cache_data
def _load_business_metrics() -> dict[str, Any] | None:
    """Cohort KPIs from ``Code/Sprint5/generate_business_metrics.py`` (None if not generated)."""
    if not BUSINESS_METRICS_PATH.exists():
        return None
    try:
        return json.loads(BUSINESS_METRICS_PATH.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None


def _render_shap(expl: ExplainResponse, *, key: str) -> None:
    """Per-customer SHAP bar chart + table (log-odds; red raises risk, blue lowers it)."""
    rows = [
        {
            "feature": c.feature,
            "value": "—" if c.value is None else str(c.value),
            "shap": c.shap,
            "effect": "raises risk" if c.shap > 0 else "lowers risk",
        }
        for c in expl.contributions
    ]
    if abs(expl.other_contribution) > 1e-6:
        rows.append(
            {
                "feature": "(all other features)",
                "value": "",
                "shap": expl.other_contribution,
                "effect": "raises risk" if expl.other_contribution > 0 else "lowers risk",
            }
        )
    chart = (
        alt.Chart(alt.Data(values=rows))
        .mark_bar()
        .encode(
            x=alt.X("shap:Q", title="SHAP contribution (log-odds)"),
            y=alt.Y("feature:N", sort=None, title=None, axis=alt.Axis(labelLimit=260)),
            color=alt.Color(
                "effect:N",
                scale=alt.Scale(domain=["raises risk", "lowers risk"], range=["#d62728", "#1f77b4"]),
                legend=alt.Legend(orient="bottom", title=None),
            ),
            tooltip=["feature:N", "value:N", alt.Tooltip("shap:Q", format="+.3f")],
        )
    )
    st.altair_chart(chart, width="stretch", key=f"shap_chart_{key}")
    st.caption(
        f"Starts from the model's average log-odds **{expl.base_value:+.3f}**; the bars "
        f"add up to **{expl.margin:+.3f}** = probability **{expl.churn_probability:.4f}**. "
        f"The ops cut t={expl.threshold:.4f} is **{expl.threshold_logit:+.3f}** in log-odds. "
        "Exact TreeSHAP from the served XGBoost model; `state` sums its one-hot columns."
    )
    with st.expander("SHAP values as a table"):
        st.dataframe(rows, width="stretch", hide_index=True)


st.set_page_config(page_title="Meridian Friction-Gate", layout="wide")
st.title("Meridian Friction-Gate")
st.caption(
    "Human review only. **Approve** means ready for a person to send outside "
    "this app — Meridian AI never sends email (ADR 003). "
    "Sidebar roles are **demo Glass-Box RBAC** (ADR 007), not SSO."
)
st.info(
    "**How to read this app:** pick a **role** (who you are), then a **page** "
    "(where you go). Roles change what buttons work — e.g. Compliance can see "
    "the queue but cannot Approve."
)



@st.cache_resource
def _api_client() -> FrictionGateClient:
    """One API client per Streamlit process (transport chosen by FRICTION_GATE_MODE)."""
    return FrictionGateClient.from_config()


# All scoring, drafting, edits, decisions and audit reads go through FastAPI,
# the single enforcement point (F8). This UI never touches the model or SQLite.
api = _api_client()

# --- Demo RBAC role picker -------------------------------------------------
role_options = list(Role)
default_role = Role.retention_agent
role = st.sidebar.selectbox(
    "Active role (demo RBAC)",
    options=role_options,
    index=role_options.index(default_role),
    format_func=lambda r: ROLE_LABELS[r],
    help=(
        "Demo role switcher for stakeholder walkthroughs — not real login / SSO. "
        "Retention agent can Approve. Compliance is read-only. "
        "Data scientist can score and inspect the model, but cannot Approve."
    ),
)
_plain_perms = ", ".join(
    PERMISSION_LABELS.get(p, p.value) for p in sorted(permissions_for(role), key=lambda x: x.value)
)
st.sidebar.caption(f"This role can: {_plain_perms}")

try:
    model = api.glass_box(role)
    st.sidebar.success(
        f"Model loaded\nrun `{model.run_id[:8]}…`\n"
        f"t={model.threshold:.4f} ({model.threshold_rule})"
    )
    st.sidebar.caption(
        "t = ops cutoff: only customers scoring at/above this rank enter "
        "the human Review queue (top ~5% capacity dial)."
    )
except ApiUnavailable as exc:
    st.sidebar.error(
        f"{exc}\n\nStart the API (`uvicorn src.serving.app:app`) or set "
        "`FRICTION_GATE_MODE=inprocess`."
    )
    model = None
except ApiError as exc:
    st.sidebar.error(f"Model not available: {exc.detail}")
    model = None

tabs: list[str] = ["Business View (Morgan)"]
if can(role, Permission.view_queue):
    tabs.append("Review queue")
if can(role, Permission.score) or can(role, Permission.create_draft):
    tabs.append("Score / create draft")
    tabs.append("ML View (Sam)")
if can(role, Permission.explain_predictions):
    tabs.append("Prediction browser (Sam)")
if can(role, Permission.view_glass_box):
    tabs.append("Glass-box")
if can(role, Permission.use_rag_assistant):
    tabs.append("Methodology Q&A Bot")
if can(role, Permission.view_audit):
    tabs.append("Audit trail")

if not tabs:
    st.error("This role has no UI permissions.")
    st.stop()

st.sidebar.markdown("---")
page = st.sidebar.radio(
    "Navigation",
    tabs,
    help=(
        "Pages available to the selected role. Switch role above to see how "
        "the menu and buttons change (Glass-Box RBAC demo)."
    ),
)

# --- Business View (Morgan) ------------------------------------------------
if page == "Business View (Morgan)":
    st.header("Executive Portfolio Overview")
    metrics = _load_business_metrics()
    if metrics:
        st.caption(
            f"Cohorts scored by the ops model on {metrics.get('source', 'a training sample')} "
            f"(run `{str(metrics.get('run_id', ''))[:8]}…`). Regenerate with "
            "`Code/Sprint5/generate_business_metrics.py`."
        )
        tailored_n = int(metrics["tailored_count"])
        automated_n = int(metrics["automated_count"])
        scored_n = int(metrics.get("scored_rows", 0))
        low_value = f"{scored_n - tailored_n - automated_n:,} accounts" if scored_n else "—"
        tailored_delta = f"-${metrics['total_aum_tailored'] / 1e6:,.1f}M AUM (At Risk)"
        automated_delta = f"-${metrics['total_aum_automated'] / 1e6:,.1f}M AUM"
        t_tailored = float(metrics["tailored_threshold"])
        t_automated = float(metrics["automated_threshold"])
    else:
        st.warning(
            "**Illustrative figures.** `Data/processed/business_metrics.json` is not "
            "present (it needs `training_data.csv`, which is not in this checkout). "
            "Run `Code/Sprint5/generate_business_metrics.py` to replace these with "
            "scored cohorts."
        )
        tailored_n, automated_n = 300, 1245
        low_value = "8,455 accounts"
        tailored_delta, automated_delta = "-$7.3M AUM (At Risk)", "-$12.1M AUM"
        t_tailored = model.threshold if model else 0.701
        t_automated = 0.50

    st.subheader("Risk Buckets & Population Distribution")
    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric(
            "High Risk (Tailored Cohort)",
            f"{tailored_n:,} accounts",
            tailored_delta,
            help=(
                "Top capacity slice for human Friction-Gate review. "
                "AUM = sum of balances in the cohort (not probability-weighted)."
            ),
        )
    with col2:
        st.metric(
            "Medium Risk (Automated)",
            f"{automated_n:,} accounts",
            automated_delta,
            help="Broader band that may use lighter-touch outreach (not this HITL queue).",
        )
    with col3:
        st.metric(
            "Low Risk (No Action)",
            low_value,
            "Stable",
            delta_color="off",
            help="Below both cuts — no retention draft is created.",
        )

    st.markdown("---")
    st.subheader("Cohort Distribution Strategy")
    st.markdown(
        f"""
- **Tailored Cohort (Max 300):** Ranked by *Expected Value of Loss*
  (score × balance). Customers at/above the ops threshold (`p >= {t_tailored:.3f}`).
  Directed to the **Friction-Gate Queue** for human review.
- **Automated Cohort:** Broader net (`p >= {t_automated:.2f}`) excluding the Tailored
  cohort. Bypasses Friction-Gate for automated messaging.
- **What is `p`?** A model **risk rank score** (higher = riskier), not a
  calibrated probability of churn.
"""
    )

    if metrics and metrics.get("top_10_tailored"):
        st.subheader("Top 10 Tailored accounts by expected value of loss")
        st.dataframe(metrics["top_10_tailored"], hide_index=True)

    st.subheader("Cohort Churn Trends (Trailing 6 Months)")
    st.caption("Illustrative trend lines for the executive narrative (not live warehouse data).")
    st.line_chart({
        "High Risk Churn Rate": [0.85, 0.82, 0.88, 0.80, 0.75, 0.72],
        "Medium Risk Churn Rate": [0.45, 0.48, 0.42, 0.40, 0.38, 0.35],
    })

# --- Review queue ----------------------------------------------------------
if page == "Review queue":
    st.header("Review queue (human Friction-Gate)")
    st.caption(
        "Pending drafts wait here until a Retention agent Approves or Rejects. "
        "**Approve does not send email** — it only marks the draft ready for a "
        "person to send outside this app."
    )
    status_filter = st.selectbox(
        "Status filter",
        options=["pending_review", "approved", "rejected", "all"],
        index=0,
        help=(
            "pending_review = waiting on a human. "
            "approved / rejected = final (cannot be changed again)."
        ),
    )
    status_enum = None if status_filter == "all" else DraftStatus(status_filter)
    try:
        drafts = api.list_drafts(role, status=status_enum, limit=50)
    except (ApiError, ApiUnavailable) as err:
        st.error(str(err))
        drafts = []
    st.write(f"{len(drafts)} draft(s) · role=`{role.value}`")
    st.caption(
        "Anti rubber-stamp (JR-REQ-19): Approve needs an attention check. "
        "Scores are ranks — precision in the contact set is only ~23%, so "
        "“usually right” is not a safe habit."
    )

    can_edit_role = can(role, Permission.edit_draft)
    can_decide_role = can(role, Permission.approve_reject)
    if not can_edit_role and not can_decide_role:
        st.info(
            "Read-only for this role — you can inspect drafts, but Save / "
            "Approve / Reject stay disabled. Switch to **Retention agent** "
            "to act, or use Audit trail / Glass-box for oversight."
        )

    for d in drafts:
        # Terminal drafts are immutable (store + UI) — Approve/Reject once.
        is_pending = d.status == DraftStatus.pending_review
        can_edit = can_edit_role and is_pending
        can_decide = can_decide_role and is_pending
        high_stakes = is_high_stakes(d.churn_probability, d.threshold)
        seen_key = f"seen_{d.id}"
        if seen_key not in st.session_state:
            st.session_state[seen_key] = time.time()
        with st.expander(
            f"{d.status.value} · p={d.churn_probability:.3f} · "
            f"{d.id[:8]}… · {d.drafter_source}"
            + (" · HIGH" if high_stakes and is_pending else "")
        ):
            st.write(
                f"**Offered interest rate:** {d.draft.offered_interest_rate:.2%} "
                f"(hard cap **3.5%** — Pydantic rejects anything higher)  \n"
                f"**Why flagged (drivers):** {', '.join(d.draft.drivers) or '—'}  \n"
                f"**Ops gate:** risk score p={d.churn_probability:.4f} vs "
                f"cutoff t={d.threshold:.4f} "
                f"({'above cutoff' if d.churn_probability >= d.threshold else 'below'})"
            )
            if high_stakes and is_pending:
                st.warning(
                    "High-stakes score (well above ops cut) — read subject, "
                    "body, rate, and SHAP drivers before Approving."
                )
            if not is_pending:
                st.caption("Terminal status — immutable (Friction-Gate: decide once).")
            if can_edit:
                new_subject = st.text_input(
                    "Edit subject",
                    value=d.draft.subject,
                    key=f"sub_{d.id}",
                    help="Email subject line the retention agent would send.",
                )
                new_body = st.text_area(
                    "Edit body",
                    value=d.draft.body,
                    height=160,
                    key=f"bod_{d.id}",
                    help="Draft email body. Edit before Approving if needed.",
                )
                new_rate = st.number_input(
                    "Edit offered rate",
                    min_value=0.0,
                    max_value=0.035,
                    value=float(d.draft.offered_interest_rate),
                    step=0.001,
                    format="%.3f",
                    key=f"rate_{d.id}",
                    help="Interest rate offered in the draft. Hard-capped at 3.5%.",
                )
            else:
                st.write(f"**Subject:** {d.draft.subject}")
                st.text_area(
                    "Body (read-only)",
                    value=d.draft.body,
                    height=160,
                    key=f"body_view_{d.id}",
                    disabled=True,
                    help="Read-only for this role or because the draft is already decided.",
                )
                new_subject = d.draft.subject
                new_body = d.draft.body
                new_rate = float(d.draft.offered_interest_rate)

            attention_ack = False
            if can_decide:
                attention_ack = st.checkbox(
                    "I reviewed the draft text, offered rate (≤3.5%), and "
                    "listed drivers — Approve is not a rubber stamp.",
                    key=f"ack_{d.id}",
                    help=(
                        "Required before Approve. Proves a human checked the "
                        "copy, rate cap, and risk drivers (anti rubber-stamp)."
                    ),
                )

            # Tooltip text depends on role + state so stakeholders see *why*
            # a button is greyed out.
            if not can_edit_role:
                save_help = (
                    "Disabled: this role cannot edit drafts. "
                    "Switch to Retention agent to Save edits."
                )
            elif not is_pending:
                save_help = "Disabled: this draft is already final (Approve/Reject once)."
            else:
                save_help = (
                    "Save subject/body/rate changes. Re-validates the 3.5% "
                    "rate cap and writes an audit event."
                )

            if not can_decide_role:
                approve_help = (
                    "Disabled: this role cannot Approve. "
                    "Switch to Retention agent. Approve ≠ send email."
                )
                reject_help = (
                    "Disabled: this role cannot Reject. "
                    "Switch to Retention agent."
                )
            elif not is_pending:
                approve_help = "Disabled: draft already decided (immutable)."
                reject_help = "Disabled: draft already decided (immutable)."
            else:
                approve_help = (
                    "Marks the draft Approved for a human to send *outside* "
                    "this app. Does not email the customer. Tick the attention "
                    "checkbox first."
                )
                reject_help = (
                    "Rejects this draft permanently. No email is sent. "
                    "Decision is logged on the audit trail."
                )

            c1, c2, c3 = st.columns(3)
            # Always render buttons when the role *might* act — avoid
            # short-circuit skipping widgets across role switches.
            save_clicked = c1.button(
                "Save edits",
                key=f"save_{d.id}",
                disabled=not can_edit,
                help=save_help,
            )
            approve_clicked = c2.button(
                "Approve",
                key=f"apr_{d.id}",
                disabled=not can_decide or not attention_ack,
                help=approve_help,
            )
            reject_clicked = c3.button(
                "Reject",
                key=f"rej_{d.id}",
                disabled=not can_decide,
                help=reject_help,
            )

            if save_clicked and can_edit:
                try:
                    api.patch_draft(
                        role,
                        d.id,
                        DraftPatchRequest(
                            subject=new_subject,
                            body=new_body,
                            offered_interest_rate=new_rate,
                        ),
                    )
                    st.success("Saved (Pydantic re-validated + audited).")
                    st.rerun()
                except (ApiError, ApiUnavailable) as err:
                    st.error(str(err))
            if approve_clicked and can_decide:
                if not attention_ack:
                    st.error("Tick the attention check before Approving.")
                else:
                    seconds_open = time.time() - float(
                        st.session_state.get(seen_key, time.time())
                    )
                    if seconds_open < FAST_DECIDE_SECONDS:
                        st.warning(
                            f"Very fast decide (~{seconds_open:.0f}s). "
                            "Logged for Compliance sampling — please still "
                            "be sure you read the draft."
                        )
                    try:
                        api.patch_draft(
                            role,
                            d.id,
                            DraftPatchRequest(
                                status=DraftStatus.approved,
                                attention_ack=True,
                                seconds_open=seconds_open,
                            ),
                        )
                    except (ApiError, ApiUnavailable) as err:
                        st.error(str(err))
                    else:
                        st.success(
                            "Approved — ready for human outbound outside this system."
                        )
                        st.rerun()
            if reject_clicked and can_decide:
                try:
                    api.patch_draft(
                        role, d.id, DraftPatchRequest(status=DraftStatus.rejected)
                    )
                except (ApiError, ApiUnavailable) as err:
                    st.error(str(err))
                else:
                    st.warning("Rejected.")
                    st.rerun()

# --- Score / create --------------------------------------------------------
if page == "Score / create draft":
    st.header("Score a customer & create a draft")
    st.write(
        "Paste a raw feature JSON object (Sprint 1 training columns). "
        "Drafts are created only when the **server** score is at/above the "
        "ops threshold (capacity gate)."
    )
    # Do NOT st.stop() here — that would kill Glass-box / Audit tabs below.
    if model is None:
        st.warning("Model not loaded — scoring disabled until Models/ops is available.")
    else:
        can_score = can(role, Permission.score)
        can_create = can(role, Permission.create_draft)

        preset = st.radio(
            "Demo preset (Sprint 4 fixtures)",
            options=[
                "Below threshold (capacity gate)",
                "Flagged (create draft)",
                "Custom JSON",
            ],
            index=0,
            help=(
                "Use **Below threshold** first to show 'no draft created', "
                "then **Flagged** to show a Friction-Gate draft."
            ),
        )
        if preset.startswith("Below"):
            loaded = _get_selected_fixture("below_threshold_demo.json")
            example = loaded.features.model_dump()
            st.info(
                f"{loaded.meta.get('description', '')} "
                f"(expect p≈{loaded.meta.get('expected_probability_approx')}, not flagged)."
            )
        elif preset.startswith("Flagged"):
            loaded = _get_selected_fixture("flagged_demo.json")
            example = loaded.features.model_dump()
            st.warning(
                f"{loaded.meta.get('description', '')} "
                f"(expect p≈{loaded.meta.get('expected_probability_approx')}, flagged)."
            )
        else:
            example = {
                "state": "California",
                "age_years": 42,
                "start_balance": 1000.0,
                "Months_Since_Creation": 24,
                "Running_Balance": 50.0,
                "Running_Balance_Rounded": 0.0,
                "Monthly_Transaction_Count": 1,
                "Monthly_Active_Txn_Count": 0,
                "Monthly_Amount_Sum": 0.0,
                "Monthly_Deposit_Sum": 0.0,
                "Monthly_Withdrawal_Sum": 0.0,
                "Deposit_Share_Of_Flow": 0.0,
                "Is_Inactive_Month": 1,
                "gone_this_month": 1,
                "Balance_MoM_Change": -500.0,
                "Active_Txn_Lag1": 0.0,
                "Active_Txn_Lag2": 0.0,
                "Active_Txn_Lag3": None,
                "Amount_Lag1": 0.0,
                "Active_Txn_Roll3_Mean": 0.0,
                "Amount_Roll3_Mean": 0.0,
                "Balance_Roll3_Mean": 200.0,
                "Consecutive_Inactive_Months": 2,
                "Inactive_Share_Prior3": 1.0,
            }

        raw = st.text_area(
            "features JSON",
            value=json.dumps(example, indent=2),
            height=280,
            key=f"features_json_{preset}",
            help=(
                "Customer feature vector used by the XGBoost model. "
                "Demo presets fill this for you — no PII / email addresses."
            ),
        )
        review_key = st.text_input(
            "review_key (opaque id — no email/PII)",
            value="demo-agent",
            help=(
                "Opaque operator id for the audit trail (1–64 chars: "
                "letters, digits, _ . : -). Never put a real email here."
            ),
        )
        score_help = (
            "Run the ops model on this feature JSON and show the risk score "
            "plus whether it clears the ops cutoff."
            if can_score
            else "Disabled: this role cannot score customers."
        )
        draft_help = (
            "If the score is flagged (at/above cutoff), create a pending "
            "email draft for the Review queue. Still does not send email."
            if can_create
            else "Disabled: this role cannot create drafts."
        )
        c_score, c_draft = st.columns(2)
        do_score = c_score.button("Score", disabled=not can_score, help=score_help)
        do_draft = c_draft.button(
            "Create draft if flagged",
            disabled=not can_create,
            help=draft_help,
        )

        if do_score or do_draft:
            try:
                feats = json.loads(raw)
                if can_score:
                    scored = api.score(role, feats)
                    prob, flagged = scored.churn_probability, scored.flagged
                    st.metric(
                        "churn_probability (risk rank score)",
                        f"{prob:.4f}",
                        help=(
                            "Higher = riskier in the ranked queue. "
                            "Not a calibrated actuarial probability."
                        ),
                    )
                    st.write(
                        f"Flagged for human review @ cutoff t={model.threshold:.4f}: "
                        f"**{flagged}**"
                    )
                if can(role, Permission.view_glass_box):
                    st.write(
                        "Top risk drivers (frozen SHAP): "
                        + (", ".join(model.top_shap_drivers) or "—")
                    )
                if do_draft and can_create:
                    # Server re-scores and gates: unflagged rows get a 422, no LLM call.
                    rec = api.create_draft(role, feats, review_key or None)
                    st.success(
                        f"Draft {rec.id} created via {rec.drafter_source} — "
                        "open **Review queue** to Approve/Reject."
                    )
            except ApiError as err:
                if err.status_code == 422 and "Not in contact queue" in str(err.detail):
                    st.error("Not flagged — no draft created (ops gate, enforced by the API).")
                else:
                    st.error(str(err))
            except (ApiUnavailable, ValueError) as err:
                st.error(str(err))

# --- Glass-box -------------------------------------------------------------
if page == "Glass-box":
    st.subheader("Why this contact queue exists")
    if model is None:
        st.warning("Model not loaded.")
    else:
        top = model.top_shap
        st.markdown(
            f"""
| Field | Value |
|-------|-------|
| MLflow run | `{model.run_id}` |
| Ops threshold | **{model.threshold:.6f}** |
| Threshold rule | `{model.threshold_rule}` |
| Contact policy | Top ~5% capacity dial (not max-F1) |
| Approved ≠ Sent | No `/send` route (ADR 003) |
| Demo RBAC | Enforced by FastAPI ``X-Demo-Role`` (ADR 007); this UI only hides buttons |
"""
        )
        st.write("**Frozen top SHAP drivers** (serving_meta — not live TreeExplainer):")
        if top:
            st.dataframe(
                [
                    {"driver": k, "mean_abs_shap": v}
                    for k, v in list(top.items())[:15]
                ],
                width="stretch",
            )
        else:
            st.write(", ".join(model.top_shap_drivers) or "—")

        st.write("**Fairness disclosure (Equalized Odds at the ops threshold, ADR 012):**")
        try:
            fair = api.fairness(role)
            st.dataframe(
                [
                    {"group": "age", "equalized_odds_diff": fair.equalized_odds_difference_age,
                     "selection_rate_diff": fair.selection_rate_diff_age, "groups_kept": "6/6"},
                    {"group": "state", "equalized_odds_diff": fair.equalized_odds_difference_state,
                     "selection_rate_diff": None,
                     "groups_kept": f"{fair.state_groups_kept}/{fair.state_groups_total}"},
                ],
                width="stretch",
            )
            st.caption(
                f"n={fair.n_sample:,}, min_group_n={fair.min_group_n}, t={fair.threshold:.4f}. "
                f"Single source: `{fair.source}` via `GET /model/fairness` — "
                "never hand-copied (ADR 015 fairness consolidation)."
            )
        except (ApiError, ApiUnavailable) as exc:
            st.warning(f"Fairness report unavailable: {exc}")

        st.caption(
            "Glass-box = explainability for humans. RBAC = who may mutate drafts. "
            "Neither grants autonomous outreach."
        )
        with st.expander("How this dashboard was built (Risk / Jamie)", expanded=False):
            st.markdown(
                """
**Design sequence we followed (Friction as a Feature):**

1. **Pin ops model** — portable `Models/ops/` with frozen run + threshold (not a floating MLflow path).
2. **Capacity dial** — contact only top ~5% of scores; below-threshold → no draft.
3. **Drafter only** — GenAI writes `pending_review` drafts; there is **no `/send`** (ADR 003).
4. **Approve ≠ Sent** — Approve means ready for a human outbound **outside** this app; decide once.
5. **Bounds** — ZDR scrub before any LLM; offered rate hard-capped at **3.5%** (Pydantic).
6. **Glass-Box RBAC** — Retention can mutate; Compliance can audit only (ADR 007 — demo, not Entra).
7. **Audit trail** — create / edit / approve / reject / **denied** with opaque `review_key`.
8. **Fairness at this cut** — Equalized Odds on age/state measured at the same ops threshold (min group n≥500); residual gaps disclosed on the model card.
9. **Anti rubber-stamp** — Approve needs attention acknowledgement; high-stakes scores get a stronger cue; fast decides are logged (JR-REQ-19).

Full stakeholder tour:
`Docs/StakeholderManagement/Meetings/04_jamie_dashboard_feature_tour.md`  
Policy: `Docs/Sprint5/review_fatigue_mitigation.md`
"""
            )

# --- Audit trail -----------------------------------------------------------
if page == "Audit trail":
    st.subheader("Friction-Gate audit events")
    st.caption(
        "Immutable log of who did what. Compliance uses this to sample decisions."
    )
    try:
        events = api.audit_events(role, limit=100)
    except (ApiError, ApiUnavailable) as err:
        st.error(str(err))
        events = []
    if not events:
        st.info("No audit events yet — create/approve/reject a draft as an agent.")
    else:
        st.dataframe(events, width="stretch")
    st.caption(
        "Compliance-visible trail: who (role / review_key) did what to which draft. "
        "Still no outbound send logged — send is outside this system."
    )

# --- Sam's ML View ---------------------------------------------------------
if page == "ML View (Sam)":
    st.header("Interactive What-If ML View")
    st.caption(
        "Adjust key features for the selected customer to see how the ops "
        "threshold responds in real-time. **Changed** controls are highlighted "
        "so stakeholders can see exactly what you moved."
    )

    if model is None:
        st.warning("Model not loaded.")
    else:
        preset_ml = st.radio(
            "Baseline Customer Data",
            options=["Below threshold (capacity gate)", "Flagged (create draft)"],
            index=0,
            key="ml_preset_radio",
            help="Loads a Sprint 4 demo fixture as the starting point for what-if edits.",
        )

        if preset_ml.startswith("Below"):
            loaded = _get_selected_fixture("below_threshold_demo.json")
        else:
            loaded = _get_selected_fixture("flagged_demo.json")

        base_features = loaded.features
        # Baseline values for change detection (compare after widgets render).
        # Running_Balance_Rounded is the #1 frozen SHAP driver; start_balance is not
        # a driver at all, so the balance slider moves the running balance.
        base_run = float(getattr(base_features, "Running_Balance", 0.0) or 0.0)
        base_txn = int(getattr(base_features, "Monthly_Transaction_Count", 5))
        base_age = int(getattr(base_features, "age_years", 45))
        base_lag1 = float(getattr(base_features, "Active_Txn_Lag1", 5.0))
        # Key suffix resets sliders when the fixture preset changes.
        preset_key = "below" if preset_ml.startswith("Below") else "flagged"

        col_sliders, col_results = st.columns([1, 1])

        with col_sliders:
            st.subheader("Feature Adjustments")
            st.caption("Green badge = moved from baseline. Grey = still at fixture value.")

            running_balance = st.slider(
                "Running_Balance",
                min_value=0.0,
                max_value=20000.0,
                value=base_run,
                step=100.0,
                key=f"ml_run_{preset_key}",
                help=(
                    "Current month-end balance (top SHAP driver). Also sets "
                    "Running_Balance_Rounded, as feature engineering does."
                ),
            )
            if abs(running_balance - base_run) > 1e-9:
                st.markdown(
                    f":green-badge[CHANGED] `Running_Balance` "
                    f"**{base_run:,.0f} → {running_balance:,.0f}**"
                )
            else:
                st.caption(f"Unchanged · baseline `{base_run:,.0f}`")

            monthly_txn = st.slider(
                "Monthly_Transaction_Count",
                min_value=0,
                max_value=50,
                value=base_txn,
                step=1,
                key=f"ml_txn_{preset_key}",
                help="Number of transactions in the observation month.",
            )
            if monthly_txn != base_txn:
                st.markdown(
                    f":green-badge[CHANGED] `Monthly_Transaction_Count` "
                    f"**{base_txn} → {monthly_txn}**"
                )
            else:
                st.caption(f"Unchanged · baseline `{base_txn}`")

            age_years = st.slider(
                "age_years",
                min_value=18,
                max_value=100,
                value=base_age,
                step=1,
                key=f"ml_age_{preset_key}",
                help="Customer age in years (demographic control — usually weak vs balances).",
            )
            if age_years != base_age:
                st.markdown(
                    f":green-badge[CHANGED] `age_years` "
                    f"**{base_age} → {age_years}**"
                )
            else:
                st.caption(f"Unchanged · baseline `{base_age}`")

            active_lag1 = st.slider(
                "Active_Txn_Lag1",
                min_value=0.0,
                max_value=100.0,
                value=base_lag1,
                step=1.0,
                key=f"ml_lag1_{preset_key}",
                help="Active transaction count in the prior month (lag-1).",
            )
            if abs(active_lag1 - base_lag1) > 1e-9:
                st.markdown(
                    f":green-badge[CHANGED] `Active_Txn_Lag1` "
                    f"**{base_lag1:,.0f} → {active_lag1:,.0f}**"
                )
            else:
                st.caption(f"Unchanged · baseline `{base_lag1:,.0f}`")

        with col_results:
            st.subheader("Real-time Prediction")

            # Clone base features and apply adjustments via Pydantic update
            adj_features = base_features.model_copy(
                update={
                    "Running_Balance": running_balance,
                    "Running_Balance_Rounded": float(round(running_balance)),
                    "Monthly_Transaction_Count": monthly_txn,
                    "age_years": age_years,
                    "Active_Txn_Lag1": active_lag1,
                }
            )

            changed_rows = []
            for name, before, after in (
                ("Running_Balance", base_run, running_balance),
                ("Monthly_Transaction_Count", float(base_txn), float(monthly_txn)),
                ("age_years", float(base_age), float(age_years)),
                ("Active_Txn_Lag1", base_lag1, active_lag1),
            ):
                if abs(float(after) - float(before)) > 1e-9:
                    changed_rows.append(
                        {
                            "feature": name,
                            "baseline": before,
                            "adjusted": after,
                            "delta": float(after) - float(before),
                        }
                    )

            if changed_rows:
                st.markdown("**Features you changed**")
                st.dataframe(changed_rows, width="stretch", hide_index=True)
            else:
                st.info("No adjustments yet — move a slider to highlight what changed.")

            try:
                # Backend score expects a raw dict
                if not can(role, Permission.score):
                    raise PermissionError("This role cannot score customers.")
                scored = api.score(role, adj_features.model_dump())
                prob, flagged = scored.churn_probability, scored.flagged
                # Score the untouched fixture so an unchanged slider shows a zero delta
                # (the fixture's expected_probability_approx is rounded).
                baseline_p = (
                    api.score(role, base_features.model_dump()).churn_probability
                    if changed_rows
                    else prob
                )
                st.metric(
                    "Adjusted Churn Probability",
                    f"{prob:.4f}",
                    delta=f"{prob - baseline_p:.4f} vs baseline",
                    help=(
                        "Risk rank score after your slider edits. "
                        "Delta is vs the unmodified fixture's score, not a calibrated probability."
                    ),
                )

                if flagged:
                    st.error(
                        f"FLAGGED for Friction-Gate "
                        f"(exceeds Ops Threshold {model.threshold:.4f})"
                    )
                else:
                    st.success(
                        f"Safe (below Ops Threshold {model.threshold:.4f})"
                    )

                with st.expander("View Full Adjusted JSON", expanded=False):
                    if changed_rows:
                        changed_names = {r["feature"] for r in changed_rows}
                        st.caption(
                            "Keys you changed: "
                            + ", ".join(f"`{n}`" for n in sorted(changed_names))
                        )
                    st.json(adj_features.model_dump())
            except (ApiError, ApiUnavailable, PermissionError) as e:
                st.error(f"Error scoring features: {e}")

            if can(role, Permission.explain_predictions):
                st.markdown("**Why this score (per-customer SHAP)**")
                try:
                    _render_shap(
                        api.explain(role, adj_features.model_dump(), top_n=8),
                        key=f"whatif_{preset_key}",
                    )
                except (ApiError, ApiUnavailable) as e:
                    st.error(f"Explanation unavailable: {e}")

        st.markdown("---")
        st.subheader("Global Model Performance")
        reports_dir = REPO_ROOT / "Docs" / "Sprint2" / "reports"
        col_pr, col_roc = st.columns(2)
        for col, filename, caption in (
            (
                col_pr,
                "yellowbrick_precision_recall.png",
                "Precision-recall (primary metric: churners are rare). XGBoost PR-AUC 0.219 vs heuristic 0.151.",
            ),
            (
                col_roc,
                "yellowbrick_rocauc.png",
                "ROC curve (secondary metric). XGBoost ROC-AUC 0.723 vs heuristic 0.551.",
            ),
        ):
            path = reports_dir / filename
            if path.exists():
                col.image(str(path), caption=caption)
            else:
                col.info(f"{filename} not found in Docs/Sprint2/reports.")

# --- Sam's prediction browser ---------------------------------------------
if page == "Prediction browser (Sam)":
    st.header("Prediction browser")
    st.caption(
        "Every customer in the cohort, scored by the served ops model and ranked "
        "highest risk first. Pick a row to see **why** that customer scored as they "
        "did (per-customer SHAP). Scores come from `GET /predictions`; the API "
        "re-scores raw features, so the list always matches the pinned run."
    )

    f1, f2, f3, f4 = st.columns([1, 1, 1, 1])
    flagged_only = f1.toggle("Flagged only", value=False, key="pb_flagged")
    min_p = f2.slider("Min probability", 0.0, 1.0, 0.0, 0.05, key="pb_min_p")
    search = f3.text_input("Customer id contains", key="pb_search").strip() or None
    page_size = f4.selectbox("Rows", [25, 50, 100, 250], index=1, key="pb_rows")

    try:
        pred_page = api.predictions(
            role,
            flagged_only=flagged_only,
            min_probability=min_p,
            customer_id=search,
            limit=page_size,
        )
    except (ApiError, ApiUnavailable) as err:
        st.error(str(err))
        pred_page = None

    if pred_page is not None:
        if pred_page.cohort_is_fixture:
            st.warning(
                "**Demo fixtures only.** `Data/processed/prediction_cohort.csv` is not "
                "present, so only the two Sprint 4 fixtures are listed. On a machine "
                "with `training_data.csv`, run "
                "`uv run python Code/Sprint5/build_prediction_cohort.py` and reload."
            )
        else:
            st.caption(f"Source: {pred_page.source} · month {pred_page.month or 'n/a'}")

        m1, m2, m3, m4 = st.columns(4)
        m1.metric("Customers scored", f"{pred_page.total:,}")
        m2.metric(
            "Flagged (≥ t)",
            f"{pred_page.flagged_total:,}",
            help="At or above the ops threshold: the Friction-Gate contact queue.",
        )
        m3.metric("Matching filters", f"{pred_page.matched:,}")
        m4.metric("Ops threshold t", f"{pred_page.threshold:.4f}")

        table = [
            {
                "rank": r.rank,
                "customer_id": r.customer_id,
                "month": r.month or "—",
                "churn_probability": r.churn_probability,
                "flagged": r.flagged,
                "actual_churned": r.actual_churned,
                "Running_Balance": r.features.get("Running_Balance"),
                "Balance_MoM_Change": r.features.get("Balance_MoM_Change"),
                "Consecutive_Inactive_Months": r.features.get("Consecutive_Inactive_Months"),
                "Monthly_Active_Txn_Count": r.features.get("Monthly_Active_Txn_Count"),
            }
            for r in pred_page.rows
        ]
        if not table:
            st.info("No customers match these filters.")
        else:
            if pred_page.matched > len(table):
                st.caption(
                    f"Showing the top {len(table):,} of {pred_page.matched:,} matches "
                    "(highest probability first)."
                )
            selection = st.dataframe(
                table,
                width="stretch",
                hide_index=True,
                on_select="rerun",
                selection_mode="single-row",
                key="pb_table",
                column_config={
                    "churn_probability": st.column_config.ProgressColumn(
                        "churn probability", min_value=0.0, max_value=1.0, format="%.4f"
                    ),
                    "actual_churned": st.column_config.NumberColumn(
                        "actual churned",
                        help="Observed label for that month (1 = churned). Not used to score.",
                    ),
                },
            )
            picked = selection.selection.rows if selection else []
            chosen = pred_page.rows[picked[0]] if picked else pred_page.rows[0]
            if not picked:
                st.caption("No row selected: explaining the highest-ranked customer.")

            st.subheader(f"Why customer `{chosen.customer_id}` scored {chosen.churn_probability:.4f}")
            if chosen.flagged:
                st.error(f"Flagged: rank {chosen.rank:,}, at or above t={pred_page.threshold:.4f}")
            else:
                st.success(f"Not flagged: rank {chosen.rank:,}, below t={pred_page.threshold:.4f}")
            try:
                _render_shap(
                    api.explain_customer(role, chosen.customer_id, top_n=10),
                    key=f"pb_{chosen.customer_id}",
                )
            except (ApiError, ApiUnavailable) as err:
                st.error(f"Explanation unavailable: {err}")
            st.caption(
                "SHAP explains the model's ranking, not causation. A feature that "
                "raises risk here is what the model keyed on for this customer, "
                "not necessarily why they would leave."
            )

# --- Methodology Q&A Bot ---------------------------------------------------
if page == "Methodology Q&A Bot":
    st.header("Methodology RAG Bot")
    st.caption(
        "Chat with an AI grounded in `Final_Report_Official.md`. Hybrid retrieval "
        "(Azure dense embeddings + BM25, fused with Reciprocal Rank Fusion) plus "
        "an LLM rerank pass over the candidate pool (ADR 010 + ADR 015). "
        "Goes through `POST /rag/ask` — this UI no longer builds the index or "
        "calls the model directly (F8: FastAPI is the single enforcement point)."
    )

    if "messages" not in st.session_state:
        st.session_state.messages = []

    for message in st.session_state.messages:
        with st.chat_message(message["role"]):
            st.markdown(message["content"])

    if query := st.chat_input("Ask a question about the churn model methodology..."):
        with st.chat_message("user"):
            st.markdown(query)
        st.session_state.messages.append({"role": "user", "content": query})

        with st.spinner("Retrieving context (hybrid + rerank) & drafting response..."):
            try:
                result = api.ask_rag(role, query, top_k=3)
            except (ApiError, ApiUnavailable) as exc:
                with st.chat_message("assistant"):
                    st.error(f"RAG assistant unavailable: {exc}")
                st.session_state.messages.append(
                    {"role": "assistant", "content": f"RAG assistant unavailable: {exc}"}
                )
            else:
                with st.chat_message("assistant"):
                    st.markdown(result.answer)
                    st.caption(
                        f"retrieval_mode={result.retrieval_mode} · "
                        f"hybrid={'yes' if result.hybrid else 'no'} · "
                        f"reranked={'yes' if result.reranked else 'no'}"
                    )
                    with st.expander("View Retrieved Context Chunks"):
                        for i, chunk in enumerate(result.sources):
                            st.write(f"**Chunk {i + 1}:**\n\n{chunk}")
                            st.markdown("---")
                st.session_state.messages.append(
                    {"role": "assistant", "content": result.answer}
                )
