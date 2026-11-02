# Jamie — Friction-Gate Dashboard Feature Tour

**Audience:** Jamie (Arvind) / Risk — how the review dashboard was built and why each feature exists.  
**Requirements IDs:** JR-REQ-03 (and standing JR-REQ-10…18) — see [jamie_requirements_register.md](../../Sprint5/jamie_requirements_register.md).  
**Live UI:** Streamlit `Code/Sprint3/friction_gate_app.py` (Glass-box tab mirrors this).  
**Companion:** [Application guide](../../Portfolio/DEMO_GUIDE.md) · [fairness narrative](../../Sprint5/fairness_anti_discrimination_narrative.md)

---

## How to use this with Jamie

1. Screenshare Streamlit → walk features in the order below (or let him click).  
2. For each feature: **what he sees** → **why we built it** → **Risk consideration**.  
3. Deeper code/ADRs only if he asks (links at bottom).

---

## Build sequence (what we considered, in order)

| Step | Decision | Risk consideration |
|------|----------|-------------------|
| 1 | Pin portable `Models/ops/` (not gitignored MLflow alone) | Reproducible scores; same threshold Risk signed off |
| 2 | Capacity dial = top ~5% (`t≈0.701`), refuse below | Limits who enters outreach — fairness blast radius |
| 3 | GenAI = **drafter only**; **no `/send`** | AI cannot email customers (ADR 003) |
| 4 | Default status `pending_review`; Approve ≠ Sent | Human owns outbound; decide-once immutability |
| 5 | ZDR scrub + rate ≤ 3.5% (Pydantic) | No PII to LLM; no hallucinated offer rates |
| 6 | Demo Glass-Box RBAC (Retention vs Compliance) | Compliance can audit without mutating (ADR 007) |
| 7 | Audit trail + Glass-box panel | Who did what + why the queue exists |
| 8 | Fairlearn at **same** ops cut + min-n ≥ 500 | Discrimination measured where contact actually happens |

---

## Feature map (what to show him)

### Sidebar — Active role (demo RBAC)

| He sees | Why we built it | Say |
|---------|-----------------|-----|
| Role picker + permission chips | Separate **mutate** vs **oversight** without waiting for Entra | “Pedagogical RBAC for assessors — not SSO. Same matrix as API `X-Demo-Role`.” |
| Green model box (`3f575754…`, `t≈0.70`) | Prove which model/threshold the UI is bound to | “Pinned ops freeze — fairness numbers use this cut.” |

**Switch to Compliance viewer** → Approve disabled. That *is* the feature.

---

### Tab — Review queue

| He sees | Why we built it | Say |
|---------|-----------------|-----|
| Status filter (`pending_review` / approved / rejected) | Friction-Gate state machine | “Drafts land pending; humans decide.” |
| Edit + Approve / Reject (agent only) | HITL before any outbound | “**Approve ≠ Sent** — ready for a person outside this app.” |
| Attention checkbox before Approve | Anti rubber-stamp (JR-REQ-19) | “HITL fails if people Approve by habit — they must affirm they checked text, rate, and drivers.” |
| HIGH banner on elevated scores | Extra attention where impact is highest | “Well above ops cut — read carefully.” |
| Terminal drafts locked | Decide-once — no silent re-open | “Approved/rejected immutable — store + UI.” |

---

### Tab — Score / create draft

| He sees | Why we built it | Say |
|---------|-----------------|-----|
| Below-threshold preset | Prove capacity gate | “~0.21 → no draft. Not a bug.” |
| Flagged preset → create draft | Prove GenAI side-effect only when flagged | “Server re-scores; client flags never trusted.” |
| Stub draft when Azure off | Offline-safe demos | “Same gates without live Foundry.” |

---

### Tab — Glass-box

| He sees | Why we built it | Say |
|---------|-----------------|-----|
| Run id, threshold, rule | Explainability for the **queue policy** | “Why this contact list exists — capacity, not max-F1.” |
| Frozen top SHAP drivers | Drivers without live TreeExplainer on every request | “Behaviour-led (balance/activity) — consistent with churn label.” |
| Build-steps expander (in UI) | Make design considerations accessible in-product | Point him here if he wants the build story without leaving the app |

---

### Tab — Audit trail

| He sees | Why we built it | Say |
|---------|-----------------|-----|
| create / edit / approve / reject / **denied** | Compliance-visible accountability | “Denied = Compliance tried to Approve — logged, not silent.” |
| Opaque `review_key` (not email) | Avoid PII in the audit key | “Actor identity is role + opaque key in this prototype.” |

---

## Fairness (not a tab — bring into Glass-box talk)

Age EOD ≈ **0.16** · State EOD ≈ **0.32** at ops cut · min-n **500**.  
Full story: [fairness_anti_discrimination_narrative.md](../../Sprint5/fairness_anti_discrimination_narrative.md).

---

## If he wants the engineering trail

| Topic | Doc / code |
|-------|------------|
| HITL / no send | [ADR 003](../../Architecture/ADRs/003-friction-as-a-feature-genai-gating.md) |
| Demo RBAC | [ADR 007](../../Architecture/ADRs/007-demo-glass-box-rbac.md) |
| Sprint 3 build narrative | [Sprint3/walkthrough.md](../../Sprint3/walkthrough.md) |
| Live demo script | [Sprint4/demo_runbook.md](../../Sprint4/demo_runbook.md) |
| UI entrypoint | `Code/Sprint3/friction_gate_app.py` |
| Permissions matrix | `src/serving/rbac.py` |
| Draft + audit store | `src/serving/draft_store.py` |

---

## Honest limitations (volunteer)

- Role picker is **spoofable by design** until Entra.  
- SQLite local prototype — not encrypted enterprise audit.  
- Stub drafts when Azure unset — controls still apply.  
- Fairness = measure + disclose + capacity + HITL — **no** automated remediator yet.
