# Portfolio evidence record

**Packaging date: 2 November 2026.**

This record separates saved model results, earlier runtime checks, and checks
run during packaging. Code tests do not establish model quality, customer
impact, or production readiness.

## Saved model evaluation

Source: [ops run summary](../Sprint2/reports/sprint2_run_summary_v2.json), run
`3f575754ae9a42c5a21ea5e476c0af37`.

| Claim | Evidence | Limit |
|---|---|---|
| Better ranking than the heuristic | Test PR-AUC 0.218922 vs 0.151016; ROC-AUC 0.723441 vs 0.551122 | One chronological test period: September 2017–April 2020. No new model evaluation in this pass. |
| Capacity-based operating point | Validation top-5% quantile, threshold 0.700547993 | Fixed cut; future queue size can change. The 40% precision target was infeasible. |
| Explicit queue/recall trade-off | Precision 0.228585, recall 0.089682; 20,127 false positives vs 248,778 at max-F1 | Lower queue load costs recall. No measured retention or revenue gain. |
| Fairness measured | Age EOD 0.155995; state EOD 0.318161; test sample 100,000, minimum group size 500 | 38 of 55 state groups kept; 3,548 sparse state rows excluded. Gaps remain. |
| Inspectable model | [Serving artifacts](../../Models/ops/), [SHAP plot](../Sprint2/reports/shap_summary.png), [model card](../Model_Card.md) | Raw data and MLflow database are absent; retraining needs external course data. |

## Engineering evidence

| Behavior | Source and regression coverage |
|---|---|
| Score before creating drafts; reject below-threshold requests | [API](../../src/serving/app.py), [API tests](../../tests/serving/test_api.py) |
| Validate output and cap offered rates | [Drafter](../../src/genai/drafter.py), [schemas](../../src/serving/schemas.py), [prompt tests](../../tests/serving/test_prompty_drafter.py) |
| Require acknowledgement and preserve terminal decisions | [Attention gate](../../src/serving/attention_gate.py), [draft store](../../src/serving/draft_store.py), [API tests](../../tests/serving/test_api.py) |
| Enforce demo permissions and audit denied changes | [Role matrix](../../src/serving/rbac.py), [RBAC tests](../../tests/serving/test_rbac.py) |
| Explain served predictions | [TreeSHAP](../../src/serving/explain.py), [prediction tests](../../tests/serving/test_predictions.py) |
| Report-grounded Q&A with explicit retrieval mode | [RAG engine](../../src/genai/rag_engine.py), [RAG tests](../../tests/genai/test_rag_engine.py) |
| Unavailable viva marking grants no credit | [Backend marker](../../src/genai/viva_grader.py), [frontend tests](../../educational_web_app/src/lib/vivaGrader.test.ts) |

## Historical checks

| Date | Evidence | Scope and limit |
|---|---|---|
| 24 September 2026 | [Docker smoke record](../Sprint5/docker_smoke_checklist.md), [Azure decision](../Architecture/ADRs/016-azure-container-apps-via-azd.md) | API container checked; Azure deployed, checked, then removed. The later API-key gate was not checked on Azure. |
| 24 September 2026 | [Sprint debrief](../Sprint5/sprint_debrief.md), [benchmark cases](../../tests/genai/viva_benchmark.json) | Recorded 87.5% agreement across 48 rubric-point labels. Small historical LLM benchmark, not a current accuracy guarantee. |
| 20 October 2026 | [Learning-app validation](../../educational_web_app/docs/validation_2026-10-20.md) | 127 Python tests, 26 frontend tests, typecheck/build, browser flow, and local timings. Live marker returned Azure 401. No learner participants. |

## Packaging checks: 2 November 2026

| Check | Result |
|---|---|
| Frontend clean install | `npm ci --no-audit --no-fund`: passed with the committed lockfile. |
| Frontend typecheck, tests, and build | `npm run lint`, `npm test`, `npm run build`: passed; 26 tests in 5 files. Build retains the chunk-size advisory (1,088.77 kB JS; 336.54 kB gzip estimate). |
| Backend tests | 127 passed in 8.39 s using the existing `tests/` suite. 22 warnings: pytest/anyio and Starlette deprecations plus unclosed SQLite connection resource warnings. |
| Committed-model fixtures and workflow | In-process API smoke passed using the real committed model and a temporary database. Scores: 0.207409 (not flagged), 0.750928 (flagged). Stub draft, capacity refusal, acknowledgement, permission denial, approval, terminal immutability, audit reads, two-row fixture cohort, and SHAP checked. No send route exists in OpenAPI. |
| Portfolio links, metrics, and Git diff | Local targets in README, setup guide, and all four portfolio documents exist. Metadata and run-summary IDs/thresholds match. Teaching-fact export produced no diff. Source diff reviewed; no application, model, dependency, or infrastructure files changed. |
| Employer archive preflight | ZIP integrity and required-file checks passed: 415 entries, about 18.6 MB. Local agent/editor config, credentials, raw CSVs, databases, installed packages, and Git history are excluded. Extracted source passed all 127 backend tests (22 warnings, 7.70 s). |

Environment: Windows, Node.js 24.15.0, npm 11.12.0, CPython 3.13.15.
Python serving dependencies came from `requirements.serving.txt`, with pytest
9.2.0 and Streamlit 1.66.1 added for validation. Key versions: scikit-learn
1.9.0, xgboost-cpu 3.3.0, FastAPI 0.139.0. Packages were installed with `uv`
into a temporary target directory and exposed through `PYTHONPATH`; no global
Python packages or tracked dependency files were changed. Python checks used
the installed 3.13 interpreter directly because `py -3.13` did not resolve it.
The successful suite invocation used `pytest.main(['tests', '-q', '-p',
'no:cacheprovider'])` through that interpreter. Initial validation processes
stalled; restarted instrumented runs completed. The smoke harness was corrected
to accept the API's documented 201 creation response; application code was unchanged.

Current checks did not include a browser session, production network load,
Docker execution, or live LLM responses. Earlier browser evidence remains dated
in the October report. The SQLite warnings are retained as a maintenance limit.

No training run, live Azure call, cloud deployment, learner trial, or new
business-outcome measurement is part of this packaging pass.
