# Sprint 3: AI Engineering Learnings

## Pointers
- Plan / walkthrough / debrief: [sprint_plan.md](sprint_plan.md) · [walkthrough.md](walkthrough.md) · [sprint_debrief.md](sprint_debrief.md)
- Portable artifacts: `Models/ops/` · export: `Code/Sprint3/export_ops_model.py`
- API: `src/serving/app.py` · GenAI: `src/genai/` · UI: `Code/Sprint3/friction_gate_app.py`
- Tests: `tests/serving/test_api.py` (**7 passed**)
- Ops provenance: [../Sprint2/reports/sprint2_run_summary_v2.json](../Sprint2/reports/sprint2_run_summary_v2.json)
- ADRs: [003 Friction-Gate](../Architecture/ADRs/003-friction-as-a-feature-genai-gating.md) · [002 Pydantic I/O](../Architecture/ADRs/002-pydantic-strict-io.md)
- Aggregate outcomes: [../AIEngineeringLearnings/ai_engineering_learning_outcomes.md](../AIEngineeringLearnings/ai_engineering_learning_outcomes.md)

## 1. Portable serve artifacts (tracking ≠ runtime)
- **Lesson:** Gitignored MLflow SQLite / `mlruns` is fine for experiment tracking and **wrong** as the only production load path.
- **What we did:** Export booster + fitted OHE preprocessor + frozen `serving_meta.json` to committed `Models/ops/`, pinning `run_id=3f575754…` and `t≈0.70055`.
- **Why it matters:** Fresh clones and demos boot without a local `mlflow.db`. Boot refuses to start if booster feature count ≠ meta names (80 features).

## 2. Compliance in the request path (not just UI copy)
- **Re-score server-side** before any GenAI side effect — never trust client `flagged` / probability.
- **Pydantic bounds on create and PATCH** — otherwise a human edit can raise `offered_interest_rate` above 3.5%.
- **No `/send` route** is a stronger guarantee than Streamlit caption alone (ADR 003).
- Frozen top SHAP **driver names** for draft context — no live TreeExplainer on the request path (latency + complexity).

## 3. AppLocker / corporate Windows for apps
- Prefer `httpx` / FastAPI `TestClient` (ASGI in-memory) over binding `127.0.0.1` in agent/CI shells.
- Streamlit can import the **same service layer in-process** so the Friction-Gate demo does not require uvicorn to be up (avoids loopback coupling).
- Soften config: Azure fields **optional** at import so `/score` never dies for missing `.env`.

## 4. Optional cloud with graceful degradation
- Paths: `stub` (default) → `azure` when configured → `stub_fallback` on 429/5xx/proxy failure.
- `/health` reports `azure_configured: false` in the demo env — expected, not a failed DoD.
- Use standard `OpenAI(base_url=…)` client patterns for enterprise gateways (avoid brittle provider-specific routing).

## 5. Red-team before serve code
- Plan red-team caught: missing model artifact portability, OHE not logged with booster, client pre-score bypass, in-memory queue split-brain, Streamlit→localhost risk.
- Mitigations were written into [sprint_plan.md](sprint_plan.md) §4 **before** implementation — same `/docs-before-code` discipline as Sprint 1–2, applied to greenfield serve.

## 6. Evidence from this sprint
| Check | Result |
|-------|--------|
| `py -3.13 -m pytest tests\serving -q` | **7 passed** |
| `GET /health` | `model_loaded=true`, run `3f575754…`, `t≈0.70055` |
| Streamlit demo row | p≈0.2074 → not flagged → no draft (ops gate) |
| Sprint 4 fixtures | below ~0.21 + flagged ~0.75 presets — [../Sprint4/fixtures/](../Sprint4/fixtures/) |
| Send route | Absent |
