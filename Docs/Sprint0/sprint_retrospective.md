# Sprint 0 Retrospective — Architecture, Setup & Agentic Harness

**Date:** filed 2026-07-10 (sprint closed earlier; retro backfilled to match mandatory dual close-out)  
**Sprint goal:** Scaffold repo, AppLocker-safe tooling, agentic harness (`AGENTS.md`), Meridian GenAI guardrails, staff-level planning docs.  
**Outcome:** Goal met. Ready for Sprint 1 EDA / churn lock.

> **Not the same as the debrief.** Delivery record → [sprint_debrief.md](sprint_debrief.md). This file is process improvement (keep / stop / start + skillify).

---

## 1. What went well

| Win | Why it mattered |
|-----|-----------------|
| **AppLocker bypass as ADR** | Global `py -3.13 -m …` became a durable rule (ADR-001), not a one-off tip — unblocked all later notebook work. |
| **AGENTS.md as SSOT + Cursor sync** | One rule file → `.cursorrules` consumer; reduced cross-tool drift between Antigravity and Cursor. |
| **Anti-speculation / ADR discipline** | Deferred unbuilt API/runbook docs; PRD + ADR-001…003 locked real decisions only. |
| **Split workflow named early** | Agent scaffolds; human runs heavy jobs — matched corporate sandbox reality before Sprint 1 data volume hit. |
| **Token diet / pointer memory** | Large install logs off-chat prevented context blow-ups during setup. |
| **GenAI guardrails designed before code** | ZDR, Pydantic caps, Friction-Gate gave Jamie a compliance story before Sprint 3 build. |

## 2. What went wrong / friction

| Issue | Impact | Fix going forward |
|-------|--------|-------------------|
| **Client name leak (“Propellant”)** | Confidentiality scrub mid-sprint | Prefer placeholders from day one; grep before commit. |
| **Mermaid parser fragility** | Broken orchestrator diagram | No emoji/`<br>`/`&` in Mermaid; keep diagrams boring. |
| **`.venv` muscle memory** | Repeated Access Denied until ADR-001 stuck | Keep AppLocker rules in AGENTS + CLAUDE; never suggest venv Python. |
| **Close-out was debrief-only** | No `sprint_retrospective.md` until backfill | Dual close-out (debrief + retro) is now mandatory in AGENTS / Engineering Standards. |
| **PRD AUM still a placeholder ($4.2M)** | Carried into Sprint 1 until P-02 | Treat board $ as provisional until EDA locks method + figure. |

## 3. Keep / Stop / Start

**Keep**
- Plan-first + human approval before large code drops.
- `MEMORY.md` anchor + cascade after major events.
- Staff-level docs only for what exists; ADRs for structural decisions.
- Split execution under AppLocker.

**Stop**
- Writing speculative ops/API docs for unbuilt systems.
- Committing client-specific names or fragile Mermaid.
- Ending a sprint with only a debrief (missing process retro).

**Start**
- Always ship `sprint_debrief.md` **and** `sprint_retrospective.md` at sprint close.
- Skillify recurring workarounds (Sprint 0 seeds: AppLocker already rules; Cursor sync already a skill).

## 4. Snapshot (closed sprint)

| Item | Status |
|------|--------|
| Repo scaffold + `Docs/Sprint0/` | Done |
| ADR-001…003 | Done |
| PRD + Engineering Standards | Done |
| EDA notebook scaffold | Ready for Sprint 1 run |
| Dual close-out (debrief + retro) | Debrief original; retro backfilled 2026-07-10 |

## 5. Skillification (Phase 0 → ship)

| Candidate | Invoke 2+? | Clear trigger? | Decision |
|-----------|------------|----------------|----------|
| AppLocker / `py -3.13` | Yes | Already AGENTS + ADR-001 | **Skip** (rule, not new skill) |
| Cursor context sync (`AGENTS` → `.cursorrules`) | Yes | Already `/cursor-context-sync` | **Skip** |
| Token diet / log offload | Yes | Already `/diet-mode` | **Skip** |
| Dual sprint close-out (debrief + retro) | Yes | “close the sprint”, end-of-milestone protocol | **Rule** in AGENTS §4 + Engineering Standards (this change) — no separate skill |

## 6. Actions into Sprint 1 (historical — now done)

1. Run EDA notebook; lock churn with Sam (ADR 004).
2. Feature export → `training_data.csv`.
3. Keep dual close-out when Sprint 1 ends.

## 7. Pointers

- Execution story: [walkthrough.md](walkthrough.md)
- Debrief (delivery): [sprint_debrief.md](sprint_debrief.md)
- Ways of working: [ways_of_working.md](ways_of_working.md)
