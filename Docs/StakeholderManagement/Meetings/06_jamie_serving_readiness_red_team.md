# Attack Note: Jamie Serving Readiness (pre–Arvind meeting)

**Date:** 2026-07-16  
**Attacker lens:** Jamie / Arvind (Risk & Compliance) — hostile demo review  
**Artifacts attacked:**
- `src/serving/app.py`, `rbac.py`, `draft_store.py`, `schemas.py`
- `src/genai/drafter.py`, `pii_scrubber.py`
- `Code/Sprint3/friction_gate_app.py`
- ADRs 002 / 003 / 007 / 008
- Prior pack: [04_jamie_sprint5_risk_prep.md](04_jamie_sprint5_risk_prep.md) (thin agenda only)
- Prior impl red-team: [sprint5_impl_red_team.md](../../Sprint5/sprint5_impl_red_team.md) (2026-07-14 — RBAC API parity already closed)

**Process note:** This attack was first executed in-session (explore agent) and code was edited **before** a signed checklist existed — a `/docs-before-code` miss. This note + [jamie_readiness_revision_plan.md](../../Sprint5/jamie_readiness_revision_plan.md) backfill the audit trail; checklist status reflects what shipped the same day.

---

## Objective

Find holes a hostile Risk reviewer would exploit in the Friction-Gate / ZDR / RBAC / fairness story **before** the Jamie meeting — without requiring Azure credentials or cloud deploy.

---

## Findings

| ID | Severity | Finding | Evidence | What would falsify |
|----|----------|---------|----------|--------------------|
| RT-J-01 | **High** | `GET /drafts` and `GET /drafts/{id}` had **no** demo RBAC — mutate paths gated, reads open | `app.py` list/get endpoints lacked `X-Demo-Role` / `view_queue` | Reads enforce same matrix as mutates |
| RT-J-02 | **High** | Compliance 403s left **no** audit row — Jamie cannot prove deny-in-depth from the trail | `_enforce` raised 403 without `record_audit` | Denied permission checks append `action=denied` |
| RT-J-03 | **Medium** | Azure draft path scrubbed **body** but not **subject** — LLM can invent email/phone in subject | `azure_draft()` subject = raw `str(data.get("subject"))` | Subject + body both pass scrub before persist |
| RT-J-04 | **Medium** | Fairness talk track in Sprint 2 BP learnings was **stale** (age EOD ≈ 0.05; state “artifact 1.0”) | `Docs/Sprint2/ai_bp_learnings.md` vs `fairlearn_equalized_odds.json` | Docs quote ops-threshold JSON (age ≈ 0.16, state ≈ 0.32) |
| RT-J-05 | **Medium** | Jamie meeting prep was agenda-only — no evidence table, fairness one-pager, or limitations | `04_jamie_sprint5_risk_prep.md` | Prep has readiness matrix + demo pointers + open questions |
| RT-J-06 | **Low** | Demo runbook / presentation pytest counts stale (15 / 7) | `demo_runbook.md`, `presentation.md` | Counts match current suite |
| RT-J-07 | **Defer** | Demo RBAC spoofable; SQLite unencrypted; no fairness release gate; no Entra | ADR 007 / 008; design scope | Production IdP / encryption / EOD gate — need Jamie policy, not code guess |
| RT-J-08 | **Defer** | Live Azure path unproven (`azure_configured=false`) | `/health`, `.env` | User sets endpoint; out of offline scope |

---

## What was already solid (not re-attacked as gaps)

- No `/send`; `pending_review` default; Approve ≠ Sent (ADR 003)
- Pydantic rate cap ≤ 3.5% on create + PATCH
- Inbound PII scrub + blocked keys before prompt render
- Streamlit + API mutate RBAC parity (closed in 2026-07-14 impl red-team)
- Capacity gate: below-threshold draft create → 422

---

## Label / ADR unlock gates

| Decision | Unlock? |
|----------|---------|
| ADR 004 churn label | **No** |
| Ops threshold / frozen run | **No** |
| ADR 003 no-send | **No** |
| ADR 007 pedagogical RBAC | **Clarify only** (document GET + denied audit) — not replace with Entra |

---

## Next

Revision checklist → [jamie_readiness_revision_plan.md](../../Sprint5/jamie_readiness_revision_plan.md)

---

## Post-meeting disposition (2026-07-16)

Meeting held with Jamie (Arvind). Code fixes from this attack are **closed**. Policy leftovers (EOD gate, Entra, prod audit) tracked as **JR-OPEN-01…05** in [jamie_requirements_register.md](../../Sprint5/jamie_requirements_register.md). Follow-up draft: [08_jamie_followup_message.md](08_jamie_followup_message.md). Index: [../README.md](../README.md).
