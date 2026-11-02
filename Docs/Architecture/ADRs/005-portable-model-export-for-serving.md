# ADR 005: Portable Model Export for Serving

**Date:** 2026-07-14
**Status:** Accepted
**Related:** [MLflow model selection & registry roadmap](../MLflow_Model_Selection_Roadmap.md) §6 (future work: export from `models:/meridian-churn@champion` instead of a hard-coded run ID; `Models/ops/` stays the serving source of truth)

## Context
During the transition from Sprint 2 (Modeling) to Sprint 3 (Serving), red-team critique identified a critical failure mode: the standard MLflow backend stores artifacts in a gitignored `mlruns/` or SQLite `mlflow.db` database. When the workspace is freshly cloned or deployed without the local database, `mlflow.xgboost.load_model(runs:/...)` fails because the model artifacts are absent. Furthermore, the Sprint 2 notebook logged only the XGBoost booster, omitting the fitted OneHotEncoder and ColumnTransformer, which could lead to silent feature name drift and incorrect scoring.

## Decision
We will decouple model serving from the live MLflow database. Instead, we will mandate a "Portable Model Export" step:
1. **Committed Directory:** Models will be exported to a committed `Models/ops/` directory.
2. **Artifacts:** 
   - `booster.json` (or `.ubj`): The native XGBoost booster.
   - `preprocessor.joblib`: The fitted scikit-learn pipeline (OneHotEncoder and ColumnTransformer).
   - `serving_meta.json`: A static metadata file containing `run_id`, `OPS_THRESHOLD`, `threshold_rule`, `model_feature_names`, `num_cols`, `cat_cols`, and `top_shap`.
3. **Strict Validation:** The server boot loader must refuse to start if the provided feature names in the request do not match the frozen names in `serving_meta.json`.

## Consequences
*   **Pros:** Guaranteed reproducibility in a clean environment; serving code does not require an active MLflow connection; protects against silent feature drift.
*   **Cons:** Introduces an explicit artifact hand-off step; requires committing binary files (`.joblib`, `.ubj`) to the repository. MLflow remains the source of truth for provenance, but the filesystem export becomes the source of truth for serving.
