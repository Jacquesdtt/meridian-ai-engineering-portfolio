# Pre-Project Planning Document: Meridian Savings Churn

A strong pre-project planning document acts as the "North Star" for your project. Because you are using this to prep for the **Azure AI Fundamentals (AI-901)** certification, your planning document should map standard Data Science lifecycle elements directly to Azure AI terminology and Responsible AI principles.

Here is an outline of what you should include, with prompts on how to fill it out:

## 1. Business Objective, Scope & ROI Business Case (Phase 1 & 4)

*Define exactly what workflow constraint you are solving and translate it into a financial outcome.*

- **Problem State:** Relationship Managers lack the bandwidth to manually identify churning accounts and draft highly contextual retention emails. This constraint results in lost liquidity.
- **Current State:** Zero automated triage. High-value accounts churn without intervention.
- **Expected Benefit:** Automating identification (XGBoost) and accelerating outreach (GenAI) can reduce response times and prevent X% of churn, saving $Y in AUM.
- **In Scope:** Predicting churn for the June 2020 window using the `transactions` and `customers` datasets.
- **Out of Scope:** Executing actual marketing campaigns or targeting other Meridian products (checking accounts, mortgages).

## 2. Target Definition & The 6-Factor Assessment (Phase 2)

*Resolve the ambiguity around "Churn" and rigorously validate the AI opportunity.*

- **Operational Definition of Churn:** "A customer is considered churned if their balance drops to zero AND they have no deposit activity in the subsequent 30 days." *(Validate with Sam).*
- **The 6-Factor Filter Validation:**
  1. **Pain:** High (Lost liquidity).
  2. **Frequency:** High (Monthly churn cycle).
  3. **Economic Value:** High (Saving Top 10% high-risk customers yields immediate ROI).
  4. **Data Availability:** High (Clean `transactions` and `customers` datasets).
  5. **Technical Feasibility:** High (Standard XGBoost classifier + Azure OpenAI).
  6. **Adoption Risk:** Medium (Sales team trust). *Mitigated via Friction as a Feature (UI review).*

## 3. Data Availability & Hidden Assumptions

*Document the raw materials you are working with and vigorously expose any hidden assumptions early.*

- **Datasets:** `transactions_tm1_e.csv` (time-series), `customers_tm1_e.csv` (demographics).
- **Hidden Assumptions to Validate:**
  - *Assumption:* The current date is exactly 2020-05-31 and no future data leaked into the dataset.
  - *Assumption:* All data provided is representative of the active customer base (no sample bias).
  - *Assumption:* Account balances can never be negative.
  - *Assumption:* The "state" column maps cleanly to standard US demographics without nulls or typos.
    *(Each assumption must be validated via EDA in Sprint 1 rather than taken for granted).*
- **Data Privacy:** Acknowledge that data must not contain PII before touching the GenAI endpoints.

## 4. Architecture & Tooling Stack (Azure & AI-901 Focus)

*List the technologies you will use.*

- **Development Environment:** Cursor (code review), Antigravity (heavy AI code generation), Python (`uv` for dependency management).
- **Machine Learning (MLOps):** `MLflow` for tracking experiments and metrics (mapping to Azure Machine Learning concepts), `FastAPI` for model serving.
- **Generative AI:** Azure OpenAI endpoint for retention emails, `Prompty` for prompt version control and evaluation.
- **Application Layer:** `Streamlit` for stakeholder dashboards.

### Senior AI Engineering Upgrades (Sprint 3 & 4 Extensions)

*To elevate this to a production-grade enterprise system, the following advanced patterns will be integrated:*

- **Automated LLM Evals (LLM-as-a-Judge):** Automated evaluation loops to score generated retention emails against a compliance rubric before human review.
- **PII Redaction Middleware:** An explicit `pii_scrubber.py` interceptor (using Microsoft Presidio or regex) in FastAPI to redact sensitive data before hitting Azure OpenAI.
- **LLM Observability & Tracing:** Explicit telemetry instrumentation around Azure OpenAI calls to track token usage, latency, and prompt drift.

## 5. Responsible AI Framework

*Crucial for AI-901 prep. Detail how you will address the 6 Microsoft Responsible AI principles.*

- **Fairness:** How will you ensure the model doesn't unfairly target specific age bands or states? (Using Disparate Impact analysis).
- **Transparency:** How will you explain decisions to stakeholders? (Using `SHAP` and `dtreeviz`).
- **Accountability:** Who is responsible for the model if it fails? (You / Sam).
- **Privacy & Security:** Ensuring no PII is sent to the Azure OpenAI endpoint.
- **Reliability & Safety:** Setting up fallback logic if the Streamlit app or API goes down.
- **Inclusiveness:** Ensuring the Streamlit dashboard is accessible.

## 6. Trust, Compliance, & Risk Framework

*Applying the "Three-Pillar Framework" to ensure this system is treated as a heavily governed software component, not a black box of magic.*

- **Pillar 1: Data Sovereignty & Zero Data Retention (The Airlock):** We deal with highly sensitive retail banking data. We architect the system using Enterprise Managed APIs (Azure OpenAI) configured with explicit Zero Data Retention (ZDR) policies. A lightweight scrubbing middleware will redact sensitive PII (Account IDs, Names) before text ever hits the LLM. No customer data ever becomes training weight.
- **Pillar 2: Deterministic Outputs over Probabilistic Guesses:** In banking, probabilistic text generation is a massive risk. We rely on **Pydantic Validation** and **Semantic Routing**. The LLM never "guesses" churn; the XGBoost model provides the hard deterministic statistical score. The LLM merely translates that factual output back into polite English (retention emails), enforced by strict Pydantic schemas to prevent hallucinations.
- **Pillar 3: Governance & The "Human-in-the-Loop" Audit Trail:** Our baseline requirement is total auditability using **"Friction as a Feature"**. If the system identifies a high-value customer churning, it does NOT automatically email them. It hits a hard-coded friction gate, drafts a structured brief into a review queue, and pauses execution for a human Relationship Manager to approve. We are building a bionic exoskeleton for the bank, not an autonomous replacement.

## 7. Sprint Plan & Milestones

*Break the 10-day project into concrete deliverables.*  
*Live Gantt / status:* [project_schedule.md](project_schedule.md) (updated 2026-07-10).

| Sprint | Days (calendar) | Theme | Status |
|--------|-----------------|-------|--------|
| **0** | 2026-07-06…07 | Scaffolding, ADRs, agentic harness | **Done** |
| **1** | 2026-07-07…10 | EDA, churn lock (ADR 004), FE export + Gini screen | **Done** |
| **2** | 2026-07-13…14 | Temporal split, XGBoost + MLflow, SHAP / fairness | **Next** |
| **3** | 2026-07-15…16 | FastAPI, Prompty GenAI, Friction-Gate Streamlit | Planned |
| **4** | 2026-07-16…17 | Final report, presentation, handover | Planned |
| **5** (optional) | — | Docker / Azure Container Apps | Stretch |

- **Sprint 1 closed with:** `training_data.csv` (2,263,608 × 27, pos 11.76%), dual close-out, `/docs-before-code` skill.
- **Sprint 2 plan:** [Docs/Sprint2/sprint_plan.md](../Sprint2/sprint_plan.md).

## 8. Risks & Mitigations

*What could go wrong and how will you prevent it?*

- **Data Leakage:** *Risk:* Using future data to predict past churn. *Mitigation:* Strict temporal cross-validation splitting. *(Implemented in Sprint 2 as a single chronological fit / validation / test split, not CV.)*
- **Prompt Injection/Hallucination:** *Risk:* The GenAI bot giving wrong answers about the report. *Mitigation:* Strict system prompts in `.prompty` and grounded RAG context.
- **Acausal Coordination Cascade (Tail-Risk):** *Risk:* Unsupervised agents entering feedback loops. *Mitigation:* The "Friction as a Feature" human-approval gate strictly limits autonomous cascading.

## 9. Learning Objectives & Knowledge Acquisition

*Document exactly what you need to learn during this project and how you intend to acquire that knowledge (Crucial for AI-901 and AI Engineering growth).*

- **What I need to learn:**
  - How to implement and interpret `SHAP` and `dtreeviz` for black-box models.
  - How to manage and version prompts natively using Azure's `.prompty` format.
  - How to practically apply Microsoft's Responsible AI principles to a real dataset.
- **How I will learn it:**
  - *AI Pair Programming:* Use Antigravity (`/ml-best-practices`) to generate the initial SHAP/dtreeviz boilerplate, then review the documentation it links to.
  - *Hands-on Experimentation:* Deliberately break the `.prompty` templates to see how the Azure OpenAI endpoint responds and handles errors.
  - *Stakeholder Validation:* Present the Responsible AI findings in the Sprint 2 demo to see if it stands up to "Jamie's" risk scrutiny.
