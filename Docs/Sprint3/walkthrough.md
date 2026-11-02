# Sprint 3: Serve + GenAI Friction-Gate — Execution Walkthrough

**Status:** Closed (demo smoke + dual close-out 2026-07-14)  
**Plan:** [sprint_plan.md](sprint_plan.md)  
**Debrief / retro:** [sprint_debrief.md](sprint_debrief.md) · [sprint_retrospective.md](sprint_retrospective.md)  
**Ops model provenance:** [../Sprint2/reports/sprint2_run_summary_v2.json](../Sprint2/reports/sprint2_run_summary_v2.json)  
**Model card:** [../Model_Card_Template.md](../Model_Card_Template.md)

This is the step-by-step execution narrative. Process → [ai_engineering_learnings.md](ai_engineering_learnings.md); stakeholder framing → [ai_bp_learnings.md](ai_bp_learnings.md).

---

## 1. Setup
- Input model: portable `Models/ops/` exported from MLflow run `3f575754ae9a42c5a21ea5e476c0af37`.
- Ops policy: `threshold_rule=fallback_quantile_top5pct`, `t≈0.700547993183136` (not max-F1 `0.475`).
- Runtime: `py -3.13`; AppLocker — no `.venv` python.exe.
- Azure OpenAI optional; without `.env` drafts use deterministic **stub**.

---

## 2. Portable export (red-team unblocker)
`mlflow.db` / `mlruns/` are gitignored, so serving cannot depend on them alone.

```text
py -3.13 Code\Sprint3\export_ops_model.py
```

Writes:
| File | Role |
|------|------|
| `Models/ops/booster.json` | XGBoost booster |
| `Models/ops/preprocessor.joblib` | Fitted state OHE + numeric passthrough |
| `Models/ops/serving_meta.json` | run_id, threshold, feature names, top_shap |

Boot refuses to start if booster feature count ≠ `len(model_feature_names)` (80 features).

---

## 3. FastAPI serve
```text
py -3.13 -m uvicorn src.serving.app:app
```

| Route | Purpose |
|-------|---------|
| `GET /` | Landing index (docs/health pointers) |
| `GET /docs` | Swagger UI |
| `GET /health` | Model loaded + run_id + threshold + azure flag |
| `POST /score` | Probability + `flagged` at ops threshold |
| `POST /drafts` | **Server re-score**; draft only if flagged → `pending_review` |
| `GET/PATCH /drafts` | List / human edit + Approve/Reject |
| *(none)* `/send` | Intentionally absent (ADR 003) |

Observed `/health` (2026-07-14):
```json
{
  "status": "ok",
  "model_loaded": true,
  "run_id": "3f575754ae9a42c5a21ea5e476c0af37",
  "threshold": 0.700547993183136,
  "threshold_rule": "fallback_quantile_top5pct",
  "azure_configured": false
}
```

---

## 4. GenAI drafts (Friction-Gate)
- ZDR: `src/genai/pii_scrubber.py` redacts email/phone/SSN-like/long IDs; drops `customer_id` etc. before LLM.
- Bounds: `RetentionDraftBody.offered_interest_rate ≤ 0.035` on create **and** PATCH.
- Drafter: Azure when configured; else `stub`; Azure failures → `stub_fallback` (queue never hard-fails).
- Drivers: frozen top SHAP names from `serving_meta` (no live TreeExplainer on request path).
- Store: SQLite `Data/processed/draft_queue.db` (gitignored), shared by API + UI.

---

## 5. Streamlit Friction-Gate (in-process)
```text
py -3.13 -m streamlit run Code\Sprint3\friction_gate_app.py
```

- Loads same `Models/ops/` — sidebar shows run `3f575754…`, `t=0.7005`.
- Copy: **Approve ≠ Sent** — human outbound outside the app.
- Demo smoke: example JSON scored **0.2074** → `flagged=False` → “Not flagged — no draft created (ops gate).” Queue correctly stayed at **0 draft(s)**.
- **Later (Sprint 4):** committed dual fixtures + Streamlit presets so the flagged draft path is demoable without hunting scores — see [../Sprint4/fixtures/](../Sprint4/fixtures/) and [../Sprint4/demo_runbook.md](../Sprint4/demo_runbook.md).

---

## 6. Tests
```text
py -3.13 -m pytest tests\serving -q
```
**Result: 7 passed** (ASGI `TestClient`; tiny mock booster fixture — no `mlflow.db` required). Coverage: health, score, below-threshold draft block, create/approve/reject, rate-cap 422, no `/send`, PII scrub, missing features 422.

---

## 7. What we did *not* change
- No EDA/FE restart; no threshold re-tune; `sprint2_run_summary.json` (v1 freeze) untouched.
- Probability calibration deferred (optional if Sam needs ≫~23% precision inside the contact budget).
