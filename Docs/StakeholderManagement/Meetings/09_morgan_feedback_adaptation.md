# Meeting Notes: Morgan (Product) - Feedback on Priority Cohorts and AUM Hit

**Date:** 2026-07-17
**Stakeholders Present:** Jacques (AI Engineer), Morgan (Product Manager - acting as Andy)
**Meeting Goal:** Process Morgan's feedback on the reporting dashboard, cohort prioritization, and future training implications.

---

## 1. Feedback Received from Morgan

* **Tailored Cohort Constraint:** The dashboard must highlight the top 300 priority customers for the retention team. Priority must be calculated as a combination of balance and risk (Expected Value of loss).
* **Automated Cohort:** Lower priority customers can receive automated messages (no upper limit on volume), but require a "sensible risk threshold" to prevent spamming false positives.
* **AUM Hit KPI:** The dashboard must display the predicted AUM hit each month resulting from churn.
* **Survivorship Bias:** Morgan asked if the model will continue to be trained, and how our successful retention interventions will affect its future accuracy (i.e., if we save a customer, they don't churn, biasing the training data).

## 2. Red-Team Analysis & Strategic Adaptation

To ensure the system scales and is mathematically sound, we conducted an architectural red-team review of Morgan's feedback and adapted the implementation plan as follows:

* **EV Ranking Hijacking (The "Whale" Problem):** We cannot rank the *entire* customer base purely by `P(churn) * Balance`. Doing so would fill the Top 300 list with ultra-wealthy customers ($10M balance) who have a negligible churn risk (1%), pushing out legitimately high-risk accounts.
  * *Adaptation:* We will apply the existing operations threshold ($p \ge 0.701$) **first** to isolate high-risk customers, and *then* take the top 300 ranked by Expected Value of Loss.
* **Dual Threshold Strategy:** The existing $p \ge 0.701$ threshold only captures the top 5% of the portfolio. If 300 go to the Tailored Cohort, the Automated Cohort would be too small.
  * *Adaptation:* We will establish a two-tier threshold. $t_{tailored} = 0.701$ for the high-touch human review (Friction-Gate), and a new, broader $t_{automated}$ (e.g., $p \ge 0.50$) for the zero-marginal-cost automated messages. The Automated Cohort will bypass Friction-Gate entirely to prevent reviewer fatigue.
* **AUM Hit Definition:** "Expected AUM Hit" will be calculated as the Total AUM of the flagged cohort ($\sum Balance_{flagged}$). While $\sum P(churn) \times Balance$ is statistically sound for expected value, business stakeholders use "AUM Hit" to represent the worst-case total capital at risk to justify operational budgets.
* **Logging Interventions (Survivorship Bias):** We cannot rely on Friction-Gate to log interventions because *Approve does not equal Sent* (ADR 003). Friction-Gate only logs `intent_to_treat`.
  * *Adaptation:* The ML Anti-Patterns ledger has been updated to mandate that actual `treatment_applied` logs must be ingested from the external CRM/Marketing system before next year's retraining, ensuring we can use causal inference or exclude treated accounts to avoid learning the treatment effect.

## 3. Action Items

- [ ] Update `Docs/Sprint1/ML_Anti_Patterns.md` with the Survivorship Bias/Intervention trap.
- [ ] Create `Docs/Sprint5/morgan_feedback_adaptation.md` to record the new dual-threshold and reporting strategy.
- [ ] Implement the new Business View in the Streamlit multi-page refactor featuring the Top 300 and Total AUM Hit KPI.
