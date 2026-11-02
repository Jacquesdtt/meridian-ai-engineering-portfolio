# Sprint 5 Plan — Red-Team / Architecture Review

**Target:** [sprint_plan.md](sprint_plan.md)  
**Date:** 2026-07-14  
**Mode:** Pre-implementation critique (Principal Engineer / adversarial)

<architecture_review_report>

### Critical Failure Modes & Edge Cases

1. **ADR 006 vs cloud split deploy** — Plan ships FastAPI on Container Apps while Streamlit still assumes **same-filesystem SQLite + in-process** imports. Two containers without a shared volume or HTTP draft API → empty queues, “Approve ≠ Sent” demos that look broken, or silent dual DBs. FastAPI-first is correct; **Streamlit-in-cloud without a store redesign is a guaranteed foot-gun**.
2. **Secret baking** — Dockerfile `COPY .` or CI logs can leak `.env`. `azure_configured` is endpoint-only today (`config.py`); cloud with MI and empty key may report configured then fail every draft → noisy `stub_fallback` that looks like success in demos.
3. **Prompt-as-code without scrub-before-render** — Moving strings into `.prompty` invites interpolating raw customer fields. Any template variable that bypasses `scrub_mapping` / `scrub_text` is a Jamie DLP incident.
4. **Foundry / `azd` as silent DoD** — Corp AppLocker + subscription locks often block scaffolds. A DoD that requires “Foundry done” without an explicit **blocked-with-rationale** exit will force fake docs (anti-speculation violation).
5. **Ops artifact amnesia in containers** — Image built without `Models/ops/` (or with stale threshold) boots wrong cut or fails boot. Fixtures then “lie” relative to production.
6. **Speculative runbooks** — Writing full ACA ops guides before a live revision URL violates AGENTS anti-speculation and Sprint 4 lessons.

### Hidden Assumptions & Tradeoffs

| Assumption | Risk if false | Plan stance |
|------------|---------------|-------------|
| Container Apps is allowed on this corp tenant | Weeks of ticket hell | Confirm with Jacques; allow “equivalent” hosting |
| `.prompty` runtime exists / is installable under AppLocker | Import fails; Azure path dead | Thin loader or fallback to embedded strings if package blocked |
| SQLite on ephemeral container disk is fine | Draft queue wiped on recycle | Accept for API-only demo; document; ADR if UI shares state |
| OpenAI-compatible `base_url` works for corp gateway | 404 / wrong API shape | Already mitigated in `drafter.py`; keep pattern |
| Phase 5 is optional on schedule but “in scope” now | Scope thrash vs Milestone 4 “done” | Frame as **post-Milestone optional deepening**, not reopening M4 |

**Tradeoff (correct):** GenAIOps depth (`.prompty`) before cloud — highest assessor signal, lowest infra dependency, keeps local demos green.

**Tradeoff (accept):** FastAPI cloud DoD without Streamlit cloud — preserves ADR 006 honesty.

### Second-Order Effects

* Container restart clears SQLite → agents lose pending drafts mid-demo; need fixture re-seed script or ephemeral “demo mode.”
* Prompt file edits without pytest → rate-cap regressions Jamie will catch in review.
* Adding Foundry agent frameworks may pull heavy deps that conflict with pinned serving stack.
* Dual close-out + PRD/schedule cascade at end is mandatory; skipping MEMORY mid-sprint breaks handoff again.

### Defensibility & Fallbacks

1. **WS order locked:** red-team ✓ → WS-0 fixtures → WS-1 `.prompty` → WS-2 FastAPI container → WS-3 Foundry best-effort → WS-4 Glass-Box only if asked.
2. **Streamlit cloud:** default **defer**; if required, open ADR 007 (HTTP draft API or shared durable store) **before** packaging UI.
3. **Secrets:** Key Vault / MI preferred; API key optional; never commit `.env`; CI secret scan if available.
4. **`.prompty`:** scrub inputs → render template → LLM → Pydantic bound; on loader failure, keep current hardcoded Azure messages as fallback (log warning).
5. **Foundry DoD wording:** “attempted **or** explicitly blocked with rationale” — already in plan; keep it.
6. **Image build:** `COPY Models/ops/` explicitly; boot assert `serving_meta.json` threshold ≈ 0.701; run fixture verify in CI/smoke against container if possible.
7. **No speculative runbook:** one short “what is live” note with revision name / URL only after deploy succeeds.

### Observability & Alerting

* `/health`: model load OK, `azure_configured`, optional `drafter_last_source` / error counters (no PII).
* Structured logs: `drafter_source` ∈ {stub, azure, stub_fallback}; never log scrubbed-out PII or full prompts with customer data.
* Container: restart count, 5xx rate, Azure 429 rate → stub_fallback ratio.
* Demo gate: fixture verify script exit code in smoke checklist.

### Decision Justification & Rationale

**Why FastAPI-first cloud:** Milestone 3 already proves local Friction-Gate; the Phase 5 PRD call is **secure hosting**. Shipping API in ACA (or equivalent) without pretending ADR 006 Streamlit is multi-node-ready is the senior move — defendable to Sam (MLOps surface) and Jamie (no new send path).

**Why `.prompty` before Foundry:** Prompt-as-code is the GenAIOps learning outcome (plan-time gap: 0 `.prompty` files — **closed mid Sprint 5**). Foundry/`azd` is credential-gated; making it best-effort avoids fake success theater.

**Why Glass-Box stays optional:** Thin Friction-Gate + Sprint 4 fixtures already satisfy “human gate + demo”; RBAC is polish unless compliance reopens scope.

**Why early fixture + Azure checklist is DoD:** Handoff reminders exist because demos and live drafts are the first things that rot after ops re-export or missing `.env` — catch them before cloud work hides regressions.

</architecture_review_report>

## Plan revisions applied after critique

| ID | Finding | Plan change |
|----|---------|-------------|
| RT-S5-01 | ADR 006 vs split containers | FastAPI-first; Streamlit cloud deferred / ADR if required |
| RT-S5-02 | Speculative runbooks | DoD: post-deploy note only |
| RT-S5-03 | Foundry corp block | Explicit attempted-or-blocked DoD |
| RT-S5-04 | Prompt PII regression | Scrub-before-render called out in WS-1 + risks |
| RT-S5-05 | Secrets / MI vs key | Risks + open questions; never commit `.env` |
| RT-S5-06 | Early checklist | Fixture verify + Azure live path in DoD §6 |

## Go / no-go for implementation

**Go** for WS-0 (fixtures — already runnable) and WS-1 (`.prompty`) after this critique.

**Update (2026-07-14 post-impl):** WS-4 Glass-Box was confirmed **IN** and shipped (ADR 007). See [sprint5_impl_red_team.md](sprint5_impl_red_team.md) for UI/API parity corrections. WS-2/WS-3 still conditional on hosting / credentials.

## Plan revisions applied after alignment critique (Docs-Before-Code)

| ID | Finding | Plan change |
|----|---------|-------------|
| RT-S5-07 | Docker Split-Brain SQLite lock | Added shared volume constraint to WS-2 |
| RT-S5-08 | AppLocker-Safe RAG | Dictated pure-Python standard-library chunking in WS-5 |
| RT-S5-09 | Streamlit AppLocker process block | Dictated programmatic routing (no pages/ dir) in WS-5 |
