# Sprint 4: AI Business Partner Learnings

## Pointers
- Plan / presentation / report: [sprint_plan.md](sprint_plan.md) · [presentation.md](presentation.md) · [final_report.md](final_report.md)
- Ops policy story: [../Sprint2/ML_Learnings.md](../Sprint2/ML_Learnings.md) §2 / §2.4a
- Friction-Gate language: [../Sprint3/ai_bp_learnings.md](../Sprint3/ai_bp_learnings.md)
- Aggregate: [../AIEngineeringLearnings/ai_business_partner_learning_outcomes.md](../AIEngineeringLearnings/ai_business_partner_learning_outcomes.md)

## 1. One story arc for the jury
1. Locked churn + temporal rigor  
2. Ranking beat heuristic  
3. Max-F1 unusable → capacity dial  
4. Honest “no 40% precision” slide  
5. Live Friction-Gate proves human gate  

Do not open with accuracy or with Azure credentials.

## 2. Stakeholder lines (reuse)
* **Morgan:** Top 5% queue; humans decide send.  
* **Sam:** Ranks ≠ probs; ≫23% precision = new work item.  
* **Jamie:** No `/send`; Approve ≠ Sent; ZDR + 3.5% cap.

## 3. Demo optics
A mid-score refusal (~0.21) is a **feature** of the product story — rehearse the sentence before the demo so nobody “fixes” the threshold live.  
Use Streamlit presets: **Below threshold** first, then **Flagged** (~0.75) for the draft queue — fixtures under [fixtures/](fixtures/).

## 4. What handover must not promise
* 40% precision inside contact budget  
* Autonomous mail  
* Full Glass-Box RBAC / `.prompty` / Foundry / cloud deploy as Sprint 4 deliverables  

## 5. Handover success criterion
Milestone 4 is met when an assessor can run the demo runbook and follow the presentation without opening Sprint 1–2 notebooks. Cloud and prompt-as-code are **next** investments, not gaps in the Phase 4 story.
