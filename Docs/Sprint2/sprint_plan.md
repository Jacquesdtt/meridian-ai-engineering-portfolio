# Sprint 2: Modelling, Interpretation & Responsible AI — Plan & Goals

**Status:** Modeling + RAI milestone complete (2026-07-14); threshold/ops polish optional before Sprint 3  
**Depends on:** Sprint 1 closed — `Data/processed/training_data.csv` (2,263,608 × 27, pos rate 11.7601%, Gini leak screen passed).  
**Schedule:** [project_schedule.md](../Sprint0/project_schedule.md)  
**Close-out:** [sprint_debrief.md](sprint_debrief.md) · [sprint_retrospective.md](sprint_retrospective.md) · [walkthrough.md](walkthrough.md)

## 1. Sprint Objective
Train a leakage-safe XGBoost churn classifier on the Sprint 1 training frame, log runs in MLflow, beat a naive baseline, and produce SHAP / fairness evidence for Sam and Jamie — without shuffling time.

## 2. Key Deliverables
*   **`Docs/Sprint2/sprint_plan.md`** (this file) + learnings.
*   **Modeling notebook** `Code/Sprint2/01_modeling_and_rai.ipynb`.
*   **MLflow** experiment tracking (params, metrics, model artifact) via `mlflow.db`.
*   **Evaluation & Interpretation:** SHAP + Yellowbrick (+ dtreeviz fail-soft).
*   **Fairness & Drift:** Fairlearn + Evidently `data_drift_report.html`.
*   **Model card** populated (`Docs/Model_Card_Template.md`).
*   **Close-out:** `sprint_debrief.md` + `sprint_retrospective.md`.

## 3. Risks & Constraints
*   **Temporal leakage:** Split only on `Month`. Never shuffle.
*   **Class imbalance (~11.8%):** PR-AUC primary; accuracy alone is not success.
*   **Operating threshold:** Val F1 cut can be recall-greedy — separate ops policy from ranking DoD.
*   **Lag3 NaNs + balance ±1e10:** Tree native missing; no blind StandardScaler.
*   **AppLocker:** `py -3.13`; human Run All for heavy notebooks.

## 4. Definition of Done
- [x] `Code/Sprint2/01_modeling_and_rai.ipynb` authored and upgraded.
- [x] Modeling notebook executed end-to-end (human Run All, 2026-07-14).
- [x] Temporal train/val/test on `Month`; no row shuffle.
- [x] Naive baselines recorded; XGBoost beats heuristic on PR-AUC (0.219 > 0.151) and ROC-AUC (0.723 > 0.551).
- [x] MLflow run `7134cee0766646498e002e5326e3c200` logged (params + metrics + model + viz artifacts).
- [x] SHAP/Yellowbrick summaries; Fairlearn slices; Evidently drift HTML.
- [x] Model card filled from `reports/sprint2_run_summary.json`.
- [x] `sprint_debrief.md` + `sprint_retrospective.md` completed.
- [x] `MEMORY.md` updated (Sprint 2 modeling closed; next = threshold polish and/or Sprint 3).

## 5. Suggested execution order
1. Load `training_data.csv`; encode `state`; keep `customer_id`/`Month` for splits only.
2. Define cutoff month(s); train on past, test on future.
3. Naive baseline (always-negative + `gone_this_month` heuristic).
4. XGBoost + MLflow; val-only threshold.
5. SHAP + fairness + drift; update model card.
6. Dual close-out docs.
