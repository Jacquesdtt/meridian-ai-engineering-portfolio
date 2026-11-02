# Sprint 4 Walkthrough — Handover / Presentation

> **Status:** **Closed** (2026-07-14) + post-close red-team mitigations applied.  
> **Plan:** [sprint_plan.md](sprint_plan.md) · **Debrief:** [sprint_debrief.md](sprint_debrief.md) · **Retro:** [sprint_retrospective.md](sprint_retrospective.md)  
> **Red-team:** [sprint4_handover_red_team.md](sprint4_handover_red_team.md) · [sprint4_revision_plan.md](sprint4_revision_plan.md)

## 1. Sprint start
1. Read MEMORY + ML_Learnings + Sprint 3 debrief/learnings + project schedule.
2. Filed [sprint_plan.md](sprint_plan.md) (objectives, Acts A–C spine, risks, DoD).
3. Set `.agents/MEMORY.md` → Sprint 4 active.

## 2. Presentation pack (markdown)
Built the Sprint 4 presentation as Marp-style slides (`---` breaks). That historical working document is not included in this public checkout. The current [application guide](../Portfolio/DEMO_GUIDE.md) describes the review workflow; it is a separate document.

| Act | Content |
|-----|---------|
| A | ADR 004, temporal split, ranking vs heuristic (PR/ROC only) |
| B | Max-F1 flood → top-5% ops cut; §2.4a “no 40%”; SHAP embed; fairness min-n |
| C | `Models/ops/`, FastAPI, Friction-Gate, AppLocker slide, demo sequence |

Numbers sourced from `sprint2_run_summary_v2.json` / ML_Learnings — **no** overwrite of v1 freeze.

## 3. Final report + demo runbook
* [final_report.md](final_report.md) v1.1 — ADR deep links, TP/FN, regenerate note, Phase 5 rows.
* [demo_runbook.md](demo_runbook.md) — pytest → `/health` → Below fixture → Flagged fixture → Approve ≠ Sent.

## 4. Verification
```cmd
set PYTHONPATH=%CD%
py -3.13 -m pytest tests\serving -q
py -3.13 .agents\scratch\verify_s4_fixtures.py
```
**Result:** 7 passed; fixtures `below` p≈0.2074 not flagged · `flagged` p≈0.7509 flagged.

## 5. Learnings + dual close-out
* [ai_engineering_learnings.md](ai_engineering_learnings.md)
* [ai_bp_learnings.md](ai_bp_learnings.md)
* This walkthrough + [sprint_debrief.md](sprint_debrief.md) + [sprint_retrospective.md](sprint_retrospective.md)

## 6. Cascades (Milestone 4 + red-team)
* README — Sprint 4 closed; fixtures + red-team links
* `Docs/Sprint0/project_schedule.md` — Milestone 4 met
* PRD Phase 4 — DONE (+ fixtures)
* Code_Walkthrough (Docs + `.agents`) — Sprint 4 + fixtures
* `Docs/Sprint2/ML_Learnings.md` §4 checklist marked done → Sprint 4 deck
* Sprint 3 debrief/retro/walkthrough/learnings — fixture follow-up cross-links
* Aggregate AIEngineeringLearnings — fixtures + frozen-metrics note
* Model card · Technical Debt (fixture debt resolved) · `Models/ops/README`
* `.agents/MEMORY.md` — cascade complete

## 7. Post-close red-team (2026-07-14)
* Attack note + revision checklist (docs-before-code).
* Fixtures: [fixtures/](fixtures/) + Streamlit presets in `Code/Sprint3/friction_gate_app.py`.
* Deck/report: accuracy trap removed; TP/FN; ADR links; SHAP embed; AppLocker slide; portable `cd`.

## 8. Explicitly deferred at Sprint 4 close (by design)
* Live Azure `.env` draft path — still open in Sprint 5
* Container Apps / Foundry — still open in Sprint 5
* `.prompty` / Glass-Box RBAC — **landed mid Sprint 5** → [../Sprint5/progress.md](../Sprint5/progress.md)

## 9. Commands
```cmd
set PYTHONPATH=%CD%
py -3.13 -m pytest tests\serving -q
py -3.13 .agents\scratch\verify_s4_fixtures.py
py -3.13 -m uvicorn src.serving.app:app
py -3.13 -m streamlit run Code\Sprint3\friction_gate_app.py
```
