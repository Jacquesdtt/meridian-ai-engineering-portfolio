# Sprint 5 Adaptation: Morgan's Business View & Cohort Logic

**Context:** Following stakeholder feedback from Morgan (Product) on 2026-07-17, the Sprint 5 Streamlit multi-page dashboard refactor (WS-5) has been adapted to address cohort capacity, Expected Value (EV) ranking, and AUM reporting.

This document formally records the red-teamed architectural decisions adopted for this feature.

## 1. Dual-Threshold Cohort Strategy

Morgan requested that the top 300 priority customers be explicitly highlighted for tailored retention, while allowing an "unlimited" lower-priority cohort to receive automated messages.

**Red-Team Finding:** The existing ops threshold ($p \ge 0.701$) only flags the top 5% of the portfolio (e.g., ~500 accounts). Taking 300 for the tailored cohort leaves the automated cohort drastically undersized.

**Adapted Implementation:**
We are implementing a two-tier classification pipeline:
1.  **Tailored Cohort (Max 300):** Must exceed the strict ops threshold ($p \ge 0.701$) **AND** be in the Top 300 when ranked by Expected Value of Loss (`churn_probability` $\times$ `Running_Balance_Rounded`).
2.  **Automated Cohort:** Captures the broader at-risk population using a lower risk threshold ($p \ge 0.50$), strictly excluding anyone already in the Tailored Cohort.
    *   *System Constraint:* The Automated Cohort **bypasses the Friction-Gate UI completely**. Human reviewers will only see the Top 300 Tailored Cohort. This prevents reviewer fatigue and maintains the integrity of the capacity dial (ADR 003).

## 2. EV Ranking Constraint (The Whale Problem)

Morgan requested ranking by a combination of balance and risk. 

**Red-Team Finding:** Ranking the *entire* customer base purely by `P(churn) * Balance` will flood the Top 300 with ultra-high-net-worth customers who have negligible churn risk, misallocating the retention team's effort.

**Adapted Implementation:**
The ranking algorithm will use a strict filter-then-sort pipeline:
```sql
-- Conceptual logic
SELECT * 
FROM scored_customers 
WHERE churn_probability >= 0.701 
ORDER BY (churn_probability * Running_Balance_Rounded) DESC 
LIMIT 300;
```
This guarantees we only apply human effort to accounts that are actually at high risk of leaving.

## 3. AUM Hit KPI Definition

Morgan requested the dashboard show the predicted AUM hit each month.

**Red-Team Finding:** While calculating the probability-weighted Expected Value ($\sum P(churn) \times Balance$) is statistically rigorous, business stakeholders require the "worst-case scenario" metric to justify operational ROI.

**Adapted Implementation:**
The dashboard will display **Total AUM at Risk**, defined as the simple sum of the balances of all flagged customers in the Tailored Cohort ($\sum Balance_{tailored}$). A secondary metric for Expected Value will be included in the Glass-Box view for the Data Science team.

## 4. Survivorship Bias Mitigation

Morgan inquired about future training and the impact of successful retention interventions.

**Red-Team Finding:** Friction-Gate cannot accurately log interventions because *Approve ≠ Sent*. Relying on the review queue to label "treated" customers will pollute future training data with false positives.

**Adapted Implementation:**
We have formally added the "Treatment Effect Trap" to the [ML Anti-Patterns Ledger](../Sprint1/ML_Anti_Patterns.md). The data engineering pipeline must be updated to ingest actual `treatment_applied` telemetry from the external CRM before the next retraining cycle. Future models will use Causal Inference or Uplift Modeling based on this validated CRM data, entirely decoupling the training loop from Friction-Gate's `intent_to_treat` logs.
