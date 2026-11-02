# Product Requirements Document (PRD)

## 1. Product Vision & Strategy

### Problem Statement
Meridian Savings Bank is experiencing a high volume of customer churn, representing a significant loss of Assets Under Management (AUM). Currently, retention efforts are reactive and generalized. There is no predictive capability to identify at-risk customers *before* they churn, nor is there a scalable, personalized intervention strategy.

### Target Audience & Personas
*   **Morgan (Product / Business Lead):** The budget holder. Morgan's primary concern is measurable ROI and impact on the bottom line (AUM retained).
*   **Sam (Head of Data Science):** The technical champion. Sam needs to see rigorous MLOps practices, valid model evaluation metrics (ROC-AUC), and robust CI/CD pipelines.
*   **Jamie (Risk & Compliance):** The primary blocker. Jamie is terrified of Generative AI hallucinating illegal interest rates or making unapproved promises to retail banking clients. Jamie demands absolute auditability and human-in-the-loop control.
*   **Retention Agents (End Users):** The staff who will utilize the system's outputs to execute targeted retention campaigns.

### Value Proposition
A predictive MLOps pipeline that not only identifies high-risk customers but also generates compliant, hyper-personalized retention communications ready for human review, effectively shifting the bank from reactive loss-mitigation to proactive AUM preservation.

### Goals & Non-Goals
**Goals:**
- Deploy an XGBoost classification model to predict the probability of churn within a strict **30-day forward-looking predictive window** (ADR 004).
- Use a data-driven, mathematically derived threshold for defining the "Churn" target label, explicitly preventing target leakage via Observation cutoffs.
- Integrate Azure OpenAI to draft context-aware retention emails based on SHAP-derived churn factors.
- Provide a "Friction-Gate UI" in Streamlit for the retention team to review predictions.
- **Crucial Goal:** Satisfy Risk/Compliance by ensuring zero AI-generated emails are sent autonomously.

**Non-Goals:**
- Fully autonomous AI email delivery.
- Complex Deep Learning / Neural Networks (XGBoost is preferred for tabular banking data due to interpretability).
- Replacing the retention agents.

### Guiding Principles
1.  **Friction as a Feature:** AI speed must never override banking compliance. Workflows are intentionally gated by human approvals.
2.  **Explainability over Complexity:** A slightly less accurate but fully explainable model (SHAP + XGBoost) is vastly superior to a black-box model in financial services.
3.  **Deterministic Boundaries:** Generative AI is strictly isolated to the content-drafting layer and is heavily policed by deterministic Pydantic validation before touching downstream systems.

## 2. Success Metrics

To prove the value of this system to Morgan (Product), we track financial outcomes over technical metrics:
*   **Primary Business Metric — Historical AUM at risk (Sprint 1 locked):** **~$7.27M**  
    *Method (EDA §9 / P-02):* for each customer’s **first** left-looking month (`Running_Balance_Rounded == 0` and inactive), take `max(Running_Balance)` over the **prior 3 calendar months**, then sum across first-exit events.  
    *Rejected proxies:* last-month `start_balance` sum (~$2.21M) and prior-month-only balance (~$34) — accounts are usually already drained the month before the first inactive+rounded-$0 state.  
    *OKR framing:* use **~$7.3M** as the validated historical AUM-at-risk baseline (replaces the old **$4.2M** placeholder). Quarterly “AUM preserved” targets should be set as a share of this baseline once retention capacity is known — not as ROC-AUC alone.
*   **Secondary Business Metric:** 30% reduction in manual email drafting time for retention agents.
*   **Primary Technical Metric:** Beat the `gone_this_month` heuristic on PR-AUC (0.219 vs 0.151) and ROC-AUC (0.723 vs 0.551). The aspirational target of ROC-AUC > 0.85 was explicitly dropped in favor of a mathematically actionable ops capacity threshold (`t≈0.701`).
*   **Compliance Metric:** 100% of generated emails pass through the `pii_scrubber.py` middleware with zero Data Loss Prevention (DLP) violations.

**Source:** `Code/Sprint1/01_data_integrity_and_eda.ipynb` §9; [churn_definition.md](../Sprint1/churn_definition.md); [eda_revision_plan.md](../Sprint1/eda_revision_plan.md) P-02.

## 3. Product Roadmap (Phased Delivery)
*   **Phase 1 (Sprint 1) — DONE (2026-07-10):** Data integrity, EDA, ADR 004 churn lock, FE export (`training_data.csv`), Gini leak screen, dual close-out.
*   **Phase 2 (Sprint 2) — DONE (2026-07-14):** Predictive modeling. XGBoost + MLflow + SHAP / fairness; ops threshold `t≈0.701`. Plan: [Sprint2/sprint_plan.md](../Sprint2/sprint_plan.md).
*   **Phase 3 (Sprint 3) — DONE (2026-07-14):** FastAPI ops-threshold serving + GenAI retention drafts (stub/Azure) + thin Streamlit Friction-Gate. Plan: [Sprint3/sprint_plan.md](../Sprint3/sprint_plan.md).
*   **Phase 4 (Sprint 4) — DONE (2026-07-14):** Handover / presentation — Consolidated in `Docs/Presentations/` ([Application guide](../Portfolio/DEMO_GUIDE.md) · [sprint_methodology_report.md](../Presentations/sprint_methodology_report.md)) · [demo_runbook.md](../Sprint4/demo_runbook.md) · [fixtures/](../Sprint4/fixtures/).
*   **Phase 5 (Sprint 5) — CLOSED 2026-09-24:** Containerization & In-Memory RAG. **Landed:** Docker Volume state management (ADR 008); `Dockerfile` + `docker-compose.yml` for the FastAPI service (built and smoke-tested locally 2026-09-24); AppLocker-safe in-memory RAG with header + paragraph chunking (ADR 010), made hybrid with an LLM rerank (ADR 015); FastAPI as the single enforcement point (F8); Tenacity resilience + token telemetry (ADR 013); single-file Streamlit role routing (ADR 011, WS-5 refactor done); portable submission inference (ADR 014). **Carried over:** Azure Container Apps deploy (WS-2 — `infra/azure-container-app.yaml` is an unfilled scaffold) and `azd` scaffolding (WS-3; Foundry already hosts the model deployments). Close-out: [Sprint5/sprint_debrief.md](../Sprint5/sprint_debrief.md). Plan: [Sprint5/sprint_plan.md](../Sprint5/sprint_plan.md).
*   **Phase 6 (Production Evolution):** Advanced RAG Architecture. See [Phase6_Production_RAG_Roadmap.md](../Architecture/Phase6_Production_RAG_Roadmap.md) for the roadmap on migrating to Hybrid Search (Vector + BM25), Query Rewriting, and Cross-Encoder Re-ranking once outside the AppLocker environment.
*   **Phase 6 (Production Evolution):** MLOps model selection & registry. See [MLflow_Model_Selection_Roadmap.md](../Architecture/MLflow_Model_Selection_Roadmap.md) for comparing candidate models under stakeholder-agreed gates (calibration, fairness), a Pareto frontier across performance / value / latency / cost, and Model Registry promotion (`challenger` → `champion`). Not built.

**Schedule source of truth:** [Docs/Sprint0/project_schedule.md](../Sprint0/project_schedule.md).

## 4. Constraints & Assumptions
*   **Constraints:** The system must operate within the strict corporate Windows AppLocker policy (no standard virtual environments). 
*   **Constraints:** PII data must be scrubbed prior to any payload hitting the Azure OpenAI endpoints.
*   **Assumptions:** The raw data (`transactions_tm1_e.csv` and `customers_tm1_e.csv`) contains sufficient predictive signal to identify churn.
