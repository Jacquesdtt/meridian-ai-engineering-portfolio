# Sprint 4: AI Engineering Learnings

## Pointers
- Plan / walkthrough / debrief: [sprint_plan.md](sprint_plan.md) · [walkthrough.md](walkthrough.md) · [sprint_debrief.md](sprint_debrief.md)
- Deliverables: [presentation.md](presentation.md) · [final_report.md](final_report.md) · [demo_runbook.md](demo_runbook.md)
- ML narrative source: [../Sprint2/ML_Learnings.md](../Sprint2/ML_Learnings.md)
- Serve evidence: [../Sprint3/ai_engineering_learnings.md](../Sprint3/ai_engineering_learnings.md)
- Aggregate: [../AIEngineeringLearnings/ai_engineering_learning_outcomes.md](../AIEngineeringLearnings/ai_engineering_learning_outcomes.md)

## 1. Presentation as a frozen-metrics product
- **Lesson:** Final decks must cite locked JSON (`*_v2.json`) and never “refresh” modeling numbers in place.
- **What we did:** Markdown slide deck + final report pull exclusively from Sprint 2 v2 + Sprint 3 close-out; first-run freeze (`sprint2_run_summary.json`) labeled as historical only.
- **Why it matters:** Assessors can audit every claimed digit against a file.

## 2. Dual narrative layers
- **Ranking vs contact policy** stay two acts — collapsing them reintroduces the max-F1 flood confusion.
- **Serve vs model science** — AppLocker, portable `Models/ops/`, ASGI tests are competency evidence, not substitutes for PR-AUC.

## 3. Demo engineering for handover
- Script **below-threshold refusal first** so capacity discipline is visible before a happy-path draft.
- Ship **committed fixtures** for both refusal and flagged paths (`Docs/Sprint4/fixtures/`) — do not leave Act C step 3 as “narrate only.”
- Keep demo commands on `py -3.13 -m` only; document `PYTHONPATH` once in the runbook.
- Re-run `pytest tests/serving` + fixture verify at close even when the sprint is docs-only.
- Ranking slides: **omit threshold-dependent accuracy** next to PR/ROC (RT-S4-02).

## 4. Scope discipline on a handover sprint
- `.prompty`, Microsoft Foundry, Glass-Box RBAC, and Container Apps belong to **Phase 5 / polish**, not Milestone 4.
- Learning-outcome docs may list those skills aspirationally; the codebase must not pretend they shipped.

## 5. Evidence from this sprint
| Check | Result |
|-------|--------|
| Presentation + report + runbook | Filed under `Docs/Sprint4/` |
| `py -3.13 -m pytest tests\serving -q` | **7 passed** |
| `sprint2_run_summary.json` | Untouched |
| Dual close-out | walkthrough + debrief + retro filed |
