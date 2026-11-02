# Sprint 5: Secure Cloud Deploy + GenAIOps Depth — Debrief

> **Status clarification, 2 November 2026:** The earlier carry-over table in §6 is superseded by §7 and ADR 016: the API was deployed and checked on 2026-09-24, then removed. The later API-key gate has not been checked on Azure. Historical test counts refer to their stated date; no fresh cloud check is claimed.


**2026-10-20 maintenance addendum:** reconciled stale cloud/cleanup/benchmark tracking against ADR 016 and the committed code. Learning-app release checks pass (127 Python / 26 frontend tests, typecheck/build/facts). Added a repeatable local production timing preview and browser validation report; corrected stale ACA wording in module 11. Live marker revalidation fails with Azure HTTP 401; learner trial remains open because the user has no participants. See [validation report](../../educational_web_app/docs/validation_2026-10-20.md) for method, results and limitations. No model, dependency, infrastructure or architecture decision changed; no new ADR required. Earlier sections retain their dated evidence.

> **Scope:** Take the Milestone 4 FastAPI + Friction-Gate stack toward cloud hosting and GenAIOps depth without reopening the model. Started **2026-07-14**, closed **2026-09-24** with two explicit carry-overs (§6).
> **Related:** Process retrospective → [sprint_retrospective.md](sprint_retrospective.md). Narrative → [walkthrough.md](walkthrough.md). Plan → [sprint_plan.md](sprint_plan.md). Status log → [progress.md](progress.md).

## 1. What Was Done

| Workstream | Delivered |
|------------|-----------|
| WS-0 early checklist | Demo fixtures re-verified (below 0.2074 / flagged 0.7509); live Azure `.env` path |
| WS-1 prompt-as-code | `src/genai/prompts/retention_draft.prompty` wired into the Azure draft path; stub stays offline-safe |
| WS-4 Glass-Box RBAC | Demo roles, glass-box panel, audit trail; enforced in FastAPI (`X-Demo-Role`), mirrored in the UI (ADR 007) |
| Jamie hardening (2 rounds) | Required role header, terminal immutability, `denied` audit rows, output scrubbing, anti rubber-stamp `attention_ack` (JR-REQ-19), fairness disclosure (ADR 012) |
| WS-5 dashboard | Single-file multi-page Streamlit (ADR 011): Morgan business view, review queue, score/create, Sam what-if, glass-box, audit trail, Methodology RAG bot |
| RAG bot | Pure-Python RAG (ADR 010) → chunking fix → hybrid BM25 + embeddings with RRF and an LLM rerank, served by `POST /rag/ask` (ADR 015) |
| F8 single enforcement point | Streamlit calls FastAPI for every score, draft, decision, audit read and RAG question (ADR 006 follow-on) |
| Azure resilience | Tenacity retries, token telemetry (ADR 013), KEY 1 → KEY 2 fallback |
| Submission | May-2020 grading CSV (17,599 rows) with a validator and FE parity check (ADR 014) |
| WS-2 container (local) | FastAPI image built and smoke-tested with compose on 2026-09-24 — every step of [docker_smoke_checklist.md](docker_smoke_checklist.md) §3 passed |
| Close-out fixes (2026-09-24) | Eight defects found while verifying Docker, the dashboard and the report render, all fixed (§4) |

## 2. How It Was Done
- **Docs-before-code** for every critique of shipped work: attack note → signed checklist → code → doc cascade (Jamie rounds 1–2, Azure RAG, RAG chunking, submission inference).
- **FastAPI as the only writer.** The API authenticates the demo role, re-scores from raw features, applies the ops gate, drafts, caps the rate and audits. The UI is an HTTP client (`FrictionGateClient`), with an `inprocess` transport for AppLocker machines that drives the same app.
- **Container:** `python:3.13-slim`; installs only `requirements.serving.txt` (42 packages, compiled for Linux with `-c requirements.lock` so versions match the pickled `Models/ops/` preprocessor; `xgboost-cpu`); copies `src/`, `Models/` and the two `Docs/` files the API reads; `HEALTHCHECK` on `/health`; SQLite on the `drafts_db_data` volume; host port via `API_PORT`.
- **Model-aware Azure calls:** `chat_limit_params()` sends `max_completion_tokens` (and no `temperature`) to reasoning deployments such as `gpt-5-mini`; `normalize_openai_base_url()` reduces a Foundry project endpoint to the resource root.
- **Verification:** `pytest tests` (115), Streamlit `AppTest` over all 19 role × page combinations against the container, live Azure draft and RAG calls, teaching-app `lint` + 23 tests.

## 3. Why It Was Done
- PRD Phase 5: move from a local prototype toward hostable, governed GenAI without weakening Friction as a Feature (no `/send`, Approved ≠ Sent, ZDR, 3.5% cap).
- Jamie (Risk) needed controls enforced server-side, auditable and fairness-disclosed before any cloud story.
- Morgan and Sam needed persona views; assessors need a demo that runs from a clean clone and a container.

## 4. Issues & Workarounds

| Issue | Impact | Mitigation |
|-------|--------|------------|
| Docker engine unavailable for most of the sprint (`docker_engine` pipe missing) | Live smoke deferred from July to September | Static packaging review first; live run on 2026-09-24 after one Rancher restart (the Windows proxy timed out on the Hyper-V socket while the VM engine was healthy) |
| Dashboard crashed on load for every role | A new `Permission.use_viva_grader` had no sidebar label → `KeyError` | Labels moved to `rbac.PERMISSION_LABELS` with a coverage test |
| Image installed unpinned `requirements.txt` | scikit-learn could drift from the version that pickled the preprocessor | Pinned serving-only lock (DK-02/07) |
| `/model/fairness` and `/rag/ask` failed in the container | Their inputs lived under the dockerignored `Docs/` | Re-included and copied (DK-08) |
| Every Azure draft silently used `stub_fallback` | Deployment switched to `gpt-5-mini`, which rejects `max_tokens` | `chat_limit_params()` (DK-09) |
| RAG ran on keyword fallback (`hybrid=false`) | Foundry **project** endpoint serves chat but 404s on embeddings | Endpoint normalised to the resource root (DK-13) |
| Container port clashed with the host API | `launch_all.ps1` already binds 8000 | `API_PORT` override (DK-10) |
| Sam's what-if slider did nothing | `start_balance` is not a SHAP driver | Slider now moves `Running_Balance` (#1 driver); baseline delta measured against the scored fixture |
| Serving critique went straight to code (2026-07-16) | Skipped docs-before-code | Backfilled attack note + checklist the same day |
| PDF render script deleted the assessor PDF when Edge failed | Lost `churn_report_df14.pdf` until re-rendered | Script now prints to a temp file with an isolated Edge profile and replaces only on success |

## 5. Learning Outcomes
- Engineering: [ai_engineering_learnings.md](ai_engineering_learnings.md)
- Business partner: [ai_bp_learnings.md](ai_bp_learnings.md)
- Cascaded: [../AIEngineeringLearnings/ai_engineering_learning_outcomes.md](../AIEngineeringLearnings/ai_engineering_learning_outcomes.md) §8 · [../AIEngineeringLearnings/ai_business_partner_learning_outcomes.md](../AIEngineeringLearnings/ai_business_partner_learning_outcomes.md) Sprint 5 addendum

## 6. Results

| Item | Value |
|------|-------|
| Python tests | **115 passed** (`pytest tests`, 2026-09-24) |
| Teaching app | `lint` clean · **23 passed** |
| Fixtures | below **0.2074** not flagged · flagged **0.7509** flagged (host = container) |
| Ops pin | run `3f575754…`, `t = 0.700548` (unchanged — no re-tune) |
| Container | Image 723 MB; `/health` ok; 400 without role; 422 below-threshold draft; 403 compliance approve; volume survives restart |
| Live Azure (Foundry project `jacqueslouisdutoit7-1355`) | Drafts `drafter_source=azure` via `gpt-5-mini`; RAG `retrieval_mode=embedding, hybrid=true, reranked=true` via `text-embedding-3-large` |
| Dashboard | All 19 role × page combinations render against the container API |
| ADRs landed this sprint | 007 · 008 (+ 2026-09-24 follow-on) · 010 · 011 · 012 · 013 · 014 · 015 · 006 follow-on |
| Assessor report | `Docs/Final_Report_Official.md` corrected and re-rendered to `churn_report_df14.pdf` (2026-09-24) |

### DoD status at close

| DoD item | Status |
|----------|--------|
| Early checklist (fixtures, live Azure, ZDR, no `/send`) | Done |
| `.prompty` asset in the Azure path | Done |
| Glass-Box RBAC + tests | Done |
| Streamlit multi-page dashboard + RAG bot | Done (verified 2026-09-24) |
| `pytest` green; fixture verify OK | Done |
| FastAPI hosted on Azure Container Apps or equivalent | **Carried over.** Local container verified; the ACA manifest is still a scaffold (`REPLACE_WITH_ACR_IMAGE`). Per the anti-speculation rule, no deploy note is written until something is live |
| Foundry / `azd` attempted or explicitly blocked | **Partial, carried over.** Foundry is in use: the project hosts both deployments the app calls. `azd` (v1.34.0 installed) scaffolding was not attempted; nothing blocks it |
| Live handover deck current | **Not done** — descoped by the owner at close (2026-09-24). The generator's text was corrected for accuracy; PPTX files were left as committed |
| Dual close-out + MEMORY | Done (this file, retrospective, walkthrough, learnings, MEMORY) |

**Next:** see [sprint_retrospective.md](sprint_retrospective.md) Start items and `.agents/MEMORY.md` §3.

## 7. Post-close addendum (2026-09-24, same day)

Two brief gaps and one carry-over were worked after close. §1–§6 above record the state at close and are not rewritten.

| Item | State | Evidence |
|------|-------|----------|
| **Prediction browser** (brief: "ML pages for Sam") | **Built** | `GET /predictions`, which ranks and filters the cohort and re-scores it from raw features on load. New page "Prediction browser (Sam)". Cohort file from `Code/Sprint5/build_prediction_cohort.py` (one month of `training_data.csv`, features only). Without the file the page lists the two Sprint 4 fixtures and says so. The file is gitignored and `training_data.csv` is not on this machine, so **no real cohort has been built or viewed yet**. |
| **Per-customer SHAP** | **Built** | `src/serving/explain.py`: XGBoost TreeSHAP (`pred_contribs`), with no new dependency. Values are log-odds, and the one-hot `state_*` columns are summed back to `state`. `GET /predictions/{id}/explain` and `POST /explain` serve it. Shown in the browser and under Sam's what-if. Fixture check: base −0.015, and the contributions sum to exactly 0.7509 and 0.2074. |
| RBAC | New `explain_predictions` permission | `data_scientist` and `compliance_viewer` have it; `retention_agent` does not. See the [ADR 007 follow-on](../Architecture/ADRs/007-demo-glass-box-rbac.md). |
| `azd` deploy to Azure Container Apps (carry-over) | **Deployed, verified live, torn down** | `azure.yaml` + `infra/*.bicep` ([ADR 016](../Architecture/ADRs/016-azure-container-apps-via-azd.md)). The owner's `azd up` provisioned everything but the remote build failed: this subscription refuses ACR Tasks (`TasksOperationsNotAllowed`). Switched to a local Docker build + push (`remoteBuild: false`); `azd deploy` succeeded. Live checks: `/health` ok (run `3f575754…`, `azure_configured=true`); fixture 0.7509; draft `drafter_source=azure`; RAG hybrid + reranked; `/predictions` + `/explain`; no role → 400, agent → 403; config shows IP allow-list `<operator-ip>/32` and 1/1 replicas. The owner then ran `azd down`. |
| Access control for the cloud URL | **Added after the deploy** | The IP allow-list alone let anyone sharing the owner's IP call every route (`X-Demo-Role` is not identity). A FastAPI middleware now requires `X-API-Key` when `API_ACCESS_KEY` is set; Bicep makes it a required secure parameter (≥ 32 characters) held as a Container Apps secret. Tests: `tests/serving/test_api_key.py` (**127 passed**). **Not yet exercised on Azure.** |
| Tests | **123 passed** (was 115) | `tests/serving/test_predictions.py` covers the SHAP sum identity, fixture fallback, RBAC and denied audit, re-scoring that ignores a file probability, NaN → null, and the builder. `AppTest` rendered all **21** role × page combinations in-process. |
| Container | Rebuilt; routes verified | Fixtures are copied into the image. On `:8001`, `/predictions` falls back to fixtures, `/explain` reproduces 0.7509, and an agent gets 403. |

Gap still open against the brief: none on Sam's pages. `infra/azure-container-app.yaml` (the hand-written manifest) is marked superseded by the `azd` project.
