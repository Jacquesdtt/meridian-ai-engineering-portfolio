# Attack Note: Jamie Serving Readiness — Round 2 (post JR-01…06)

**Date:** 2026-07-16  
**Attacker lens:** Jamie / Arvind (Risk) + assessor probing API vs UI  
**Prior closed:** [06_jamie_serving_readiness_red_team.md](06_jamie_serving_readiness_red_team.md) · [jamie_readiness_revision_plan.md](../../Sprint5/jamie_readiness_revision_plan.md)  
**Artifacts attacked:** `src/serving/*`, `src/genai/*`, `Code/Sprint3/friction_gate_app.py`, ADRs 002/003/007, demo runbook §§3–4

**Process:** `/docs-before-code` — checklist [jamie_readiness_revision_plan_r2.md](../../Sprint5/jamie_readiness_revision_plan_r2.md). User asked to red-team **and integrate fixes** → Phase 3 sign-off for implement rows.

---

## Findings

| ID | Severity | Finding | Evidence | Falsifier |
|----|----------|---------|----------|-----------|
| RT-J2-01 | **High** | `POST /score` ignores RBAC (`Permission.score` unused) | `app.py` `score()` | Compliance/`X-Demo-Role` missing → 400/403 |
| RT-J2-02 | **High** | Missing `X-Demo-Role` silently elevates to `retention_agent` (create/approve) | `rbac.parse_role` default | Mutate/score without header → 400 |
| RT-J2-03 | **High** | Terminal drafts mutable (`approved→rejected`, edits after decide) | `draft_store.update_draft`; UI buttons; test encodes approve-then-reject | Only `pending_review` may edit/decide |
| RT-J2-04 | **High** | Pending cap only on FastAPI path; Streamlit `insert_draft` uncapped; TOCTOU | `app.py` vs `friction_gate_app.py` | Cap enforced inside store transaction; UI hits same path |
| RT-J2-05 | **High** | `review_key` accepts PII-like strings and echoes in queue/audit | `schemas.ScoreRequest.review_key` | Opaque pattern only (no `@`, bounded) |
| RT-J2-06 | **Medium** | UI mutates store directly (policy split vs API) | `friction_gate_app` → `draft_store` | Store enforces transitions + cap (shared); full API mediation **defer** |
| RT-J2-07 | **Medium** | Draft commit then separate audit = unaudited crash window | `insert_draft` / `update_draft` | Single transaction for draft + audit |
| RT-J2-08 | **Low / defer** | `/health` exposes run_id, threshold, `azure_configured` | Demo runbook depends on this | Keep for demo glass-box; note as intentional |
| RT-J2-09 | **Medium** | LLM-returned `drivers` persisted without scrub/replace | `sanitize_llm_draft` | Always freeze to server drivers |
| RT-J2-10 | **Medium** | ADR 002 claims schema `response_format`; code uses `json_object` + post-validate | ADR 002 §Decision 3 vs `drafter.azure_draft` | Correct ADR |
| RT-J2-11 | **Low** | ADR 003 implies Approve dispatches; “liability to zero” | ADR 003 vs runbook | Align wording to Approve ≠ Sent / no `/send` |
| RT-J2-12 | **Medium** | Suite doesn’t cover J2-01…05/09; encodes illegal transition | `test_api.py` | Adversarial tests added |

---

## Unlock gates

| Decision | Unlock? |
|----------|---------|
| ADR 004 / ops threshold | **No** |
| ADR 003 no-send | **No** (clarify wording only) |
| ADR 007 demo RBAC | **Tighten** (require header) — still pedagogical, not Entra |
| Entra / encrypted audit | **Defer** (Jamie policy) |

---

## Post-meeting disposition (2026-07-16)

JR2 implement rows **shipped** (33 tests). Meeting confirmed fairness narrative + feature accessibility as assessor DoD ([jamie_requirements_register.md](../../Sprint5/jamie_requirements_register.md) JR-REQ-01…03). Deferred policy → JR-OPEN-01…05 · follow-up [08_jamie_followup_message.md](08_jamie_followup_message.md).
