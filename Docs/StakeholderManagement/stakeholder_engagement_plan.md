# Stakeholder Engagement Plan

This document outlines the strategy for engaging with stakeholders throughout the Meridian Savings Churn project. It uses industry-standard business analysis frameworks (CATWOE and POPIT) to map out the environment, constraints, and impact of the project.

**Meetings index:** [README.md](README.md) · **Jamie requirements (SoT):** [../Sprint5/jamie_requirements_register.md](../Sprint5/jamie_requirements_register.md)

**Roleplay map:** Arvind ↔ Jamie (Risk) · Andy ↔ Morgan (Product).

---

## 1. CATWOE Analysis
*Used to define the business problem and the high-level perspective of the system.*

*   **C (Customers):** 
    *   *External:* Meridian Savings Bank account holders (who will ultimately receive the retention emails).
    *   *Internal:* The Marketing and Customer Retention teams who will consume the Streamlit app and the generated insights.
*   **A (Actors):** 
    *   Solo AI Engineer (You) - building the ML pipeline and GenAI extensions.
    *   Sam (Head of Data Science) - reviewing the model rigor and ML fundamentals.
    *   Morgan (Product Manager) - ensuring the output aligns with business goals (AUM saved).
    *   Jamie (Risk / Compliance) - fairness, privacy, HITL, and GenAI guardrails.
*   **T (Transformation Process):** 
    *   Transforming massive, raw, unstructured transaction logs and demographic data into a clean, predictive churn probability score and contextualized GenAI retention email.
*   **W (World View / Weltanschauung):** 
    *   Proactively identifying and preventing liquidity loss (churn) is significantly more cost-effective than acquiring new customers. AI can scale this personalized retention strategy.
*   **O (Owners):** 
    *   Sam (Technical Owner - owns the model risk).
    *   Morgan (Business Owner - owns the KPIs).
    *   Jamie (Risk Owner - owns fairness / GenAI compliance narrative for assessors).
*   **E (Environmental Constraints):** 
    *   Strict enterprise security policies (AppLocker blocking virtual environments).
    *   Compliance with Microsoft Responsible AI principles (Fairness, Transparency, Privacy).
    *   Tight 10-day sprint schedule for delivery.

---

## 2. POPIT Analysis
*Used to analyze the holistic business impact of the proposed system.*

*   **P (People):** 
    *   The project requires shifting marketing from a "batch-and-blast" approach to a targeted, AI-driven workflow. Stakeholders need to trust the model outputs (requiring SHAP/dtreeviz explainability).
*   **O (Organisation):** 
    *   Meridian Savings Bank is integrating GenAI into traditional banking workflows, requiring cross-functional buy-in between Data Science, Product, and Risk/Compliance.
*   **P (Processes):** 
    *   New processes introduced: Automated monthly data ingestion, MLOps model retraining cycles, and Azure OpenAI prompt evaluation via `.prompty`. Friction-Gate human review before any outbound (Approve ≠ Sent).
*   **I (Information):** 
    *   The system relies on securely handling sensitive transaction and demographic data. It produces high-value information: churn probabilities, SHAP impact scores, and drafted retention emails.
*   **T (Technology):** 
    *   Python 3.13 (Global scope execution), XGBoost, MLflow (Tracking), Streamlit (Dashboard), FastAPI (Serving), Azure OpenAI & Prompty (GenAI).

---

## 3. Stakeholder Mapping & Strategy (Phase 4 Framework)
*Translating the AI capability into managed political capital and financial metrics.*

*   **Champions (High Influence, High Support): Sam (Data Science).**
    *   *Strategy:* Integrate into early discovery. Sam wants to see robust ML pipelines (MLflow, XGBoost). Win their trust in Sprint 2 to secure technical validation.
*   **Blockers (High Influence, Low Support): Jamie (Risk / Compliance).** → *Support rising after Sprint 5 Risk meeting (2026-07-16).*
    *   *Strategy:* Manage risks aggressively. Jamie fears data leaks, autonomous hallucinations, **and unfair treatment of customers**. Win trust with ZDR, Pydantic rate caps, Friction-Gate HITL, Glass-Box RBAC, **and an explicit fairness / anti-discrimination narrative** in the final presentation and report.
    *   *Current ask:* Answer JR-OPEN-01…05 (follow-up: [Meetings/08_jamie_followup_message.md](Meetings/08_jamie_followup_message.md)).
*   **Users (Low Influence, High Support/Resistance): The Relationship Managers (Sales Team).**
    *   *Strategy:* Optimize UX and feedback loops. They must not feel replaced. We are building them an intelligence exoskeleton (the Sales Intelligence Bot) to speed up their workflow.
*   **Executives (High Influence, Budget Holders): Morgan (Product Manager) / Vincent (CEO).**
    *   *Strategy:* Focus exclusively on the ROI Business Case. They don't buy LLMs; they buy reduced churn and protected AUM. Note: Jamie’s fairness DoD is now mandatory in the same final deck Morgan will see.

---

## 4. Stakeholder Meeting Schedule

| Stakeholder | Role | Cadence | Purpose of Meetings | Latest status |
| :--- | :--- | :--- | :--- | :--- |
| **Sam** | Head of Data Science | End of Sprints 1 & 2; Sprint 5 deploy | Data integrity, churn lock, metrics, hosting | Sprint 5 prep: [03_…](Meetings/03_sam_sprint5_deployment_prep.md) |
| **Morgan** | Product Manager | Mid-Sprint 3 & Final | Queue size, GenAI quality, AUM | Sprint 5 prep: [05_…](Meetings/05_morgan_sprint5_product_prep.md)<br>Feedback: [09_morgan_feedback_adaptation.md](Meetings/09_morgan_feedback_adaptation.md) |
| **Jamie** | Risk / Compliance | Sprint 2 RAI + **Sprint 5 serving/GenAI** | Fairness, privacy, HITL, RBAC | **Met 2026-07-16** — see §5 |

---

## 5. Jamie engagement log (Sprint 5)

| Date | Activity | Outcome |
|------|----------|---------|
| 2026-07-16 | Serving readiness red-team R1 + R2 | Controls hardened; 33 tests; [06](Meetings/06_jamie_serving_readiness_red_team.md) / [07](Meetings/07_jamie_serving_round2_red_team.md) |
| 2026-07-16 | Risk meeting (Arvind) | **JR-REQ-01/02** fairness mandatory in final deck/report; **JR-REQ-03** dashboard build/feature tour accessible; standing HITL/ZDR/RBAC still required |
| 2026-07-16 | Docs cascade | Requirements register · fairness narrative · feature tour · architecture slide in presentation/report |
| 2026-07-16 | Anti rubber-stamp (JR-REQ-19) | Attention ack on Approve · high-stakes cue · audit timing — [review_fatigue_mitigation.md](../Sprint5/review_fatigue_mitigation.md) |
| Pending | Follow-up on JR-OPEN-01…05 | Draft: [08_jamie_followup_message.md](Meetings/08_jamie_followup_message.md) |

**Canonical requirements:** [jamie_requirements_register.md](../Sprint5/jamie_requirements_register.md)  
**Meeting pack:** [04_jamie_sprint5_risk_prep.md](Meetings/04_jamie_sprint5_risk_prep.md) · cheat sheet · feature tour

---

## 6. Cross-stakeholder dependencies (post–Jamie meeting)

| If Jamie decides… | Impact on others |
|-------------------|------------------|
| Hard EOD release gate (JR-OPEN-01) | Sam/Morgan: may block “ship” language until metric within bound |
| Extra protected attributes (JR-OPEN-02) | Sam: may need new Fairlearn slices if columns exist |
| Second mailer approval (JR-OPEN-03) | Morgan: ops workflow / capacity story changes for production |
| Extra audit fields / Entra (JR-OPEN-04/05) | Sam: WS-2 hosting / IdP; out of current prototype scope unless unlocked |
