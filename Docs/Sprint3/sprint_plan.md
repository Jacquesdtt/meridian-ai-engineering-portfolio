# Sprint 3: FastAPI Serve + GenAI Friction-Gate — Plan & Goals

> **Status clarification, 2 November 2026:** This dated record retains the original plan. Calibration is probability-quality work, not a demonstrated way to increase precision for unchanged top-k membership. Higher precision at fixed capacity requires ranking improvement. See the [current model card](../Model_Card.md).


**Status:** **Closed** (2026-07-14) — implementation + demo smoke + dual close-out  
**Depends on:** Sprint 2 ops-threshold lock — MLflow `3f575754ae9a42c5a21ea5e476c0af37`, `t≈0.701`, `fallback_quantile_top5pct` ([reports/sprint2_run_summary_v2.json](../Sprint2/reports/sprint2_run_summary_v2.json)).  
**Schedule:** [project_schedule.md](../Sprint0/project_schedule.md)  
**Close-out:** [walkthrough.md](walkthrough.md) · [sprint_debrief.md](sprint_debrief.md) · [sprint_retrospective.md](sprint_retrospective.md)

## 1. Sprint Objective

Serve the locked XGBoost churn model at the **ops contact policy** (top-5% / `t≈0.701`), draft GenAI retention emails behind ADR 003 Friction-Gate (human Approve/Edit/Reject only; **no autonomous send**), with ZDR and Pydantic-bounded outputs.

## 2. Key Deliverables

*   **`Docs/Sprint3/sprint_plan.md`** (this file) + learnings stubs.
*   **Portable model export** `Models/ops/` — booster + preprocessor + `serving_meta.json` (do not rely on gitignored `mlflow.db` alone).
*   **FastAPI** score + draft APIs (`src/serving/`, `src/genai/`).
*   **SQLite draft queue** shared by API and UI.
*   **Minimal Streamlit Friction-Gate** (in-process; Approve / Edit / Reject).
*   **ASGI pytest** suite (mock booster; no loopback bind).
*   **Close-out** (end of sprint): walkthrough + debrief + retrospective.

## 3. Locked decisions

| Item | Value |
|------|-------|
| Score threshold | `≈0.700547993183136` from `*_v2.json` (not max-F1 `0.475`) |
| MLflow provenance | `3f575754ae9a42c5a21ea5e476c0af37` |
| GenAI | Drafts only; Azure when configured else stub; stub_fallback on Azure failure |
| Friction-Gate | Thin Streamlit + API statuses; **Approved ≠ Sent** |
| Scope | No EDA/FE restart; no threshold re-tune; no overwrite of `sprint2_run_summary.json` |

## 4. Red-team mitigations (must ship)

*   Portable `Models/ops/` export (MLflow gitignored / model artifact not portable).
*   Freeze OHE + feature names in `serving_meta.json`; refuse boot on mismatch.
*   **Always re-score server-side** before draft create (no client `flagged` trust).
*   SQLite draft store (not process-local dict).
*   Streamlit calls **in-process** service layer (no localhost HTTP dependency).
*   Re-validate Pydantic on PATCH; rate ≤ 3.5%; no `/send` route.
*   Frozen top SHAP drivers for draft context (no live TreeExplainer on request path).
*   Optional Azure settings so `/score` works without `.env`.

## 5. Risks & Constraints

*   **Temporal leakage:** Serving does not retrain; still no shuffle anywhere upstream.
*   **AppLocker:** `py -3.13 -m …`; ASGI in-memory tests.
*   **PII / ZDR:** Scrub before any LLM call; never send customer_id/DOB to the model.
*   **Capacity:** Single-row drafts only; ops queue is already ~5% of book at the score cut.

## 6. Definition of Done

- [x] `Models/ops/` committed with booster, preprocessor, `serving_meta.json` pinned to ops run / threshold.
- [x] `POST /score` uses ops threshold; max-F1 cut unused.
- [x] Drafts only after server re-score flags; statuses `pending_review` | `approved` | `rejected`; no send.
- [x] ZDR scrub + Pydantic bounds (rate ≤ 3.5%) on create and PATCH.
- [x] Stub / stub_fallback works without Azure; live Azure when `.env` set.
- [x] Minimal Streamlit Friction-Gate (in-process) wired to SQLite queue.
- [x] ASGI pytest green without requiring `mlflow.db` (`tests/serving` — 7 passed).
- [x] Dual close-out (`walkthrough` / debrief / retro) at sprint end; model card serving line cascade.
- [x] `MEMORY.md` updated; sprint_plan filed at start.

## 7. Suggested execution order

1. This plan + MEMORY update.
2. Portable `Models/ops/` export.
3. Score loader + `/health` `/score` + mock-booster tests.
4. SQLite drafts + scrubber + Pydantic + stub/Azure + re-score gate.
5. Full ASGI compliance tests.
6. In-process Streamlit Friction-Gate.
7. Sprint close-out docs when feature-complete.

## 8. Out of scope

*   Probability calibration / model lift (unless Sam later requires ≫~23% precision).
*   Full Glass-Box dashboard / RBAC.
*   Celery / async task queue (unless Azure latency forces it).
*   Batch `/drafts` endpoints.
