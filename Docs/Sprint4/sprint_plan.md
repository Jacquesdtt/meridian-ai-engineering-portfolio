# Sprint 4: Handover / Presentation / Final Report — Plan & Goals

> **Status clarification, 2 November 2026:** This dated record retains the original plan. Calibration is probability-quality work, not a demonstrated way to increase precision for unchanged top-k membership. Higher precision at fixed capacity requires ranking improvement. See the [current model card](../Model_Card.md).


**Status:** **Closed** (2026-07-14) — Milestone 4 + post-close red-team mitigations (fixtures / deck patches)  
**Depends on:** Sprint 2 ops lock (`3f575754…`, `t≈0.701`, `*_v2.json`) + Sprint 3 serve / Friction-Gate closed.  
**Schedule:** [project_schedule.md](../Sprint0/project_schedule.md) — **Milestone 4 met 2026-07-14**  
**PRD:** Phase 4 — DONE ([PRD §3](../Product/Product_Requirements_Document.md))  
**Close-out:** [walkthrough.md](walkthrough.md) · [sprint_debrief.md](sprint_debrief.md) · [sprint_retrospective.md](sprint_retrospective.md)

## 1. Sprint Objective

Package the Meridian churn story for final submission: a **presentation-ready narrative** (ranking DoD → ops contact policy → serve + Friction-Gate) and a **final report / handover pack**, without restarting modeling, re-tuning the ops threshold, or rewriting frozen Sprint 2 numbers.

## 2. Key Deliverables

| Deliverable | Path / form | Source of truth |
|-------------|-------------|-----------------|
| **This plan** | `Docs/Sprint4/sprint_plan.md` | — |
| **Final report / handover** | [final_report.md](final_report.md) | Cascades from Sprint 0–3 artifacts; no new ML claims |
| **Demo runbook** | [demo_runbook.md](demo_runbook.md) | Sprint 3 BP demo sequence + ops threshold language |
| **Learnings** | [ai_engineering_learnings.md](ai_engineering_learnings.md) · [ai_bp_learnings.md](ai_bp_learnings.md) | Closed; cascaded to aggregates |
| **Dual close-out** | walkthrough · debrief · retrospective | AGENTS §4 |
| **MEMORY** | `.agents/MEMORY.md` | Updated at start + end |

## 3. Presentation spine (locked content — do not invent new metrics)

### Act A — Setup & ranking (Sprint 1–2)
1. ADR 004 churn + leakage-safe `training_data.csv` (Month split only).
2. Beat `gone_this_month`: **PR-AUC 0.219 vs 0.151**, **ROC-AUC 0.723 vs 0.551**.
3. Always-negative accuracy trap (~87%) — not the bar.

### Act B — Decision policy (Sprint 2 ops)
4. Max-F1 (`t=0.475`) flood: ~249k FP / ~21% precision — unusable for Sam.
5. Prec ≥ 40% ∩ sel ≤ 5% **infeasible** (§2.4a); shipped **top 5%** (`t≈0.701`).
6. Before/after (§2.5): FP **248k → 20k**; ranking metrics **unchanged**.
7. SHAP balance-led ↔ ADR 004; state EOD **1.0 → ~0.32** with min-n ≥ 500.

### Act C — Serve & Friction-Gate (Sprint 3)
8. Portable `Models/ops/` + FastAPI at ops cut; **no `/send`** (ADR 003).
9. GenAI drafts only: ZDR, rate ≤ 3.5%, human Approve/Edit/Reject; **Approved ≠ Sent**.
10. Demo sequence: `/health` → below-threshold refusal → flagged draft → approve line.


## 4. Locked decisions (carry forward)

| Item | Value |
|------|-------|
| Score / contact policy | Ops `t≈0.701` / `fallback_quantile_top5pct` — **not** max-F1 `0.475` |
| Numbers freeze | Do **not** overwrite `sprint2_run_summary.json`; cite `*_v2.json` for ops |
| Modeling | No EDA/FE restart; no threshold re-tune; no calibration unless Sam demands ≫~23% precision |
| GenAI | Drafts only; human gate; ZDR; no autonomous send |
| Scope vs PRD Phase 4 | Handover polish; full Glass-Box RBAC stays **out of scope** |

## 5. Risks & Constraints

| Risk | Mitigation |
|------|------------|
| Deck invents metrics or mixes v1/v2 | Cite only `*_v2.json` / ML_Learnings for ops; label first-run as `7134cee0` |
| Demo looks “broken” at p≈0.21 | Script the refusal as **capacity discipline**; optional flagged fixture is polish only |
| Stakeholder confuses ranking win with 40% precision | Refer to the threshold evaluation in ML_Learnings.md §2.4a |
| Accidental model/serve edits during doc sprint | Code changes only if a doc bug or demo blocker; no threshold edits |
| AppLocker / PATH | Demo commands: `py -3.13 -m …` only |
| Temporal leakage language | Reaffirm Month-only split; no shuffle in any slide |

## 6. Definition of Done

- [x] `Docs/Sprint4/sprint_plan.md` filed at sprint start (this file).
- [x] Presentation artifact covers ML_Learnings checklist (§4) **plus** Sprint 3 Friction-Gate / ADR 003 story. → [Application guide](../Portfolio/DEMO_GUIDE.md)
- [x] Final report / handover doc links canonical artifacts (training export, MLflow ops run, `Models/ops/`, API, tests, ADRs 003/004). → [final_report.md](final_report.md)
- [x] Demo runbook matches live commands (`uvicorn`, Streamlit, `pytest tests\serving`) and ops threshold language. → [demo_runbook.md](demo_runbook.md)
- [x] No overwrite of `sprint2_run_summary.json`; no ops threshold re-tune; no EDA/FE restart.
- [x] `ai_engineering_learnings.md` + `ai_bp_learnings.md` for Sprint 4; cascade aggregates.
- [x] Dual close-out: `walkthrough.md` + `sprint_debrief.md` + `sprint_retrospective.md`.
- [x] `project_schedule.md` / PRD Phase 4 / README / MEMORY updated for Milestone 4.
- [x] Flagged + below-threshold demo fixtures + Streamlit presets (post–red-team RT-S4-01).
- [ ] Optional polish (not blocking): live Azure `.env` draft path.

## 7. Suggested execution order

1. **This plan** + MEMORY “Sprint 4 active”.
2. **Slide outline / deck** from ML_Learnings §0/§2/§2.4a/§2.5/§4 + Sprint 3 Act C.
3. **Final report** (executive summary → data → model → ops policy → serve/GenAI → risks / next steps).
4. **Demo runbook** + dry-run commands (user or agent shell).
5. Optional: flagged Streamlit fixture if demo needs a pending draft without hunting scores.
6. Close-out docs + MEMORY + schedule/PRD cascade. ← **done**

## 8. Out of scope (explicit)

*   Re-running Sprint 1 EDA/FE or Sprint 2 full modeling notebook for “better numbers.”
*   Re-tuning or replacing the ops threshold; overwriting `sprint2_run_summary.json`.
*   Probability calibration / model lift (unless Sam explicitly requires ≫~23% precision inside the contact budget).
*   Full Glass-Box RBAC dashboard (PRD deferred).
*   Azure Container Apps / Phase 5 cloud deploy.
*   Batch draft endpoints or autonomous send.
*   `.prompty` assets / Microsoft Foundry agent orchestration (Phase 5 / polish).
