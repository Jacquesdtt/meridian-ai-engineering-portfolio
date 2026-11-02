# Jamie (Arvind) — Risk Requirements Register

**Persona:** Jamie = Arvind (Risk & Compliance)  
**Last updated:** 2026-07-16 (post-meeting capture + stakeholder cascade)  
**Meeting notes:** [04_jamie_sprint5_risk_prep.md](../StakeholderManagement/Meetings/04_jamie_sprint5_risk_prep.md)  
**Follow-up (JR-OPEN):** [08_jamie_followup_message.md](../StakeholderManagement/Meetings/08_jamie_followup_message.md)  
**Status legend:** `Met` · `In progress` · `Open` · `Deferred / out of scope`

This is the **canonical list of Jamie’s requirements** for Meridian Friction-Gate / churn GenAI. Other docs link here; do not invent new Risk asks without updating this register.

---

## A. Confirmed from 2026-07-16 meeting (must ship in assessor artifacts)

| ID | Requirement (Jamie’s words / intent) | Acceptance criteria | Status | Where documented / implemented |
|----|--------------------------------------|---------------------|--------|--------------------------------|
| **JR-REQ-01** | **Fairness is core** — final presentation and final report must show how fairness was ensured and discrimination prevented | Deck + report include measure / constrain / disclose narrative with ops-cut EOD numbers (age ≈0.16, state ≈0.32); not HITL-only | **Met (docs)** | [fairness_anti_discrimination_narrative.md](fairness_anti_discrimination_narrative.md) · live deck [Docs/Presentations/](../Presentations/generate_presentation.py) · legacy Marp [Sprint4/presentation.md](../Sprint4/presentation.md) · [final_report.md](../Sprint4/final_report.md) §4.4 · model card |
| **JR-REQ-02** | Show **what was done** to prevent discrimination (actions, not slogans) | Six-layer table: Fairlearn at serving cut, min-n≥500, capacity dial, SHAP behaviour-led, HITL no-send, disclose residual gaps | **Met (docs)** | Same narrative §2 |
| **JR-REQ-03** | Dashboard **features and build considerations** must be accessible to Risk (steps + why) | Feature tour doc + in-app Glass-box expander “How this dashboard was built” | **Met** | [04_jamie_dashboard_feature_tour.md](../StakeholderManagement/Meetings/04_jamie_dashboard_feature_tour.md) · Streamlit Glass-box expander |

---

## B. Standing Risk requirements (pre-meeting; still in force)

These were Jamie’s expected control plane before / during Sprint 5 readiness. Demo evidence is required; production IdP is not claimed.

| ID | Requirement | Acceptance criteria | Status | Evidence |
|----|-------------|---------------------|--------|----------|
| **JR-REQ-10** | No autonomous customer email | No `/send` route; drafts only | **Met** | ADR 003 · OpenAPI · pytest |
| **JR-REQ-11** | Approve ≠ Sent | UI + docs state Approved = ready for human outbound outside system | **Met** | ADR 003 · Friction-Gate copy |
| **JR-REQ-12** | Default Pending Review | Drafts persist as `pending_review` | **Met** | `draft_store.insert_draft` |
| **JR-REQ-13** | ZDR / no PII to LLM (prototype-grade) | Scrubber + blocked keys; subject/body scrubbed outbound | **Met (prototype)** | `src/genai/pii_scrubber.py` · tests |
| **JR-REQ-14** | Interest rate hallucination trap | Offered rate ≤ **3.5%** on create and edit | **Met** | Pydantic `le=0.035` · ADR 002 |
| **JR-REQ-15** | Glass-Box oversight (Compliance ≠ Approve) | Demo RBAC; compliance Approve → 403 + denied audit | **Met (demo)** | ADR 007 · `rbac.py` · UI role picker |
| **JR-REQ-16** | Decide-once / terminal immutability | Approved/rejected cannot be flipped | **Met** | Store + UI · JR2 tests |
| **JR-REQ-17** | Audit trail of mutations + denials | create/edit/approve/reject/**denied**; atomic with draft writes | **Met (prototype)** | `audit_events` · Audit trail tab |
| **JR-REQ-18** | Fairness **measured** at serving threshold | Fairlearn EO age/state at ops `t≈0.701`, min-n≥500 | **Met (measured)** | `fairlearn_equalized_odds.json` |
| **JR-REQ-19** | HITL must resist **review fatigue / rubber-stamping** | Approve requires `attention_ack`; high-stakes cue; fast-decide soft warn + audit fields; capacity dial kept | **Met (prototype)** | [review_fatigue_mitigation.md](review_fatigue_mitigation.md) · ADR 003 amendment · UI + API |

---

## C. Resolved / Deferred from follow-up

| ID | Question | Why it matters | Status | Resolution |
|----|----------|----------------|--------|------------|
| **JR-OPEN-01** | Formal **EOD release gate** (max Equalized Odds) vs periodic review only? | Would add a hard ship/no-ship control beyond disclosure | **Resolved** | Periodic review and disclosure is sufficient. (ADR 012) |
| **JR-OPEN-02** | Protected attributes beyond **age / state**? | Bank policy may require more slices if data exists | **Resolved** | Age and state are sufficient; no other attributes required. (ADR 012) |
| **JR-OPEN-03** | Second approval on an outbound **mailer** (beyond Approve ≠ Sent)? | HITL depth for production | **Resolved** | One human approval is deemed sufficient; downstream system handles actual send. (ADR 012) |
| **JR-OPEN-04** | Extra **production audit fields** (immutable actor id, prompt hash, retention)? | Prototype SQLite may be insufficient for prod | **Deferred** | Local SQLite logging accepted for now. Deferred for future prod system. (ADR 012) |
| **JR-OPEN-05** | **Entra / SSO** timeline for replacing demo `X-Demo-Role`? | Pedagogical RBAC is spoofable by design | **Deferred** | Demo RBAC accepted for prototype; Entra ID deferred. (ADR 007, ADR 012) |

---

## D. Explicitly out of scope (do not over-promise)

| Item | Rationale |
|------|-----------|
| Live Azure / Foundry as Risk control | Credential-gated; stub path proves same gates |
| Encrypted enterprise audit store | Local SQLite prototype |
| Automated Fairlearn remediator / ThresholdOptimizer | Not shipped; disclosure + HITL instead |
| Changing ops threshold / churn label | Frozen (`t≈0.701`, ADR 004) unless Sam+Jamie unlock |
| Random challenge % / daily Approve budgets | Deferred — need Morgan capacity + Jamie policy (see review_fatigue §3) |

---

## E. Assessor DoD checklist (final presentation + report)

Use before handover. All boxes should be tickable for Jamie sign-off on *narrative completeness* (not cloud production).

- [x] JR-REQ-01/02 — Fairness / anti-discrimination section in presentation + final report  
- [x] JR-REQ-03 — Build/feature tour accessible (doc + Glass-box)  
- [x] JR-REQ-10…19 — Controls demonstrated or evidenced in deck/runbook (incl. anti rubber-stamp)  
- [x] JR-OPEN-* — Record Jamie’s answers when received (update §C + meeting notes §§6–8)  
- [ ] Final deck rehearsal: lead with fairness one-sentence + prevention table  

---

## F. Doc index (Jamie pack)

| Doc | Role |
|-----|------|
| This register | **Requirements source of truth** |
| [StakeholderManagement/README.md](../StakeholderManagement/README.md) | Meetings index |
| [stakeholder_engagement_plan.md](../StakeholderManagement/stakeholder_engagement_plan.md) | Strategy + Jamie engagement log §5 |
| [04_jamie_sprint5_risk_prep.md](../StakeholderManagement/Meetings/04_jamie_sprint5_risk_prep.md) | Meeting agenda + notes |
| [04_jamie_demo_cheat_sheet.md](../StakeholderManagement/Meetings/04_jamie_demo_cheat_sheet.md) | Live demo talk track |
| [04_jamie_dashboard_feature_tour.md](../StakeholderManagement/Meetings/04_jamie_dashboard_feature_tour.md) | Feature → why → Risk |
| [08_jamie_followup_message.md](../StakeholderManagement/Meetings/08_jamie_followup_message.md) | Outstanding JR-OPEN questions to Arvind |
| [fairness_anti_discrimination_narrative.md](fairness_anti_discrimination_narrative.md) | Fairness assessor narrative |
| [review_fatigue_mitigation.md](review_fatigue_mitigation.md) | Anti rubber-stamp / JR-REQ-19 |
| Live deck (`Docs/Presentations/`) + Sprint 4 final report | Assessor deliverables (Sprint4 Marp presentation = **legacy**) |
| ADR 002 / 003 / 007 / 008 | Architectural commitments |
