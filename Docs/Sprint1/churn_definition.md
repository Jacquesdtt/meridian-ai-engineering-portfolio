# Sprint 1: Churn Definition — What Changed, Why, and What We Found

**Status:** EDA v1.1 complete (2026-07-10) — label **unchanged** (ADR 004); revision P-01…P-12 closed; PRD AUM locked at ~$7.27M  
**Canonical ADR:** [ADR 004](../Architecture/ADRs/004-churn-target-and-predictive-window.md)  
**Implementation:** `Code/Sprint1/01_data_integrity_and_eda.ipynb` (§1–§9)  
**Process:** [AI engineering learnings — EDA revision process](ai_engineering_learnings.md#eda-revision-process-docs-before-code)  
**Learnings:** [ML_Learnings.md](ML_Learnings.md) · [ai_bp_learnings.md](ai_bp_learnings.md)  
**Checklist:** [eda_revision_plan.md](eda_revision_plan.md) (all done)

This note is the **post-Sam → EDA v1** story plus **§7 revision findings (v1.1)** after the notebook red-team.

---

## 0. How Sam changed the EDA (meeting → v1)

| Before meeting (strawman) | After Sam + EDA v1 |
|---------------------------|--------------------|
| `Running_Balance <= $50` as “gone” | Sense-check near $0; **round to nearest pound** → `Running_Balance_Rounded == 0` |
| Raw monthly txn count for inactivity | **`$0` placeholders** make raw count useless → `Monthly_Active_Txn_Count` |
| Unclear consecutive-month rule | Sam: explore & defend → data showed **mostly 1-month** left-looking streaks |
| 30 / 60 / 90 day options | Locked **next calendar month** (`t` → label in `t+1`) |
| Ad-hoc new-account handling | **Grace:** `Months_Since_Creation >= 2` at observation `t` |
| Null `start_balance` undecided | Sam: **`fillna(0)`** (3 customers) |
| High-balance quiet accounts unclear | Inactive with balance ≥ $1000 = **AUM preserved, not churn** |

Meeting notes: [01_sam_churn_definition_prep.md](../StakeholderManagement/Meetings/01_sam_churn_definition_prep.md)  
Pre-meeting red-team (stakeholder risks): [01_sam_red_team_analysis.md](../StakeholderManagement/Meetings/01_sam_red_team_analysis.md)

---

## 1. What changed in the notebook (and why)

| Change | Why |
|--------|-----|
| Load CSVs via `Path('../..') / 'StartingFiles'` | Notebook lives under `Code/Sprint1/`; paths relative to repo root were wrong and caused `FileNotFoundError`. |
| Detect `$0` placeholder rows (`amount = deposit = withdrawal = 0`) | Quiet months are padded with month-end zero rows. |
| Activity = `Monthly_Active_Txn_Count` (nonzero amounts only) | Raw `Monthly_Transaction_Count == 0` is **impossible** once placeholders exist — the old “danger zone” was always empty. |
| `Running_Balance_Rounded` + threshold sweep (£0 / £1 / £5 / £50) | Sam: sense-check near $0; round to nearest pound — not only `balance <= $50`. |
| Inactive streak analysis + high-balance dormancy | Defend “left” vs “still holding AUM but quiet.” |
| Grace period: `Months_Since_Creation >= 2` | Sam-approved exclusion for new accounts. |
| Label = state in month **t+1**; features from **t** only | Matches 1-month forward prediction; prevents target leakage. |
| `fillna(0)` on null `start_balance` | **Sam confirmed** (3 customers). |
| Locked `Is_Churned` + `Is_Train_Eligible` columns | Freeze a presentation-defensible training target. |

---

## 2. What we found (EDA v1)

| Finding | Result |
|---------|--------|
| Placeholder prevalence | **8.15%** of transaction rows (523,679 / 6,421,943) |
| True inactive months | **523,679** customer-months with zero *active* txs |
| Churn-shaped months | **266,215** with rounded £0 **and** inactive |
| Streak lengths (near-£0 inactive) | Mostly **length 1** (~163k) vs length 2 (~34k) |
| High-balance dormancy | **~53k** streaks with min balance ≥ $1000 → **not** labeled churn |
| Next-month positive rate (1-month rule) | **≈ 11.8%** (tenure ≥ 2) |
| Next-month positive rate (2-month confirm) | **≈ 2.6%** |

**Critical bug fixed:** exploring “months with 0 transactions” on the old aggregate always returned **0**. That was a methodology error, not evidence that nobody is inactive.

Plain-language glossary (left-looking, streaks, 11.8%): [ML_Learnings.md](ML_Learnings.md).

---

## 3. Locked definition (v1)

At observation month **t** (`Months_Since_Creation >= 2`):

```text
Is_Churned = 1  iff  month t+1 has
    Running_Balance_Rounded == 0
    AND Monthly_Active_Txn_Count == 0
```

**Why 1-month (not 2-month confirmation):**
- Prediction horizon is already the next month.
- Most near-zero inactive streaks are length 1.
- 2-month confirm delays detection and yields a ~2.6% positive rate (harder class balance, less actionable for retention).

Sensitivity column `Churn_State_2m_Confirm` remains in the notebook for comparison only.

**Do not change this lock in code until** the [revision plan](eda_revision_plan.md) says the evidence requires it (and ADR 004 is updated in the same change).

---

## 4. Data sources

| Source | Role | Notes |
|--------|------|-------|
| `StartingFiles/customers_tm1_e.csv` | Demographics, `start_balance`, `creation_date` | Immutable raw extract |
| `StartingFiles/transactions_tm1_e.csv` | Cash movements | Use `transaction_date` for month grain; ignore `$0` placeholders for activity |
| Sam meeting 2026-07-10 | Business constraints | See `Docs/StakeholderManagement/Meetings/01_sam_churn_definition_prep.md` |

Schema validation: `py -3.13 .cursor/skills/validate-csv-schema/scripts/validate_schema.py`

---

## 5. How to reproduce

```cmd
py -3.13 .agents\scratch\churn_threshold_analysis.py
```

Or run all cells in `Code/Sprint1/01_data_integrity_and_eda.ipynb` (Python 3.13 kernel; cwd-independent paths).

---

## 6. Narrative currency convention (P-12)

**Board / deck language:** amounts are shown with a **`$`** prefix because the extract uses US `state` geography and dollar-denominated balances. The locked balance rule is still Sam’s sense-check: **round to the nearest currency unit** (`Running_Balance_Rounded == 0`). When Sam said “nearest pound,” treat that as the rounding metaphor, not a GBP conversion.

Do **not** mix “£0 churn” and “$0 churn” in the same stakeholder slide — prefer “rounded to nearest $1 (Sam sense-check).”

---

## 7. Revision findings (v1.1 — post §9)

Checklist: [eda_revision_plan.md](eda_revision_plan.md) — **all P-items closed**.  
Technical write-up: [ML_Learnings.md](ML_Learnings.md). Business framing: [ai_bp_learnings.md](ai_bp_learnings.md).

| Item | Result |
|------|--------|
| **P-01** | Gap rate 0%; no reindex |
| **P-02** | Prior-month AUM ≈ **$34**; **prior-3-month max ≈ $7.27M** → [PRD §2](../Product/Product_Requirements_Document.md) |
| **P-03** | Prior-month timing; **34%** of `$0` crosses on day ≤14 → score early in prediction month |
| **P-04 / P-05 / P-11** | Prevalence 11.76%; first-exit 3.92%; impending 10.38%; late panel ~12–14%; 2020-05 censored |
| **P-06 / P-12** | Anti-patterns + currency narrative aligned |
| **P-07** | 11.23% negative months; **keep** `rounded == 0`; no ADR change |
| **P-08 / P-10** | DQ triage; 100% 1:1 accounts |
| **P-09** | Age ~11.0–11.9%; TX 13.43% / CA 10.36% |

**Done (2026-07-10):** `02_feature_engineering.ipynb` exported `Data/processed/training_data.csv` (2,263,608 × 27; pos rate **11.7601%**, matches this lock). See [walkthrough.md](walkthrough.md) §5.
