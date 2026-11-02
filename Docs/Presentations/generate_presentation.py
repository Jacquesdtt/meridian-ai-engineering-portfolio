"""
Meridian Savings — Kubrick-themed PPTX generator (python-pptx).

Builds two handover decks from the assertion-evidence slide outline:
  • Meridian_Presentation_PresenterView.pptx — speaker notes on every slide
  • Meridian_Presentation_Standalone.pptx — same slides, notes stripped

Run from repo root:
  py -3.13 Docs\\Presentations\\generate_presentation.py
"""

import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor

# ---------------------------------------------------------------------------
# Kubrick theme
# ---------------------------------------------------------------------------
DARK_SLATE = RGBColor(33, 47, 50)   # #212F32
NEON_GREEN = RGBColor(0, 255, 102)  # #00FF66
WHITE = RGBColor(255, 255, 255)
# Near-white body text — high contrast on dark slate (avoid washed-out 220 gray)
BODY_TEXT = RGBColor(245, 247, 247)
LIGHT_GRAY = BODY_TEXT  # alias kept for any residual references

SLIDE_WIDTH = Inches(13.333)
SLIDE_HEIGHT = Inches(7.5)
MARGIN_LEFT = Inches(1.0)
CONTENT_WIDTH = Inches(11.333)
ASSETS_DIR = os.path.join(os.path.dirname(__file__), "assets")
OUTPUT_DIR = os.path.dirname(__file__)

# ---------------------------------------------------------------------------
# Slide outline — synced to Docs/Presentations/presentation.md (Jul 2026)
# Extra UI / solo-builder / ranking-vs-calibration slides kept where they
# strengthen the narrative (see slide comments in list order).
# ---------------------------------------------------------------------------
slides_data = [
    # 0 — Title
    {
        "title": "Meridian Savings — Churn Ranking & Friction-Gate Handover",
        "body": [
            "Audience: Sam (Data Science) · Morgan (Ops) · Jamie (Risk) · Assessors",
            "Ops cut t≈0.701 · Model card 1.1.0-sprint3-serving",
            "Solo build · AI engineering focus",
        ],
        "notes": (
            "Welcome everyone. Today we hand over the Meridian Churn ranking model and "
            "GenAI Friction-Gate. Our dual mandate: capture the ~$7.3M of historical AUM "
            "at risk while satisfying strict compliance constraints. I built this solo — "
            "Part 2 covers how AI engineering and orchestration made that breadth possible. "
            "Ops contact policy ships at t≈0.701 (top ~5%). Model card version "
            "1.1.0-sprint3-serving is the governed serving artifact."
        ),
    },
    # 1 — Part 1 section
    {
        "title": "Part 1: The Product & The ML Solution",
        "body": [],
        "notes": "Let's dive into the core product we built and the ML engine powering it.",
    },
    # 2 — Business problem (NEW)
    {
        "title": "Meridian is bleeding ~$7.3M in historical AUM, and we must rank churners within finite retention capacity and strict RAI constraints.",
        "body": [
            "Problem: silent churn erodes AUM — Sprint 1 validated ~$7.3M at risk",
            "Constraints: finite agent capacity; Responsible AI, explainability, risk mitigation",
            "Tier 1 — Predictive Engine: XGBoost (deterministic, verifiable, explainable)",
            "Tier 2 — GenAI Extension: Azure OpenAI + Pydantic + Zero Data Retention",
        ],
        "notes": (
            "Morgan — the business case is ~$7.3M historical AUM at risk from silent churn. "
            "Retention capacity is finite and we operate under heavy regulation. We rejected "
            "zero-shot foundation models for core prediction to guarantee deterministic, "
            "mathematically verifiable rankings regulators can audit. Tier 2 GenAI drafts "
            "retention outreach under Pydantic bounds and ZDR — never autonomous send."
        ),
    },
    # 3 — Churn definition
    {
        "title": "We eliminated threshold-calibration leakage by training on the past and predicting the future.",
        "body": [
            "Churn: Running_Balance_Rounded == 0 AND no active transactions that month",
            "Excluded high-balance dormant accounts (e.g. $10k inactive — still hold AUM)",
            "Temporal split (no shuffle): Train ≤ 2016-08 · Val · Test 2017-09 → 2020-04",
            "Observation window = features through month t; label = month t+1 (ADR 004)",
        ],
        "notes": (
            "Sam — we did not have a simple account-closed flag. We excluded high-balance "
            "dormant accounts because they still hold AUM. Churn is zero balance plus no "
            "activity. Training grain is customer × month. Features are left-looking through "
            "month t; the label is month t+1. We trained on the past, validated in the "
            "middle, and tested on the future to avoid threshold-calibration leakage."
        ),
    },
    # 4 — EDA / preprocessing (NEW)
    {
        "title": "We let tree models partition messy balances natively instead of destroying signal with heavy imputation.",
        "body": [
            "Nulls: imputed missing opening balances with $0",
            "Kept extreme balance outliers (±1e10) and NaNs in early-tenure lag features",
            "Filtered $0 system-generated placeholder transactions (false-active signals)",
            "Cohort: two-month inactivity streaks correlate with churn; geo/age slices flagged for fairness",
        ],
        "notes": (
            "Sam — preprocessing was deliberate. We imputed $0 opening balances but kept "
            "extreme outliers and NaNs so XGBoost could partition them natively. We filtered "
            "$0 system placeholders that would look like activity. EDA confirmed two-month "
            "inactivity streaks drive risk. Geography and age bands became high-variance slices "
            "for later Fairlearn scrutiny."
        ),
    },
    # 5 — Why XGBoost
    {
        "title": "We chose XGBoost because it natively handles our extreme balance outliers, missing lagged features, and Glass-Box explainability mandates.",
        "body": [
            "1. Requirement constraints: ML Fundamentals forbade zero-shot GenAI for core prediction",
            "2. Tree ensembles fit tabular churn — shipped model is XGBoost (LightGBM considered in-family)",
            "3. Native NaNs + outlier robustness (±1e10) without destructive scaling",
            "4. SHAP for Jamie's Glass-Box / RAI mandate (dtreeviz attempted, skipped: Lag3 NaNs)",
        ],
        "notes": (
            "Sam and Jamie — four reasons for XGBoost over deep learning or linear models: "
            "bootcamp requirement for traditional ML; tree ensembles are the right family for "
            "tabular churn data (LightGBM was in the consideration set; the shipped ops model is "
            "XGBoost); native NaN and outlier handling; and SHAP/dtreeviz for explainability. "
            "We explicitly rejected zero-shot foundation models for the prediction engine."
        ),
    },
    # 5b — MLflow + portable ops artifact (crash-course Module 1)
    {
        "title": "MLflow tracks every training run, and the portable Ops artifact freezes the business-optimized cut at t≈0.701.",
        "body": [
            "MLflow logs hyperparameters, temporal CV folds, and ranking metrics (PR-AUC / ROC-AUC)",
            "Ops artifact in Models/ops/ freezes the contact policy — not a re-tune on demo day",
            "Business cut t≈0.701 is a RAISE from max-F1 t=0.475 → 12× fewer false positives",
            "Serving loads that frozen threshold so FastAPI / Streamlit stay aligned",
        ],
        "notes": (
            "Sam — MLOps is not optional polish. MLflow is the experiment ledger. The portable "
            "Ops artifact ships the capacity-constrained threshold: we RAISED the cut from "
            "max-F1 0.475 to ≈0.701 to shrink the queue, not lower it to flood agents with "
            "more false positives. Cost of a miss still matters — that is why ranking quality "
            "stays the DoD — but the operating point is deliberate capacity discipline."
        ),
    },
    # 6 — Ranking DoD
    {
        "title": "Our model beats the historical heuristic on PR-AUC and ROC-AUC — not on misleading accuracy.",
        "body": [
            "Always-negative: PR-AUC 0.132 (accuracy ≈ 0.869 — useless)",
            "gone_this_month heuristic: PR-AUC 0.151 · ROC-AUC 0.551",
            "XGBoost: PR-AUC 0.219 · ROC-AUC 0.723",
            "Ranking DoD = PR-AUC / ROC-AUC — threshold accuracy is not the bar",
        ],
        "notes": (
            "Sam — do not lead with accuracy. Always-negative is ~86.9% accurate and useless. "
            "We cleared the real ranking bar: PR-AUC 0.219 vs heuristic 0.151, ROC-AUC 0.723 "
            "vs 0.551. Threshold-dependent accuracy is not the Definition of Done."
        ),
        "image": "yellowbrick_rocauc.png",
        "image_layout": "wide",
    },
    # 7 — Ranking vs calibrated probs (KEEP)
    {
        "title": "We prioritize ranked operational queues over calibrated actuarial probabilities.",
        "body": [
            "Scores represent ranking percentile, not true probability",
            "Platt scaling explicitly skipped — scale_pos_weight skews calibration",
            "Monotonic ranking preserves the Friction-Gate contact queue",
            "Decision policy (top 5%) is separate from ranking quality",
        ],
        "notes": (
            "The PR curve shows we identify risk, but probabilities are uncalibrated due to "
            "class imbalance handling. We deliberately skipped Platt scaling because Morgan's "
            "team needs a ranked operational queue, not actuarial probabilities. Monotonic "
            "ranking is what matters for the Friction-Gate — this connects to Red Team finding "
            "on probability skew in Part 2."
        ),
        "image": "yellowbrick_precision_recall.png",
        "image_layout": "wide",
    },
    # 8 — Ops capacity
    {
        "title": "We restrict the retention queue to the top 5% of risk scores to keep false positives manageable.",
        "body": [
            "Max-F1 (t=0.475): precision 0.211 · 248,778 FP (~62% of test rows flagged)",
            "Ops RAISE to top-5% (t≈0.701): precision 0.229 · 20,127 FP (12× reduction)",
            "PR-AUC 0.219 / ROC-AUC 0.723 unchanged — decision policy, not ranking",
            "North Star ~$7.3M AUM: business-optimized capacity over max-F1 flood",
        ],
        "notes": (
            "Morgan — max-F1 at t=0.475 would flood Friction-Gate with ~248k false positives. "
            "We RAISED the threshold to capacity-constrained top-5% at t≈0.701: precision 0.229, "
            "only 20,127 FP — a 12× reduction. This is not lowering the bar to capture more "
            "false positives. Ranking metrics are identical; we changed decision policy for the "
            "~$7.3M North Star queue. Business View shows the high-risk cohort feeding the gate."
        ),
        "image": "friction_gate_business_view.png",
        "image_layout": "wide",
    },
    # 9 — 40% precision infeasible
    {
        "title": "We can rank better than the heuristic, but we cannot promise a 40% hit rate from raw scores.",
        "body": [
            "Top 50% ≈ 0.21 · Top 10% ≈ 0.23 · Top 5% ≈ 0.23 · Top 1% ≈ 0.24 val precision",
            "40% never appears — scores are ranks, not calibrated probabilities",
            "Modest PR-AUC (0.219) limits precision at the top of the queue",
            "Base rate ~12% — 40% would require 3× richer than chance; needs new signal, not threshold hunt",
        ],
        "notes": (
            "Jury one-liner: we can rank better than the heuristic, but we can't promise 40% "
            "from raw scores — we dialed capacity (top 5%) instead. Three reasons: "
            "scale_pos_weight makes scores ranks; PR-AUC 0.219 is a real win but precision "
            "stays low-mid 20%s; ~12% base rate makes 40% mathematically unrealistic. "
            "If stakeholders demand >23% precision, that is calibration or new features — "
            "not another threshold search."
        ),
    },
    # 10 — SHAP + fairness
    {
        "title": "SHAP confirms financial behaviour drives risk, and we disclose Equalized Odds on age and state at the ops cut.",
        "body": [
            "Top drivers: Running_Balance_Rounded · Running_Balance · Monthly_Deposit_Sum",
            "Fairlearn Equalized Odds on age + state at ops t≈0.701",
            "Honest slices only: groups with n ≥ 500 (reject sparse noise)",
            "Disclosed on model card: Age EOD ≈ 0.16 · State EOD ≈ 0.32",
        ],
        "notes": (
            "Jamie — SHAP confirms logical financial behaviours drive predictions, not "
            "demographics directly. Top three: Running_Balance_Rounded, Running_Balance, "
            "Monthly_Deposit_Sum. Fairlearn EOD on age and state at t≈0.701 with n≥500 "
            "filtering. Model card discloses Age EOD ≈ 0.16 and State EOD ≈ 0.32. "
            "Contact capacity limited to top 5% as an additional fairness control."
        ),
        "image": "shap_plot.png",
        "image_layout": "wide",
    },
    # 11 — Local SHAP waterfall (KEEP)
    {
        "title": "Local SHAP waterfall plots explain exactly why each individual customer was flagged.",
        "body": [
            "Friction-Gate UI displays exact push/pull features per customer",
            "Red: increases churn risk · Blue: decreases risk",
            "Agents see behaviour-led drivers — not opaque demographic scores",
            "Builds trust with retention agents reviewing the queue",
        ],
        "notes": (
            "While global drivers show overall trends, operations needs to know why a "
            "specific customer was flagged. SHAP waterfall plots provide local explanations — "
            "exactly which behaviours push a customer toward churn. This is the per-account "
            "Glass-Box surface inside the Friction-Gate UI."
        ),
        "image": "shap_waterfall_high_risk.png",
        "image_layout": "wide",
    },
    # 12 — GenAI Meridian Framework
    {
        "title": "All Generative AI outreach is strictly bound by Zero Data Retention, Pydantic validation, and RAG context injection.",
        "body": [
            "Zero Data Retention (ZDR): no raw PII to LLMs — scrub via middleware first",
            "Pydantic determinism: every output structured; offered rate hard-capped ≤ 3.5%",
            "Prompt-as-code: versioned .prompty assets + Azure OpenAI (not hardcoded strings)",
            "RAG context injection: ground drafts / Q&A — Tier 2 never replaces Tier 1 ranking",
        ],
        "notes": (
            "Jamie — Tier 2 GenAI operates under the Meridian Framework. ZDR means no raw PII "
            "hits Azure endpoints. Pydantic hard-fails if the LLM hallucinates above 3.5% "
            "interest. Prompts live as versioned .prompty files. RAG injects semantic context — "
            "we do not rely on zero-shot LLM knowledge for retention copy or methodology answers."
        ),
    },
    # 12b — Prompt versioning + dummy demo data (crash-course / GenAIOps)
    {
        "title": "We version prompts as code and demo only on scrubbed fixture customers — never live PII.",
        "body": [
            "retention_draft.prompty v1.0.0 — prompt-as-code (logic + params separated from Python)",
            "Demo path: Sprint 4 fixtures (below_threshold / flagged JSON) — no emails, no real customers",
            "ZDR: scrub_mapping / scrub_text before prompty.prepare and again on LLM subject/body",
            "Why: governance, replayable demos, and zero real-customer PII in assessor walkthroughs",
        ],
        "notes": (
            "GenAIOps proof: prompts are versioned assets under src/genai/prompts/, loaded by "
            "drafter.py via prompty.load / prepare. Streamlit demo presets load Docs/Sprint4/"
            "fixtures/*.json — synthetic feature rows for Below-threshold and Flagged paths, "
            "explicitly without PII. Before any Azure call we scrub context keys; after the LLM "
            "we scrub subject and body. That is how we get prompt replayability and Jamie's ZDR "
            "bar on the same demo path Morgan uses to show Friction-Gate."
        ),
    },
    # 13 — Friction HITL
    {
        "title": "The Friction-Gate UI guarantees no email reaches a customer without active human approval.",
        "body": [
            "AI drafts locked in Pending Review — never autonomous dispatch",
            "Approve ≠ Sent — no /send route exists in architecture",
            "Approve marks draft ready; outbound mail lives outside this system",
            "Demo RBAC: Compliance can view, cannot Approve (ADR 007)",
        ],
        "notes": (
            "Morgan and Jamie — the biggest GenAI risk is rubber-stamping. Every draft stays "
            "Pending Review until a retention agent decides. Approve does NOT send email — "
            "there is no /send endpoint. Architecture cannot dispatch even if UI is misused. "
            "Next slides show role enforcement and anti-fatigue controls in the Streamlit demo."
        ),
        "image": "friction_gate_dashboard.png",
        "image_layout": "wide",
    },
    # 14 — Anti-fatigue
    {
        "title": "We treat Friction as a Feature so Streamlit Approves cannot become rubber stamps.",
        "body": [
            "Attention Ack required before Approve (attention_ack=true · JR-REQ-19)",
            "High-stakes visual banner when score is well above ops cut",
            "Fast-decide soft warn + audit if Approve in < ~8s (seconds_open logged)",
            "Queue copy: ranks only — contact-set precision ~23%",
        ],
        "notes": (
            "Jamie and Morgan — HITL fails if agents Approve by habit. Anti-fatigue controls: "
            "(1) capacity dial already cut volume; (2) Approve disabled until Attention Ack "
            "checkbox; (3) high-stakes banner; (4) approving under ~8s soft-warns and logs "
            "seconds_open — no hard block to avoid rage-clicks; (5) UI states ~23% precision "
            "so 'usually right' is not a safe habit. Retention agent owns the live Approve path."
        ),
        "image": "friction_gate_dashboard.png",
        "image_layout": "wide",
    },
    # 14b — Guardrails overview (assertion slide — Meridian control set)
    {
        "title": "Meridian ships an explicit guardrail stack — privacy, bounded GenAI I/O, HITL friction, and Glass-Box access.",
        "body": [
            "Privacy / I/O: ZDR scrub · Pydantic rate ≤ 3.5% · versioned .prompty + fixture demos",
            "Retrieval: ChromaDB rejected → pure-Python in-memory RAG (portable, zero native vector DB)",
            "HITL: Pending Review · Approve ≠ Sent · no /send · attention_ack · ~8s soft-warn · audit trail",
            "Access / fairness: Glass-Box RBAC (X-Demo-Role) · SHAP · Fairlearn EOD · ops cut t≈0.701",
        ],
        "notes": (
            "This is the one-slide guardrail map for Jamie and assessors. GenAI never sees raw PII; "
            "outputs are schema-bound; prompts are versioned code exercised on dummy fixtures. "
            "We rejected ChromaDB and shipped in-memory pure-Python retrieval for portability. "
            "Friction-as-Feature means Pending Review, Approve does not send, Attention Ack, "
            "high-stakes cues, seconds_open soft-warn at ~8s, and an immutable audit trail. "
            "Glass-Box demo RBAC lets Compliance audit without Approve. SHAP + Fairlearn EOD "
            "disclosure plus the raised top-5% ops cut complete the fairness posture."
        ),
    },
    # 15 — DS readonly (KEEP)
    {
        "title": "Data scientists can inspect the Review queue but cannot Save, Approve, or Reject drafts.",
        "body": [
            "Pending drafts, drivers, and 3.5% rate cap stay visible",
            "Read-only banner on the Review card",
            "Save / Approve / Reject disabled — not just relabeled",
            "Proves Glass-Box RBAC is enforced, not decorative",
        ],
        "notes": (
            "Sam and Jamie — flip to Data scientist on the Review queue. Inspect pending drafts, "
            "SHAP drivers, and the 3.5% cap — but Save, Approve, and Reject stay disabled "
            "behind a read-only banner. Glass-Box RBAC is not sidebar labels: the action "
            "surface actually changes. Only Retention agents get the live Approve path."
        ),
        "image": "friction_gate_dashboard_datascienist_readonly.png",
        "image_layout": "wide",
    },
    # 16 — Compliance business (KEEP)
    {
        "title": "Compliance can oversee the $7.3M high-risk cohort on Business View but still cannot Approve.",
        "body": [
            "Capacity cohorts remain visible for Risk oversight",
            "High-risk slice tied to ~$7.3M historical AUM",
            "Approve path locked — Compliance views, does not decide",
            "Demo RBAC: pedagogical role picker, not production SSO",
        ],
        "notes": (
            "Jamie — switch to Compliance on Business View. Portfolio overview and capacity "
            "cohorts — including the high-risk slice tied to ~$7.3M historical AUM — stay "
            "visible for oversight. There is still no Approve for this role. Demo RBAC only — "
            "not SSO."
        ),
        "image": "friction_gate_business_compliance.png",
        "image_layout": "wide",
    },
    # 17 — Glassbox (KEEP)
    {
        "title": "Glass-box evidence pins the ops cutoff, frozen SHAP drivers, and Approve ≠ Sent for Jamie.",
        "body": [
            "Ops threshold locked in Models/ops/ (top ~5% dial · t≈0.701)",
            "Frozen SHAP drivers — not live TreeExplainer on the request path",
            "Demo RBAC: Compliance can audit; cannot Approve (ADR 007)",
            "Approve never sends email — outbound lives outside the system",
        ],
        "notes": (
            "Jamie — the Glass-box tab is the compliance surface: MLflow run and threshold "
            "that created this contact queue, frozen SHAP drivers, and the hard rule that "
            "Approve never sends email. Sidebar roles are pedagogical demo RBAC. Next slide "
            "expands the full Friction-as-Feature design sequence."
        ),
        "image": "friction_gate_glassbox.png",
        "image_layout": "wide",
    },
    # 18 — Jamie design sequence (KEEP)
    {
        "title": "Jamie's Glass-box design sequence makes Friction-as-Feature auditable in nine explicit steps.",
        "body": [
            "Expanded “How this dashboard was built (Risk / Jamie)”",
            "Capacity dial → Attention Ack → high-stakes / fast-decide",
            "Approve ≠ Sent called out in the design chain",
            "Anti rubber-stamp controls mapped to JR-REQ-19",
        ],
        "notes": (
            "Jamie — expand Glass-box to the Risk design sequence. Nine steps document "
            "Friction-as-Feature: capacity dial first, Attention Ack, high-stakes banners, "
            "fast-decide soft-warn, immutable audit fields, and Approve never sends mail — "
            "including JR-REQ-19 anti rubber-stamp."
        ),
        "image": "friction_gate_glassbox_jamie.png",
        "image_layout": "wide",
    },
    # 19 — Audit trail (KEEP)
    {
        "title": "Every create, edit, approve, and reject is written to an immutable audit trail.",
        "body": [
            "Approves log attention_ack, high_stakes, seconds_open",
            "Compliance can sample haste / rubber-stamp patterns",
            "Still no outbound send — send lives outside this system",
            "Audit closes the anti-fatigue loop for Risk sampling",
        ],
        "notes": (
            "Jamie — Audit trail closes the anti-fatigue loop. Approve events record "
            "attention checkbox usage, high-stakes flag, and seconds_open. Compliance can "
            "spot rubber-stamp patterns after the demo — without logging PII or inventing a "
            "send pipeline."
        ),
        "image": "friction_gate_audit_trail.png",
        "image_layout": "wide",
    },
    # 20 — System flow & ADR commitments
    {
        "title": "System architecture commits to HITL drafts, bounded GenAI I/O, and Compliance oversight without Approve rights.",
        "body": [
            "FastAPI: /health · /score · /drafts (+ PATCH) · X-Demo-Role RBAC · no /send",
            "Streamlit Friction-Gate UI; ADR 006 in-process demo path also valid",
            "ADR 003 HITL · ADR 002 rate ≤ 3.5% · ADR 007 Compliance audits, cannot Approve",
            "Guardrails stack: ZDR · .prompty fixtures · pure-Python RAG · attention_ack · audit",
        ],
        "notes": (
            "Jamie — walk the system flow left to right. FastAPI exposes /health, /score, and "
            "/drafts with required X-Demo-Role (ADR 007). There is no /send route. Streamlit is "
            "the Friction-Gate surface; ADR 006 also documents an in-process demo path. "
            "ADR 003 locks HITL and Approve ≠ Sent. ADR 002 caps GenAI at 3.5%. Hybrid "
            "architecture: verifiable ML for who to contact, guarded GenAI for what to say."
        ),
        "image": "system_flow.png",
        "image_layout": "wide",
    },
    # 21 — Part 2 section
    {
        "title": "Part 2: The Meta-Project — How It Was Built",
        "body": [],
        "notes": (
            "Now we pivot to the meta-project. I was a solo builder covering ML, GenAI, "
            "Streamlit, compliance, and portable enterprise-safe execution. Subtitle: "
            "Professional setup, AI Orchestration, and System Architecture. The scarce skill "
            "was not typing code — it was AI engineering and orchestration."
        ),
    },
    # 22 — Solo AI engineering (KEEP)
    {
        "title": "As a solo builder I prioritized AI engineering and orchestration over hand-writing every line.",
        "body": [
            "One person · Sprints 0–5 · ML + GenAI + UI + RAI + portable execution",
            "Role shift: Syntax Writer → Systems Orchestrator",
            "Agents execute scoped tasks; I own strategy, critique, and diffs",
            "Living MEMORY.md + project rules keep context across sessions",
        ],
        "notes": (
            "Honest constraint: one person, product surface spanning temporal XGBoost, "
            "Friction-Gate, Azure RAG, Glass-Box RBAC, ADRs, stakeholder demos. I invested "
            "in AI engineering: lock strategy first, dispatch tactical agents, force MEMORY.md "
            "hand-offs, review diffs. Next slides show governance, Split-Executor, and Red Team."
        ),
    },
    # 23 — Governance
    {
        "title": "We established a rigid governance structure before a single line of code was written.",
        "body": [
            "PRD: locked ~$7.3M AUM target and Sam / Morgan / Jamie personas",
            "ADRs: permanent logs — e.g. ADR 008 why-not PostgreSQL · ADR 004 churn definition",
            "Model Card (1.1.0-sprint3-serving): lineage, ethics, EOD fairness metrics",
            "Governance is the playbook agents must follow — not optional polish",
        ],
        "notes": (
            "Solo orchestration starts with governance. PRDs locked the $7.3M AUM target and "
            "personas. ADR 008 documents why we chose SQLite over PostgreSQL for prototype "
            "portability. ADR 004 codifies 30-day forward-looking churn. Model Card treats "
            "the ML model as a governed enterprise asset with disclosed EOD metrics."
        ),
    },
    # 24 — Agile rituals (NEW)
    {
        "title": "We managed a solo project with enterprise Agile rituals and aggressive stakeholder mapping.",
        "body": [
            "Morgan: speed / conversion / queue capacity · Jamie: explainability / fairness / HITL (DORA · EU AI Act framing)",
            "Sam: MLflow rigor · Sprint 0–5: sprint_plan at start · debrief + retrospective at close (not interchangeable)",
            "Repo layout: notebooks = explore · src/ = production · Docs/SprintN = rationale",
            "Execution convention: py -3.13 -m … + pyproject/uv — portable, enterprise-safe module runs",
        ],
        "notes": (
            "Stakeholder tension is the product. Morgan wants actionable queues and conversion; "
            "Jamie wants Glass-Box explainability, fairness disclosure, and HITL under DORA / "
            "EU AI Act-style accountability framing. Sam wants MLflow rigor. Debrief = what we "
            "shipped; retrospective = how we work next — both mandatory. Notebooks stay "
            "exploratory; src/ is the serving path; Docs/SprintN holds the why. We run tools via "
            "py -3.13 -m for a portable enterprise-safe convention."
        ),
    },
    # 24b — MEMORY.md + agent skills (crash-course Module 2)
    {
        "title": "Living MEMORY.md and agent skills keep a solo builder coherent across sessions.",
        "body": [
            ".agents/MEMORY.md = living save-state — read/update before every major agent turn",
            "Skills: docs-before-code · red-team · skillify — critique before code, then cascade",
            "Project rules (.cursorrules / AGENTS.md) lock hybrid ML + GenAI + RAI constraints",
            "Orchestration > syntax: agents execute scoped tasks; I own merge judgment",
        ],
        "notes": (
            "Module 2 AI engineering: MEMORY.md is the hand-off file so a new session does not "
            "reinvent the mission. docs-before-code forces attack note → checklist → docs → code. "
            "Red-team skills critique plans before implementation. skillify captures repeatable "
            "friction into reusable skills. Rules encode the hybrid architecture and guardrails "
            "so agents cannot quietly swap in foundation-model prediction."
        ),
    },
    # 25 — Split-Executor
    {
        "title": "We utilized a Split-Executor workflow to prevent AI agents from developing tunnel vision.",
        "body": [
            "Strategic: Define Architecture/PRD → Red Team loop → Lock Strategy",
            "Flaw found → Revise Docs & ADRs, then re-enter Red Team until Approved",
            "Tactical: Update MEMORY.md → Dispatch Tactical Agent → Generate Code",
            "Human Review Diffs closes the loop — I own merge judgment, not the agent",
        ],
        "notes": (
            "Assessors — this chart is the solo AI-engineering operating system. Top: Strategic "
            "Definition with Red Team attack loop until strategy is locked. Bottom: Tactical "
            "Execution — update MEMORY.md, dispatch agent, generate code, human review diffs. "
            "That split stops an agent rewriting the whole stack when asked to fix one bug."
        ),
        "image": "split_executor.png",
        "image_layout": "tall",
    },
    # 26 — Docs-Before-Code
    {
        "title": "We enforced an ironclad Docs-Before-Code circuit breaker to prevent AI from writing flawed logic.",
        "body": [
            "Red Team sub-agents attacked architecture before implementation",
            "The cascade: Attack Note → Revision Checklist → Update Docs → THEN code",
            "Solo builder cannot afford silent wrong turns across six sprints",
            "Critique first — code second",
        ],
        "notes": (
            "Agents eagerly write wrong code if you let them. Red Team sits before Lock Strategy. "
            "When a flaw is found: attack note, signed revision checklist, update docs and ADRs, "
            "then code. That cascade keeps AI engineering accountable when there is no second "
            "human reviewer."
        ),
    },
    # 27 — Red Team Sprint 2 (NEW)
    {
        "title": "Red Team caught four critical modeling flaws before we wrote a single training script.",
        "body": [
            "Threshold leakage: ops threshold must calibrate on Val, freeze for Test",
            "Probability skew: scale_pos_weight → treat outputs as rankings, not probabilities",
            "Memory-efficient training: tree_method=\"hist\" for 2.2M-row histograms",
            "Baseline reality: hardcode baseline PR-AUC ~0.117 so stakeholders don't misread naive baseline",
        ],
        "notes": (
            "Sprint 2 Red Team attack on the XGBoost plan caught four flaws: test-set threshold "
            "calibration leakage; scale_pos_weight destroying probability calibration (led to "
            "ranking policy earlier in Part 1); memory pressure on 2.2M rows requiring "
            "tree_method=hist; and forcing an honest baseline PR-AUC ~0.117 so the heuristic "
            "win reads correctly."
        ),
    },
    # 28 — Defending architecture (Chroma rejected → pure-Python RAG)
    {
        "title": "We rejected ChromaDB and shipped pure-Python in-memory RAG for a portable, zero-native-deps prototype.",
        "body": [
            "Rejected: ChromaDB / local native vector DB stacks (extra native deps + local services)",
            "Shipped (ADR 010 + 015): BM25 + Azure embeddings fused with RRF, LLM rerank, ≤1200-char chunks",
            "Why: portability, zero native install footprint, no separate vector-DB process for demos",
            "ADR 008 — SQLite shared volume over PostgreSQL; busy_timeout + exponential backoff",
        ],
        "notes": (
            "Sam and Jamie — industry default is Chroma or FAISS. We explicitly rejected those "
            "for the prototype: they pull native C++/DLL install paths and a local vector-DB "
            "service we did not want as a demo dependency. ADR 010 ships Azure "
            "text-embedding-3-large over bounded markdown chunks; ADR 015 added BM25, Reciprocal "
            "Rank Fusion and an LLM rerank, still in pure Python — no Chroma, no FAISS. "
            "Tradeoff: lighter semantic polish vs 100% portable "
            "deployability. ADR 008 keeps SQLite on a shared volume with busy_timeout and "
            "backoff instead of standing up PostgreSQL for the prototype."
        ),
    },
    # 29 — Production RAG roadmap
    {
        "title": "Production scale requires migrating to managed hybrid search with measured retrieval quality.",
        "body": [
            "Current: pure-Python hybrid — BM25 + embeddings (RRF) + LLM rerank (ADR 010 + 015)",
            "Target: managed hybrid search + purpose-built cross-encoder reranking + query rewrite",
            "Measure retrieval quality (chunk precision/recall) before trusting LLM answers",
            "Infrastructure: Azure AI Search — managed vectors without a local vector-DB service",
        ],
        "notes": (
            "Prototype RAG is deliberately pure-Python and portable; it is already hybrid with an "
            "LLM rerank (ADR 015). Production needs managed hybrid search with a real cross-encoder reranker and query rewriting on a managed store such as "
            "Azure AI Search. We must rigorously measure retrieval quality independently before "
            "trusting the LLM to generate answers."
        ),
    },
    # 30 — Sprint 5
    {
        "title": "Sprint 5 expanded our stack with containerization, multi-page UIs, and a grounded RAG bot.",
        "body": [
            "Docker Compose: FastAPI container (Streamlit on host), smoke-tested locally",
            "Multi-page dashboards: Business View (Morgan) · ML / What-If View (Sam)",
            "RAG Q&A bot grounded in Final_Report_Official.md (hybrid BM25 + embeddings, LLM rerank)",
            "Anti-rubber-stamp: attention_ack + seconds_open auditing (JR-REQ-19)",
        ],
        "notes": (
            "Sprint 5 GenAIOps phase: a FastAPI Docker image (built and smoke-tested locally; "
            "Streamlit stays on the host), persona-tailored multi-page "
            "Streamlit, RAG chatbot grounded in Final_Report_Official.md (bounded chunks + Azure "
            "embeds — no ChromaDB), and Jamie's JR-REQ-19 anti-rubber-stamp controls. "
            "When you open the Methodology Q&A bot live, ask one of these — they retrieve well: "
            "DEMO Q: “What ops threshold did we ship, and why not max-F1?” "
            "DEMO Q (alt): “Does Approve send the retention email?”"
        ),
    },
    # 31 — Demo handover
    {
        "title": "We are ready to demo the handover path — health check, capacity discipline, and human-gated drafts.",
        "body": [
            "1. GET /health — run id + threshold + azure_configured",
            "2. Below threshold (~0.21) → no draft (capacity discipline)",
            "3. Flagged (~0.75) → create draft → Approve / Edit / Reject",
            "4. Say explicitly: “Approved is not sent.” · Then Methodology RAG Q&A",
        ],
        "notes": (
            "Live demo walkthrough. GET /health shows run id and threshold. Below-threshold preset "
            "~0.21 produces no draft — capacity discipline. Flagged ~0.75 flows through draft, "
            "Approve/Edit/Reject. Say out loud: Approved is not sent. "
            "Then open Methodology Q&A (RAG on Final_Report_Official.md). Ready-to-read: "
            "DEMO Q: “What ops threshold did we ship, and why not max-F1?” "
            "DEMO Q (alt): “Does Approve send the retention email?” "
            "Optional third if time: “What is the ~$7.3M AUM figure?” "
            "Methodology: sprint_methodology_report.md. Demo commands: Sprint4/demo_runbook.md. "
            "Model card: Model_Card_Template.md 1.1.0-sprint3-serving. Closing: we rank better "
            "than a strong heuristic, contact only the top 5%, and every GenAI draft stops at a "
            "human — by design."
        ),
        "image": "friction_gate_score_create.png",
        "image_layout": "wide",
    },
]


# ---------------------------------------------------------------------------
# Layout helpers
# ---------------------------------------------------------------------------
def _title_font_pt(title: str) -> int:
    """Shrink long assertion titles so they stay within the title band."""
    if len(title) > 140:
        return 24
    if len(title) > 110:
        return 26
    return 28


def _estimate_title_height_inches(title: str, font_pt: int | None = None) -> float:
    """Rough line count at Georgia title size (~55 chars/line at 28pt), clamped 0.9–1.9."""
    font_pt = font_pt or _title_font_pt(title)
    chars_per_line = 60 if font_pt <= 26 else 55
    lines = max(1, (len(title) + chars_per_line - 1) // chars_per_line)
    height = 0.42 + lines * (0.36 if font_pt >= 28 else 0.34)
    return max(0.9, min(1.9, height))


def _fit_picture_dims(image_path: str, max_w_in: float, max_h_in: float) -> tuple[float, float]:
    """
    Compute width/height in inches so the image fits within max box without overflow.
    Uses Pillow when available; otherwise assumes 16:9 for wide and 3:4 for tall fallback.
    """
    try:
        from PIL import Image as PILImage  # optional dependency

        with PILImage.open(image_path) as img:
            px_w, px_h = img.size
        aspect = px_w / px_h if px_h else 16 / 9
    except Exception:
        aspect = 16 / 9

    if max_w_in / aspect <= max_h_in:
        return max_w_in, max_w_in / aspect
    return max_h_in * aspect, max_h_in


def add_slide_content(prs, slide_data, include_notes, slide_index):
    """Render one Kubrick slide with dynamic title sizing and overflow-safe images."""
    blank_layout = prs.slide_layouts[6]
    slide = prs.slides.add_slide(blank_layout)

    # Dark background
    fill = slide.background.fill
    fill.solid()
    fill.fore_color.rgb = DARK_SLATE

    is_main_title = slide_index == 0
    is_section_header = "Part" in slide_data["title"] and not is_main_title
    has_image = "image" in slide_data
    body_items = slide_data.get("body") or []

    if is_main_title:
        # Vertically balanced title slide
        title_box = slide.shapes.add_textbox(MARGIN_LEFT, Inches(2.0), CONTENT_WIDTH, Inches(2.2))
        tf = title_box.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
        p = tf.paragraphs[0]
        p.text = slide_data["title"]
        p.font.name = "Georgia"
        p.font.size = Pt(44)
        p.font.bold = True
        p.font.color.rgb = WHITE

        sub_box = slide.shapes.add_textbox(MARGIN_LEFT, Inches(4.35), CONTENT_WIDTH, Inches(2.4))
        tf_sub = sub_box.text_frame
        tf_sub.word_wrap = True
        tf_sub.margin_left = tf_sub.margin_top = tf_sub.margin_right = tf_sub.margin_bottom = 0
        for idx, sub_line in enumerate(body_items):
            p_sub = tf_sub.add_paragraph() if idx > 0 else tf_sub.paragraphs[0]
            p_sub.text = sub_line
            p_sub.font.name = "Arial"
            p_sub.font.size = Pt(20 if idx == 0 else 18)
            # First subtitle line accent neon; remaining lines near-white for contrast
            p_sub.font.color.rgb = NEON_GREEN if idx == 0 else BODY_TEXT
            p_sub.space_after = Pt(10)

    elif is_section_header:
        title_box = slide.shapes.add_textbox(MARGIN_LEFT, Inches(2.8), CONTENT_WIDTH, Inches(2.0))
        tf = title_box.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
        p = tf.paragraphs[0]
        p.text = slide_data["title"]
        p.font.name = "Georgia"
        p.font.size = Pt(40)
        p.font.bold = True
        p.font.color.rgb = NEON_GREEN

    else:
        # Standard assertion-evidence layout (all positions tracked in inches)
        title_top_in = 0.5
        title_font = _title_font_pt(slide_data["title"])
        title_h_in = _estimate_title_height_inches(slide_data["title"], title_font)

        title_box = slide.shapes.add_textbox(
            MARGIN_LEFT, Inches(title_top_in), CONTENT_WIDTH, Inches(title_h_in)
        )
        tf = title_box.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
        p = tf.paragraphs[0]
        p.text = slide_data["title"]
        p.font.name = "Georgia"
        p.font.size = Pt(title_font)
        p.font.bold = True
        p.font.color.rgb = WHITE

        accent_top_in = title_top_in + title_h_in + 0.12
        accent = slide.shapes.add_shape(
            1, MARGIN_LEFT, Inches(accent_top_in), CONTENT_WIDTH, Inches(0.04)
        )
        accent.fill.solid()
        accent.fill.fore_color.rgb = NEON_GREEN
        accent.line.fill.background()

        body_top_in = accent_top_in + 0.25
        body_top = Inches(body_top_in)
        slide_h_in = 7.5

        if has_image:
            col_w = Inches(5.1)
            img_left_in = 6.9 if slide_data.get("image_layout") != "tall" else 7.2
            max_img_w = 5.5
            max_img_h = slide_h_in - body_top_in - 0.35

            if body_items:
                bullet_size = Pt(16 if len(body_items) >= 5 else 17)
                body_box = slide.shapes.add_textbox(MARGIN_LEFT, body_top, col_w, Inches(4.35))
                tf_body = body_box.text_frame
                tf_body.word_wrap = True
                tf_body.margin_left = tf_body.margin_top = tf_body.margin_right = tf_body.margin_bottom = 0
                for idx, bullet in enumerate(body_items):
                    p_b = tf_body.add_paragraph() if idx > 0 else tf_body.paragraphs[0]
                    p_b.text = "•  " + bullet
                    p_b.font.name = "Arial"
                    p_b.font.size = bullet_size
                    p_b.font.color.rgb = BODY_TEXT
                    p_b.space_after = Pt(10)
                    p_b.line_spacing = 1.1

            image_filename = slide_data["image"]
            image_path = os.path.join(ASSETS_DIR, image_filename)

            if os.path.exists(image_path):
                layout = slide_data.get("image_layout", "wide")
                if layout == "tall":
                    fit_w, fit_h = _fit_picture_dims(image_path, 4.8, min(4.4, max_img_h))
                else:
                    fit_w, fit_h = _fit_picture_dims(image_path, max_img_w, min(4.3, max_img_h))

                slide.shapes.add_picture(
                    image_path,
                    left=Inches(img_left_in),
                    top=body_top,
                    width=Inches(fit_w),
                    height=Inches(fit_h),
                )
            else:
                fb = slide.shapes.add_textbox(Inches(img_left_in), body_top, Inches(5.0), Inches(1.0))
                p_f = fb.text_frame.paragraphs[0]
                p_f.text = f"[Missing Visual: {image_filename}]"
                p_f.font.name = "Arial"
                p_f.font.color.rgb = NEON_GREEN
                p_f.font.size = Pt(16)

        else:
            # Text-only full-width column
            many_bullets = len(body_items) >= 5
            bullet_size = Pt(18 if many_bullets else 20)
            space_after = Pt(10 if many_bullets else 14)

            if body_items:
                body_box = slide.shapes.add_textbox(
                    MARGIN_LEFT, body_top, CONTENT_WIDTH, Inches(slide_h_in - body_top_in - 0.5)
                )
                tf_body = body_box.text_frame
                tf_body.word_wrap = True
                tf_body.margin_left = tf_body.margin_top = tf_body.margin_right = tf_body.margin_bottom = 0
                for idx, bullet in enumerate(body_items):
                    p_b = tf_body.add_paragraph() if idx > 0 else tf_body.paragraphs[0]
                    p_b.text = "•  " + bullet
                    p_b.font.name = "Arial"
                    p_b.font.size = bullet_size
                    p_b.font.color.rgb = BODY_TEXT
                    p_b.space_after = space_after
                    p_b.line_spacing = 1.15 if many_bullets else 1.2

    if include_notes:
        slide.notes_slide.notes_text_frame.text = slide_data.get("notes", "")


def generate_presentation(include_notes: bool, filename: str) -> str:
    """Build one PPTX file; return output path."""
    prs = Presentation()
    prs.slide_width = SLIDE_WIDTH
    prs.slide_height = SLIDE_HEIGHT

    for i, slide_data in enumerate(slides_data):
        add_slide_content(prs, slide_data, include_notes, i)

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    out_path = os.path.join(OUTPUT_DIR, filename)
    prs.save(out_path)
    print(f"Saved: {out_path} ({len(slides_data)} slides)")
    return out_path


if __name__ == "__main__":
    generate_presentation(include_notes=True, filename="Meridian_Presentation_PresenterView.pptx")
    generate_presentation(include_notes=False, filename="Meridian_Presentation_Standalone.pptx")
    print("Presentations generated successfully.")
