# Sprint 2: Modelling, Interpretation & Responsible AI — Debrief

> **Scope:** Temporal XGBoost churn model + MLflow + SHAP/Yellowbrick + Fairlearn + Evidently + model card. As of **2026-07-14**.
>
> **Related:** Process retrospective → [sprint_retrospective.md](sprint_retrospective.md). Narrative → [walkthrough.md](walkthrough.md).

## 1. What Was Done
- Built and ran `Code/Sprint2/01_modeling_and_rai.ipynb` end-to-end on `training_data.csv`.
- Chronological fit / val / test on `Month`; always-negative + `gone_this_month` baselines.
- Trained XGBoost with `scale_pos_weight` and early stopping; logged params/metrics/model to MLflow (SQLite).
- Produced Yellowbrick diagnostics, SHAP summary + waterfalls, Fairlearn age/state + Equalized Odds, Evidently drift HTML.
- Populated [Model_Card_Template.md](../Model_Card_Template.md) from `reports/sprint2_run_summary.json`.

## 2. How It Was Done
- Human Run All under Python 3.13; agents authored/hardened notebook cells.
- MLflow tracking URI: `sqlite:///…/mlflow.db` (file store `./mlruns` rejected by current MLflow).
- Yellowbrick via sklearn wrapper around the booster (`force_model=True`, sampled 40k for speed).
- SHAP TreeExplainer on 20k test rows; Fairlearn on 100k; Evidently on 50k/50k with clipped balances for the report only.
- Threshold: max F1 on **validation**, applied blindly to test (no test peek).

## 3. Why It Was Done
- Prove a leakage-safe traditional ML baseline for the bootcamp (not TabFM).
- Give Sam interpretable drivers (SHAP), Jamie fairness slices, Morgan drift visibility.
- Beat a meaningful heuristic on ranking metrics before GenAI / serving work.

## 4. Issues & Workarounds
| Issue | Mitigation |
|-------|------------|
| MLflow file store maintenance mode | SQLite `mlflow.db`; gitignore `mlflow.db` + `mlartifacts/` |
| Duplicate `scale_pos_weight` param log | Single `log_params(loggable)` dict |
| Yellowbrick “not a classifier” / missing `target_type_` | Wrapper `_estimator_type` + `force_model` + explicit `.fit` before `.score` |
| Yellowbrick / SHAP runtime on full test | Sampled evaluation sets |
| `distutils` missing (Py3.13) | `setuptools` dependency |
| `dtreeviz` NaNs | Fail-soft skip (Lag3 native missing) |
| State Equalized Odds extreme | Document as sparse-slice artifact under ~100% recall |

## 5. Learning Outcomes
- **Presentation source of truth (first run → why we change):** [ML_Learnings.md](ML_Learnings.md)
- Process / BP: [ai_engineering_learnings.md](ai_engineering_learnings.md), [ai_bp_learnings.md](ai_bp_learnings.md).

## 6. Results

| Item | Value |
|------|-------|
| MLflow run | `7134cee0766646498e002e5326e3c200` |
| Test window | 2017-09 → 2020-04 (505,863 rows) |
| Val threshold (F1) | **0.475** |
| XGBoost PR-AUC / ROC-AUC | **0.219** / **0.723** |
| Heuristic PR-AUC / ROC-AUC | 0.151 / 0.551 |
| Beats heuristic? | **Yes** (both) |
| Precision / Recall @ threshold | 0.211 / 0.9997 |
| Top SHAP | `Running_Balance_Rounded` |
| Age EOD | ≈ 0.052 |
| Drift HTML | [data_drift_report.html](data_drift_report.html) |

**Follow-ups (before ops / Sprint 3 GenAI routing):**
1. Retune operating threshold for precision / campaign capacity (not max F1).
2. Re-audit state fairness with minimum group counts.
3. Optional Lag3 impute solely for dtreeviz stakeholder diagrams.

**Next:** Sprint 3 serving + GenAI retention drafts behind Friction-Gate — or remaining Sprint 2 threshold/fairness polish if schedule allows.
