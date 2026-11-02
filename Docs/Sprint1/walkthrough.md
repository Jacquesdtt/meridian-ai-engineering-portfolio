# Sprint 1: Full Execution Walkthrough

**Status:** Complete — EDA + FE export + Gini screen + dual close-out (2026-07-10)  
**As of:** 2026-07-10  
**Next sprint:** [Sprint 2 plan](../Sprint2/sprint_plan.md) · [project schedule](../Sprint0/project_schedule.md)

This is the step-by-step execution narrative for Sprint 1. Deeper technical learnings live in [ML_Learnings.md](ML_Learnings.md); process in [ai_engineering_learnings.md](ai_engineering_learnings.md); business framing in [ai_bp_learnings.md](ai_bp_learnings.md). Code map: [Code_Walkthrough.md](../Engineering/Code_Walkthrough.md).

---

## 1. Setup & constraints
- Windows AppLocker → run with `py -3.13`, not `.venv`.
- CSVs in `StartingFiles/`; schema guard via `.cursor/skills/validate-csv-schema/`.
- State tracked in `.agents/MEMORY.md`.
- Heavy notebooks: agents write cells/docs; human runs in IDE (Python 3.13 kernel) or `nbconvert`.

---

## 2. Sam meeting → EDA v1
**Why:** Lock a defensible churn proxy with Sam before modeling; avoid guessing thresholds.

1. Prep + pre-meeting red-team (`Docs/StakeholderManagement/Meetings/01_*`).
2. Locked decisions into [ADR 004](../Architecture/ADRs/004-churn-target-and-predictive-window.md): next-month label, rounded-$0 + inactive, grace ≥ 2, `fillna(0)` on null `start_balance`.
3. Rebuilt `Code/Sprint1/01_data_integrity_and_eda.ipynb` (§1–§8): placeholders → `Monthly_Active_Txn_Count`, running balance, threshold/streak/grace EDA, locked `Is_Churned` / `Is_Train_Eligible`.
4. Wrote [churn_definition.md](churn_definition.md) (v1 story).

**v1 headline:** eligible positive rate ≈ **11.8%**; 1m vs 2m confirm ≈ 2.6%.

---

## 3. Notebook red-team → revision plan (docs before code)
**Why:** Attack the *implemented* EDA before trusting the label for FE/modeling.

1. Attacked the notebook: [02_eda_notebook_red_team.md](../StakeholderManagement/Meetings/02_eda_notebook_red_team.md).
2. Signed off [eda_revision_plan.md](eda_revision_plan.md) (P-01…P-12) before further code edits.
3. Process captured in [ai_engineering_learnings.md](ai_engineering_learnings.md).

---

## 4. EDA notebook run (`01_data_integrity_and_eda.ipynb`)
**Why:** Prove data integrity, lock the label with evidence, and answer Morgan/Jamie questions (AUM, ops timing, fairness) without unlocking ADR 004.

**How:** Restart Kernel → Run All in IDE (Python 3.13), or `nbconvert` (see §8).

| Block | Items | Result (short) |
|-------|-------|----------------|
| §2.1 | P-08, P-10 | DQ triage; **100%** 1:1 accounts |
| §4.1 | P-01 | **0%** calendar gaps → no reindex |
| §8 / §8.1 | Label + P-04/05/11 | Prevalence **11.76%**; first-exit **3.92%**; impending **10.38%**; late panel ~12–14% |
| Docs | P-06, P-12 | Anti-patterns + `$` narrative |
| §9 | P-02, P-03, P-07, P-09 | See below |

**§9 highlights:**
- **P-02:** Prior-month AUM ~$34 (useless); **prior-3-month max ≈ $7.27M** → locked in [PRD §2](../Product/Product_Requirements_Document.md).
- **P-03:** Timing on **prior** month (exit month has 0 active txs); **34%** of `$0` crosses by day 14.
- **P-07:** Keep `rounded == 0` (no ADR unlock).
- **P-09:** Age ~11–12%; TX 13.4% / CA 10.4%.

Label lock **unchanged**.

---

## 5. Feature engineering notebook run (`02_feature_engineering.ipynb`)
**Why:** Rebuild the locked label independently of the EDA notebook, engineer month-`t`-only features (no future peek), and export a single training CSV for Sprint 2 XGBoost / MLflow.

**How:** Run All in IDE (Python 3.13) after EDA lock; spot-checked CSV on disk.

| § | What ran | Output |
|---|----------|--------|
| 1 | Load raw CSVs | 141,576 customers; 6,421,943 transactions |
| 2 | Monthly panel + ADR 004 label | 2,685,091 monthly rows → **2,263,608** eligible; pos rate **11.7601%** |
| 3 | Features at observation month `t` | Demographics, level, lags/rolls, dormancy |
| 4 | Export | `Data/processed/training_data.csv` — **2,263,608 × 27**, ~417 MB |
| 5 | Anti-leakage sanity | `gone_this_month == Is_Churned` **81.75%**; name check + **RF Gini screen** (top feature **27.3%** ≪ 50%) — **passed** |

**Spot-check (post-run):**
- Positive rate matches EDA (**11.76%**); 266,202 positives / 1,997,406 negatives.
- Months `2007-03` → `2020-04` (158 months); 138,640 customers.
- `Active_Txn_Lag3` NaNs = **138,640** (early tenure; Lag1/Lag2 complete under grace ≥ 2).
- Extreme balance outliers still present (±1e10) — known from EDA; trees tolerate; do not scale blindly.
- Split on **`Month`** in Sprint 2 — do not shuffle rows.

**Empirical Gini screen (RF, 50k-row sample, `gone_this_month` held out):**

| Rank | Feature | Gini |
|------|---------|------|
| 1 | `Running_Balance_Rounded` | 0.273 |
| 2 | `Running_Balance` | 0.265 |
| 3 | `Balance_Roll3_Mean` | 0.164 |
| 4 | `Monthly_Amount_Sum` | 0.076 |
| 5–10 | MoM change, deposit share, amount roll/lag, tenure, withdrawals | ≤0.048 |

No feature >50% → no smoking-gun mathematical leak. Balance features leading is **expected** (label is next-month rounded-$0 + inactive), not proof of future peek.

Column definitions: [Data_Dictionary.md](../Data/Data_Dictionary.md) §2.

---

## 6. Documentation cascade
Updated learnings, walkthrough, code walkthrough mirrors, red-team closure, ADR 004 consequences, sprint plan/debrief DoD, `MEMORY.md`, processed-data README.

---

## 7. Sprint 1 DoD
- [x] EDA notebook executed end-to-end (incl. §9 revision).
- [x] Churn definition locked (ADR 004 + churn_definition.md).
- [x] Red-team + P-01…P-12 closed; PRD AUM ≈ $7.27M.
- [x] FE notebook executed; `training_data.csv` generated and spot-checked.
- [x] Sprint 1 retrospective + skillify (`sprint_retrospective.md`, `.agents/skills/docs-before-code/`).
- Dual close-out is mandatory every sprint (AGENTS §4): debrief **and** retrospective — also backfilled for [Sprint 0](../Sprint0/sprint_retrospective.md).

---

## 8. How to re-run
```cmd
cd Code\Sprint1
py -3.13 -m nbconvert --to notebook --execute --inplace 01_data_integrity_and_eda.ipynb
py -3.13 -m nbconvert --to notebook --execute --inplace 02_feature_engineering.ipynb
```
Or Restart Kernel → Run All in the IDE (Python 3.13). FE alone is enough to regenerate `training_data.csv` (it rebuilds the panel from raw CSVs).
