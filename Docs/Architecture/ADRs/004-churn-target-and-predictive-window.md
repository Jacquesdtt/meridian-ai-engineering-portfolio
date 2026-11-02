# ADR 004: Churn Target Definition and Predictive Window

**Date:** 2026-07-10  
**Status:** Accepted (thresholds locked after Sprint 1 EDA)

## Context

Before feature engineering or XGBoost training, we must define `Is_Churned` and the predictive lead time. In retail banking, churn is often silent abandonment (stop transacting, leave a near-zero balance) rather than an explicit closure event. Sam (Head of DS) granted autonomy to set thresholds from data, required a sense-check rounded to the nearest pound, approved a new-account grace period, and set the prediction horizon to the **next month**.

Raw `transactions_tm1_e.csv` also contains month-end `$0` placeholder rows. Counting all rows as activity makes “zero transactions” impossible and would break any inactivity-based label.

## Decision

### Locked label

At observation month **t** (with `Months_Since_Creation >= 2`):

```text
Is_Churned = 1  iff  month t+1 has
    Running_Balance_Rounded == 0
    AND Monthly_Active_Txn_Count == 0
else 0
(NaN if the customer has no month t+1)
```

| Component | Rule | Rationale |
|-----------|------|-----------|
| Balance | `Running_Balance_Rounded == 0` | Sam: as close to $0 as possible; round to nearest £. Empirically ≈ `abs(balance) < 1`. |
| Activity | `Monthly_Active_Txn_Count == 0` | Exclude `$0` placeholder rows (~8.15% of txs). Raw `count == 0` never occurs. |
| Horizon | Label = state in **t+1**; features from **t** only | 1-month forward window; anti-leakage. |
| Grace | Tenure ≥ 2 months at **t** | Sam-approved new-account exclusion (`GRACE_MONTHS = 2`). |
| Null `start_balance` | `fillna(0)` | Sam-confirmed (3 customers). |
| High-balance dormancy | **Not** churn | Inactive with balance ≥ $1000 still holds AUM. |

### Supporting EDA facts (full file)

| Metric | Value |
|--------|-------|
| `$0` placeholder rows | 523,679 / 6,421,943 (8.15%) |
| Customer-months | 2,685,091 |
| Inactive months (active txn count = 0) | 523,679 |
| Rounded-£0 **and** inactive months | 266,215 |
| Near-£0 inactive streaks length 1 vs 2 | ~162,783 vs ~34,385 |
| High-balance dormant streaks (min ≥ $1000) | 52,574 |
| Next-month positive rate (1-month rule, tenure≥2) | ≈ 11.8% |
| Next-month positive rate (2-month confirm) | ≈ 2.6% |

**Why not 2 consecutive inactive months?** The prediction window is already next-month; most exit-shaped streaks are length 1; requiring two months delays detection and drops the positive rate to ~2.6%. Keep `Churn_State_2m_Confirm` as sensitivity only.

## Alternatives considered

1. **Strict `$0.00` without rounding** — Rejected; Sam asked for round-to-pound sense-check; pennies would create false negatives.
2. **`Running_Balance <= $50` only** — Too loose; includes large negatives and non-abandoned low balances; does not match “as close to 0 as possible.”
3. **Raw `Monthly_Transaction_Count == 0`** — Invalid; `$0` placeholders pad quiet months.
4. **60/90-day prediction window** — Rejected with Sam; signal weaker further out; 30-day chosen.
5. **2-month confirmation before labeling churn** — Deferred as sensitivity; too rare/delayed for the locked training label.

## Consequences

* Training rows use `Is_Train_Eligible` (`tenure >= 2` and known next month).
* Features must stop at end of month **t**; never use month **t+1** cash-flow as a feature when predicting `Is_Churned` for **t**.
* Inference must leave enough calendar time inside the 30-day window for the Retention Team’s ~14-day Friction-Gate review (ADR 003). EDA P-03: **34%** of pre-exit rounded-$0 crosses occur by day 14 of the prior month — score early in month `t+1`.
* Historical AUM-at-risk for Morgan: **~$7.27M** (prior-3-month max `Running_Balance` at first left-looking exit) — see PRD §2. Not part of the label math.
* Implementation source of truth: `Code/Sprint1/01_data_integrity_and_eda.ipynb` (§7–§9). Narrative summary: `Docs/Sprint1/churn_definition.md`.

## References

* Meeting notes: `Docs/StakeholderManagement/Meetings/01_sam_churn_definition_prep.md`
* Data dictionary: `Docs/Data/Data_Dictionary.md`
* Anti-patterns: `Docs/Sprint1/ML_Anti_Patterns.md`
* Offline diagnostics: `.agents/scratch/churn_threshold_analysis.py`
