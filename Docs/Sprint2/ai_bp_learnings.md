# Sprint 2: AI Business Partner Learnings

## Pointers
- PRD §2: [../Product/Product_Requirements_Document.md](../Product/Product_Requirements_Document.md)
- Model card: [../Model_Card_Template.md](../Model_Card_Template.md)
- Drift for Morgan: [data_drift_report.html](data_drift_report.html)

## 1. How to brief stakeholders on this run
* **Morgan (value):** Ranking improved vs a strong behavioural heuristic (PR-AUC 0.219 vs 0.151). Historical AUM-at-risk context remains ~$7.27M from Sprint 1 — the model ranks *who* to work, it does not invent new AUM.
* **Sam (actionability):** SHAP says balance / cash-flow trajectory drives scores — consistent with the locked churn definition. **Do not** mail the current 0.475 cut: ~4/5 flagged customers are false positives. Raise the bar or take a capacity-limited top-N.
* **Jamie (fairness):** At the **ops** cut (`t≈0.701`, `min_group_n=500`): age Equalized Odds difference ≈ **0.16**; state ≈ **0.32** (38/55 states kept). Quote [`reports/fairlearn_equalized_odds.json`](reports/fairlearn_equalized_odds.json) — not the near-universal-recall first cut (state EOD ≈ 1.0 was a measurement artifact).

## 2. Accuracy is the wrong victory lap
Always-negative is ~87% accurate and useless. Lead with PR-AUC / ROC-AUC and the confusion matrix cost of false positives (campaign budget) vs false negatives (AUM).
