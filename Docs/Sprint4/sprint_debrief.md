# Sprint 4: Handover / Presentation / Final Report — Debrief

> **Scope:** Package Meridian churn ranking + Friction-Gate story for final submission. Closed **2026-07-14**.  
> **Related:** Process retrospective → [sprint_retrospective.md](sprint_retrospective.md). Narrative → [walkthrough.md](walkthrough.md). Plan → [sprint_plan.md](sprint_plan.md).

## 1. What Was Done
- Filed Sprint 4 plan at sprint start (objectives, Acts A–C spine, risks, DoD).
- Built the Sprint 4 markdown presentation as Marp slides (`---` breaks). That historical working document is not included in this public checkout. The current [application guide](../Portfolio/DEMO_GUIDE.md) describes the review workflow.
- Wrote final handover report: [final_report.md](final_report.md).
- Wrote live demo runbook: [demo_runbook.md](demo_runbook.md).
- Drafted then finalized Sprint 4 learnings (`ai_engineering_learnings.md`, `ai_bp_learnings.md`).
- Dual close-out: walkthrough + this debrief + retrospective.
- Cascaded Milestone 4: README, project schedule, PRD Phase 4, Code_Walkthrough, MEMORY, aggregate learning outcomes.
- Post-close red-team + mitigations: fixtures, Streamlit presets, deck/report patches; cascaded Sprint 2–3 pointers + Technical Debt + `Models/ops/README`.
- Re-confirmed serve suite: `pytest tests/serving` — **7 passed**; fixture verify OK (no threshold re-tune).

## 2. How It Was Done
- **Frozen metrics only:** All deck/report digits from `Docs/Sprint2/reports/sprint2_run_summary_v2.json` + [ML_Learnings.md](../Sprint2/ML_Learnings.md); first-run freeze `sprint2_run_summary.json` cited as historical only.
- **Three-act spine:** (A) ranking DoD → (B) ops capacity dial + “no 40% precision” → (C) serve + ADR 003 Friction-Gate.
- **No EDA/FE restart, no threshold re-tune, no overwrite of v1 summary.**
- Documentation-only sprint; AppLocker demo commands documented as `py -3.13 -m …`.

## 3. Why It Was Done
- Satisfy PRD Phase 4 / Milestone 4: presentation + final report + handover pack.
- Make the Sprint 2 policy story and Sprint 3 serve story assessor-ready without inventing new ML claims.
- Leave a single entry point (`final_report.md` + `presentation.md`) for Sam / Morgan / Jamie / assessors.

## 4. Issues & Workarounds
| Issue | Mitigation |
|-------|------------|
| Risk of mixing v1 max-F1 vs v2 ops numbers | Explicit labels in deck/report; cite `*_v2.json` for ops |
| Default Streamlit demo scores ~0.21 (looks “broken”) | Demo runbook scripts refusal as **capacity discipline** first |
| Scope creep (dashboard / Prompty / Foundry) | Kept out of Sprint 4 DoD; documented as Phase 5 / optional polish |
| Dual close-out stubs pre-existed empty | Filled at close with delivery vs process separation |
| Post-close red-team: no flagged fixture; accuracy trap on ranking slide | [sprint4_handover_red_team.md](sprint4_handover_red_team.md) → fixtures + Streamlit presets + deck/report patches (v1.1) |

## 5. Learning Outcomes
- Engineering: [ai_engineering_learnings.md](ai_engineering_learnings.md)
- Business partner: [ai_bp_learnings.md](ai_bp_learnings.md)
- Cascaded: [../AIEngineeringLearnings/ai_engineering_learning_outcomes.md](../AIEngineeringLearnings/ai_engineering_learning_outcomes.md) §2 · [../AIEngineeringLearnings/ai_business_partner_learning_outcomes.md](../AIEngineeringLearnings/ai_business_partner_learning_outcomes.md) Phase 5 handover note

## 6. Results

| Item | Value |
|------|-------|
| Presentation | Historical Sprint 4 Marp slides; not included in this public checkout. Current [standalone slides](../Presentations/Meridian_Presentation_Standalone.pptx). |
| Final report | [final_report.md](final_report.md) |
| Demo runbook | [demo_runbook.md](demo_runbook.md) |
| Ops numbers source | `sprint2_run_summary_v2.json` (v1 freeze untouched) |
| Serve regression | **7 passed** (`tests/serving`) |
| Milestone 4 | **Met** (2026-07-14) |
| Post-close red-team | [sprint4_handover_red_team.md](sprint4_handover_red_team.md) — fixtures + deck/report mitigations applied |
| Demo fixtures | below ≈0.21 not flagged · flagged ≈0.75 creates draft |
| Out of scope kept out | Glass-Box RBAC, `.prompty`, Foundry, Container Apps, calibration |

Subsequent work is recorded in the [Sprint 5 debrief](../Sprint5/sprint_debrief.md).
