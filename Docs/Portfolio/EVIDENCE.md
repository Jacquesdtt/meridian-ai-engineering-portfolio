# Validation record

**Validation date: 2 November 2026.**

The initial packaging checks below predate the later public cleanup. See the
[cleanup validation](CLEANUP_2026-11-02.md) for the corrected code, dependency
update, 159 backend tests, and 27 frontend tests.

This record separates saved model results, earlier runtime checks, and checks
run on 2 November 2026. Code tests do not establish model quality, customer
impact, or production readiness. See [technical status and evidence limits](TECHNICAL_STATUS.md)
for the reconciled fairness, calibration, retrieval and hosting statements.

## Saved model evaluation

Source: [ops run summary](../Sprint2/reports/sprint2_run_summary_v2.json), run
`3f575754ae9a42c5a21ea5e476c0af37`.

| Claim | Evidence | Limit |
|---|---|---|
| Better ranking than the heuristic | Test PR-AUC 0.218922 vs 0.151016; ROC-AUC 0.723441 vs 0.551122 | One chronological test period: September 2017–April 2020. No new model evaluation in this pass. |
| Capacity-based operating point | Validation top-5% quantile, threshold 0.700547993 | Fixed cut; future queue size can change. The 40% precision target was infeasible. |
| Explicit queue/recall trade-off | Precision 0.228585, recall 0.089682; 20,127 false positives vs 248,778 at max-F1 | Lower queue load costs recall. No measured retention or revenue gain. |
| Fairness measured | [Committed JSON summary](../Sprint2/reports/fairlearn_equalized_odds.json): age EOD 0.155995; state EOD 0.318161; sample 100,000, minimum group size 500 | 38 of 55 state groups kept; 3,548 sparse state rows excluded. Detailed slice CSV is absent; per-group rates cannot be inspected here. Gaps remain. |
| Inspectable model | [Serving artifacts](../../Models/ops/), [SHAP plot](../Sprint2/reports/shap_summary.png), [model card](../Model_Card.md) | Raw data and MLflow database are absent; retraining needs external course data. |

### Evaluation unit and count check

One test record is one customer in one observation month. Its label checks the
following month's rounded-zero balance and inactivity. A customer can appear
and meet that rule more than once. This is not a count of unique departures.
See the [target definition](../Architecture/ADRs/004-churn-target-and-predictive-window.md)
and [model card](../Model_Card.md#training-data).

The saved ops confusion matrix contains 505,863 customer-month records:
419,234 true negatives, 20,127 false positives, 60,538 false negatives and
5,964 true positives. Thus precision is 5,964 / 26,091 = 22.9%, and recall is
5,964 / 66,502 = 9.0%. These counts explain the reported percentages; they are
not a new evaluation. The [worked local workflow](DEMO_GUIDE.md#one-case-from-score-to-recorded-decision)
uses an illustrative fixture, with no observed next-month outcome.

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

## Initial validation: 2 November 2026

| Check | Result |
|---|---|
| Frontend clean install | `npm ci --no-audit --no-fund`: passed with the committed lockfile. |
| Frontend typecheck, tests, and build | `npm run lint`, `npm test`, `npm run build`: passed; 26 tests in 5 files. Build retains the chunk-size advisory (1,088.77 kB JS; 336.54 kB gzip estimate). |
| Backend tests | 127 passed in 8.39 s using the existing `tests/` suite. 22 warnings: pytest/anyio and Starlette deprecations plus unclosed SQLite connection resource warnings. |
| Committed-model fixtures and workflow | In-process API smoke passed using the real committed model and a temporary database. Scores: 0.207409 (not flagged), 0.750928 (flagged). Stub draft, capacity refusal, acknowledgement, permission denial, approval, terminal immutability, audit reads, two-row fixture cohort, and SHAP checked. No send route exists in OpenAPI. |
| Documentation and metric checks | Local targets in README, setup guide, and all four portfolio documents exist. Metadata and run-summary IDs/thresholds match. Teaching-fact export produced no diff. Source diff reviewed; no application, model, dependency, or infrastructure files changed. |

Environment: Windows, Node.js 24.15.0, npm 11.12.0, CPython 3.13.15.
Serving checks used `requirements.serving.txt`, pytest 9.2.0, and Streamlit
1.66.1. Dependencies were installed in an isolated target directory. No global
Python packages or tracked dependency files were changed.

Current checks did not include a browser session, production network load,
Docker execution, or live LLM responses. Earlier browser evidence remains dated
in the October report. The SQLite warnings are retained as a maintenance limit.

No training run, live Azure call, cloud deployment, learner trial, or new
business-outcome measurement is part of this validation.
