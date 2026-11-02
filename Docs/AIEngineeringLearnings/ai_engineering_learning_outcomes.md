# AI Engineering Learning Outcomes
*Meridian Savings Churn Project*

Completing this project as a solo developer assisted by advanced AI tools transitions you from a standard Data Scientist or Developer into a modern **AI Engineer**. 

An AI Engineer sits at the intersection of Software Engineering, Machine Learning, and Systems Architecture. Here is exactly what you will learn and demonstrate by the end of this sprint:

## 1. GenAIOps & Prompt Engineering Infrastructure
*The difference between a hackathon script and a production AI system.*
- **Prompt Versioning with `.prompty`:** You will learn how to treat LLM prompts as code. By using Microsoft's Prompty format, you will separate prompt logic, hyper-parameters, and context grounding from your Python application logic.
- **Agent Orchestration (Microsoft Foundry):** You will learn how to scaffold, deploy, and monitor an AI agent end-to-end using the `azd` CLI and the Microsoft Foundry SDK, bypassing the need to write raw deployment boilerplate.

## 2. Agentic Workflow Management (AI Pair Programming)
*Maximizing output by managing AI, not just writing code.*
- **Delegation vs. Review:** You will learn the crucial skill of knowing *what* to delegate to a high-context frontier model (Antigravity doing data aggregation and complex boilerplate) versus *what* to handle yourself using a fast IDE (Cursor for code navigation and logic review).
- **Context Management:** You will learn how to structure project files and rules (like `.cursorrules` and `AGENTS.md`) so that autonomous agents generate code that adheres to your strict corporate security policies (e.g., avoiding loopback port binding). **Unidirectional sync:** `AGENTS.md` is the shared source of truth for Antigravity *and* Cursor; `.cursorrules` is a downstream compile only (never the master).
- **Split workflow for notebooks (Human Orchestrator):** Corporate AppLocker / sandbox limits mean the agent often **cannot reliably execute** heavy Jupyter notebooks or large CSV pipelines itself. The durable pattern is: agent **authors and edits** notebook cells (and may optionally mirror logic in a scratch script for a quick check), **you** run the notebook in the IDE with the global `py` kernel, then the agent **reads saved cell outputs** from the `.ipynb` (or your pasted results) as source of truth. Treating a side script’s numbers as final without a notebook re-run risks drift and stale outputs—Sprint 1 EDA (§2.1 / §8.1) and FE export + Gini screen made this explicit.
- **Docs before code (`/docs-before-code`):** When an *implemented* artifact is red-teamed, do **not** open the notebook first. Attack note → signed checklist (implement / investigate / defer + label-unlock gates) → code → doc cascade. Skillified in Sprint 1 from the EDA revision loop; see `.agents/skills/docs-before-code/SKILL.md` and `Docs/Sprint1/ai_engineering_learnings.md`.
- **Dual sprint close-out:** Every sprint ends with both a **debrief** (delivery: what/how/why/results) and a **retrospective** (process: keep/stop/start + skillify)—not interchangeable. Mandatory in `AGENTS.md` §4; Sprint 0–4 filed under `Docs/SprintN/`.
- **Frozen-metrics handover (Sprint 4):** Final decks and reports cite locked ops JSON (`sprint2_run_summary_v2.json`) and preserve the first-run freeze. The historical pack included Marp slides, a report, a demo runbook and fixtures (below ~0.21; flagged ~0.75). The Marp working document and presenter generator are not included in this public checkout. Current public slides: [standalone presentation](../Presentations/Meridian_Presentation_Standalone.pptx). Post-close red-team: [sprint4_handover_red_team.md](../Sprint4/sprint4_handover_red_team.md).
- **Prompt-as-code + Glass-Box (Sprint 5 mid):** `.prompty` render path + demo RBAC (ADR 007; UI + `X-Demo-Role`) shipped; Container Apps / Foundry / live Azure endpoint remain open — [../Sprint5/progress.md](../Sprint5/progress.md). Impl red-team: [sprint5_impl_red_team.md](../Sprint5/sprint5_impl_red_team.md).
- **Demo fixtures as product:** A handover demo that only shows below-threshold refusal is incomplete — commit a verified flagged row and wire UI presets so Act C is executable without hunting scores.

## 3. Applied Responsible AI (AI-901 Practical Application)
*Translating certification theory into code.*
- **Algorithmic Transparency:** You will learn how to open the "black box" of modern machine learning. By applying `SHAP` (SHapley Additive exPlanations) and `dtreeviz`, you will learn how to generate human-readable explanations for AI decisions—a critical skill for highly regulated industries like banking.
- **Quantitative Fairness:** You will learn how to write code that actively measures Disparate Impact and Equal Opportunity across demographic slices (e.g., age and state) to ensure compliance with Microsoft's Responsible AI principles.

## 4. Systems Architecture under Security Constraints
*Building AI solutions that actually survive in the real world.*
- **Environment Resiliency:** You will learn how to architect and test backend APIs (like FastAPI) using in-memory ASGI transports (`httpx.ASGITransport` / `TestClient`). This circumvents strict corporate Windows environments (EDR, AppLocker, loopback restrictions) that typically kill local AI development. **Evidence:** `tests/serving` — **15 passed** (Sprint 5; was 7 at Sprint 3 close) without binding a port.
- **Python Module-Level Execution (`py -m`):** You will understand why running Python utilities as modules via the global launcher (`py -3.13 -m <module>`) is immune to OS `PATH` configuration issues under corporate constraints. By bypassing external OS-level executable search (`.exe` wrappers blocked by AppLocker or missing in PATH) and utilizing Python's internal dependency resolution (`sys.path`), you can run CLI packages seamlessly.
- **Portable ML serve artifacts:** Experiment tracking (MLflow SQLite) is not the same as a runtime load path when DBs/artifacts are gitignored. **Sprint 3:** export booster + fitted preprocessor + frozen meta to committed `Models/ops/`; pin ops threshold (`t≈0.701`) and refuse boot on feature-name mismatch. Details: `Docs/Sprint3/ai_engineering_learnings.md`.
- **In-process Friction-Gate UI:** Streamlit can share the FastAPI service layer without localhost HTTP — useful when loopback is flaky under AppLocker.

## 4a. GenAI governance in the request path (Sprint 3)
*Compliance is an API design problem, not only a UI caption.*
- **Server re-score before side effects:** Never trust client `flagged` before creating a retention draft.
- **Pydantic determinism on create and PATCH:** Cap hallucinated offers (e.g. interest rate ≤ 3.5%).
- **ZDR scrubbing:** Redact PII before any LLM payload; drop `customer_id` / email-like keys.
- **No autonomous send:** Omit `/send` entirely (ADR 003). Statuses stop at `approved` / `rejected`.
- **Graceful Azure absence:** Optional credentials + stub / `stub_fallback` so demos and DoD are not blocked on the gateway.
- **Prompt-as-code (Sprint 5):** Azure chat messages from `retention_draft.prompty` via `prompty.prepare`; scrub-before-render; embedded fallback if Prompty fails.
- **Demo Glass-Box RBAC (Sprint 5):** Same permission matrix in Streamlit and FastAPI (`X-Demo-Role`); audit trail; not production SSO (ADR 007).
- **AppLocker-safe RAG + chunk granularity (Sprint 5):** Methodology Q&A uses Azure embeddings + pure-Python cosine (ADR 010), not Chroma. Retrieval quality includes **chunk size** — H2-only splits stuffed whole chapters into `top_k=3`; bounded ATX/paragraph chunks + cache `schema_version` fixed the “whole report” expander. Cross-encoder rerank remains Phase 6.

## 5. Temporal Framing for Predictive AI
*Avoiding the most common trap in Applied Machine Learning.*
- **Time-Series Leakage Prevention:** You will learn how to conceptually and programmatically align feature windows (observation month `t` only) with target windows (`t+1` left-looking churn) in panel data. Understanding how to build out-of-time (OOT) evaluation sets is what separates junior modelers from senior AI Engineers.
- **Semantic vs empirical leak checks:** Asserting column names do not contain `t+1` / `future` is cosmetic. Sprint 1 FE added an **empirical Gini screen**: fit a fast Random Forest on a training sample; if any feature’s importance **> ~0.50**, treat as a likely mathematical leak. Result: top feature `Running_Balance_Rounded` **0.273** (pass). Balance leading is expected for a rounded-$0 label — not proof of future peek. Details: `Docs/Sprint1/ML_Learnings.md`, `02_feature_engineering.ipynb`.
- **Independent label rebuild:** Feature engineering reloads raw CSVs and re-applies ADR 004 rather than pickling EDA state; matching positive rates (~11.76%) are a consistency check across notebooks.

## 6. Native Agent Extensibility & Skill Architecture
*Scaling AI agent capabilities without collapsing the context window.*
- **Rules vs. Skills:** You will learn the architectural difference between passive behavioral rules (e.g., `AGENTS.md`) and deterministic, executable toolsets (Skills). 
- **The `/skillify` Pipeline:** You will learn how to systematically upgrade complex or frequently-failed text rules into hardcoded, executable helper scripts (or full `SKILL.md` contracts) to guarantee consistent agent performance. **Sprint 1 worked example:** the EDA red-team → revision loop became `/docs-before-code` and was indexed from the sprint retrospective.
- **Context Economy & Lazy Loading:** You will understand how agents dynamically discover tools and utilize "lazy loading"—keeping only tool summaries in active memory and pulling heavy instructions (like `SKILL.md`) only when autonomously triggered, thus preventing context bloat and hallucination.

## 7. Managing Agentic Tunnel Vision & The Documentation Cascade
*Recognizing and mitigating the failure modes of AI coding agents.*
- **The Core Risk:** Agents excel at tactical problem-solving (e.g., fixing an MLflow AppLocker crash by swapping to SQLite) but suffer from "tunnel vision." They fix the immediate error but often fail to cascade the "Why" into strategic documentation (like an ADR). Managing this separates a code-monkey from an AI Orchestrator. 
- **The 4-Part Circuit Breaker:** We enforce four strict strategies to force the AI to act like a Systems Architect:
  1. **Enforce the "Docs-Before-Code" Pattern for Bug Fixes:** When hitting a major blocker, diagnose the error first. If the fix requires changing a dependency, storage backend, or architecture, a markdown plan must be proposed and approved before any code is written (skillified via `/docs-before-code`).
  2. **Architectural Trigger Rules:** Global Agent rules (`AGENTS.md`) dictate that modifying a core dependency, database, or bypassing an OS-level constraint immediately triggers a mandatory pause to ask: *"Does this change warrant a new Architecture Decision Record (ADR)?"*
  3. **End-of-Session Reflection Prompt:** Before closing a sprint, the agent must reflect on its context window: *"Did we make any structural, infrastructure, or data-flow decisions that are not currently documented in the ADRs folder?"*
  4. **Human-in-the-Loop Diff Reviews:** The ultimate safety net. Reviewing git diffs (e.g., seeing a directory path change to a database URI) serves as the human trigger to catch undocumented infrastructure shifts.


## 8. Verifying Live GenAI Integrations (Sprint 5 close-out)
*Graceful fallbacks keep demos running — and hide breakage.*
- **The trap:** A stub drafter and keyword-only retrieval are good resilience design, but they make a broken integration look healthy. In Sprint 5 two provider-side changes (a `gpt-5-mini` deployment rejecting `max_tokens`; a Foundry project endpoint that 404s on embeddings) went unnoticed behind them.
- **The practice:** Surface which path ran (`drafter_source`, `retrieval_mode`, `hybrid`) and assert the live path after any deployment or `.env` change. Keep model-specific request rules (reasoning models use `max_completion_tokens`, no custom `temperature`) in one helper.
- **Packaging:** Pin the serving image to the environment that serialized the model, and copy every runtime input into the image. Test the UI as a program (Streamlit `AppTest`), not just the API.
- **Evidence:** [../Sprint5/sprint_debrief.md](../Sprint5/sprint_debrief.md) §4 · [../Sprint5/docker_smoke_checklist.md](../Sprint5/docker_smoke_checklist.md) DK-07…DK-13.

---
> [!NOTE] 
> **Why this matters for your career:**
> Being an AI Engineer today is less about knowing how to write backpropagation algorithms from scratch, and more about knowing how to safely, fairly, and reliably stitch together frontier models, robust data pipelines, and production infrastructure. This project forces you to exercise all three muscles simultaneously.
