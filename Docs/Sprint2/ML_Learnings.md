# Machine Learning Learnings — Sprint 2

> **Status clarification, 2 November 2026:** Calibration concerns probability reliability. An increasing Platt mapping preserves ranking and precision for the same top-k cases; isotonic calibration can introduce ties. Neither provides demonstrated precision lift here. Fairness numbers below are aggregate records; the detailed slice CSV is not public.


This record describes the first model run, the threshold change, and the evaluation evidence.

| | |
|---|---|
| **Notebook** | `Code/Sprint2/01_modeling_and_rai.ipynb` (Run All confirmed 2026-07-14) |
| **First successful MLflow run** | `7134cee0766646498e002e5326e3c200` (max-F1 threshold) |
| **Ops-threshold MLflow run** | `3f575754ae9a42c5a21ea5e476c0af37` (notebook Run All; top-5% fallback) |
| **Numbers source** | [reports/sprint2_run_summary.json](reports/sprint2_run_summary.json) (v1) · [reports/sprint2_run_summary_v2.json](reports/sprint2_run_summary_v2.json) (ops cut) |
| **Model card** | [../Model_Card_Template.md](../Model_Card_Template.md) |
| **Anti-patterns (defensive)** | [../Sprint1/ML_Anti_Patterns.md](../Sprint1/ML_Anti_Patterns.md) |
| **Debrief / walkthrough** | [sprint_debrief.md](sprint_debrief.md) · [walkthrough.md](walkthrough.md) |
| **Ops threshold policy (locked)** | §2 below — tried prec ≥ 0.40 ∩ selection ≤ 5%; **fallback** = val top-5% quantile (`t≈0.701`) |

---

## 1. First successful run — what we found

Evidence: MLflow run `7134cee0`, test months **2017-09 → 2020-04**, threshold frozen from **validation F1**.

> **Where the v1 code lives:** re-running the notebook replaced the `xgb_temporal_v1` cell with the ops-cut version. The original max-F1 training code now survives only in `.agents/scratch/build_sprint2_modeling_nb.py` (private development note; omitted from this public snapshot) (`run_name="xgb_temporal_v1"`).

### 1.1 Ranking (the DoD we cared about)

| Model | PR-AUC | ROC-AUC | Accuracy |
|-------|--------|---------|----------|
| Always-negative | 0.132 | n/a | 0.869 |
| `gone_this_month` heuristic | 0.151 | 0.551 | 0.795 |
| **XGBoost (first run)** | **0.219** | **0.723** | 0.508 |

**Finding:** The model **cleared** the heuristic on both ranking metrics. Accuracy looked “worse” than always-negative — that is expected under imbalance and is **not** a failure.

### 1.2 Operating point (the surprise)

| At threshold 0.475 | Value |
|--------------------|-------|
| Precision | 0.211 |
| Recall | 0.9997 |
| F1 | 0.348 |
| Confusion | TN 190,583 · **FP 248,778** · FN 17 · TP 66,485 |

**Finding:** Val-tuned **max F1** produced a recall-greedy cut. For Meridian retention spend, that operating point is **not usable** even though ranking DoD passed.

### 1.3 Drivers (SHAP)

Top mean \|SHAP\| on a test sample:

1. `Running_Balance_Rounded`
2. `Running_Balance`
3. `Monthly_Deposit_Sum`
4. `Balance_Roll3_Mean`
5. `Monthly_Withdrawal_Sum`

**Finding:** Balance dominates — **expected** under ADR 004 (next-month rounded-$0 + inactive), consistent with Sprint 1’s Gini leak screen (top feature ≪ 0.50). Not automatic proof of leakage.

### 1.4 Fairness (first cut)

| Slice | Result | How to talk about it |
|-------|--------|----------------------|
| Age | EOD ≈ 0.052, selection-rate gap ≈ 0.049 | Mild under this aggressive threshold |
| State | EOD = 1.0, ratio = 0.0 | **Not** “the model hates some states” — sparse groups + ~100% recall inflate Equalized Odds |

### 1.5 Engineering findings before/around that run

These are worth one slide as “how we got the run to finish,” not as model science:

| Fault on the way | What we changed | Why |
|------------------|-----------------|-----|
| MLflow blocked `./mlruns` file store | SQLite `mlflow.db` | Current MLflow puts file store in maintenance mode |
| `scale_pos_weight` logged twice (full float then rounded) | Single `log_params` dict | MLflow forbids changing a param on the same run |
| Yellowbrick: “not a classifier” / missing `target_type_` | Wrapper + `force_model` + visualizer `.fit` before `.score` | Yellowbrick expects sklearn fit metadata even when XGBoost is already trained |
| Full-test Yellowbrick too heavy | 40k sample + per-plot try/except | Runtime / resilience |
| `dtreeviz` NaNs | Fail-soft skip | Lag3 native missing by design — don’t impute just for a diagram |

---

## 2. What we changed in the *decision policy* (not the ranking story)

> **Status:** Applied and **confirmed by notebook Run All** (2026-07-14). Canonical ops run: MLflow `3f575754…`. Numbers in §2.5 and `reports/sprint2_run_summary_v2.json`.

### 2.1 Decision summary

The first run improved ranking over the heuristic. The max-F1 cut created too many review cases, so the contact policy was evaluated separately.

### 2.2 What stayed (so we are not “moving the goalposts”)

| Kept | Why it matters to Chloe / Sam / Jamie |
|------|----------------------------------------|
| Same modeling recipe / temporal split | Production scores the *future* from the *past* |
| Heuristic bar still the ranking DoD | Success is still “better than `gone_this_month`,” not accuracy |
| Threshold chosen on **validation only**, frozen for test | Avoids threshold-calibration leakage (ML anti-pattern) |
| SHAP / Fairlearn / Evidently pack | Explainability and governance evidence |

### 2.3 What changed — and why (tied to first-run evidence)

| Before (first run `7134cee0`) | After (ops Run All `3f575754`) | Why |
|-------------------------------|--------------------------------|-----|
| Pick `t` to **maximize F1** on validation | Tried prec ≥ 0.40 ∩ sel ≤ 5%; **fallback** = val **top 5%** quantile | Max F1 gave ~21% precision and ~249k FPs — unusable for Sam’s queue |
| Implicitly contact ~62% of test rows at `t=0.475` | Contact ~**5%** (`t≈0.701`) | Friction-Gate capacity is finite (ADR 003) |
| Treat F1 as the ops dial | Capacity is the dial that moved cost; precision floor was aspirational | Ranking quality ≠ who we email |
| State EOD with no min group size | EOD only for groups with **n ≥ 500** | First-run state EOD = 1.0 was a sparse-slice artifact |

### 2.4 Locked threshold rule (validation only) — what we ran

On validation probabilities `val_prob` only, grid-search  
`t ∈ np.linspace(0.05, 0.99, 95)`:

1. **Precision floor:** candidates with `precision(val) ≥ 0.40`
2. **Capacity cap:** among those, `selection_rate(val) ≤ 0.05` (then 0.02, 0.01)
3. **Objective:** maximize validation recall (tie-break: precision, then F1)
4. **Freeze** `t*` and apply unchanged to test

**What actually happened (notebook + MLflow `3f575754`):** No validation cut reached precision ≥ 0.40 (val precision tops out ≈ **0.24**). Fallback fired:

- `t* = quantile(val_prob, 0.95)` → **`t* ≈ 0.701`**
- Rule logged: `fallback_quantile_top5pct`
- Val @ cut: selection 5.0%, precision ≈ 0.228, recall ≈ 0.091

### 2.4a Why we could not hit 40% precision


**What we measured (validation — never tuned on test):**

| Contact slice (by score rank) | Approx. selection | Val precision | Val recall |
|------------------------------|-------------------|---------------|------------|
| Top 50% | 50% | ≈ 0.21 | ≈ 0.84 |
| Top 10% | 10% | ≈ 0.23 | ≈ 0.18 |
| Top 5% *(shipped cut)* | 5% | ≈ **0.23** | ≈ 0.09 |
| Top 1% | 1% | ≈ **0.24** | ≈ 0.02 |
| Peak on fine grid (≥50 flagged) | ~0.9% | ≈ **0.24** | — |

**40% never appears in that table** — raising the threshold does not unlock it.

**Three reasons (plain language):**

1. **Scores are ranks, not calibrated probabilities**  
   Training used `scale_pos_weight` for class imbalance. That helps ranking under rare churn; it does **not** make “score = 0.70” mean “70% chance of churn.” Cutting higher shrinks the queue; it does not magically make the queue 40% true positives.

2. **Ranking is better than the heuristic, but still modest**  
   PR-AUC ≈ **0.219** vs heuristic **0.151** is a real win on *ordering*. It does **not** mean the head of the list is mostly churners. Precision at the top stays in the low–mid 20%s.

3. **Base rate is ~12%**  
   Random contact would be ~12% precise. Hitting **40%** means the contacted set must be roughly **3× richer** than chance. This booster does not concentrate positives that tightly — even the very top percentile only reaches ~24%.

**What we did instead (and why that is still a success):**

| Dial | Result |
|------|--------|
| Precision floor 40% | **Not achievable** on these scores → documented, not faked |
| Capacity (top 5%) | **Shipped** — test FPs **248k → 20k**; queue Friction-Gate-sized |
| Ranking DoD | **Unchanged** — PR-AUC / ROC-AUC still beat the heuristic |

**If Sam later needs ≫23% precision:** that is a **new work item** (a different objective, better features, or a stronger model) — not another max-F1 threshold hunt on the same scores.

### 2.5 Before / after (notebook Run All)

| | **Before** — `7134cee0` | **After** — `3f575754` |
|--|-------------------------|------------------------|
| Threshold *rule* | Maximize F1 on validation | Fallback: val top-5% quantile (prec≥0.40 infeasible) |
| Frozen `t` | **0.475** | **≈ 0.701** |
| Test precision | **0.211** | **0.229** |
| Test recall | **0.9997** | **0.090** |
| Test false positives | **248,778** | **20,127** (~12× fewer) |
| Test PR-AUC | **0.219** | **0.219** |
| Test ROC-AUC | **0.723** | **0.723** |
| Beats heuristic (PR / ROC) | Yes / Yes | **Yes / Yes** |
| MLflow run | `7134cee0…` | `3f575754…` |


### 2.6 Fairness follow-up (Jamie) — notebook Run All at ops threshold

At `t≈0.701`, 100k test sample, Equalized Odds **only for groups with n ≥ 500**:

| Slice | First-run (aggressive cut) | Ops cut + min-n (`3f575754`) |
|-------|----------------------------|------------------------------|
| Age EOD | ≈ 0.052 | ≈ **0.156** |
| Age selection-rate gap | ≈ 0.049 | ≈ **0.099** |
| State EOD | **1.0** (artifact) | ≈ **0.318** (38/55 states kept; 3,548 sparse rows excluded) |

Interpretation: use the filtered state EOD (~0.32), **not** 1.0. Age gap widened vs the near-universal-recall first cut — expected when selection is sparse; still flag for Jamie if automating volume by age band.

### 2.7 What we deliberately did *not* change

- No new features, no EDA/FE restart.
- No StandardScaler; Lag3 stays native NaN for trees.
- No threshold tuning on the test months.
- Did **not** claim we hit 40% precision — we documented why the floor failed and what we shipped instead.

---

## 3. ML lessons worth keeping (Sprint 2)

### Evaluation
* **Threshold calibration leakage:** Never pick the cut on the test set. Calibrate on validation, freeze, apply to test.
* **F1-max ≠ ops-ready:** Ranking DoD and operating policy are different questions.
* **Heuristic bar matters:** Always-negative accuracy is a trap; beat `gone_this_month` on PR-AUC/ROC-AUC.
* **`scale_pos_weight` skew:** Treat outputs as ranking scores unless you calibrate probabilities separately.
* **Precision floor can be infeasible:** A 40% target is not “failed tuning” if the PR curve never reaches it — measure precision@k on val, then choose capacity or investigate a better ranking (see §2.4a).

### Features / trees
* **Native NaNs (Lag3):** Prefer tree missing handling over arbitrary impute in the training path.
* **No StandardScaler on ±1e10 balances:** Trees tolerate raw scale; scaling can hide or distort extremes.

### Explainability / RAI
* **SHAP aligning with the label** is expected for balance-based churn — pair with a leak screen, don’t panic.
* **Sparse-slice fairness metrics** can look catastrophic when recall ≈ 1; apply min-n before board language.

---

## 5. Pointers to artifacts

| Artifact | Path |
|----------|------|
| First-run summary | `Docs/Sprint2/reports/sprint2_run_summary.json` |
| Ops-threshold summary | `Docs/Sprint2/reports/sprint2_run_summary_v2.json` |
| SHAP / Yellowbrick PNGs | `Docs/Sprint2/reports/` |
| Fairlearn | [Committed aggregate summary](reports/fairlearn_equalized_odds.json); detailed slice CSV is generated by the notebook but absent from this public checkout |
| Drift (Morgan) | [`data_drift_report.html`](data_drift_report.html) |
| Outcomes canvas (interactive) | Cursor canvas `sprint2-modeling-outcomes.canvas.tsx` |
| Application workflow | [Application guide](../Portfolio/DEMO_GUIDE.md) · [Fixtures](../Sprint4/fixtures/) |
