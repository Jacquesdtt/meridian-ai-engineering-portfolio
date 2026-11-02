# Red Team Analysis: EDA Notebook (`01_data_integrity_and_eda.ipynb`)

**Date:** 2026-07-10  
**Status:** Attack complete → revision **closed** (see [Closure](#closure) at bottom). Body below is the original attack log (present tense = as of pre-revision).  
**Target:** Post-Sam EDA v1 — locked `Is_Churned` in `Code/Sprint1/01_data_integrity_and_eda.ipynb`  
**Related:** [churn_definition.md](../../Sprint1/churn_definition.md) · [eda_revision_plan.md](../../Sprint1/eda_revision_plan.md) · [ML_Learnings.md](../../Sprint1/ML_Learnings.md) · [01_sam_red_team_analysis.md](01_sam_red_team_analysis.md)

**Objective:** Attack the *implemented* EDA and label construction — not the meeting agenda. Find holes a hostile Sam / Morgan / Jamie / Chloe review would exploit before we change code.

**Rule:** This document does **not** authorize notebook edits. Fixes are gated by the revision plan.

---

## What is already solid (do not reopen without cause)

- `$0` placeholder detection → activity via `Monthly_Active_Txn_Count`
- Sam-confirmed `fillna(0)` on null `start_balance`
- Balance sense-check: `Running_Balance_Rounded == 0` (not loose `<= $50` alone)
- High-balance dormancy (≥ $1000 inactive) excluded from “churn”
- Grace: tenure ≥ 2 at observation `t`
- Label = state in **`t+1`**; features described as from **`t` only**
- 1-month vs 2-month confirmation sensitivity documented (~11.8% vs ~2.6%)

---

## Critical

### RT-01 — Missing calendar months break the panel
*   **The flaw:** `monthly_tx` only contains months with ≥1 transaction row. A true silent month (no placeholder either) **vanishes**. Then `cumsum` skips calendar time, inactive streaks undercount, and `shift(-1)` is “next *observed* month,” not necessarily next **calendar** month.
*   **Attack:** “Your next-month label isn’t next calendar month.”
*   **Evidence needed:** Count gaps (customer-months missing between first and last observed month); share of labels where “next row” ≠ “next calendar period.”
*   **Direction (plan only):** Reindex each customer to a continuous month range; fill active count = 0; carry forward balance.

### RT-02 — AUM is still a fake number
*   **The flaw:** §5e sums **`start_balance` of last-month exits** — not balance just before exit. PRD still carries the **$4.2M** placeholder. Sam red-team Vulnerability 2 remains open.
*   **Attack (Morgan):** “You can’t tell me historical AUM at risk.”
*   **Evidence needed:** First transition into left-looking; prior-month (or prior-3-month max) `Running_Balance`; portfolio sum / distribution.
*   **Direction:** Replace coarse proxy with AUM-at-exit; feed PRD when stable.

### RT-03 — Ops 14-day Friction-Gate vs month grain
*   **The flaw:** Label = “gone sometime in month `t+1`.” Features = end of month `t`. Retention needs ~14 days inside a 30-day window. No intra-month timing of last nonzero tx / balance crossing £0.
*   **Attack:** “You predict next month, but they leave on day 3 and the email goes out day 20.”
*   **Evidence needed:** Day-of-month distribution of last active tx and of crossing into rounded £0.
*   **Direction:** Document scoring cadence (e.g. score early in month); align `ML_Anti_Patterns.md` example with ADR 004 month grain + in-month ops buffer.

---

## High

### RT-04 — Churn is a recurring state, not an absorbing exit
*   **The flaw:** A customer who stays empty can generate **many** `Is_Churned = 1` rows (each month asks “will *next* month look gone?”). 11.8% is **customer-month prevalence**, not unique-customer churn rate. Reactivations (gone → funded) unmeasured.
*   **Attack:** “11.8% isn’t a churn rate; it’s monthly prevalence.”
*   **Evidence needed:** First-exit incidence; share of positives where `gone_this_month` already 1; reactivation counts.
*   **Direction:** Report prevalence **and** first-exit; optional “not already gone” cohort for metrics (label lock may stay).

### RT-05 — `gone_this_month` at `t` nearly predicts the label
*   **The flaw:** If already left-looking at `t`, `t+1` is often still left-looking → easy accuracy, weak “save them *before* they leave” story.
*   **Attack:** “You’re predicting continued emptiness, not impending exit.”
*   **Evidence needed:** Positive rate and baseline accuracy on subset `gone_this_month == 0`.
*   **Direction:** Dual reporting; consider training/eval focus on not-yet-gone accounts without silently changing ADR unless agreed.

### RT-06 — Anti-patterns doc vs notebook mismatch
*   **The flaw:** `ML_Anti_Patterns.md` still sketches a **15-day buffer then 30-day target**. Notebook/ADR use clean **month `t` → month `t+1`**.
*   **Attack:** “Your own anti-leakage doc disagrees with your label.”
*   **Direction:** Rewrite the example to match ADR 004; state that the 14-day review sits *inside* the operational month.

### RT-07 — Negative / odd balances
*   **The flaw:** Locked rule is `rounded == 0`. Large negatives are not “churn” unless they round to 0. Overdraft / data-error story unexplored.
*   **Evidence needed:** Count / share of months with `Running_Balance < 0`; overlap with inactive.
*   **Direction:** Quantify; only change rule if evidence demands (would touch ADR).

---

## Medium

### RT-08 — Thin DQ outside `start_balance`
Duplicates, impossible `dob`, bad `state`, `account_id` vs `customer_id` cardinality, `date` vs `transaction_date` disagreement, `amount` vs `deposit + withdrawal`.

### RT-09 — No demographic / fairness slice on the label
Jamie will ask age/state. No crosstab of locked `Is_Churned` by age band or state on eligible rows.

### RT-10 — Multi-account customers
Schema has `account_id`; aggregation is by `customer_id` only. Blended balances if multi-account.

### RT-11 — Right-censoring at panel end
Last month → `Is_Churned = NaN` (correct). No plot of eligible volume / positive rate by `Month`.

### RT-12 — Currency / geography narrative
Sam said “nearest pound”; data has US `state`. Harmless for modeling; messy in a board deck — pick one narrative convention.

---

## Mapping to Sam pre-meeting red-team

| Sam vulnerability | Status after EDA v1.1 revision |
|-------------------|-------------------------------|
| V1 Target leakage | **Closed** — `t`/`t+1` + P-01 (0% gaps) + P-06 (anti-patterns aligned) |
| V2 AUM vs ROC-AUC | **Closed** — P-02 prior-3-month max ≈ **$7.27M** locked in PRD §2 |
| V3 Ops lead time | **Closed** — P-03 prior-month timing; 34% `$0` crosses by day 14; score early |
| V4 Data delusion | **Closed** — schema-grounded label + P-08/P-10 DQ |

---

## Closure

Revision checklist [eda_revision_plan.md](../../Sprint1/eda_revision_plan.md) **complete** (P-01…P-12). Label lock (ADR 004) **unchanged**. Learnings: [ML_Learnings.md](../../Sprint1/ML_Learnings.md), [ai_bp_learnings.md](../../Sprint1/ai_bp_learnings.md).

This file remains the **attack log** (what was wrong). Do not treat open wording above the closure section as current status.
