# Fairness & Anti-Discrimination Narrative (Jamie / Final Assessors)

**Status:** Locked from Jamie meeting feedback (2026-07-16) — **JR-REQ-01 / JR-REQ-02** in [jamie_requirements_register.md](jamie_requirements_register.md).  
**Evidence freeze:** ops threshold `t≈0.701` · run `3f575754…` · [`fairlearn_equalized_odds.json`](../Sprint2/reports/fairlearn_equalized_odds.json)

**Purpose:** One place to answer: *“How did you ensure fairness / prevent discrimination?”* without overselling remediation we did not ship.

---

## 1. One-sentence answer (use this)

> We **measure** age and geography disparities at the **same ops cut we serve**, we **refuse sparse-slice artifacts**, we **limit contact capacity** so outreach cannot flood any group, and we **never let the model act alone** — residual gaps are **disclosed** for human review, not hidden.

---

## 2. What we did to prevent / constrain discrimination

| Layer | What we did | Why it matters | Proof |
|-------|-------------|----------------|-------|
| **1. Measure at the serving cut** | Fairlearn Equalized Odds on **age** and **state** at ops `t≈0.701` (not max-F1) | Board numbers match the contact policy customers actually feel | `Docs/Sprint2/reports/fairlearn_equalized_odds.json` |
| **2. Honest group sizes** | Keep slices only if **n ≥ 500**; drop tiny states from EOD | Sparse groups + high recall invent “EOD = 1.0” that looks like hate but is noise | First-run state EOD **1.0** → filtered **≈0.32** (38/55 states) |
| **3. Capacity dial** | Contact only top ~**5%** of scores (`fallback_quantile_top5pct`) | Limits how many people in any slice enter outreach — reduces blast radius of model error | `Models/ops/serving_meta.json` · Friction-Gate below-threshold refuse |
| **4. Behaviour-led drivers** | SHAP: balance / withdrawal / activity dominate; consistent with ADR 004 label | Primary drivers are **account behaviour**, not a demographic rule we optimized for | `Docs/Sprint2/reports/shap_summary.png` |
| **5. Human-in-the-loop** | Drafts only; **Approve ≠ Sent**; no `/send`; Compliance cannot Approve (demo RBAC) | Model cannot autonomously email a protected group; humans own outbound | ADR 003 · ADR 007 · Friction-Gate UI |
| **6. Disclose residual gaps** | Age EOD ≈ **0.16**; state EOD ≈ **0.32** stated in model card + decks | Prevention includes **not claiming zero bias**; Risk sees the real trade-off | Model card · this doc |

---

## 3. Numbers crib (ops threshold only)

| Slice | Equalized Odds difference | Notes |
|-------|---------------------------|--------|
| Age (6 bands) | **≈ 0.156** | All bands kept |
| State | **≈ 0.318** | 38/55 states; 3,548 rows excluded for small-n |

**Do not say:** age ≈ 0.05 · state EOD ≈ 1.0 (those were first-cut / sparse artifacts).

---

## 4. What we did *not* claim (say this if pressed)

- No automated Fairlearn **ThresholdOptimizer** / in-training fairness constraint in Sprint 5.
- No production **release gate** that blocks deploy when EOD exceeds a bank limit — Risk agreed periodic review and disclosure is sufficient for now (ADR 012, JR-OPEN-01); a hard gate can still be added later.
- Demo Glass-Box RBAC ≠ Entra; SQLite audit is a prototype trail.
- ZDR scrub ≠ demographic fairness — different control (PII to LLM vs slice disparity).

**Honest close:** *“We prevent unsupervised discriminatory *action* via capacity + HITL, and we prevent *false confidence* via Fairlearn at the ops cut with min-n. Gaps remain — they are on the model card for Risk.”*

---

## 5. Slide / report outline (paste into final artifacts)

### Slide — “Fairness: how we prevent discrimination”

1. **Measure** — Fairlearn EO at serving threshold  
2. **Filter noise** — min group n ≥ 500  
3. **Limit harm** — top 5% contact only  
4. **Explain** — SHAP behaviour-led  
5. **Govern** — human Approve; AI never sends  
6. **Disclose** — age ~0.16 · state ~0.32

### Report paragraph (short)

Meridian’s fairness posture is measurement-plus-governance, not a claim of zero disparity. At the operational contact threshold (~0.701, top 5% of scores), Fairlearn Equalized Odds on a 100k test sample is approximately 0.16 across age bands and 0.32 across states with at least 500 members (38 of 55 states retained). Earlier unfiltered state Equalized Odds of 1.0 was rejected as a sparse-slice artifact. Contact capacity, SHAP review of behavioural drivers, and Friction-Gate human approval (no autonomous send) constrain how model scores can affect customers. Residual gaps are documented on the model card for Risk oversight.

---

## 6. Where this lands in deliverables

| Deliverable | Action |
|-------------|--------|
| Live deck [Docs/Presentations/](../Presentations/generate_presentation.py) | Fairness / anti-discrimination framing (this narrative); Sprint4 [presentation.md](../Sprint4/presentation.md) is **legacy** Marp |
| [final_report.md](../Sprint4/final_report.md) | §4.4 RAI expanded with prevention layers |
| [Model_Card.md](../Model_Card.md) | Already has numbers — keep as canonical metrics |
| Final assessor deck / report | Copy §1 + §2 table + §5 slide |

---

## 7. Jamie follow-up (closed)

Closed in [ADR 012](../Architecture/ADRs/012-fairness-and-compliance-guardrails.md) (Accepted, 2026-07-17) · original draft: [08_jamie_followup_message.md](../StakeholderManagement/Meetings/08_jamie_followup_message.md)

- [x] Formal **EOD release gate** vs periodic review only? → **Periodic review and disclosure** is sufficient (JR-OPEN-01)
- [x] Any protected attributes beyond age/state required for the bank? → **No**; age and state are sufficient (JR-OPEN-02)
