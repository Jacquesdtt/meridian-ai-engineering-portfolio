# Meeting Notes: Sam (Head of DS) - Churn Definition

**Date/Time:** 2026-07-10 11:00 AM (Completed)
**Stakeholders Present:** Jacques, Sam
**Meeting Goal:** Finalize the operational definition of "Churn" so feature engineering can begin.

---

## 1. Pre-Meeting Prep / Agenda

**Context to provide Sam:**

* We've aggregated the 350MB transaction file into a monthly grain and computed the Running Balance for all customers.
* Before we build the XGBoost model, we need to explicitly label our training data (1 = Churned, 0 = Retained).

**Questions to ask Sam:**

1. **The Hard Definition of "Gone" (The Threshold):**
   * Does an account balance have to hit exactly `$0.00` to be considered churned, or is there a minimum threshold (e.g., dropping below `$50`)?
   * How many consecutive months of zero transactions must accompany a zero-balance to confirm they have left the bank?
2. **The Predictive Window (The Lead Time):**
   * Since our goal is to send retention emails *before* they leave, how far out are we trying to predict? 30 days, 60 days, or 90 days?
3. **Inactivity vs. Churn (The Engagement Question):**
   * What if a customer has `$10,000` but hasn't made a single transaction in 6 months? Are they considered 'churned' due to lack of engagement, or is that perfectly fine because the AUM is preserved?
4. **Explicit Exclusions:**
   * Are there any customers we must exclude from this model? (e.g., accounts closed due to suspected fraud, or accounts opened less than 30 days ago).
   * Are there any specific behavioral features you've seen work well in the past that you want me to engineer? (e.g., Velocity of withdrawals, average transaction size).

**The Proposed Strawman Definition (To present to Sam):**

Based on our EDA and the need to defend against Temporal Target Leakage while giving Operations their 14-day lead time, I propose the following strict mathematical definition:

```python
# The mathematical flag for the label
Is_Churned = 1 IF:
    (Running_Balance <= $50.00) 
    AND 
    (Monthly_Transaction_Count (excluding $0.00 transactions) == 0 for the subsequent month)

# The Temporal Defense (Anti-Leakage)
Observation Cutoff = Anchor Date
Operations Lead Time = 15 Days (Buffer where no features are extracted)
Prediction Window = Anchor Date + 15 Days to Anchor Date + 45 Days
```

## 2. Meeting Notes / Transcript Summaries

* **The Hard Definition of "Gone":** Sam indicated there is no explicit minimum balance, but recommended a "sense check" and rounding to the nearest pound. The balance should be as close to 0 as possible for that month.
* **Consecutive Months of Inactivity:** Sam isn't sure about specific thresholds and wants us to explore the data to find what makes sense. She expects us to use clear, defensible definitions, especially for churn, as we will present to Chloe, Jamie, and herself. We need to defend our choices based on the data.
* **The Predictive Window:** We want the model to determine the probability they will churn in the **next month** (a 30-day prediction window).
* **Explicit Exclusions:** It's reasonable to exclude certain customers, such as those within a grace period after opening an account.
* **Feature Engineering:** No specific features were mandated. We should explore, implement, and explain our choices. We are allowed to use outside sources (e.g., economic indicators). We must document all data sources and ensure they are reliable and referenced.

## 3. Decisions Made

* **Target Variable Window:** The model will predict the probability of churn in the *next month* (1-month forward looking).
* **Autonomy:** We have full autonomy to define the exact thresholds for churn (balance and inactivity) and feature engineering, provided we can rigorously defend our choices with data during the final presentation.
* **External Data:** Approved to use external data sources (like economic indicators) as long as they are documented and reliable.
* **Exclusions:** We will implement a grace period for new accounts before including them in the churn model.
* **Null `start_balance`:** Confirmed — impute the 3 missing opening balances as `$0` (`fillna(0)`) for running-balance calculations.

## 4. Action Items & Next Steps

* [x]  Complete Sprint 1 EDA to determine the optimal threshold for churn (e.g., balance < $50 vs $0).
* [x]  Analyze inactivity periods to define the consecutive months threshold for the churn label.
* [x]  Formalize the Churn definition in code based on EDA findings.
* [x]  Document data sources and rationale for all decisions.
  * See `Docs/Sprint1/churn_definition.md` and [ADR 004](../../Architecture/ADRs/004-churn-target-and-predictive-window.md).

### Locked churn definition (from EDA)

At observation month `t` (with `Months_Since_Creation >= 2`):

`Is_Churned = 1` iff month `t+1` has `Running_Balance_Rounded == 0` **and** `Monthly_Active_Txn_Count == 0`.

- Activity ignores `$0` placeholder rows (~8.15% of transactions).
- Chose **1-month** label window (not 2-month confirm): matches next-month prediction horizon; most near-zero inactive streaks are length 1; next-month positive rate ≈ 11.8% vs ≈ 2.6% for 2-month confirm.
- High-balance dormancy (inactive with balance ≥ $1000) is **not** treated as churn.
