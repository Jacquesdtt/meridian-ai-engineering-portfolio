# Sprint 4: AI Business Partner Learnings

## Pointers
- Plan, application guide, and report: [sprint_plan.md](sprint_plan.md) · [Application guide](../Portfolio/DEMO_GUIDE.md) · [final_report.md](final_report.md)
- Ops policy story: [../Sprint2/ML_Learnings.md](../Sprint2/ML_Learnings.md) §2 / §2.4a
- Friction-Gate language: [../Sprint3/ai_bp_learnings.md](../Sprint3/ai_bp_learnings.md)
- Aggregate: [../AIEngineeringLearnings/ai_business_partner_learning_outcomes.md](../AIEngineeringLearnings/ai_business_partner_learning_outcomes.md)

## 1. Project scope
1. Locked churn + temporal rigor  
2. Ranking beat heuristic  
3. Max-F1 unusable → capacity dial  
4. The 40% precision target was not met
5. Live Friction-Gate proves human gate  


## 2. Stakeholder concerns
* **Morgan:** Top 5% queue; humans decide send.  
* **Sam:** Ranks ≠ probs; ≫23% precision = new work item.  
* **Jamie:** No `/send`; Approve ≠ Sent; ZDR + 3.5% cap.

## 3. Control demonstration
A mid-score refusal (~0.21) is a **feature** of the product story — the below-threshold refusal follows the configured contact policy.
Use Streamlit presets: **Below threshold** first, then **Flagged** (~0.75) for the draft queue — fixtures under [fixtures/](fixtures/).

## 4. Scope limits
* 40% precision inside contact budget  
* Autonomous mail  
* Full Glass-Box RBAC / `.prompty` / Foundry / cloud deploy as Sprint 4 deliverables  

## 5. Historical milestone criterion
Milestone 4 required a reproducible application runbook and a project summary that could be read without opening Sprint 1–2 notebooks. Cloud and prompt-as-code are **next** investments, not gaps in the Phase 4 story.
