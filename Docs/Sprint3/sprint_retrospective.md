# Sprint 3 Retrospective — Application & Azure Extensions

**Sprint goal:** Serve ops-threshold scores + GenAI retention drafts behind Friction-Gate (ADR 003).  
**Delivery record:** [sprint_debrief.md](sprint_debrief.md) (not interchangeable with this file).

## What went well
- Red-team *before* code caught the non-portable MLflow artifact gap; `Models/ops/` unblocked serve on day one.
- Ops gate behaved correctly in the live Streamlit demo (below-threshold → no draft).
- ASGI `TestClient` suite gave fast compliance coverage without loopback binds.
- Optional Azure + stub_fallback kept DoD independent of credentials.

## What went wrong / friction
- Initial `GET /` 404 confused the browser smoke (fixed with landing route).
- Default Streamlit example JSON is a mid-book row (~0.21) — fine for proving the gate, but easy to misread as “model broken” until threshold is remembered.
- Export still needs a local `mlflow.db` once to mint `Models/ops/`; after that clones are fine.

## Keep / Stop / Start
| | Action |
|---|--------|
| **Keep** | Plan → red-team → portable export → ASGI tests → thin UI. |
| **Stop** | Assuming gitignored MLflow runs are a serve dependency. |
| **Start** | ~~Ship a “flagged demo fixture”~~ → **Done in Sprint 4** ([fixtures/](../Sprint4/fixtures/) + Streamlit presets). Next: live Azure `.env` if demos need real LLM drafts. |

## Skillification decisions
| Candidate | Decision |
|-----------|----------|
| Portable MLflow → `Models/ops/` export pattern | **Skillify candidate** — repeatable across projects with gitignored tracking stores |
| In-process Streamlit + FastAPI shared store (AppLocker) | Document in learnings; consider skill if reused in Sprint 4+ |
| Server re-score before GenAI side-effects | Keep as ADR 003 / AGENTS reminder — already a rule-shaped invariant |

## Cross-link
Debrief metrics and smoke evidence: [sprint_debrief.md](sprint_debrief.md) §6 · [walkthrough.md](walkthrough.md).
