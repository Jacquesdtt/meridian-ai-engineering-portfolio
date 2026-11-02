# Machine Learning Anti-Patterns Ledger

This document serves as a living registry of critical machine learning pitfalls, why they occur in business contexts, and the explicit Python/pandas countermeasures required to prevent them in this project.

**AI Agent Rule:** Before executing any feature engineering, data aggregation, or train-test split logic, AI agents MUST cross-reference this document to ensure no anti-patterns are introduced.

---

## 1. Temporal Target Leakage

### The Trap
Target leakage occurs when the model is trained using data that will not be available at the time of prediction (i.e., the model "looks into the future"). In churn prediction, this usually happens when you define churn (e.g., near-zero balance and inactive in month `t+1`) but let features use cash-flows or balances from that same future month. If the model sees that the account is already empty *during* the label month, it achieves high test accuracy and is useless in production.

### Business Implication
The Operations (Retention) team needs ~14 days inside the action month for Friction-Gate review and send (ADR 003). Features must stop at the end of observation month **t**; the label is the left-looking state of calendar month **t+1** (ADR 004). The 14-day ops buffer sits *inside* month `t+1` — it is not a separate 15-then-30 day offset in the training label.

### The Defensive Code Pattern
Enforce a clean month-`t` observation window and month-`t+1` prediction window. Features only from month `t` (and earlier history ending at `t`).

```python
import pandas as pd

# Example anchor: we are scoring at the end of May 2007 (month t).
# Label = whether June 2007 (month t+1) is left-looking:
#   Running_Balance_Rounded == 0 AND Monthly_Active_Txn_Count == 0
obs_month = pd.Period('2007-05', freq='M')
label_month = obs_month + 1  # 2007-06

# 1. ENFORCE ISOLATION before feature / label construction
features_data = monthly_tx[monthly_tx['Month'] <= obs_month]
# Label uses only the t+1 month state — never merge t+1 activity into feature columns
label_rows = monthly_tx[monthly_tx['Month'] == label_month][
    ['customer_id', 'Running_Balance_Rounded', 'Monthly_Active_Txn_Count']
]

# 2. Features: aggregates ending at obs_month only
# ...

# 3. Label: left-looking flag on label_month only
# Is_Churned_at_t = f(label_rows)  # see ADR 004 / notebook §8

# Ops cadence (not part of the ML label math):
# Score early in month t+1 using end-of-t features so ~14 days remain for review.
```

**Aligned sources:** [ADR 004](../Architecture/ADRs/004-churn-target-and-predictive-window.md), `Code/Sprint1/01_data_integrity_and_eda.ipynb` §8, revision item **P-06**.

---

## 2. Survivorship Bias from Interventions (The "Treatment Effect" Trap)

### The Trap
If the business successfully intervenes and retains a high-risk customer, that customer does not churn. If this customer is included in the next training iteration without an explicit label indicating they received an intervention, the model will learn a false correlation: "high risk behaviors (like withdrawing funds) actually result in the customer staying." The success of the model inherently destroys the validity of its future training labels.

### Business Implication
Morgan (Product) requested clarification on how future training handles retention interventions. Friction-Gate only logs `intent_to_treat` (when a draft is Approved), as it lacks a `/send` endpoint. We cannot rely on Friction-Gate to accurately determine who received an intervention.

### The Defensive Data Pattern
We must require the ingestion of actual `treatment_applied` logs from the external CRM/Marketing system before the next ML retraining cycle. 

Future models must adopt one of the following approaches:
1. **Exclusion:** Drop all treated customers from the training set (simplest, but reduces dataset size and introduces selection bias).
2. **Feature Injection (Causal Inference):** Include `treatment_applied` as a training feature, allowing the model to learn the base churn rate vs. the treated churn rate.
3. **Uplift Modeling:** Train two separate models (or a two-learner approach) to explicitly predict the *delta* in probability caused by the intervention.

**Aligned sources:** [09_morgan_feedback_adaptation.md](../StakeholderManagement/Meetings/09_morgan_feedback_adaptation.md)
