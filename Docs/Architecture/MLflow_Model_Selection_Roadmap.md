# Roadmap: MLflow Constrained Model Selection & Registry

**Date:** 2026-09-15  
**Status:** 🔵 FUTURE WORK. **Not built.** Present only as next steps.  
**Related:** [ADR 009](ADRs/009-sqlite-mlflow-tracking-backend.md) (SQLite tracking) · [ADR 005](ADRs/005-portable-model-export-for-serving.md) (portable export) · [ADR 012](ADRs/012-fairness-and-compliance-guardrails.md) (fairness = review + disclosure) · [Corrections register](../Engineering/Corrections_and_Future_Work.md) (A1, A3, B1–B3, F1–F6)

**Context:** Sprint 2 trained **one** XGBoost recipe and chose an **operating threshold** under constraints. It did not compare several models against governance gates. This roadmap describes how to turn model selection into an auditable, constrained multi-objective process in MLflow, so that the "ideal" talk track in §9 becomes true.

---

## 1. What MLflow does today

| Aspect | Current state |
|---|---|
| Backend | `sqlite:///mlflow.db` + local `mlartifacts/` ([ADR 009](ADRs/009-sqlite-mlflow-tracking-backend.md)). Both are gitignored and absent from a fresh clone. |
| Experiment | `meridian_churn_sprint2` |
| Runs | `7134cee0…` `xgb_temporal_v1` (max-F1 threshold, t = 0.475) and `3f575754ae9a42c5a21ea5e476c0af37` `xgb_temporal_v2_ops_threshold` (top-5% fallback, t ≈ 0.701). **Identical model**, PR-AUC 0.219 / ROC-AUC 0.723; only the threshold rule differs. |
| Logged | Params, metrics, `mlflow.xgboost.log_model`. Yellowbrick, SHAP, Fairlearn, Evidently and summary artifacts are added by reopening the run with `start_run(run_id=...)`. |
| Not logged | The fitted preprocessor (re-fitted by `export_ops_model.py`), dataset inputs, gate decisions |
| Not used | Nested runs, cross-validation, `search_runs`-based selection, **Model Registry** |
| Serving link | [`Code/Sprint3/export_ops_model.py`](../../Code/Sprint3/export_ops_model.py) loads `runs:/<RUN_ID>/model` → `Models/ops/` → `run_id` exposed by `/health`, `/score` and stored on every draft |

Evidence: [`sprint2_run_summary_v2.json`](../Sprint2/reports/sprint2_run_summary_v2.json), notebook `Code/Sprint2/01_modeling_and_rai.ipynb` (MLflow cell `a4cc443a`).

### 1.1 Does this need an MLflow endpoint?

**No, not for the build in this roadmap.** MLflow runs in-process against a local file:

| Option | Tracking URI | Endpoint / access needed? | Status |
|---|---|---|---|
| **A. Local SQLite (current)** | `sqlite:///mlflow.db` | **None.** Nested runs, `search_runs`, and the **Model Registry + aliases** all work on a SQL-backed store with no server. | ✅ Used in Sprint 2. Everything in §3–§7 can be built on this. |
| B. Shared tracking server | `<REPLACE_WITH_SHARED_MLFLOW_TRACKING_URI>` | Yes: a hosted MLflow server (or an Azure ML workspace tracking URI) plus network access and credentials | ⛔ **Not available.** Placeholder only; ADR 009 Alternatives §2 deferred it. Required only if several people or a deployed service must read the same registry. |

- **What actually failed in Sprint 2** was MLflow's default `./mlruns` file store (maintenance mode on MLflow ≥ 3, plus antivirus file-locking), not a missing endpoint. SQLite fixed it ([ADR 009](ADRs/009-sqlite-mlflow-tracking-backend.md)). The unused `http://localhost:5000` default in `src/core/config.py` / `.env.example` was never a working server and was removed on 2026-09-15 (register B5, A8-n).
- **Do not fill in option B** until a real server exists and access is confirmed. Code for this roadmap should read the URI from an environment variable and default to the local SQLite store, for example `os.getenv("MLFLOW_TRACKING_URI", "sqlite:///mlflow.db")`.
- **Limitation of option A:** the registry lives in one person's `mlflow.db`. A reviewer (Sam / Jamie) sees it via `mlflow ui --backend-store-uri sqlite:///mlflow.db` on that machine, or through committed evidence (`selection_rationale.json`, frontier plot, model card). State this honestly when presenting.

## 2. Requirement driver

- The brief (`StartingFiles/banking-churn-genai-project.md:113`, `:119`, tagged **[MLOps]**): *register the final model in the MLflow Model Registry*.
- The submission guide (`StartingFiles/submission-guide.md:15`): a registry link, *versioned with promotion stage*.
- Whether [MLOps] applies to DF14 is **unconfirmed** (register item B1). The quick fix in B1 is to register the existing run as `champion`. This roadmap is the full version.

## 3. Target workflow

### 3.1 Run structure

- **One selection round = one parent run.** It holds the policy: gate limits, stakeholder weights, split dates and the candidate list, all as params.
- **Each candidate = one nested child run** (`mlflow.start_run(nested=True)`):
  1. `gone_this_month` heuristic (baseline)
  2. Logistic regression
  3. Current XGBoost (`scale_pos_weight`, early stopping)
  4. XGBoost + isotonic calibration
  5. *(optional)* Shallower XGBoost, or XGBoost without `scale_pos_weight`
- **Same data for all:** `mlflow.log_input(mlflow.data.from_pandas(...), context=...)` records the dataset and the time-based split on every child run.

### 3.2 Scorecard per candidate (validation only)

| Objective | Metrics | Direction |
|---|---|---|
| Performance | `pr_auc`, `roc_auc`, `precision_at_5pct`, `recall_at_5pct`, `pr_auc_lift` vs heuristic | ↑ |
| Calibration | `brier`, `ece`, calibration-curve artifact | ↓ |
| Fairness (at ops threshold) | `eod_age`, `eod_state` (groups with n ≥ 500), `selection_gap_age` | ↓ |
| Latency | `p50_ms`, `p95_ms` for single-row preprocess + predict (mirrors `/score`) | ↓ |
| Cost | Model MB, train seconds, CPU s per 1k rows; **cost per contact** = LLM tokens per draft × price + agent review minutes × rate | ↓ |
| Business value | `expected_aum_saved` = Σ(prior-3-month max balance of true churners in queue) × save rate − contacts × cost per contact | ↑ |

Reuse the P-02 AUM method (prior-3-month max balance; ~$7.27M baseline) from the PRD.

### 3.3 Gates (constraints)

- Limits are agreed with stakeholders **before** training and logged as **params on the parent run**, so they cannot quietly move afterwards.
- Each child gets pass/fail **tags**: `gate.beats_heuristic`, `gate.calibration`, `gate.fairness`, `gate.all`.

| Gate | Proposed rule | Owner |
|---|---|---|
| Beats baseline | PR-AUC on validation > heuristic PR-AUC | Sam |
| Calibration | ECE ≤ *agreed limit* | Sam |
| Fairness | `eod_age` ≤ *limit* and `eod_state` ≤ *limit* | Jamie (needs [ADR 012](ADRs/012-fairness-and-compliance-guardrails.md) amendment, see §8) |

### 3.4 Pareto frontier

```python
passing = mlflow.search_runs(
    experiment_ids=[exp_id],
    filter_string=f"tags.mlflow.parentRunId = '{parent_id}' and tags.`gate.all` = 'true'",
)
```

- Keep **non-dominated** rows across the four objectives: `precision_at_5pct` ↑, `expected_aum_saved` ↑, `p95_ms` ↓, `cost_per_contact` ↓.
- Log `pareto_frontier.png` and `frontier.csv` on the parent run.

### 3.5 Stakeholder weights and rationale

- Weights (for example Morgan → value, Sam → performance, Jamie → fairness margin) are logged as params. They **rank frontier candidates only** and **never override a failed gate**.
- `selection_rationale.json` on the parent run: policy, all candidate run IDs, gate results, frontier run IDs, weights, winner and a short human-written reason.

### 3.6 Dependencies (tracked in the corrections register)

| Register item | Why this roadmap needs it |
|---|---|
| [F2 Calibration](../Engineering/Corrections_and_Future_Work.md#f2-probability-calibration--p2) | Required for the calibration gate and expected-value maths |
| [F3 Fairness limits](../Engineering/Corrections_and_Future_Work.md#f3-fairness-limits-as-an-agreed-gate--p2) | Required for the fairness gate (numbers + ADR 012 amendment) |
| [F4 pyfunc pipeline](../Engineering/Corrections_and_Future_Work.md#f4-log-the-complete-serving-pipeline-to-mlflow--p3) | Registered model must rebuild what `/score` serves |
| [F5 Business value](../Engineering/Corrections_and_Future_Work.md#f5-business-value-metric-with-morgans-assumptions--p3) | Save rate + cost per contact from Morgan |
| [F6 Operational metrics](../Engineering/Corrections_and_Future_Work.md#f6-operational-metrics--p3) | Latency + token cost inputs |
| [B2 / B12 Reproducibility](../Engineering/Corrections_and_Future_Work.md#b2-mlflow-run-not-reproducible-from-a-clean-clone--p2) | Data files and `mlflow.db` must exist to run anything |

## 4. Rules that must hold

1. **Select on validation; test once.** Test metrics are computed **only for the winner**, after selection, and logged on its child run as `test_*`.
2. **Split validation by time.** Validation is 2016-09 → 2017-08. Proposed: an earlier window (e.g. 2016-09 → 2017-02) fits the calibrator; a later window (2017-03 → 2017-08) picks the threshold and scores the gates. Isotonic calibration is monotonic, so ranking (PR-AUC, top-5% queue) is unchanged.
3. **Fixed split, no leakage.** Fit / validation / test dates stay as in ADR 004 / Sprint 2; the one-hot encoder is fit on fit months only.
4. **Be honest about latency and cost.** They will barely separate tabular candidates. The real trade-off is **queue size**: business value vs contact, review and LLM cost. Say so rather than inflate the frontier.

## 5. Registry and promotion

- Works on the local SQLite store (§1.1 option A); no registry server is required.
- `mlflow.register_model(f"runs:/{winner_run_id}/model", "meridian-churn")` → set alias **`challenger`** (`MlflowClient().set_registered_model_alias`). MLflow aliases replace the deprecated Staging / Production stages.
- **Human promotion gate:** move the alias to **`champion`** only after Sam (Data Science) and Jamie (Risk) review `selection_rationale.json` plus the model card. This follows the ADR 003 principle that nothing consequential happens without human approval.
- Record the reviewers and date as tags on the model version (`approved_by`, `approved_on`).

## 6. Serving change

- `export_ops_model.py` loads `models:/meridian-churn@champion` instead of a hard-coded `RUN_ID`.
- `serving_meta.json` gains `registered_model`, `model_version`, `alias`; `/health` exposes them next to `run_id`.
- The `Models/ops/` portable export remains the **serving** source of truth ([ADR 005](ADRs/005-portable-model-export-for-serving.md)); the registry becomes the **provenance and promotion** source of truth.

## 7. Minimal one-day version

| Dimension | Scope |
|---|---|
| Candidates | 4: heuristic, logistic regression, XGBoost, XGBoost + isotonic |
| Gates | 2: ECE, age/state EOD |
| Objectives | 3: precision at 5%, expected AUM saved, p95 latency |
| Registry | 1 registered model, `champion` alias after review |

**Build checklist**

- [ ] Restore data + MLflow store (B2 / B12)
- [ ] Selection script: parent run, nested candidates, `log_input`, scorecard
- [ ] Gates as params/tags; `search_runs` → Pareto frontier + plot + rationale JSON
- [ ] Test-once evaluation of the winner; register as `challenger`
- [ ] Human review → `champion`; update `export_ops_model.py` + `serving_meta.json` + `/health`
- [ ] Amend ADR 012 (if fairness becomes a gate) and write a new ADR for the selection policy

## 8. Open decisions for stakeholders

| # | Decision | Owner |
|---|---|---|
| 1 | Is [MLOps] in scope for DF14 (registry deliverable)? | Trainer |
| 2 | Numeric fairness limits for age and state EOD; does fairness become a hard release gate (amends ADR 012)? | Jamie |
| 3 | Maximum acceptable ECE after calibration | Sam |
| 4 | Save rate and cost per contact for expected-value maths | Morgan |
| 5 | Stakeholder weights across frontier objectives | Sam, Morgan, Jamie |
| 6 | Who approves `challenger` → `champion` | Sam + Jamie |
| 7 | Contact capacity: keep 5%, or let business value set queue size? | Morgan |
| 8 | Is a shared MLflow server needed (§1.1 option B)? If so, who provides `<REPLACE_WITH_SHARED_MLFLOW_TRACKING_URI>` and access? | Trainer / platform team |

## 9. Interview statement: today vs after this roadmap

### True today

> "I wouldn't simply pick the run with the highest AUC. I separate *can the model rank risk* from *who should we actually contact*, and treat the second as a constrained optimisation.
>
> First, the model had to beat a realistic baseline on a time-based holdout, not accuracy. XGBoost beat the 'gone this month' rule on PR-AUC, 0.22 against 0.15.
>
> Then, on validation data only, I set constraints from the business: at least 40% precision, and no more than 5% of customers contacted, because every flagged customer gets a human-reviewed email. The data showed the precision target was impossible, since even the top 1% was only about 24% precise. So I documented that instead of forcing it, and let the team's capacity set the threshold at the top 5%. That cut false positives about twelvefold without changing ranking quality.
>
> Fairness and explainability are published to Risk for review rather than used as an automatic gate, and nothing reaches a customer without human approval.
>
> The next step is to make this a full multi-objective selection: calibrate the scores, agree hard fairness limits with Risk, and compare several candidate models on performance, latency, cost and expected assets saved before registering a champion."

### True once this roadmap (and F2–F3) is built

> "I wouldn't simply pick the run with the highest AUC. I treat model selection as a constrained multi-objective problem, and I run it in MLflow so every decision can be audited.
>
> Before training, I agree the gates with stakeholders: the model must beat the business baseline, calibration error must stay under a set limit, and fairness gaps by age and state must stay within limits Risk has signed off. Those limits are logged on the selection run, so they can't quietly move afterwards.
>
> Each candidate (the baseline rule, logistic regression, XGBoost, calibrated XGBoost) is a child run with the same time-based split and the same scorecard, all measured on validation data. Among the candidates that pass every gate, I keep the Pareto frontier across four things: precision in the contact queue, expected assets saved, scoring latency, and cost per contact, including LLM tokens and review time.
>
> The stakeholders' agreed weights pick one model from that frontier, and I record the reasons with the run. Only the winner is scored on the test set, once. It's registered as the challenger, and promoted to champion only after Data Science and Risk review it."
