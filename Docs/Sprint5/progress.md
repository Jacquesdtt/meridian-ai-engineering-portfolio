# Sprint 5 — Progress log (2026-07-14 → closed 2026-09-24)

> Status log kept during the sprint. **Sprint closed 2026-09-24** — delivery record: [sprint_debrief.md](sprint_debrief.md) · process: [sprint_retrospective.md](sprint_retrospective.md).

**Status reconciliation — 2026-10-20:** dated checks below are historical. Current local release checks pass: 127 Python tests, 26 frontend tests, typecheck, production build and generated facts. The production browser/performance report is [learning-app validation](../../educational_web_app/docs/validation_2026-10-20.md). Live viva revalidation is blocked by Azure HTTP 401; the 2026-09-24 benchmark remains historical. Learner trial remains open by user agreement (no participants).

## Shipped
| Workstream | Status | Evidence |
|------------|--------|----------|
| Plan + plan red-team | Done | [sprint_plan.md](sprint_plan.md) · [sprint5_plan_red_team.md](sprint5_plan_red_team.md) |
| Impl red-team + corrections | Done | [sprint5_impl_red_team.md](sprint5_impl_red_team.md) |
| WS-0 fixtures | Done | verify script OK |
| WS-1 `.prompty` | Done | `src/genai/prompts/retention_draft.prompty` |
| WS-4 Glass-Box RBAC | Done (IN) | ADR 007 · UI + `X-Demo-Role` API parity |
| Serving + GenAI tests | **47 passed** (2026-07-14) | `pytest tests/serving tests/genai` |
| Full test suite (re-verified 2026-09-15) | **68 passed** | `python -m pytest tests -q` (needs `prompty<2`, now pinned in `requirements.txt`; `prompty` 2.x fails `test_prompty_drafter`) |
| Jamie round-1 hardening | Done | [06 attack](../StakeholderManagement/Meetings/06_jamie_serving_readiness_red_team.md) → [JR plan](jamie_readiness_revision_plan.md) |
| Jamie round-2 red-team + fixes | Done | [07 attack](../StakeholderManagement/Meetings/07_jamie_serving_round2_red_team.md) → [JR2 plan](jamie_readiness_revision_plan_r2.md) (required role header, terminal immutability, store cap, opaque review_key, ADR 002/003 clarify) |
| Jamie fairness narrative (final deck/report) | Done | [fairness_anti_discrimination_narrative.md](fairness_anti_discrimination_narrative.md) → presentation + final_report + model card |
| Jamie requirements register | Done | [jamie_requirements_register.md](jamie_requirements_register.md) — JR-REQ-01…03 confirmed; JR-REQ-10…18 standing; JR-OPEN-01…03 resolved, 04–05 deferred (ADR 012, 2026-07-17) |
| Jamie feature / build tour | Done | [04_jamie_dashboard_feature_tour.md](../StakeholderManagement/Meetings/04_jamie_dashboard_feature_tour.md) + Glass-box expander |
| Stakeholder cascade post–Jamie | Done | [StakeholderManagement/README.md](../StakeholderManagement/README.md) · engagement plan §5 · Sam/Morgan deps · [08_followup](../StakeholderManagement/Meetings/08_jamie_followup_message.md) |
| JR-REQ-19 anti rubber-stamp | Done | [review_fatigue_mitigation.md](review_fatigue_mitigation.md) · ADR 003 amendment · UI/API ack |
| WS-5 Streamlit Refactor | Done | `friction_gate_app.py` Pydantic models, sidebar routing, dynamic Morgan's View without script |
| Efficient-Frontier Logic | Done | UI cohort distribution explicitly mapped to `p >= 0.701` tailored cohort |
| Azure `.env` live path | Done (2026-07-17) | `jacqueslouisdutoit7-2493-resourc` · `gpt-4o-mini` + `text-embedding-3-large` (2026-09-24: chat deployment is now `gpt-5-mini`; embeddings had 404'd via the Foundry project URL — fixed, RAG is hybrid again, DK-13) |
| Azure RAG red-team + fixes | Done | [sprint5_azure_rag_revision_plan.md](sprint5_azure_rag_revision_plan.md) RAG-01…05 · Tenacity · WAL · index cache · telemetry · `maxReplicas: 1` |
| WS-5 RAG Q&A Bot | Done | `src/genai/rag_engine.py` + Streamlit Methodology tab · corpus `Final_Report_Official.md` |
| RAG chunking (H3 + ≤1200) | Done | [rag_chunking_red_team.md](rag_chunking_red_team.md) → [plan](rag_chunking_revision_plan.md) · ADR 010 amendment · schema_version=3 · retrieve coverage ~3.6% |
| Docker smoke (local compose) | **Done 2026-09-24** | [docker_smoke_checklist.md](docker_smoke_checklist.md) §4 all PASS · fixed DK-07 unpinned sklearn, DK-08 `Docs/` runtime files, DK-09 `gpt-5-mini` `max_tokens` 400 |
| Dashboard verification | **Done 2026-09-24** | `AppTest`: 19 role × page combos render against the container API · fixed sidebar `KeyError` crash (`use_viva_grader` label) · PR curve (primary metric) now shown beside ROC · Morgan view reads `business_metrics.json` when generated · Sam slider → `Running_Balance` (top SHAP driver) |
| Full test suite (2026-09-24) | **115 passed** | `uv run python -m pytest tests -q` |
| Prediction browser + per-customer SHAP (post-close, 2026-09-24) | **Done** | `GET /predictions`, `GET /predictions/{id}/explain`, `POST /explain` · page "Prediction browser (Sam)" · SHAP under Sam's what-if · permission `explain_predictions` · **123 passed** · `AppTest` 21 role × page combos · [debrief §7](sprint_debrief.md#7-post-close-addendum-2026-09-24-same-day) |
| Submission inference (May-2020) | Done | [red-team](submission_inference_red_team.md) → [plan](submission_inference_revision_plan.md) · `create_submission.py` · `submission_df14.csv` (17,599) · validator · **60** tests with submission helpers · [FE parity](submission_fe_parity_spotcheck.md) PASS |

## Deployment and close-out outcomes
| Workstream | Status | Blocker |
|------------|--------|---------|
| WS-2 Container Apps | **Done (then torn down)** | Local container smoke-tested; ACA deploy verified live 2026-09-24 and removed to stop charges. No standing URL |
| WS-3 Foundry / `azd` | **Deployed, verified, torn down** (2026-09-24) | Foundry project hosts `gpt-5-mini` + `text-embedding-3-large`. `azd up` → live checks passed → `azd down`. ADR 016 · [debrief §7](sprint_debrief.md) |
| Dual close-out | **Done 2026-09-24** | [sprint_debrief.md](sprint_debrief.md) · [sprint_retrospective.md](sprint_retrospective.md) · walkthrough + learnings |

## Open carry-overs (reconciled 2026-10-20)

| Item | Next action / dependency |
|---|---|
| Cloud access gate | On a future deployment verify 401 without the API key, 200 with it. Previous live deploy preceded the key gate. |
| Real prediction cohort | Obtain `training_data.csv`, build `prediction_cohort.csv` and verify; current checkout has only fixtures. |
| Regression automation | Commit Streamlit page matrix and live integration smoke script; add Python CI. |
| Live viva revalidation | Restore valid Azure credentials/endpoint, rerun `--require-live`; current attempt returns 401. |
| Learner trial | 3–5 real learners when available; no outcome claimed. |
| MLflow | Confirm assessment requirement; recover/back up store; log preprocessor on next training run. |

## Demo path (updated)
1. pytest (`123 passed`) → fixtures verify  
   Optional: `docker compose up -d` (API in a container; `API_PORT=8001` if a host API is on 8000)  
2. Streamlit: role = Retention agent → Below → Flagged → Approve ≠ Sent (terminal immutable)  
3. Switch to Compliance viewer → Audit trail + Glass-box (no Approve)  
   Data scientist → Prediction browser → pick a customer → SHAP bars (fixtures only unless `prediction_cohort.csv` is built)  
4. Methodology Q&A Bot (Azure grounded on `Final_Report_Official.md`; expander shows ≤3 bounded chunks — restart Streamlit after chunker/cache changes)  
5. Optional API: missing `X-Demo-Role` → **400**; compliance PATCH approve → **403** + `denied`  
6. Grading CSV: `uv run python StartingFiles\validate_submission.py submission_df14.csv`  
