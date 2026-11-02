# Sprint 4 Retrospective — Handover / Presentation

**Sprint goal:** Final presentation + report + demo runbook for Milestone 4 handover.  
**Delivery record:** [sprint_debrief.md](sprint_debrief.md) (not interchangeable with this file).

## What went well
- Plan → markdown pack → cascade stayed documentation-only; no accidental threshold or FE churn.
- Reusing `ML_Learnings.md` as the metric spine avoided reinventing slides from notebooks.
- Explicit “out of scope” (Prompty / Foundry / Glass-Box) prevented Phase 5 work from eating handover time.
- Serve pytest re-check (7 passed) gave confidence that the demo path still works without code edits.

## What went wrong / friction
- Sprint 4 debrief/retro stubs existed empty from earlier scaffolding — easy to forget they are mandatory DoD, not optional.
- Default Streamlit mid-score example still needs verbal coaching; flagged fixture remains a Start item from Sprint 3.
- Schedule Gantt dates for Sprint 3–4 drifted vs original sketch; status board + Milestone dates matter more than the first Gantt draft.

## Keep / Stop / Start
| | Action |
|---|--------|
| **Keep** | Frozen-metrics citation (`*_v2.json`); three-act deck spine; demo refusal-first script. |
| **Stop** | Expanding handover sprints into cloud/dashboard/Prompty mid-close. |
| **Start** | After Milestone 4: `.prompty` spike before Foundry/Container Apps; keep red-team → revision checklist even on “docs-only” sprints. |

## Skillification decisions
| Candidate | Decision |
|-----------|----------|
| Handover pack pattern (presentation + final_report + demo_runbook + dual close-out) | **Document in learnings** — project-specific; skillify only if repeated across courses |
| Frozen-metrics rule (never overwrite first-run JSON) | Already MEMORY / AGENTS reminder — **skip skillify** |
| Flagged demo fixture | **Shipped** post–red-team (`Docs/Sprint4/fixtures/` + Streamlit presets) — skip skillify |
| Docs-only sprint red-team | **Keep process** — attack note + checklist before claiming Milestone complete |

## Cross-link
Debrief + results: [sprint_debrief.md](sprint_debrief.md) §6 · [walkthrough.md](walkthrough.md).
