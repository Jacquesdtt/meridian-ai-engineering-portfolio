"""Portable ops-threshold model artifacts for Sprint 3 serving.

Source of truth for runtime (``mlflow.db`` is gitignored).

| File | Purpose |
|------|---------|
| ``booster.json`` | XGBoost booster from MLflow run ``3f575754…`` |
| ``preprocessor.joblib`` | Fitted ``ColumnTransformer`` (state OHE + numeric passthrough) |
| ``serving_meta.json`` | Threshold, run_id, feature names, frozen top SHAP drivers |

Re-export after a new ops training run:

```text
py -3.13 Code\\Sprint3\\export_ops_model.py
```

After re-export, re-verify Sprint 4 demo fixtures still flag as expected:

```text
set PYTHONPATH=%CD%
py -3.13 .agents\\scratch\\verify_s4_fixtures.py
```

Demo fixtures live at ``Docs/Sprint4/fixtures/`` (below-threshold + flagged). They are
illustrative rows for Friction-Gate demos — not an evaluation set and not used to tune ``t``.

Sprint 5 does **not** change these artifacts; Glass-Box / `.prompty` live in ``src/`` and Streamlit.
"""
