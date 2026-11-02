# Sprint 4 Handover — Red Team Attack Note

**Date:** 2026-07-14  
**Target:** Milestone 4 pack — `Docs/Sprint4/*` + demo path (`friction_gate_app.py`)  
**Method:** Principal-engineer critique vs plan DoD, ML_Learnings §4 checklist, frozen `*_v2.json`, live ops score probe  
**Revision checklist:** [sprint4_revision_plan.md](sprint4_revision_plan.md)  
**Status:** All implement rows mitigated; doc cascade updated (Sprint 2–4, aggregates, model card, Technical Debt, `Models/ops/README`).

---

## Critical / High

| ID | Severity | Finding | Evidence | Falsifier |
|----|----------|---------|----------|-----------|
| RT-S4-01 | **High** | Act C demo step 3 (“flagged draft”) is not reliably executable — runbook punts to “optional polish” | [demo_runbook.md](demo_runbook.md) §3; Streamlit default JSON scores ~0.21 | A committed fixture that scores ≥ `t≈0.701` + UI/runbook wiring |
| RT-S4-02 | **High** | Ranking slide shows XGBoost **accuracy 0.508** next to PR/ROC without making clear that is **max-F1** accuracy; ops accuracy ≈0.841 | Historical Sprint 4 Marp ranking table; the working document is not included in this public checkout | Remove or dual-label accuracy; ranking DoD = PR/ROC only |
| RT-S4-03 | **Medium** | Absolute machine path in demo runbook breaks other clones | `cd /d C:\Users\JacquesduToit\…` | Repo-root-relative instructions |
| RT-S4-04 | **Medium** | ML_Learnings §4 optional AppLocker / MLflow engineering beat missing from deck | Checklist item “Optional: MLflow SQLite / AppLocker” | One short engineering slide |
| RT-S4-05 | **Medium** | ADR 003/004/005/006 cited by title only — weak audit trail | [final_report.md](final_report.md) §6; presentation handover map | Deep links to ADR files |
| RT-S4-06 | **Medium** | Ops before/after slide omits TP/FN (Sam may ask “what recall means in counts”) | Model card has TN/FP/FN/TP; deck does not | Add FN/TP row from v2 / model card |
| RT-S4-07 | **Low** | SHAP PNGs mentioned as paths, not embedded — hard to show in markdown preview | presentation SHAP slide | Relative image embeds |
| RT-S4-08 | **Low** | `training_data.csv` cited without “how to regenerate if absent” | final_report §1 / §3 | Note Sprint 1 FE export path |
| RT-S4-09 | **Low** | Phase 5 (`.prompty` / Foundry) called out in chat/PRD but thin in limitations table | final_report §9 | Explicit rows |
| RT-S4-10 | **Process** | Sprint closed without a written red-team / revision checklist (docs-before-code gap) | No prior `*_red_team.md` under Sprint4 | This note + revision plan |

---

## Architecture review (handover pack)

### Critical failure modes & edge cases
- Live demo dies at the happy path if the presenter only has the default mid-book JSON.
- Metric misread: “accuracy 0.508” used against always-negative 0.869 looks like model failure.

### Hidden assumptions
- Assumes presenter remembers ops threshold language under pressure.
- Assumes assessor will open `ML_Learnings.md` for SHAP images.
- Assumes every clone has `Data/processed/training_data.csv` (large; may be absent).

### Second-order effects
- Weak flagged path → pressure to lower threshold live (policy regression).
- Accuracy confusion → PRD ROC>0.85 debate reopened in Q&A.

### Defensibility & fallbacks
- Ship dual fixtures (below / flagged); default Streamlit to below-threshold; one-click flagged.
- Ranking tables: PR-AUC / ROC-AUC only (or clearly label threshold-dependent accuracy).

### Observability
- Demo runbook should state **expected** approx probabilities for each fixture.
- Sidebar already shows run id + threshold — keep as live proof.

### Decision justification
- Milestone 4 remains docs + demo polish; no threshold re-tune; fixtures are **illustrative rows**, not new evaluation sets.
