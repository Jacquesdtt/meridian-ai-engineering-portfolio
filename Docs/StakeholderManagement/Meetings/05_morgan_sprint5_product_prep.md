# Meeting Notes: Morgan (Product & Executive) - Sprint 5 Value & Ops Workflow

**Date:** [YYYY-MM-DD]
**Stakeholders Present:** Jacques, Morgan
**Meeting Goal:** Review the business impact, operational workflow, and expected ROI of the deployed Churn Prediction system.

**Dependency (Jamie 2026-07-16):** Final assessor deck/report **must** include fairness / anti-discrimination (JR-REQ-01/02) alongside AUM / queue story. See [jamie_requirements_register.md](../../Sprint5/jamie_requirements_register.md) · engagement plan [../stakeholder_engagement_plan.md](../stakeholder_engagement_plan.md) §6.

---

## 1. Pre-Meeting Prep / Agenda

**Context to provide Morgan:**
* We are finalizing Sprint 5, which deploys the end-to-end churn prediction and GenAI retention system.
* We have shifted from a purely theoretical model to a live system that the operations team can use.
* Our focus has been on ensuring the output is actionable and tied directly to the primary business metric: preserving AUM.
* **Risk (Jamie):** Fairness at the ops cut is now a mandatory slide in the **same** final presentation — capacity dial is both ops discipline and a discrimination blast-radius control.

**Topics / Questions for Morgan:**
1. **The ROI & AUM Preservation Focus:**
   * Re-align on the primary financial metric (protecting the ~$7.3M AUM at risk).
   * Review how the model ranks customers by risk so the retention team can prioritize high-value accounts.
2. **Operational Feasibility (The Capacity Constraint):**
   * Explain our pivot to a "Capacity Constraint" model (capturing the top 5% highest-risk accounts).
   * *Why this matters to Product:* By ignoring the mathematical maximum F1 score (which yielded 248k false positives), we reduced the ops queue to ~20,000 accounts. This ensures the retention team is not overwhelmed and can actually review and send these emails.
   * *Question for Morgan:* Is a queue of ~20k high-risk accounts per month aligned with the current capacity of the retention team?
3. **The Customer Experience (Retention Emails):**
   * Walk through the GenAI-drafted retention emails.
   * Review how the LLM uses historical data to personalize the message without violating privacy policies.
   * Ensure the tone and the limits (e.g., max 3.5% interest rate offer) align with the product and brand strategy.
4. **Jamie open item (if answered):** If Risk requires a second approval at mailer send time (JR-OPEN-03), does ops capacity still hold?

## 2. Meeting Notes / Transcript Summaries
*(Use this space to transcribe or summarize the discussion, decisions, and feedback since you are acting as the sole notetaker).*

*   **Point 1:** 
*   **Point 2:** 

## 3. Decisions Made
*   [Decision 1]
*   [Decision 2]

## 4. Action Items & Next Steps
- [ ] **Task 1:** [Owner] - [Deadline]
- [ ] **Task 2:** [Owner] - [Deadline]

## 5. Clarifications Needed (Parking Lot)
*   [Any questions that couldn't be answered during the meeting]
