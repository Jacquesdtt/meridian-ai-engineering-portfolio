# Sprint 5: Jamie Readiness Revision Plan — Round 2

**Status:** Complete 2026-07-16 — JR2-01…07, 09–12 done; JR2-08 deferred  
**Attack note:** [07_jamie_serving_round2_red_team.md](../StakeholderManagement/Meetings/07_jamie_serving_round2_red_team.md)  
**Prior round:** [jamie_readiness_revision_plan.md](jamie_readiness_revision_plan.md) (JR-01…06 closed)  
**Sign-off:** User — “red team and integrate fixes if any” (2026-07-16)

**Goal:** Close residual Risk holes in shared store + API RBAC without inventing Entra/cloud.

---

## Gate rules

1. Docs before code — attack note + this checklist before `src/` edits.
2. No churn label / ops threshold unlock.
3. Store-level policy so Streamlit direct writes inherit the same rules as API.
4. Cascade meeting prep, ADRs 002/003/007, demo runbook, MEMORY.

---

## Checklist

| ID | RT | Action | Success criteria | Unlock? | Status |
|----|----|--------|------------------|---------|--------|
| JR2-01 | RT-J2-01 | **implement** | `POST /score` requires `X-Demo-Role` + `Permission.score`; compliance → 403 | No | **done** |
| JR2-02 | RT-J2-02 | **implement** | Protected routes reject missing `X-Demo-Role` with 400 (no silent elevation) | No | **done** |
| JR2-03 | RT-J2-03 | **implement** | Terminal drafts immutable in store + UI; approve-then-reject → 422 | No | **done** |
| JR2-04 | RT-J2-04 | **implement** | Pending cap inside `insert_draft`; API → 429; Streamlit inherits | No | **done** |
| JR2-05 | RT-J2-05 | **implement** | Opaque `review_key` validator (no `@` / free-text PII) | No | **done** |
| JR2-06 | RT-J2-06 | **implement** | Store-level JR2-03/04 shared by UI; full API mediation deferred | No | **done** |
| JR2-07 | RT-J2-07 | **implement** | insert/update draft + audit in one SQLite transaction | No | **done** |
| JR2-08 | RT-J2-08 | **defer** | Detailed `/health` kept for demo glass-box (documented intentional) | Demo | **deferred** |
| JR2-09 | RT-J2-09 | **implement** | `sanitize_llm_draft` freezes drivers to server list | No | **done** |
| JR2-10 | RT-J2-10 | **implement** | ADR 002 corrected (json_object + post-validate) | No | **done** |
| JR2-11 | RT-J2-11 | **implement** | ADR 003: Approve ≠ Sent; drop “liability to zero” | No | **done** |
| JR2-12 | RT-J2-12 | **implement** | Adversarial tests; suite **33 passed** | No | **done** |

---

## Verification

```cmd
set PYTHONPATH=%CD%
py -3.13 -m pytest tests\serving tests\genai -q
```

Expect: **33 passed**.
