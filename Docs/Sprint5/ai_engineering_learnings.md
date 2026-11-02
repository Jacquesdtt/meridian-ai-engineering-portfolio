# Sprint 5 — AI Engineering Learnings

> Filed at sprint start (2026-07-14); completed at close-out (2026-09-24). Delivery record: [sprint_debrief.md](sprint_debrief.md).

## Themes to capture
- Prompt-as-code (`.prompty`) vs hardcoded drafter strings
- Container Apps (or equivalent) packaging of FastAPI + `Models/ops/`
- ADR 006 tension when splitting API vs Streamlit across containers
- Foundry / `azd` attempt vs corp policy block
- AppLocker + secrets hygiene in cloud images

## Entries
- (2026-07-14) Prompt-as-code: `prompty.load` + `prepare` → chat messages, then existing OpenAI-compatible client. Keeps gateway `base_url` / AppLocker path; scrub-before-render; embedded fallback if Prompty fails.
- (2026-07-14) Glass-Box RBAC: permission matrix in `src/serving/rbac.py`; SQLite `audit_events`; Streamlit tabs gated by role; FastAPI `X-Demo-Role` + `/audit/events`. Unit-tested; spoofable by design (demo only).
- (2026-07-14) Impl red-team: UI-only RBAC was a Jamie-story hole — closed with API parity; `st.stop()` / widget short-circuit fixed. See [sprint5_impl_red_team.md](sprint5_impl_red_team.md).
- (2026-07-14) Doc cascade: living docs + aggregates point to [progress.md](progress.md); Milestone 4 pack remains frozen except final_report §9 forward pointers.
- (2026-07-16) Jamie prep hardening: `GET /drafts*` now requires `view_queue`; 403s write `denied` audit rows; LLM subject+body scrubbed via `sanitize_llm_draft`. Meeting pack: [04_jamie_sprint5_risk_prep.md](../StakeholderManagement/Meetings/04_jamie_sprint5_risk_prep.md).
- (2026-07-16) **Process miss → backfill:** Serving readiness critique went straight to code (skipped `/docs-before-code` Phase 1–3). Remediated same day with attack note [06_jamie_serving_readiness_red_team.md](../StakeholderManagement/Meetings/06_jamie_serving_readiness_red_team.md) + checklist [jamie_readiness_revision_plan.md](jamie_readiness_revision_plan.md). Rule reinforced: next critique→revise stops for sign-off before `src/` edits.
- (2026-07-16) **Round-2 red-team (docs-before-code OK):** [07_…](../StakeholderManagement/Meetings/07_jamie_serving_round2_red_team.md) → [r2 plan](jamie_readiness_revision_plan_r2.md) → fixes: required `X-Demo-Role`, score RBAC, terminal immutability, store pending cap + atomic audit, opaque `review_key`, freeze LLM drivers, ADR 002/003 truth-up. Tests **33 passed**.
- (2026-07-17) **RAG “whole report” context:** H1/H2-only chunking made `top_k=3` look like full-document grounding. Fix: ATX `#`–`######` + ≤1200-char pack; cache `schema_version` so chunker upgrades invalidate without mtime change. Lesson: retrieval quality includes **chunk granularity**, not only embed/rank. Attack/plan: [rag_chunking_red_team.md](rag_chunking_red_team.md) · [rag_chunking_revision_plan.md](rag_chunking_revision_plan.md). Cross-encoder rerank still Phase 6.
- (2026-09-18) **F8 — one enforcement point.** Two write paths (UI straight to SQLite, API) meant every rule had to be kept in sync twice and already had drifted (the UI passed no `extra_context` to the drafter). Making the UI an HTTP client of FastAPI removed a class of bugs rather than fixing one. ADR 006 follow-on.
- (2026-09-22) **Hybrid retrieval without new infrastructure:** BM25 + dense embeddings fused with Reciprocal Rank Fusion, then an LLM rerank reusing the chat deployment (ADR 015). Rank fusion needs no score calibration between signals, which is why RRF suits mixing BM25 scores with cosine similarities.
- (2026-09-24) **Silent fallbacks need a loud check.** `stub_fallback` drafts and keyword-only RAG both look like working features. Two separate breakages (a `gpt-5-mini` deployment rejecting `max_tokens`; a Foundry *project* endpoint that serves chat but 404s on embeddings) hid behind them. Lesson: after any `.env` or deployment change, assert `drafter_source=azure` and `hybrid=true` on a live call. Mocked tests cannot catch provider-side changes.
- (2026-09-24) **Reasoning models change the request contract.** `gpt-5*` / `o*` deployments reject `max_tokens` and custom `temperature`, and count hidden reasoning tokens inside `max_completion_tokens`, so the budget must be larger than for a classic chat model. Centralised in `chat_limit_params()` so drafter, RAG and viva grader cannot diverge.
- (2026-09-24) **Pin the serving image to the training environment.** A pickled scikit-learn preprocessor is only safe with the version that saved it. The image now installs a Linux-compiled serving lock constrained by `requirements.lock`; `xgboost-cpu` gives the same version without ~300 MB of CUDA libraries. The container also needs every file the API reads at runtime; `.dockerignore` had excluded two of them.
- (2026-09-24) **Test the UI as a program.** Adding one enum member crashed every dashboard page, and 107 passing tests did not notice. Streamlit's `AppTest` can render every role × page headlessly (19 combinations); that belongs in `tests/`.
- (2026-09-24, corrected 2026-11-02) **Deployment close-out:** `azure.yaml` and `infra/*.bicep` deployed the API with `azd`; live checks passed and the owner removed the resources the same day (ADR 016). No standing URL. The API-key gate was added after that check; its Azure verification remains open.
