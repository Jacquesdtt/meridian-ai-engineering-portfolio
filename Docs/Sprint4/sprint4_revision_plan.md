# Sprint 4 Handover — Revision Checklist

**Date:** 2026-07-14  
**Attack note:** [sprint4_handover_red_team.md](sprint4_handover_red_team.md)  
**Sign-off:** User requested red-team **and** integrate fixes (2026-07-14).  
**Label-unlock gates:** None — no ADR / threshold / churn definition changes.

| ID | Action | Success criteria | Status |
|----|--------|------------------|--------|
| RT-S4-01 | **implement** | `Docs/Sprint4/fixtures/{below_threshold,flagged}_demo.json`; Streamlit preset selector; runbook §3 uses flagged fixture | done |
| RT-S4-02 | **implement** | Ranking slide: drop misleading single accuracy or dual-label max-F1 vs ops | done |
| RT-S4-03 | **implement** | Demo runbook uses repo-root relative `cd` | done |
| RT-S4-04 | **implement** | Presentation: short AppLocker / portable-ops engineering slide | done |
| RT-S4-05 | **implement** | Deep links to ADRs 003–006 in report + deck handover map | done |
| RT-S4-06 | **implement** | Before/after slide includes test TP/FN counts | done |
| RT-S4-07 | **implement** | Embed SHAP summary (and note waterfalls) in presentation | done |
| RT-S4-08 | **implement** | final_report note on regenerating `training_data.csv` | done |
| RT-S4-09 | **implement** | Limitations table: `.prompty` / Foundry / Container Apps | done |
| RT-S4-10 | **implement** | This checklist + attack note; cascade walkthrough/debrief/MEMORY | done |

**Deferred:** Live Azure `.env` (credentials). Calibration / model lift (Sam-gated). Glass-Box RBAC / Foundry impl (Phase 5).
