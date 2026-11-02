# ADR 007: Demo Glass-Box RBAC for Friction-Gate

**Date:** 2026-07-14  
**Status:** Accepted

## Context
Sprint 3 shipped a thin Friction-Gate (Approve / Edit / Reject) without role separation.
Jamie (Risk & Compliance) and Sam (Head of DS) asked for a **Glass-Box** view: who can
mutate drafts, who can only audit, and what model evidence (ops threshold + frozen SHAP)
justifies the contact queue. Full corporate SSO (Entra ID) is out of scope for this
prototype and often blocked on AppLocker workstations.

## Decision
1. **Demo RBAC** in Streamlit via an explicit role picker (`retention_agent`,
   `compliance_viewer`, `data_scientist`) backed by `src/serving/rbac.py`.
2. **Same matrix on FastAPI** via **required** `X-Demo-Role` header on protected
   routes (`/score`, `/drafts*`, `/audit/events`). Missing header → **400** (no
   silent elevation to `retention_agent`). Wrong role → **403**. `GET /drafts*`
   requires `view_queue`; `GET /audit/events` requires `view_audit`; `POST /score`
   requires `score`. Denied checks append `audit_events.action=denied`.
3. **Glass-box panel** surfaces portable `Models/ops/` meta: run_id, ops threshold,
   threshold rule, frozen top SHAP drivers — not live TreeExplainer on the request path.
4. **SQLite `audit_events`** records create / edit / approve / reject / **denied**
   with actor role and opaque `review_key` (no email/PII pattern). Draft + audit
   writes are one transaction; terminal drafts are immutable; pending cap is
   enforced in the store (API and Streamlit share it).
5. **Still no `/send`** (ADR 003). Approved ≠ Sent.

## Alternatives considered
1. **Entra ID / real IdP** — Rejected for Sprint 5 prototype (credentials + corp policy).
2. **No RBAC (keep thin gate)** — Rejected after stakeholder confirmation that Glass-Box
   RBAC is **in** for Sprint 5.
3. **API-only RBAC headers without UI** — Incomplete for Jamie demo story.

## Consequences
* **Pros:** Assessor-visible compliance story; permission matrix is unit-tested; audit
  trail survives process restart (same SQLite as drafts).
* **Cons:** Role picker is spoofable by design — document as pedagogical, not production
  authorization. Cloud split of Streamlit vs API still needs ADR 006 follow-on.

## Trade-offs
We trade production-grade identity for a clear, demoable permission + explainability
surface that does not invent SSO runbooks or weaken ADR 003 Friction-Gate.

## Follow-on (2026-09-24): per-customer explanations
Decision 3 kept live SHAP off the request path. The brief's "SHAP explanations per
customer" and "prediction browser" for Sam now put it there, on request only:

* **New permission `explain_predictions`** for `data_scientist` and
  `compliance_viewer`, not `retention_agent`. Seeing one customer's score and
  drivers is more sensitive than the frozen aggregate glass-box, so it gets its own
  gate instead of reusing `view_glass_box`. Compliance can check why a customer was
  flagged. Agents work the queue and do not browse the book.
* **Routes:** `GET /predictions`, `GET /predictions/{customer_id}/explain`,
  `POST /explain`. Same header rules: missing role → 400, wrong role → 403 plus a
  `denied` audit row.
* **Computation:** XGBoost TreeSHAP (`pred_contribs=True`) on the served booster. It is
  exact, needs no `shap` dependency, and gives values in log-odds that sum to the score.
  The glass-box page is unchanged and still shows the frozen global drivers.
* **Drafts unchanged:** the LLM still receives only the frozen global driver names
  (Jamie RT-J2-09). Per-customer SHAP is for humans, not prompts.
