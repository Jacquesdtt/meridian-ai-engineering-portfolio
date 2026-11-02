# Meeting Notes: Jamie (Arvind) — Sprint 5 Security & Governance

**Date:** 2026-07-16 (meeting held; requirements captured)  
**Stakeholders:** Jacques · Jamie (Arvind — Risk & Compliance)  
**Meeting goal:** Confirm Risk is comfortable with Friction-Gate HITL, ZDR, rate caps, Glass-Box RBAC, fairness evidence, and audit trail — before any cloud cutover.

**Canonical requirements:** [Docs/Sprint5/jamie_requirements_register.md](../../Sprint5/jamie_requirements_register.md) ← **source of truth for Jamie’s asks**

**During the call — use:** [Application guide](../../Portfolio/DEMO_GUIDE.md) · [04_jamie_dashboard_feature_tour.md](04_jamie_dashboard_feature_tour.md)

**Roleplay map:** Arvind ↔ Jamie (docs keep persona name Jamie).

**Docs-before-code trail:**
- Round 1: [06_…](06_jamie_serving_readiness_red_team.md) → [jamie_readiness_revision_plan.md](../../Sprint5/jamie_readiness_revision_plan.md)
- Round 2: [07_…](07_jamie_serving_round2_red_team.md) → [jamie_readiness_revision_plan_r2.md](../../Sprint5/jamie_readiness_revision_plan_r2.md) (JR2-01…12 mostly done; JR2-08 health glass-box deferred)

---

## 1. Pre-meeting readiness (what we can demo today)

| Jamie concern | Status | Proof (60s) |
|---------------|--------|-------------|
| No autonomous email send | **Done** | OpenAPI has no `/send`; statuses are `pending_review` / `approved` / `rejected` only |
| Approve ≠ Sent | **Done** | UI copy + ADR 003; Approved = ready for human outbound **outside** this system |
| Pending Review default | **Done** | `insert_draft` always persists `pending_review` |
| ZDR / PII scrub before LLM | **Done (prototype)** | Scrubber + blocked keys; only numeric aggregates + SHAP driver *names* enter the prompt; LLM **subject/body** scrubbed on the way out |
| Interest rate hallucination trap | **Done** | Pydantic `le=0.035` on create + PATCH; Azure path also clamps |
| Glass-Box RBAC | **Done (demo)** | Required `X-Demo-Role` on protected API routes; missing → 400; compliance Approve → **403** + **denied** |
| Draft queue reads gated | **Done** | `GET /drafts*` require `view_queue`; `POST /score` requires `score` |
| Terminal decide-once | **Done** | Approved/rejected immutable (store + UI) |
| Opaque `review_key` | **Done** | Rejects email/PII-like keys |
| Audit trail | **Done (prototype)** | Atomic draft+audit; create/edit/approve/reject/**denied** |
| Fairness / RAI slices | **Measured** | Ops-threshold Fairlearn JSON (see §3) — no auto-remediation gate yet |
| Anti rubber-stamp / review fatigue | **Done (prototype)** | Approve needs attention ack (UI + API); high-stakes cue; fast-decide logged — [JR-REQ-19](../../Sprint5/review_fatigue_mitigation.md) |
| Live Azure OpenAI | **Blocked** | Needs `AZURE_OPENAI_ENDPOINT` in `.env` — stub path still proves guardrails |
| Production IdP / encryption | **Out of scope** | ADR 007: pedagogical RBAC, not Entra; SQLite unencrypted local prototype |

**Regression pack (run before the call):**

```cmd
cd /d <repo-root>
set PYTHONPATH=%CD%
py -3.13 -m pytest tests\serving tests\genai -q
```

Expect: **36 passed** (HITL, rate cap, scrubber, required-role RBAC, terminal immutability, opaque review_key, attention_ack).

Application checks: [Docs/Sprint4/demo_runbook.md](../../Sprint4/demo_runbook.md) §§3–4.

---

## 2. Agenda (suggested 20–25 min)

1. **Friction-Gate** (5 min) — Below-threshold refuse → Flagged draft → Approve ≠ Sent  
2. **ZDR + rate cap** (5 min) — What reaches Azure; 3.5% hard fail on edit  
3. **Glass-Box RBAC** (5 min) — Retention agent vs Compliance viewer; API 403 + denied audit  
4. **Fairness snapshot** (3 min) — Age / state Equalized Odds at ops cut (not max-F1)  
5. **Honest limitations + ask** (5 min) — Demo RBAC ≠ SSO; what audit logging does Risk want for prod?

### Topics / questions for Jamie

1. **Friction Gate:** Is “Approved ≠ Sent / no `/send`” sufficient HITL language for Risk, or do you need an explicit outbound mailer integration with a second approval?
2. **ZDR:** Comfortable that we scrub patterns + drop PII keys, knowing we do **not** claim perfect NER for all names?
3. **Rate cap:** Confirm 3.5% remains the bank-approved ceiling for draft offers.
4. **Glass-Box RBAC:** Accept pedagogical `X-Demo-Role` for assessor demos, with Entra deferred?
5. **Audit:** Beyond SQLite `audit_events` (create / edit / approve / reject / **denied**), any mandatory fields for production (immutable actor id, prompt hash, retention period)?
6. **Fairness:** Age EOD ≈ **0.16**, state EOD ≈ **0.32** at ops threshold (`n≥500` groups). Do you want a release **gate** (e.g. max EOD) or periodic review only?

---

## 3. Fairness one-pager (ops threshold — use these numbers)

Source: [`Docs/Sprint2/reports/fairlearn_equalized_odds.json`](../../Sprint2/reports/fairlearn_equalized_odds.json)  
Threshold: **≈0.701** (`fallback_quantile_top5pct`). Do **not** quote the near-universal-recall first cut.

| Slice | Equalized Odds difference | Notes |
|-------|---------------------------|-------|
| Age (6 bands) | **≈0.156** | All bands kept (`min_group_n=500`) |
| State | **≈0.318** | 38/55 states kept; 3,548 rows excluded for small-n |

**Recorded fairness position:** Gaps are real at the **capacity-limited** cut; small-n states are filtered so we don’t invent geographic bias from noise. No automated fairness remediator ships in Sprint 5 — human review + model card disclosure.

---

## 4. Architecture pointers (if Jamie wants depth)

| Topic | Doc |
|-------|-----|
| HITL / no send | [ADR 003](../../Architecture/ADRs/003-friction-as-a-feature-genai-gating.md) |
| Pydantic I/O | [ADR 002](../../Architecture/ADRs/002-pydantic-strict-io.md) |
| Demo RBAC | [ADR 007](../../Architecture/ADRs/007-demo-glass-box-rbac.md) |
| Split-brain SQLite if UI≠API host | [ADR 008](../../Architecture/ADRs/008-split-brain-state.md) |
| Phrase sheet | [Sprint3 ai_bp_learnings §2](../../Sprint3/ai_bp_learnings.md) |
| Presentation language | Live deck [Project presentation](../../Presentations/Meridian_Presentation_Standalone.pptx); [Application guide](../../Portfolio/DEMO_GUIDE.md) |

---

## 5. Optional Teams opener (if async)

> Hi Arvind — before we talk Risk sign-off on the churn GenAI path: Friction-Gate is drafts-only (no `/send`, Approve ≠ Sent), PII is scrubbed before Azure, rates hard-capped at 3.5%, and Compliance can view audit but cannot Approve (demo RBAC). Happy to walk the Streamlit path live or send the pytest evidence pack. One question: any extra audit fields you need beyond our SQLite trail for a future production state?

Full draft (longer): see conversation history / prior Teams draft.

---

## 6. Meeting Notes / Transcript Summaries

*   **2026-07-16 — Jamie (Arvind):** Core Risk requirement is **fairness / anti-discrimination evidence** in the **final presentation and final report** — not only HITL/ZDR. Must show *what was done* to prevent discrimination (measure + constrain + disclose), not only that Friction-Gate exists. → **JR-REQ-01, JR-REQ-02**
*   **2026-07-16 — Jamie:** Dashboard features and **build steps / considerations** should be accessible so Risk can see how the review UI was designed. → **JR-REQ-03**
*   HITL / Approve ≠ Sent / demo RBAC remain necessary but are **not sufficient alone** without the fairness story (**JR-REQ-10…18** still in force).

## 7. Decisions Made

*   [x] Fairness is a **mandatory** final-assessor narrative (presentation + report) — JR-REQ-01/02.
*   [x] Canonical fairness write-up: [fairness_anti_discrimination_narrative.md](../../Sprint5/fairness_anti_discrimination_narrative.md).
*   [x] Feature/build accessibility for Risk — JR-REQ-03 ([feature tour](04_jamie_dashboard_feature_tour.md) + Glass-box expander).
*   [x] All Jamie requirements consolidated in [jamie_requirements_register.md](../../Sprint5/jamie_requirements_register.md).
*   [ ] Still open: formal EOD **release gate** vs periodic review only (JR-OPEN-01).

## 8. Action Items & Next Steps

- [x] **Jacques** — Capture fairness narrative + wire into Sprint 4 presentation / final report.
- [x] **Jacques** — Feature tour + Glass-box build expander for Jamie.
- [x] **Jacques** — Requirements register (`jamie_requirements_register.md`).
- [x] **Jacques** — Stakeholder pack cascade (engagement plan, README index, Sam/Morgan deps, attack-note dispositions).
- [x] **Jacques** — Follow-up message drafted: [08_jamie_followup_message.md](08_jamie_followup_message.md).
- [ ] **Jamie (follow-up)** — Answer JR-OPEN-01…05; update register §C.

## 9. Clarifications Needed (Parking Lot)

See register §C:

*   [ ] JR-OPEN-01 — EOD release gate?
*   [ ] JR-OPEN-02 — Attributes beyond age/state?
*   [ ] JR-OPEN-03 — Second outbound-mailer approval?
*   [ ] JR-OPEN-04 — Extra prod audit fields?
*   [ ] JR-OPEN-05 — Entra timeline?
