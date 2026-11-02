# Sprint 5 Implementation — Red-Team Review (post WS-1 + WS-4)

**Date:** 2026-07-14  
**Scope:** `.prompty` wiring, Glass-Box RBAC, Streamlit Friction-Gate, draft audit store, tests  
**Mode:** Adversarial review of *shipped* code (not the plan alone)

<architecture_review_report>

### Critical Failure Modes & Edge Cases

1. **`st.stop()` in Score tab aborts the whole script** — If the model fails to load, agent roles never render Glass-box / Audit tabs that appear *after* Score in the file. Compliance-looking demos break for the wrong reason.
2. **Streamlit widget short-circuit** — `can(role) and st.button(...)` skips rendering the button when `can` is False → widget-ID / state instability across role switches.
3. **FastAPI completely bypasses demo RBAC** — UI says compliance is read-only; `PATCH /drafts` still approves with no role. Jamie demo is theater if assessors use `/docs`.
4. **API audit gaps** — `insert_draft` / `update_draft` from FastAPI leave `actor_role=None`, so Audit trail shows anonymous mutators.
5. **Duplicate editable Body widgets** — View `text_area` stays enabled when `can_edit`, inviting edits that are never saved (silent data-loss UX).
6. **Prompty load every Azure call** — No cache; repeated filesystem + parse cost; harder to detect “always on fallback” in tests.
7. **Weak prompty test** — Asserts messages exist but not that the `.prompty` body (vs embedded fallback) was used.

### Hidden Assumptions & Tradeoffs

| Assumption | Reality |
|------------|---------|
| UI RBAC = system RBAC | False until API enforces the same matrix |
| Agent without audit is fine | Weakens glass-box story; agents should see their own trail |
| `st.stop()` is tab-local | False — stops entire Streamlit run |
| Demo RBAC spoofability is only a docs issue | OK for pedagogy *if* labeled AND API shares the same explicit role header |

**Tradeoff kept:** Pedagogical roles (not Entra) — correct for AppLocker prototype; must not pretend UI-only gates are authorization.

### Second-Order Effects

* Role switching mid-session + missing widgets → confusing Streamlit DuplicateWidgetID / empty columns.
* Anonymous API audits train compliance to distrust the trail.
* Prompty silent fallback → GenAIOps “prompt-as-code” claim is false in production without a metric.

### Defensibility & Fallbacks

1. Replace Score-tab `st.stop()` with in-tab warning + skip actions.
2. Always render buttons on visible tabs; gate on click via `require`/`can`.
3. Enforce `X-Demo-Role` (default `retention_agent`) on FastAPI mutate routes; 403 on deny.
4. Pass `actor_role` into draft_store from API; add `GET /audit/events` for compliance.
5. Grant `view_audit` to retention_agent.
6. Cache loaded Prompty; assert `.prompty`-unique phrase in tests; test missing-file fallback.
7. Read-only queue: single body view; edit fields only when `can_edit`.

### Observability & Alerting

* Log warning when Prompty fallback engages (already present) — add test hook / counter later if needed.
* Audit events must always carry `actor_role` for mutate paths.
* `/health` unchanged; no speculative cloud metrics.

### Decision Justification & Rationale

Glass-Box RBAC remains a **demo control plane** for Jamie/Sam, not SSO. Closing the FastAPI hole and Streamlit foot-guns makes that story defensible: same permission matrix in UI and API, explicit spoofable header, audited actors, no `/send`. Prompty stays render-only with OpenAI-compatible execute path — GenAIOps depth without AppLocker invoker risk.

</architecture_review_report>

## Corrections applied

| ID | Finding | Fix |
|----|---------|-----|
| RT-S5-I01 | `st.stop()` kills later tabs | In-tab warning; no global stop |
| RT-S5-I02 | Button short-circuit | Always render; gate on click |
| RT-S5-I03 | API RBAC bypass | `X-Demo-Role` + `require()` on create/patch |
| RT-S5-I04 | Null actor_role from API | Pass role into draft_store; `GET /audit/events` |
| RT-S5-I05 | Duplicate body editors | View-only vs edit fields split |
| RT-S5-I06 | Agent no audit | `view_audit` for retention_agent |
| RT-S5-I07 | Prompty uncached / weak tests | Cache load; assert unique phrase + fallback test |
