# Sprint 5: Secure Cloud Deploy + GenAIOps Depth — Plan & Goals

**Status:** **Closed 2026-09-24** (started 2026-07-14) — see [sprint_debrief.md](sprint_debrief.md) §6 for the DoD status; ACA deploy and `azd` carried over  
**Progress:** [progress.md](progress.md) · **Handoff:** [continue_sprint5_prompt.md](continue_sprint5_prompt.md)  
**Depends on:** Sprint 3 serve / Friction-Gate + Sprint 4 handover closed (Milestone 4 met 2026-07-14).  
**Schedule:** [project_schedule.md](../Sprint0/project_schedule.md) — Phase 5 (post–Milestone 4 deepening)  
**PRD:** Phase 5 — Secure Cloud Deployment + GenAIOps depth ([PRD §3](../Product/Product_Requirements_Document.md))  
**Red-team:** [sprint5_plan_red_team.md](sprint5_plan_red_team.md) · [sprint5_impl_red_team.md](sprint5_impl_red_team.md)

## 1. Sprint Objective

Take the **already-shipped** FastAPI + Friction-Gate stack from local AppLocker-safe prototype toward **secure cloud hosting** and **GenAIOps depth** (prompt-as-code, optional Foundry/`azd` scaffolding), without restarting EDA/FE, re-tuning the ops threshold, or inventing runbooks for infra that is not yet deployed.

## 2. Key Deliverables

| Deliverable | Path / form | Notes |
|-------------|-------------|--------|
| **This plan** | `Docs/Sprint5/sprint_plan.md` | Filed at sprint start |
| **Plan red-team** | `Docs/Sprint5/sprint5_plan_red_team.md` | Attack → revise before cloud / Prompty / Foundry |
| **Early checklist** | §7 below | Fixture verify + Azure `.env` live-draft path |
| **Container hosting** | Azure Container Apps (or equivalent) for FastAPI; optional Streamlit | Only document what is actually deployed (anti-speculation) |
| **`.prompty` prompt-as-code** | `src/genai/prompts/retention_draft.prompty` | **Shipped** — Azure path via `build_azure_chat_messages`; stub offline-safe |
| **Foundry / `azd` scaffolding** | Where credentials + corp policy allow | Learning-outcome target; degrade gracefully if blocked |
| **ADRs** | New ADR(s) only if hosting / prompt / agent choices are durable | Do not invent ops runbooks pre-deploy |
| **Learnings + dual close-out** | walkthrough · debrief · retro · `ai_*_learnings.md` | End of sprint; update `MEMORY.md` |
| **Glass-Box RBAC** | **IN** (shipped 2026-07-14) | Demo roles + glass-box + audit; UI + FastAPI `X-Demo-Role`; still no `/send` |

## 3. Locked decisions (carry forward — do not reopen)

| Item | Value |
|------|-------|
| Score / contact policy | Ops `t≈0.701` / `fallback_quantile_top5pct` — **not** max-F1 `0.475` |
| Numbers freeze | Do **not** overwrite `sprint2_run_summary.json`; ops numbers stay in `*_v2.json` |
| Modeling | No EDA/FE restart; no threshold re-tune; no calibration unless Sam demands ≫~23% precision |
| GenAI | Drafts only; human Approve/Edit/Reject; ZDR; rate ≤ 3.5%; **no `/send`**; Approved ≠ Sent |
| Serving artifacts | Portable `Models/ops/` (ADR 005); re-verify fixtures after any re-export |
| Draft store / UI | SQLite + in-process Streamlit (ADR 006) — cloud may force a follow-on ADR if split deploy. *(Superseded 2026-09-18 by F8: the UI calls FastAPI; only the API writes SQLite — ADR 006/008 follow-ons.)* |
| Runtime | `py -3.13`; AppLocker — prefer `py -3.13 -m …` locally |
| Temporal | Month-only split; no shuffle anywhere upstream |

## 4. Workstreams (priority order)

### WS-0 — Early checklist (before / alongside cloud)
1. **Demo fixtures** — re-verify; use in live demos (do not reinvent unless ops re-export breaks them).
2. **Live Azure `.env`** — stub drafts already DoD-complete; wire real LLM when credentials allow.

### WS-1 — Prompt-as-code (`.prompty`)
- Add retention draft `.prompty` under a clear path (e.g. `src/genai/prompts/` or `prompts/`).
- Load from `src/genai/drafter.py` for Azure path; keep stub path offline-safe.
- Preserve ZDR scrub **before** any prompt render / LLM call; keep Pydantic post-validate.
- Tests: stub still works without Azure; Azure path mocked; rate ≤ 3.5% unchanged.

### WS-2 — Secure cloud hosting (FastAPI first)
- Package FastAPI for Container Apps (or documented equivalent).
- Provide a `Dockerfile` and a local `docker-compose.yml` for local development testing, **explicitly using a shared Docker volume for the SQLite database** to prevent split-brain locking (ADR 008 mitigation).
- Secrets via env / Key Vault / managed identity — **never** commit `.env`.
- Health endpoint must report `azure_configured` honestly in the target environment.
- Streamlit: optional second container or defer if ADR 006 split-brain forces HTTP redesign — prefer FastAPI DoD first.
- **Anti-speculation:** write deploy runbook / ops docs only after something is actually running.

### WS-5 — Streamlit Dashboard & GenAI RAG Bot
- Refactor the Streamlit application (`friction_gate_app.py`) into a programmatic multi-page layout. **Must avoid the `pages/` directory** to prevent AppLocker subprocess execution blocks.
- Implement **Morgan's Business View**: macro portfolio AUM overview, cohort churn trends, and business-readable risk buckets (High / Medium / Low).
- Implement **Sam's ML View**: interactive What-If feature-sensitivity slider and prediction browser.
- Implement **RAG Q&A Bot**: build a pure-Python, standard-library retrieval module grounded in the markdown reports (e.g. `final_report.md`) to answer methodology questions. **Must avoid heavy vector databases (Chroma/FAISS)** to prevent AppLocker C++ compilation blocks.

### WS-3 — Microsoft Foundry / `azd` (policy-gated)
- Scaffold only where corp credentials and policy allow.
- Prefer OpenAI-compatible client + `base_url` for enterprise gateways (existing `drafter.py` pattern).
- If blocked: document blocker in debrief; ship `.prompty` + local/cloud API without inventing Foundry success.

### WS-4 — Glass-Box RBAC (**IN** — shipped)
- Demo RBAC (not corp IdP): roles `retention_agent` | `compliance_viewer` | `data_scientist`.
- Glass-box panel: ops threshold, run_id, frozen top SHAP drivers, score vs cut.
- Audit trail of create / edit / approve / reject (actor role + review_key).
- Permission gates in Streamlit **and** FastAPI (`X-Demo-Role`, `GET /audit/events`); **still no `/send`**.
- ADR 007; impl red-team corrections in [sprint5_impl_red_team.md](sprint5_impl_red_team.md).

## 5. Risks & Constraints

| Risk | Mitigation |
|------|------------|
| Invent cloud runbooks for undeployed infra | Anti-speculation: code + ADR first; runbook only post-deploy |
| ADR 006 SQLite / in-process UI breaks on split containers | FastAPI-first deploy; Streamlit optional; new ADR if shared store must become network API |
| Secrets leak into git / images | `.env` gitignored; Key Vault / MI in cloud; never bake keys into Dockerfile |
| `.prompty` regresses stub / AppLocker demos | Stub path remains default; pytest + fixture verify stay green |
| Foundry / `azd` blocked by corp policy | Treat as best-effort; DoD does not require live Foundry if blocked |
| Accidental ops threshold / v1 summary overwrite | Explicit lock in §3; no Sprint 2 notebook “refresh” |
| PII to LLM after prompt refactor | Scrub before render; assert scrubber in tests; Jamie compliance metric unchanged |
| Demo RBAC mistaken for production auth | ADR: Streamlit role picker is pedagogical; not SSO/IdP |
| Scope creep (calibration, RAG Phase 6) | Explicit out of scope (§8) |

## 6. Definition of Done

### Early checklist (DoD gate — do not skip)
- [x] Demo fixtures re-verified: `Docs/Sprint4/fixtures/below_threshold_demo.json` (p≈0.21, not flagged) + `flagged_demo.json` (p≈0.75, flagged); Streamlit presets Below → Flagged → Approve ≠ Sent. *(2026-07-14: below 0.2074 / flagged 0.7509)*
- [x] `set PYTHONPATH=%CD%` then `py -3.13 .agents\scratch\verify_s4_fixtures.py` → OK (re-run after any `Models/ops/` re-export).
- [x] Live Azure path: `.env` from `.env.example` (never commit); `/health` shows `azure_configured=true` when endpoint configured; Flagged fixture draft has `drafter_source` `azure` or `stub_fallback` on 429/5xx. *(.env present and **endpoint configured** as of 2026-07-17 — key set, deployment set to gpt-4o-mini)*
- [x] ZDR + Pydantic rate ≤ 3.5% still enforced; **no `/send`**; Approved ≠ Sent. *(serving suite green 2026-07-14)*

### Core Phase 5
- [x] `Docs/Sprint5/sprint_plan.md` filed at sprint start (this file).
- [x] Plan red-teamed; mitigations reflected here / in red-team doc before big implementation. → [sprint5_plan_red_team.md](sprint5_plan_red_team.md)
- [x] ≥1 `.prompty` asset wired into `src/genai/` Azure draft path; stub path still works offline. → `src/genai/prompts/retention_draft.prompty` + `build_azure_chat_messages`
- [x] FastAPI hosted on Azure Container Apps with a post-deploy note. *(Reconciled 2026-10-20: deployed and verified 2026-09-24, then torn down; ADR 016 and [debrief §7](sprint_debrief.md). No standing URL; live verification of the later API-key gate remains open.)*
- [x] Foundry / `azd` scaffolding attempted. *(Reconciled 2026-10-20: `azd up` provisioned, remote ACR Tasks build failed, local build and `azd deploy` succeeded; verified then torn down 2026-09-24. The debrief's §6 is the earlier close-time snapshot; §7 records the outcome.)*
- [x] `pytest tests/serving` green; fixture verify OK after prompt / deploy changes. *(15 passed after impl red-team)*
- [x] ADRs updated only for decisions that landed (hosting / prompt / agent / Glass-Box RBAC). → [ADR 007](../Architecture/ADRs/007-demo-glass-box-rbac.md)
- [x] Glass-Box RBAC: role picker + permission-gated Friction-Gate + glass-box panel + audit trail; pytest for permission matrix. → `src/serving/rbac.py` · Streamlit · FastAPI `X-Demo-Role` · `tests/serving/test_rbac.py` + API RBAC tests
- [x] Dual close-out: walkthrough + debrief + retrospective + `ai_engineering_learnings.md` + `ai_bp_learnings.md`; cascade aggregates; `MEMORY.md` updated. *(2026-09-24)*
- [ ] ~~Keep live handover deck current in `Docs/Presentations/` (generator + dual PPTX).~~ *(Descoped by the owner at close, 2026-09-24; generator text corrected, PPTX left as committed.)* Sprint 4 Marp (`Docs/Sprint4/presentation.md`) is **legacy** — do not treat as SoT.
- [x] Streamlit refactor complete: multi-page dashboard featuring Morgan, Sam, and Friction-Gate views. *(Verified 2026-09-24: all 19 role × page combinations render against the containerised API; sidebar crash fixed — see [progress.md](progress.md).)*
- [x] GenAI RAG Bot complete: grounded Q&A interface inside the Streamlit app.

### Optional (not blocking)
- [ ] Streamlit Friction-Gate also cloud-hosted (or documented deferral with ADR).
- [ ] Probability calibration / model lift (Sam-driven only).

## 7. Suggested execution order

1. **This plan** + MEMORY “Sprint 5 active” + learnings stubs.
2. **Red-team plan** → revise DoD / risks before coding cloud / Prompty.
3. **WS-0 early checklist** — fixture verify (agent can run); Azure live draft (needs real endpoint/key — user if missing).
4. **WS-1 `.prompty`** — highest GenAIOps signal with lowest infra dependency.
5. **WS-2 Container Apps** — FastAPI first; secrets hygiene; post-deploy note only when live.
6. **WS-3 Foundry / `azd`** — if credentials/policy allow; else document blocker.
7. **WS-4 Glass-Box RBAC** — **IN**; can proceed in parallel with WS-2 once hosting confirmed.
8. Dual close-out + MEMORY + schedule/PRD cascade.

## 8. Out of scope (explicit)

* Re-running Sprint 1 EDA/FE or Sprint 2 full modeling for “better numbers.”
* Re-tuning or replacing the ops threshold; overwriting `sprint2_run_summary.json`.
* Probability calibration / model lift unless Sam explicitly requires ≫~23% precision inside the contact budget.
* Production SSO / Entra ID / real IdP (demo role picker only).
* Autonomous send / `/send` / batch draft blast endpoints.
* Inventing detailed cloud ops runbooks before something is deployed.

## 9. Run commands (reference)

```cmd
set PYTHONPATH=%CD%
py -3.13 -m pytest tests\serving -q
py -3.13 .agents\scratch\verify_s4_fixtures.py
py -3.13 -m uvicorn src.serving.app:app
py -3.13 -m streamlit run Code\Sprint3\friction_gate_app.py
py -3.13 Code\Sprint3\export_ops_model.py
```

## 10. Open questions (need Sam / Jamie / Jacques)

1. ~~Confirm hosting target: Azure Container Apps vs other corp-approved equivalent.~~ **Resolved (2026-07-17):** Defaulting to Azure Container Apps (FastAPI only) per Red-Team advice and Sam meeting cancellation.
2. ~~Glass-Box RBAC~~ — **IN** (2026-07-14).
3. ~~Confirm live Azure OpenAI / gateway credentials for `azure_configured=true` demos (endpoint still missing on probe).~~ **Resolved (2026-07-17):** Endpoint and key successfully configured; utilizing `jacqueslouisdutoit7-2493-resourc` with `gpt-4o-mini` deployment. *(As of 2026-09-24: resource `jacqueslouisdutoit7-135-resource`, project `jacqueslouisdutoit7-1355`, chat `gpt-5-mini`, embeddings `text-embedding-3-large`.)*
4. **Resolved 2026-09-24:** Foundry / `azd` was used successfully on this workstation/subscription; local Docker builds replace unavailable ACR Tasks (ADR 016).
5. **Jamie requirements** — canonical register: [jamie_requirements_register.md](jamie_requirements_register.md). JR-OPEN-01…03 resolved under ADR 012; JR-OPEN-04…05 (enterprise audit identity and Entra) remain deferred. See the register for the exact agreed scope.
