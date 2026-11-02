# ADR 014: Portable Submission Inference (Script FE + Ops Artifacts)

**Date:** 2026-07-17  
**Status:** Accepted  
**Related:** [ADR 004](004-churn-target-and-predictive-window.md) (windows) · [ADR 005](005-portable-model-export-for-serving.md) (ops model) · [Data Dictionary §4](../../Data/Data_Dictionary.md)

## Context

Training and serving freeze observation months through **2020-04** (`Data/processed/training_data.csv`, Friction-Gate fixtures). Grading requires probabilities for **active accounts as of 2020-05-31** (`StartingFiles/submission_sample.csv`). Re-running the Sprint 1 FE notebook only to append May rows is slow, AppLocker-hostile in agent workflows, and easy to drift from the locked ops preprocessor.

We therefore need a **portable inference path** that (1) rebuilds month-`t` features for May 2020 with the same anti-leakage rules as the notebook, and (2) scores with the committed `Models/ops/` artifacts — without re-fitting or applying the ops contact threshold to the CSV.

## Decision

1. **Grading export** lives in `Code/Sprint3/create_submission.py` (+ `submission_helpers.py`): pure-Python temporal FE targeting observation month **`t = 2020-05`**, then score with ADR 005 `preprocessor.joblib` + `booster.json`.
2. **Feature column SoT** is `Models/ops/serving_meta.json` → `raw_feature_cols` / `model_feature_names` (same naming contract as FastAPI serving — not sklearn `cat__`/`num__` prefixes on the DMatrix).
3. **Output** is `submission_df14.csv`: probabilities only (`binary:logistic`); do **not** hard-label at ops `t≈0.701`. Validate with `StartingFiles/validate_submission.py` against `submission_sample.csv`.
4. **Notebook FE remains SoT for training history** through 2020-04. The script is the SoT for **May grading inference**, kept in parity by spot-check (see [submission_fe_parity_spotcheck.md](../../Sprint5/submission_fe_parity_spotcheck.md)).

## Alternatives considered

| Option | Why not |
|--------|---------|
| Extend `training_data.csv` via notebook for May | Heavier; May has no train label (`Is_Churned` NaN); unnecessary for grading |
| Score April features, stamp `date=2020-05-31` | Wrong observation window vs guide / ADR 004 |
| Threshold CSV at ops cut | Guide requires continuous `pred_churn` in `[0,1]` |

## Consequences

* Clean clone can regenerate the submission CSV with `py -3.13 Code\Sprint3\create_submission.py` (no MLflow, no notebook kernel).
* FE logic is duplicated vs the notebook — treat parity spot-checks as mandatory after any FE change; do not “improve” submission FE independently of ADR 004.
* Ops threshold stays a **serving/contact** policy only; grading and contact policy remain deliberately split.
