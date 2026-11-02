# Sprint 2: AI Engineering Learnings

## Pointers
- Input data: `Data/processed/training_data.csv` (Sprint 1)
- Notebook: `Code/Sprint2/01_modeling_and_rai.ipynb`
- Anti-patterns: [../Sprint1/ML_Anti_Patterns.md](../Sprint1/ML_Anti_Patterns.md)
- Walkthrough / debrief: [walkthrough.md](walkthrough.md), [sprint_debrief.md](sprint_debrief.md)
- If revising after critique: `/docs-before-code`

## 1. Red Teaming the Implementation Plan (docs-before-code)
- **What is an Attack Note?** A formal critique of a plan/model/notebook (severity, implication, mitigation) — not chat-only nitpicks.
- **Why it's important:** Audit trail for locked decisions; prevents silent rewrites.
- **Sprint 2 catch:** Plan almost picked a top-risk cut on the **test** set → leakage. Amended to calibrate threshold on **validation** only.

## 2. Windows Environment & AppLocker Bypass (`py -m`)
- User-scope package `.exe` wrappers are often blocked / off PATH. Prefer `py -3.13 -m <module>`.
- Yellowbrick on Python 3.13 still imports `distutils` → install `setuptools`.

## 3. MLflow tracking on modern clients
- Filesystem `./mlruns` raises unless `MLFLOW_ALLOW_FILE_STORE=true`. Prefer `sqlite:///…/mlflow.db`.
- Never log the same param key twice with different values on one run (`scale_pos_weight` full float vs rounded).
- Re-attach artifacts later with `mlflow.start_run(run_id=…)`.

## 4. Notebook execution hygiene
- Reloading the `.ipynb` file ≠ keeping kernel variables. After patch/reload, re-run from imports through XGBoost before Yellowbrick/SHAP.
- Premeditate the next fault (sample heavy viz; try/except per Yellowbrick plot; NaN-safe Fairlearn → MLflow).

## 5. Yellowbrick + non-sklearn estimators
- Custom booster wrappers need `_estimator_type = "classifier"`, `force_model=True`, and an explicit visualizer `.fit(X, y)` so `target_type_` exists — even when the underlying model is already trained.
