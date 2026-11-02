# Sprint 3: Application & Azure Extensions — Debrief

> **Status clarification, 2 November 2026:** This dated record retains the original plan. Calibration is probability-quality work, not a demonstrated way to increase precision for unchanged top-k membership. Higher precision at fixed capacity requires ranking improvement. See the [current model card](../Model_Card.md).


> **Scope:** FastAPI ops-threshold serving + GenAI retention drafts behind ADR 003 Friction-Gate. Closed **2026-07-14**.
>
> **Related:** Process retrospective → [sprint_retrospective.md](sprint_retrospective.md). Narrative → [walkthrough.md](walkthrough.md). Plan → [sprint_plan.md](sprint_plan.md).

## 1. What Was Done
- Filed Sprint 3 plan with red-team mitigations baked in.
- Exported portable ops artifacts to committed `Models/ops/` (booster + OHE preprocessor + `serving_meta.json`).
- Shipped FastAPI (`src/serving/app.py`): `/`, `/health`, `/score`, `/drafts` (+ PATCH); **no send route**.
- Shipped GenAI path (`src/genai/`): ZDR scrubber, Pydantic rate ≤ 3.5%, stub / Azure / stub_fallback.
- SQLite draft queue shared by API and UI.
- Minimal Streamlit Friction-Gate (`Code/Sprint3/friction_gate_app.py`) — in-process, Approve/Edit/Reject.
- ASGI pytest suite: **7 passed**.
- Human smoke: `/health` OK; Streamlit scored demo row below threshold and correctly refused draft.

## 2. How It Was Done
- Serve source of truth = filesystem `Models/ops/` (MLflow remains provenance; `mlflow.db` gitignored).
- Export script re-fits the Sprint 2 temporal OHE on fit months only (read-only; no re-tune) and loads booster from MLflow run `3f575754…`.
- Draft create **always re-scores server-side**; client `flagged` / probability not trusted.
- Streamlit imports `src.serving` / `src.genai` directly (no localhost HTTP dependency under AppLocker).
- Config: Azure endpoint optional so `/score` and stub drafts work without `.env`.

## 3. Why It Was Done
- Put the Sprint 2 **ops contact policy** (top 5% / `t≈0.701`) into a callable service — not the max-F1 flood cut.
- Satisfy Jamie: drafts only, human gate, ZDR, hard rate cap, Approved ≠ Sent.
- Unblock demo/handover without requiring Azure credentials or a portable MLflow DB.

## 4. Issues & Workarounds
| Issue | Mitigation |
|-------|------------|
| `mlflow.db` / model artifacts not portable (gitignored) | Committed `Models/ops/` export |
| Booster logged without OHE in MLflow | Re-fit preprocessor in export; freeze names in `serving_meta.json` |
| Bare `GET /` 404 in browser | Added landing JSON pointing to `/docs` and `/health` |
| Streamlit demo example below ops threshold | Expected — ops gate refused draft; proves capacity dial. **Follow-up (Sprint 4):** dual fixtures below+flagged under `Docs/Sprint4/fixtures/` |
| Azure not configured in demo env | Stub drafter; `azure_configured: false` on `/health` |
| AppLocker / loopback | `py -3.13 -m`; ASGI tests; Streamlit in-process |

## 5. Learning Outcomes
- Engineering (portable serve, ASGI, ZDR/Pydantic, stub fallback): [ai_engineering_learnings.md](ai_engineering_learnings.md)
- Business partner (ops dial, Jamie language, demo sequence): [ai_bp_learnings.md](ai_bp_learnings.md)
- Cascaded into: [../AIEngineeringLearnings/ai_engineering_learning_outcomes.md](../AIEngineeringLearnings/ai_engineering_learning_outcomes.md) §4 / §4a · [../AIEngineeringLearnings/ai_business_partner_learning_outcomes.md](../AIEngineeringLearnings/ai_business_partner_learning_outcomes.md) Phase 5

## 6. Results

| Item | Value |
|------|-------|
| Ops run (pinned) | `3f575754ae9a42c5a21ea5e476c0af37` |
| Threshold / rule | **≈0.70055** / `fallback_quantile_top5pct` |
| Feature count | 80 (OHE state + numerics) |
| pytest | **7 passed** (`tests/serving`) |
| `/health` | `status=ok`, `model_loaded=true`, `azure_configured=false` |
| Streamlit smoke | p≈0.2074 → not flagged → 0 drafts (gate OK) |
| Send endpoint | **None** (ADR 003) |

**Next (as of Sprint 4 close):** Milestone 4 met — [../Sprint4/final_report.md](../Sprint4/final_report.md) · [../Sprint4/demo_runbook.md](../Sprint4/demo_runbook.md) · [../Sprint4/fixtures/](../Sprint4/fixtures/). Optional: live Azure `.env`; calibration only if Sam needs ≫~23% precision; Phase 5 `.prompty` / Foundry / Container Apps.
