# Sprint 1 Retrospective — EDA & Feature Engineering

**Date:** 2026-07-10  
**Sprint goal:** Lock churn label (ADR 004), revise EDA under red-team pressure, export leakage-safe `training_data.csv`.  
**Outcome:** Goal met. DoD closed. Ready for Sprint 2 modeling.

> **Not the same as the debrief.** Delivery record → [sprint_debrief.md](sprint_debrief.md). This file is process improvement (keep / stop / start + skillify).

---

## 1. What went well

| Win | Why it mattered |
|-----|-----------------|
| **Docs-before-code revision loop** | Red-team → `eda_revision_plan` → notebook §9 → PRD/MEMORY cascade. Prevented silent label unlocks and produced a demo-ready audit trail. |
| **Independent FE rebuild** | FE reloaded raw CSVs and re-applied ADR 004; matching **11.7601%** vs EDA **11.76%** was a real consistency check, not a pickle copy. |
| **Measure before “fix”** | P-01 gap rate **0%** → skipped a planned reindex that would have been wasted risk. |
| **Wrong-window catches** | P-02/P-03 first pass failed loudly (~$34 AUM; exit-month timing n=0). Fixing the window unlocked Morgan’s **~$7.27M** and Jamie’s **34% by day 14**. |
| **Split workflow** | Agents wrote cells/docs; human ran notebooks under AppLocker. Heavy CSVs never dumped into LLM context. |
| **Schema skill** | `validate-csv-schema` blocked Title Case column hallucinations early. |

## 2. What went wrong / friction

| Issue | Impact | Fix going forward |
|-------|--------|-------------------|
| **First-pass AUM/timing used wrong month** | Misleading metrics until revision | Always state the *window* next to any $ or timing figure; red-team windows before publishing. |
| **Doc drift after milestones** | Walkthrough/debrief still said “FE open” after CSV existed | Treat doc cascade as part of DoD, not optional polish. |
| **Currency narrative slip** | Data dictionary briefly said “pound” | Board language = `$` + Sam rounding metaphor (P-12). |
| **Balance outliers / Lag3 NaNs deferred** | Training CSV carries ±1e10 extremes and ~138k Lag3 nulls | Explicit Sprint 2 handling (trees OK; no blind scaling). |
| **Skill stubs vs real skills** | Project `.agents/skills/*` are often one-liners | New skills from retros get full contracts (this sprint: `docs-before-code`). |

## 3. Keep / Stop / Start

**Keep**
- Stakeholder lock → ADR → EDA evidence → self red-team → checklist → code.
- FE independent of EDA notebook state.
- Anti-leakage sanity (`gone_this_month` vs `Is_Churned` ≪ 100%).
- `MEMORY.md` as session anchor.

**Stop**
- Jumping from “red-team found gaps” straight into notebook edits.
- Quoting placeholder dollars ($4.2M) after a method is locked.
- Random-row train/test thinking for this panel.

**Start**
- Invoke `/docs-before-code` whenever revising an implemented artifact under critique.
- Sprint 2 plan on day-1 of modeling (`Docs/Sprint2/sprint_plan.md` per AGENTS).
- Temporal split on `Month` + naive baseline before XGBoost complexity.

## 4. Metrics snapshot (closed sprint)

| Metric | Value |
|--------|-------|
| Eligible positive rate | 11.76% |
| AUM at risk (prior-3-month max) | ~$7.27M |
| Ops: `$0` cross by day 14 (prior month) | 34% |
| Training rows × cols | 2,263,608 × 27 |
| Anti-leakage agree rate | 81.75% |

## 5. Skillification (Phase 0 → ship)

| Candidate | Invoke 2+? | Clear trigger? | Decision |
|-----------|------------|----------------|----------|
| Docs-before-code revision loop | Yes (every critique→revise) | “red-team then revise”, “docs before code” | **Skillify** → `.agents/skills/docs-before-code/` |
| Milestone doc cascade | Yes | “close the sprint”, “update walkthrough” | Covered by AGENTS §4 + walkthrough checklist; no separate skill yet |
| AppLocker / `py -3.13` | Yes | Already in AGENTS + CLAUDE.md | **Skip** (already rules) |

Cross-modal eval (skillify item 3) **waived for v1** — process skill, no deterministic script output to score. Revisit if we add a checklist generator script.

## 6. Actions into Sprint 2

1. Write `Docs/Sprint2/sprint_plan.md` (objectives, deliverables, DoD).
2. Temporal train/test on `Month`; naive baseline; then XGBoost + MLflow.
3. Handle Lag3 NaNs + balance extremes explicitly in the modeling notebook.
4. Use `/docs-before-code` if a model red-team forces pipeline changes.

## 7. Pointers

- Execution story: [walkthrough.md](walkthrough.md)
- Debrief (delivery): [sprint_debrief.md](sprint_debrief.md)
- Process deep-dive: [ai_engineering_learnings.md](ai_engineering_learnings.md)
- New skill: docs-before-code/SKILL.md (private development note; omitted from this public snapshot)
