# AI Business Partner: Learning Outcomes & Objectives

This document translates the "Synthesized AI Opportunity & Workflow Framework" into concrete learning outcomes for Jacques du Toit, bridging the gap between technical AI engineering and executive business strategy.

## The Core Axiom
**Never start with AI. Start with the problem.** 
The most valuable skill developed in this project is operating at the intersection of Technology, Business, Product, and Strategy.

The Golden Sequence implemented across this project:
`Customer Problem → Business Value → Workflow → Data → AI Capability → Execution`

## Phase 1: Problem Discovery & Qualification
*   **Outcome:** Transition from a purely technical mindset ("What can XGBoost/Azure OpenAI do?") to a business mindset ("What is the workflow constraint at Meridian Savings?").
*   **Application:** Identifying that the core constraint is not a lack of data, but the inability of Relationship Managers to manually identify and contextually engage churning customers at scale.

## Phase 2: The 6-Factor Opportunity Assessment
*   **Outcome:** Ability to vigorously filter AI opportunities using the 6-factor framework.
*   **Application (Meridian Savings Case):**
    *   **Pain (High):** Customer attrition drains core liquidity.
    *   **Frequency (Monthly):** Continual churn window.
    *   **Economic Value (High):** Saving 10% of churning AUM yields massive ROI.
    *   **Data Availability (High):** `transactions` and `customers` datasets exist and are clean.
    *   **Technical Feasibility (High):** XGBoost + RAG easily solves this without fundamental R&D.
    *   **Adoption Risk (Medium):** Risk of Sales Team rejecting automated emails. *Mitigation:* Friction as a Feature (Human-in-the-Loop Review Queue).

## Phase 3: Prioritization & Strategy (Roger Martin Cascade)
*   **Outcome:** Ability to define strategic boundaries.
*   **Where will we play?** Internal Sales/Retention workflows (Not external customer chatbots).
*   **How will we win?** Faster intelligence gathering for Sales Reps and highly contextual, targeted retention drafting.
*   **What capabilities are required?** MLOps (XGBoost), Prompt Engineering (Azure Prompty), and Data Pipelines.

## Phase 4: Stakeholder & ROI Engineering
*   **Outcome:** Translating AI capabilities into financial metrics and managing political capital.
*   **Application:** Creating an explicit ROI Business Case (e.g., Cost of problem vs. Expected Benefit) and executing rigorous Stakeholder Mapping (identifying Jamie in Risk as a potential Blocker, and Sam in Data Science as a Champion).

## Phase 5: Solution Architecture & Delivery
*   **Outcome:** Executing the Architecture Sequence:
    `User Intent → Planner (Logic) → Agent → Tools (APIs) → Data (RAG) → Memory → Evaluation → Governance`
*   **Application (Sprint 3 — delivered 2026-07-14):**
    *   FastAPI serves the Sprint 2 **ops contact policy** (`t≈0.701` / top 5%), not the max-F1 flood cut.
    *   GenAI retention **drafts** only, behind Friction-Gate (Approve/Edit/Reject); **Approved ≠ Sent**; no `/send` route (ADR 003).
    *   Thin Streamlit review UI shipped in Sprint 3; Glass-Box/RBAC was optional at that time.
    *   Stakeholder demo pattern: `/health` → below-threshold refusal → flagged draft review (Sprint 4 fixtures: [../Sprint4/fixtures/](../Sprint4/fixtures/)).
    *   Sprint learnings: [../Sprint3/ai_bp_learnings.md](../Sprint3/ai_bp_learnings.md) · [../Sprint3/ai_engineering_learnings.md](../Sprint3/ai_engineering_learnings.md).
*   **Application (Sprint 5 — mid, 2026-07-14):**
    *   `.prompty` prompt-as-code + **demo Glass-Box RBAC** (ADR 007) shipped — compliance read-only + audit; agents approve; glass-box shows ops cut + frozen SHAP.
    *   Still open for Phase 5: live Azure endpoint, Container Apps hosting, Foundry/`azd` — [../Sprint5/progress.md](../Sprint5/progress.md).

## Phase 5 addendum: Ranking success ≠ contact policy
*   **Outcome:** Separate “model ranks better than heuristic” from “who enters the retention queue.”
*   **Application:** Max-F1 (~21% precision, ~249k FP) cleared ranking DoD but failed ops. Capacity dial (top 5%) made Friction-Gate usable. Do not promise 40% precision on these scores without calibration/model lift (see `Docs/Sprint2/ML_Learnings.md` §2.4a).

## Phase 5 addendum: Milestone 4 handover (Sprint 4 — 2026-07-14)
*   **Outcome:** One assessor-ready story arc without inventing new metrics or expanding into cloud/dashboard mid-close.
*   **Application:** Milestone 4 freeze: [../Sprint4/presentation.md](../Sprint4/presentation.md) *(legacy Marp)* · [../Sprint4/final_report.md](../Sprint4/final_report.md) · [../Sprint4/demo_runbook.md](../Sprint4/demo_runbook.md) · [../Sprint4/fixtures/](../Sprint4/fixtures/). **Live deck SoT:** [../Presentations/generate_presentation.py](../Presentations/generate_presentation.py) (dual PPTX). Ranking slides omit threshold-dependent accuracy next to PR/ROC. Stakeholder lines unchanged from Sprint 3 BP learnings. Phase 5 follow-ons that were still open at Milestone 4 (`.prompty`, Glass-Box RBAC) are now mid-sprint landed — see [../Sprint5/progress.md](../Sprint5/progress.md); Foundry / Container Apps / live Azure remain open.

## Phase 5 addendum: Sprint 5 close-out (2026-09-24)
*   **Outcome:** GenAIOps depth (prompt-as-code, Glass-Box RBAC, hybrid RAG, persona dashboards, a verified API container) delivered without loosening Friction as a Feature or reopening the model.
*   **Application:** Report which path actually ran, not only that a feature responded: a demo can look fine while drafts come from the stub and search is keyword-only. Persona views must move real drivers (Sam's what-if now moves running balance, the top SHAP driver). Cloud hosting and `azd` carry over; nothing claims them live. Details: [../Sprint5/sprint_debrief.md](../Sprint5/sprint_debrief.md) · [../Sprint5/ai_bp_learnings.md](../Sprint5/ai_bp_learnings.md).
