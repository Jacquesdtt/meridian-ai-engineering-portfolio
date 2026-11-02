# Meeting Notes: Sam (Head of DS) - Sprint 5 Deployment & GenAIOps

> **Status clarification, 2 November 2026:** This is a historical question and assumption record. Calibration alone does not increase precision for the same selected cases. The later operating decision and results are in the [current model card](../../Model_Card.md); the 40% target was not met.


**Date:** [YYYY-MM-DD]
**Stakeholders Present:** Jacques, Sam
**Meeting Goal:** Review the model serving architecture, GenAIOps setup, and finalize the cloud deployment strategy for the final presentation.

**Dependency (Jamie 2026-07-16):** Risk locked fairness narrative for final assessors (JR-REQ-01/02) and standing HITL controls. Open policy that may touch Sam: EOD release gate, extra fairness attributes, Entra timeline — [jamie_requirements_register.md](../../Sprint5/jamie_requirements_register.md) JR-OPEN-01/02/05 · [08_jamie_followup_message.md](08_jamie_followup_message.md).

---

## 1. Pre-Meeting Prep / Agenda

**Context to provide Sam:**
* We are in Sprint 5, focusing on Cloud Deployment and GenAIOps.
* We have frozen the XGBoost model at the operational threshold (`t≈0.701`).
* The application consists of a FastAPI backend (model serving and GenAI endpoints via Azure OpenAI) and a Streamlit frontend UI.
* We implemented a "Glass-Box RBAC" (ADR 007) with demo roles for Risk/Compliance visibility.
* Jamie meeting (2026-07-16): fairness must appear in final presentation/report; demo RBAC remains pedagogical until Entra.

**Topics / Questions for Sam:**
1. **Cloud Hosting Target (WS-2):**
   * *Why we need this:* We need a scalable, secure, and production-ready environment that can handle concurrent GenAI requests and model serving.
   * Confirm the preferred hosting environment for the final demo (e.g., Azure Container Apps vs equivalent).
   * Confirm if we can proceed with Foundry/`azd` for declarative infrastructure deployment.
2. **GenAIOps & Azure Configuration:**
   * *Why we need this:* We must enforce Zero Data Retention (ZDR) policies and ensure that all AI-generated retention emails are strictly validated (via Pydantic schemas) before they reach the Friction Gate UI.
   * Review the Azure OpenAI endpoint integration for the retention email generation.
   * Ensure Sam is comfortable with the prompt structure (WS-1 `.prompty` deployed).
3. **Architecture Trade-offs (ADR 008):**
   * *Why we need this:* The current monolithic SQLite setup was built to quickly validate the "Friction Gate" human-in-the-loop workflow. We need alignment on the target architecture before investing in the decoupled production backend.
   * Review the "split-brain state risk" caused by running Streamlit and FastAPI on the same filesystem.
   * Discuss the path to a production-grade decoupled architecture (e.g., PostgreSQL backend + resilient HTTP clients) for the final report.
4. **Model Performance & Precision Target Feedback:**
   * *Why we need this:* We aimed for a 40% precision floor, but empirical results showed this was unachievable on the current features (precision plateaus at ~24% even in the top 1% of scores, given the ~12% base churn rate).
   * *What we did instead:* We pivoted to a **capacity constraint** approach, taking the top 5% highest-risk accounts. This still successfully reduces false positives from ~248k (max-F1) down to ~20k, giving operations a manageable queue.
   * *Question for Sam:* Is this capacity-driven fallback acceptable for the retention campaign workflow, or do we need to pause and invest further in feature engineering/model calibration to try and lift precision at the absolute top? We would love your feedback on this trade-off.
5. **Jamie fairness open items:** If Risk wants a hard Equalized Odds gate or more demographic slices, does that change Sprint 5 scope vs disclosure-only?

## 2. Meeting Notes / Transcript Summaries
*(Meeting Cancelled 2026-07-17. Proceeding with default assumptions to unblock WS-2 execution).*

## 3. Decisions Made (Defaults assumed due to cancellation)
*   **Cloud Hosting Target:** Proceeding with **Azure Container Apps** for the FastAPI backend only. Streamlit will remain local to avoid the split-brain SQLite state risk (ADR 008 mitigation per Red-Team advice).
*   **Model Performance & Precision Target:** We assume the capacity constraint (top 5% highest-risk accounts, approx 20k) is acceptable for the business workflow. No further model calibration or feature engineering will be performed.
*   **GenAIOps:** ZDR policies and `.prompty` prompt-as-code are approved as implemented.

## 4. Action Items & Next Steps
- [ ] **Task 1:** [Owner] - [Deadline]
- [ ] **Task 2:** [Owner] - [Deadline]

## 5. Clarifications Needed (Parking Lot)
*   [Any questions that couldn't be answered during the meeting]
