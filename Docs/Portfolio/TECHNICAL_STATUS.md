# Technical status and evidence limits

**Reconciled: 2 November 2026.** This is a solo course prototype. No production adoption, retention gain or revenue benefit was measured. Existing AI-assistance disclosure remains in the [case study](CASE_STUDY.md).

| Topic | Supported statement | Evidence and remaining limit |
|---|---|---|
| Ranking and queue | Test PR-AUC 0.219, ROC-AUC 0.723; precision 22.9%, recall 9.0% at threshold 0.70055 | [Saved run](../Sprint2/reports/sprint2_run_summary_v2.json). Counts describe customer-month observations. The 40% precision target was not achieved. |
| Capacity | Fixed threshold from the validation top-5% quantile | [Serving metadata](../../Models/ops/serving_meta.json). No per-group quota or guaranteed future queue size. |
| Fairness | Age EOD 0.155995 and state EOD 0.318161 on a 100,000-row sample | [Summary](../Sprint2/reports/fairlearn_equalized_odds.json). Minimum group size 500; 38/55 state groups retained, 3,548 rows excluded. Detailed CSV absent. Excluded groups and other attributes remain unassessed. |
| Explanation | SHAP describes the model's use of inputs; age and state are model inputs | [Model card](../Model_Card.md). Dominant balance features do not establish nondiscrimination or causal validity. |
| Calibration | Not implemented; scores are ranks, not verified probabilities | [Calibration discussion](../Final_Report_Official.md#73-calibration). An increasing Platt mapping preserves order; isotonic can introduce ties. Neither establishes higher precision for unchanged selected cases. |
| Retrieval | BM25 offline; optional dense embeddings, reciprocal rank fusion and LLM reranking with Azure | [ADR 015](../Architecture/ADRs/015-hybrid-rag-rerank-fairness-consolidation.md). Legacy API label is tfidf. Dedicated cross-encoder and measured retrieval/answer-quality gates remain future work. |
| Azure hosting | API deployed and checked on 24 September 2026, then removed | [ADR 016](../Architecture/ADRs/016-azure-container-apps-via-azd.md). No standing URL; later API-key gate has local tests only. Cloud SQLite is ephemeral. |
| Controls | Human review, rate validation, PII filtering, demo roles and audit records | [Limitations](../Engineering/Technical_Debt_and_Limitations.md). No autonomous send. These controls do not establish legal compliance, provider retention terms, demographic fairness or production identity. |

Dated sprint plans, questions and ADR context retain their history. Later-status notes distinguish those records from current capabilities. [Validation record](EVIDENCE.md) separates saved results, historical cloud checks and local tests. This reconciliation changed documentation only; it did not rerun training, fairness evaluation or live Azure checks.

Method references: [scikit-learn calibration](https://scikit-learn.org/stable/modules/calibration.html) and [Fairlearn assessment](https://fairlearn.org/main/user_guide/assessment/common_fairness_metrics.html). Project results come from the linked repository records.
