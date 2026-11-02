# Sprint 1: EDA & Feature Engineering - Debrief

> **Scope:** Full Sprint 1 close-out — EDA revision (P-01…P-12) **and** FE export (`training_data.csv`). As of 2026-07-10.
>
> **Related:** Process retrospective (keep/stop/start) → [sprint_retrospective.md](sprint_retrospective.md). This debrief is the delivery record.

## 1. What Was Done (Change from Last Sprint)
- Locked `Is_Churned` after Sam (ADR 004); rebuilt and ran `01_data_integrity_and_eda.ipynb` (§1–§9).
- Red-teamed the notebook; signed off [eda_revision_plan.md](eda_revision_plan.md); implemented **P-01…P-12**.
- Locked historical AUM-at-risk ≈ **$7.27M** in [PRD §2](../Product/Product_Requirements_Document.md).
- Built and ran `02_feature_engineering.ipynb` → exported `Data/processed/training_data.csv`.
- Documented learnings in `ML_Learnings.md`, `ai_engineering_learnings.md`, `ai_bp_learnings.md`.

## 2. How It Was Done
- **Docs before code:** attack note → checklist → notebook §2.1/§4.1/§8.1/§9 → PRD/MEMORY cascade.
- Heavy notebooks executed in IDE (`py -3.13` kernel); agents wrote cells / docs, human ran Run All.
- FE notebook **rebuilds** the monthly panel + ADR 004 label from raw CSVs (does not depend on pickled EDA state), then adds month-`t` features and exports CSV.
- Schema validation skill for CSV column names; AppLocker bypass via global `py` launcher.

## 3. Why It Was Done
- **EDA:** Defend the label to Sam; give Morgan a real AUM figure; give Jamie fairness/ops timing; avoid silent label unlocks.
- **FE:** Produce a leakage-safe training frame for Sprint 2 XGBoost / MLflow — features only through observation month `t`, label = next-month left-looking state.
- Produce an audit trail for the cohort report (stakeholder → EDA → self-critique → stronger EDA → training export).

## 4. Issues & Workarounds
- **AppLocker:** no `.venv` Python; use `py -3.13`.
- **P-02/P-03 first pass wrong windows:** prior-month AUM ~$34; exit-month timing n=0. Fixed to prior-3-month max + prior-month timing.
- **Large tx file (~350MB) / FE CSV (~417MB):** keep diagnostics in `.agents/scratch/`; don’t dump frames into LLM context; CSV is gitignored.
- **Balance outliers (±1e10) and Lag3 NaNs (~138k rows):** carried into training by design; handle in Sprint 2 (tree models / native missing).

## 5. Learning Outcomes
- See [ML_Learnings.md](ML_Learnings.md) (technical), [ai_bp_learnings.md](ai_bp_learnings.md) (business), [ai_engineering_learnings.md](ai_engineering_learnings.md) (process).

## 6. Results & Next Steps

### EDA (label lock)
| Result | Value |
|--------|-------|
| Label positive rate | **11.76%** (2.26M eligible rows) |
| AUM at risk (P-02) | ~**$7.27M** prior-3-month max |
| Ops timing (P-03) | **34%** `$0` crosses by day 14 (prior month) |
| Label unlock? | No (P-07 keep `rounded == 0`) |

### Feature engineering (export)
| Result | Value |
|--------|-------|
| `training_data.csv` | **2,263,608 × 27**, ~417 MB |
| Positive rate | **11.7601%** (matches EDA) |
| Customers / months | 138,640 / 158 (`2007-03`→`2020-04`) |
| Anti-leakage check | `gone_this_month == Is_Churned` **81.75%** (t+1 shift OK) |
| RF Gini screen (50k sample) | Top = `Running_Balance_Rounded` **0.273** (≪ 0.50 threshold); no single-feature domination |
| Lag3 NaNs | 138,640 (early tenure) |

**Next:** Sprint 2 — see [sprint_plan.md](../Sprint2/sprint_plan.md). Temporal train/test on `Month` + XGBoost / MLflow. Schedule: [project_schedule.md](../Sprint0/project_schedule.md).

**Retrospective (2026-07-10):** [sprint_retrospective.md](sprint_retrospective.md). Skillified: `/docs-before-code`.
