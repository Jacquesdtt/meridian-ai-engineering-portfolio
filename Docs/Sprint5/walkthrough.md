# Sprint 5 Walkthrough: Containerisation, GenAIOps & Close-out

**2026-10-20 maintenance:** local release checks and the production browser/performance baseline are recorded in [learning-app validation](../../educational_web_app/docs/validation_2026-10-20.md). Run the normal release commands, then `node scripts/validation-preview.mjs` inside `educational_web_app` for the isolated no-store timing preview. This pass reconciles tracking and deployment wording; it does not redeploy Azure. Live marker revalidation is blocked by HTTP 401, and the participant trial remains open.

> **Closed 2026-09-24.** Delivery record: [sprint_debrief.md](sprint_debrief.md) · process record: [sprint_retrospective.md](sprint_retrospective.md). Sections are in execution order; earlier sections describe the system as it was on their date.

## 1. Overview
In Sprint 5, we moved our local FastAPI application toward secure cloud hosting (Workstream 2). Due to corporate policy blocking/delaying Azure endpoints and the split-brain database risk documented in [ADR 008](../Architecture/ADRs/008-split-brain-state.md), we prioritized building a portable OCI-compliant container using Docker.

## 2. Changes Made
*   **API-First Deployment:** We decided to containerise *only* the FastAPI backend to avoid isolating the Streamlit UI from the `drafts.db` SQLite database.
*   **`Dockerfile`:** Created a Python 3.13 slim image that packages `src/` and `Models/`, while explicitly ensuring that local secrets (`.env`) are never baked into the image.
*   **`.dockerignore`:** Added rigorous exclusions to prevent `mlflow.db`, `mlruns/`, `.env`, and cache folders from bloating the image or leaking sensitive data.
*   **`docker-compose.yml` (Local Fallback):** We provided a `docker-compose.yml` file as a resilient fallback in case Azure Container Apps remains blocked. This compose file explicitly maps the `Data/processed/` directory to a named volume (`drafts_db_data`), ensuring that the local SQLite database persists across container restarts during demonstrations via Rancher Desktop or Docker Desktop.

## 3. WS-5: Streamlit Refactoring & Efficient-Frontier Validation
While waiting for Docker admin privileges, we expanded and hardened the Streamlit application (`Code/Sprint3/friction_gate_app.py`) following a dual-axis code review:
*   **Single-File Routing (Sidebar):** Migrated from `st.tabs()` to `st.sidebar.radio` for reliable programmatic routing and to prevent the `pages/` subprocess crash vector (ADR 011).
*   **Morgan's Business View (Efficient-Frontier Validated):** Rebuilt the view to satisfy UI requirements dynamically without external script dependencies. **Verified Efficient-Frontier Logic:**
    *   The "Tailored Cohort" is explicitly routed to the Friction-Gate using a strict ops threshold of `p >= 0.701` (Max 300).
    *   The "Automated Cohort" broadens the net to `p >= 0.50` bypassing the Friction-Gate.
    *   The KPI correctly reflects "Total AUM at Risk" as a straightforward sum of flagged balances (not probability-weighted EV).
*   **Sam's ML View (Interactive What-If):** Allows data scientists to load a baseline customer and adjust key SHAP drivers (e.g., `Running_Balance`, the #1 frozen SHAP driver — `start_balance` was used until 2026-09-24 but is not a driver, so it never moved the score) via sliders. We refactored this logic to manipulate strict Pydantic `CustomerFeatures` using `.model_copy(update=...)` for type safety.
*   **Jamie's Methodology RAG Bot:** Pure-Python retrieval in `src/genai/rag_engine.py` (Azure embeddings + cosine when live; TF-IDF offline), grounded on `Docs/Final_Report_Official.md`. Pydantic `BaseModel` index/chunk types (ADR 010).

## 3b. Azure OpenAI RAG hardening (2026-07-17)
Executed signed checklist [sprint5_azure_rag_revision_plan.md](sprint5_azure_rag_revision_plan.md) (docs-before-code):
*   **RAG-01:** `tenacity` exponential backoff on Azure chat in `rag_engine.py` and `drafter.py`
*   **RAG-02:** SQLite `PRAGMA journal_mode=WAL` + `busy_timeout=5000` in `draft_store.py`
*   **RAG-03:** `maxReplicas: 1` in `infra/azure-container-app.yaml` + Compose `deploy.replicas: 1` (ADR 008)
*   **RAG-04:** JSON disk cache `Data/processed/rag_index_cache.json` (mtime + model + schema_version)
*   **RAG-05:** Log `prompt_tokens` / `completion_tokens` and SQLite `OperationalError`
*   **Validation:** `pytest tests/serving tests/genai -q` → **47 passed** (pre-submission); later **60** with submission helpers
*   **ADRs cascaded:** [008](../Architecture/ADRs/008-split-brain-state.md) · [010](../Architecture/ADRs/010-applocker-safe-in-memory-rag.md) · [013](../Architecture/ADRs/013-azure-openai-resilience-tenacity-telemetry.md) (new)

## 3d. RAG chunking fix (2026-07-17)
Demo expander looked like the full report. Attack → plan → code ([rag_chunking_red_team.md](rag_chunking_red_team.md) · [rag_chunking_revision_plan.md](rag_chunking_revision_plan.md)):
*   **Cause:** `_chunk_markdown` only split on `#`/`##` → 10 chapter chunks (max ~6k chars); `top_k=3` ≈ ~38% of report.
*   **Fix:** Split on `#`–`######` + paragraph pack ≤1200 chars → **44** chunks; ops-threshold coverage ~**3.6%**.
*   **Cache:** `_CACHE_SCHEMA_VERSION=3` invalidates stale indexes when source mtime is unchanged.
*   **Honest scope:** Still no cross-encoder rerank (Phase 6). Regression tests in `tests/genai/test_rag_engine.py`.
*   **Ops note:** Restart Streamlit so `@st.cache_resource` rebuilds/re-embeds.

## 3c. May-2020 grading submission (2026-07-17)
Executed signed [submission_inference_revision_plan.md](submission_inference_revision_plan.md):
*   Hardened `Code/Sprint3/create_submission.py` + `submission_helpers.py` (fail on missing May rows; meta feature cols; probabilities only)
*   `StartingFiles/validate_submission.py` — schema / identity / `[0,1]` bounds
*   `submission_df14.csv` — 17,599 rows; validated OK
*   April FE parity vs `training_data.csv` — [PASS](submission_fe_parity_spotcheck.md)
*   **ADR 014** portable May-2020 inference ([014](../Architecture/ADRs/014-portable-submission-inference.md))
*   Tests: `pytest tests/submission tests/serving tests/genai` → **60 passed**

## 3e. One enforcement point and hybrid RAG (2026-09-18 → 2026-09-22)
*   **F8 (2026-09-18):** Streamlit stopped importing the draft store and model; every score, draft, decision and audit read now goes through FastAPI via `FrictionGateClient` (`http` by default, `inprocess` for AppLocker machines). ADR 006 follow-on.
*   **ADR 015 (2026-09-22):** RAG became hybrid (Okapi BM25 + dense embeddings fused with Reciprocal Rank Fusion, then an LLM rerank) and moved behind `POST /rag/ask`; fairness numbers now come from one accessor via `GET /model/fairness`.
*   The WS-5 note in §3 about cosine-only retrieval describes the July state.

## 4. Validation
*   Local `pytest tests/submission tests/serving tests/genai -q` → **60 passed**.
*   Streamlit files successfully passed `py_compile` checks.
*   The setup is strictly aligned with the principal engineer's red-team critique: FastAPI-first deploy, no speculative runbooks, no C++ compilation vectors, and a solid local fallback.

## 4b. Docker packaging sanity + smoke checklist (2026-07-17)
*   Static review of `Dockerfile` / `docker-compose.yml` / `.dockerignore` / `infra/azure-container-app.yaml` — see [docker_smoke_checklist.md](docker_smoke_checklist.md).
*   Hardened `.dockerignore` (`.git/`, `Data/`, root CSVs) to shrink build context; image still only `COPY`s `src/` + `Models/`.
*   Host pre-check: `verify_s4_fixtures.py` → below **0.2074** / flagged **0.7509** OK.
*   Live `docker compose` smoke **blocked**: Rancher CLI installed but engine pipe `docker_engine` not up yet.

## 4c. Live Docker smoke + dashboard verification (2026-09-24)
*   Rancher Desktop up (one restart needed: the Windows proxy timed out on the Hyper-V socket while the VM engine was healthy).
*   `docker compose build` / `up` → every [docker_smoke_checklist.md](docker_smoke_checklist.md) §3 step PASS: `/health` ops pin, 400 without role, fixtures 0.7509 / 0.2074 (identical to host), 422 below-threshold draft, 403 compliance approve, SQLite volume survives restart.
*   **Bugs found and fixed:**
    *   **Dashboard crashed on load for every role:** `Permission.use_viva_grader` had no sidebar label → `KeyError`. Labels moved to `src/serving/rbac.py` (`PERMISSION_LABELS`) with a coverage test.
    *   **Image installed unpinned deps:** scikit-learn could drift from the 1.9.0 that pickled the preprocessor. Now `requirements.serving.txt` (pinned from `requirements.lock`, Linux, `xgboost-cpu`), 723 MB image, `HEALTHCHECK`.
    *   **Fairness + RAG broken in the container:** their input files lived under the dockerignored `Docs/`. Re-included.
    *   **Azure drafts silently fell back to the stub:** the deployment is now `gpt-5-mini`, which rejects `max_tokens`. Shared `chat_limit_params()` sends `max_completion_tokens` to reasoning models (drafter, RAG answer + rerank, viva grader).
*   **Dashboard improvements:** Sam's view shows the precision-recall curve (the primary metric) beside the ROC curve, instead of ROC alone; its balance slider now drives `Running_Balance`; the baseline delta is measured against the scored fixture (it showed −0.0026 with nothing moved). Morgan's view reads `Data/processed/business_metrics.json` when generated and labels the fallback figures as illustrative. `generate_business_metrics.py` reads the pinned threshold instead of hard-coding 0.701.
*   **Verification:** `AppTest` rendered all 19 role × page combinations against the container with no errors; `pytest tests` → **115 passed**.
*   **RAG hybrid restored (DK-13):** embeddings 404'd because `.env` uses a Foundry project endpoint (`…/api/projects/<name>`), whose OpenAI route serves chat but not embeddings. `normalize_openai_base_url()` now strips the project path; RAG reports `retrieval_mode=embedding, hybrid=true`.

## 4d. Relaunch, documentation alignment and close-out (2026-09-24)
*   Relaunched all local services with `launch_all.ps1` on the fixed code and re-checked live: `/health` ok, Azure draft `drafter_source=azure`, RAG `hybrid=true`, Streamlit and the teaching app respond.
*   **Documentation aligned with the code:**
    *   `Final_Report_Official.md`: Docker is FastAPI-only, not dual-service; the ML View has no "prediction browser" (built later the same day, §4e); the chat deployment is `gpt-5-mini`; retrieval is hybrid with rerank; test count is 115. Re-rendered to `churn_report_df14.pdf`. The render script now writes to a temp file first, because a failed Edge print had deleted the PDF.
    *   AI-901 interview guides (Docs + teaching-app copies): model names, the RAG diagram and caveats now describe hybrid retrieval, and the test count is current.
    *   Teaching app: Docker status and RAG code notes updated (lint + 23 tests pass).
    *   `Code_Walkthrough.md`, crash course, technical debt, ADR 008 follow-on, handoff prompts, and the deck generator's source text. The PPTX files themselves were left as committed, at the owner's request.
*   Dual close-out: [sprint_debrief.md](sprint_debrief.md), [sprint_retrospective.md](sprint_retrospective.md), learnings, aggregates, MEMORY.

## 4e. Post-close: prediction browser, per-customer SHAP, `azd` scaffold (2026-09-24)
*   **Why:** the brief lists "prediction browser" and "SHAP explanations per customer" for Sam; §4d had corrected the report to say they did not exist. This built them.
*   **Per-customer SHAP:** `src/serving/explain.py` calls `Booster.predict(pred_contribs=True)`, which is exact TreeSHAP with no `shap` package in the image. The one-hot `state_*` columns are summed back into `state`, and the rest are folded into "all other features" beyond `top_n`. The values are log-odds and satisfy `base + Σ = logit(p)`, so the two fixtures come out at exactly 0.7509 and 0.2074.
*   **Prediction browser:** `src/serving/cohort.py` loads `Data/processed/prediction_cohort.csv` and re-scores every row with the pinned model. Probabilities in the file are ignored. It caches on file mtime. Without the file it falls back to the two fixtures and labels itself. `Code/Sprint5/build_prediction_cohort.py` writes the file from one month of `training_data.csv` (default: the latest). With `--max-rows` it keeps every flagged customer and samples the rest.
*   **API + RBAC:** `GET /predictions` (filters: flagged only, min probability, id; paging), `GET /predictions/{id}/explain`, `POST /explain`. New `explain_predictions` permission for data scientist and compliance; agents get 403 and a `denied` audit row (ADR 007 follow-on).
*   **UI:** page "Prediction browser (Sam)", a ranked table with row selection feeding a SHAP bar chart (red raises risk, blue lowers it). Sam's what-if also shows SHAP for the edited row.
*   **Verification:** `pytest tests` → **123 passed**. `AppTest` rendered all 21 role × page combinations in-process. Browser check against a 40-row synthetic cohort (scratch only, deleted): row selection updates the chart. Container rebuilt: `/predictions` fixture fallback, `/explain` 0.7509, agent 403.
*   **Not verified:** a real cohort. `training_data.csv` is not on this machine.
*   **`azd`:** `azure.yaml` and `infra/main.bicep`, `resources.bicep` and `main.parameters.json` define:
    *   a new RG and Log Analytics;
    *   ACR Basic, with the image built remotely in it;
    *   a user-assigned identity with AcrPull;
    *   an ACA environment and an app with min = max = 1 replica;
    *   the OpenAI key read by `listKeys()` from the existing AI Services resource;
    *   an ingress IP allow-list.

    `azd provision --preview` passed. `azd up` was not run: it creates billable resources and was blocked by the agent's permission policy. The owner decides.

## 4f. Azure Container Apps deploy, access key, teardown (2026-09-24)
*   **Deploy:** the owner's `azd up` created the RG, registry, Log Analytics, environment and app. The remote build then failed: this subscription refuses ACR Tasks (`TasksOperationsNotAllowed`). With `remoteBuild: false` in `azure.yaml`, `azd deploy` built the image locally, pushed it and rolled a revision in about a minute.
*   **Live checks:**
    *   `/health` ok, `azure_configured=true`;
    *   fixture 0.7509;
    *   draft `drafter_source=azure`;
    *   RAG `embedding / hybrid / reranked`;
    *   `/predictions` and `/explain`;
    *   no role → 400, agent → 403;
    *   `az containerapp show`: IP allow-list `<operator-ip>/32`, min = max = 1.
*   **Access review:** the IP allow-list was the only gate, and `X-Demo-Role` is not identity. Added a required `X-API-Key`:
    *   FastAPI middleware, active only when `API_ACCESS_KEY` is set;
    *   Bicep `@secure()` parameter of at least 32 characters, held as a Container Apps secret;
    *   a random key in the gitignored azd env;
    *   the Streamlit client sends `FRICTION_GATE_API_KEY`.

    127 tests. The redeploy to prove it on Azure did not run, because the owner had already started `azd down`.
*   **ADR 016** records the hosting and access design. `infra/azure-container-app.yaml` is marked superseded.
*   Local API and Streamlit restarted on the new code (all four local services respond).

## 5. Carry-overs (next sprint)
1. Redeploy with `azd up` when a standing URL is needed, and confirm the `X-API-Key` gate returns 401 without the key (first deploy verified and torn down 2026-09-24, §4f).
2. Build `prediction_cohort.csv` on a machine with `training_data.csv` and check the browser against real customers.
3. From the retrospective: a live integration check (`drafter_source=azure`, `hybrid=true`), the `AppTest` page matrix in `tests/`, and CI for the Python suite.
