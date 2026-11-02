# Fairness evaluation and review controls

**Status:** Locked from Jamie meeting feedback (2026-07-16) — **JR-REQ-01 / JR-REQ-02** in [jamie_requirements_register.md](jamie_requirements_register.md).  
**Evidence freeze:** ops threshold `t≈0.701` · run `3f575754…` · [`fairlearn_equalized_odds.json`](../Sprint2/reports/fairlearn_equalized_odds.json)

This record documents the fairness evaluation, review controls, and remaining gaps.

---

## 2. Measurement and review controls

| Layer | What we did | Why it matters | Proof |
|-------|-------------|----------------|-------|
| **1. Measure at the serving cut** | Fairlearn Equalized Odds on **age** and **state** at ops `t≈0.701` (not max-F1) | Evaluation uses the same threshold as serving; this is a historical test sample, not observed customer contact | `Docs/Sprint2/reports/fairlearn_equalized_odds.json` |
| **2. Honest group sizes** | Keep slices only if **n ≥ 500**; drop tiny states from EOD | Reduces instability in the reported comparison; excluded groups remain unassessed | First cut, unfiltered: **1.0**; ops cut, filtered: **≈0.32** (38/55 groups). Threshold and filtering both differ. |
| **3. Capacity dial** | Fixed threshold selected from the validation top-**5%** quantile (`fallback_quantile_top5pct`) | Targets overall review capacity; sets no per-group cap and does not guarantee future queue size | `Models/ops/serving_meta.json` · Friction-Gate below-threshold refuse |
| **4. Behaviour-led drivers** | SHAP: balance / withdrawal / activity dominate; consistent with ADR 004 label | Explains fitted model output, not absence of bias. **Age and state are model inputs**; proxy and demographic effects remain possible | `Docs/Sprint2/reports/shap_summary.png` |
| **5. Human-in-the-loop** | Drafts only; **Approve ≠ Sent**; no `/send`; Compliance cannot Approve (demo RBAC) | Model cannot autonomously email a protected group; humans own outbound | ADR 003 · ADR 007 · Friction-Gate UI |
| **6. Disclose residual gaps** | Age EOD ≈ **0.16**; state EOD ≈ **0.32** stated in model card + decks | Prevention includes **not claiming zero bias**; Risk sees the real trade-off | Model card · this doc |

---

## 3. Recorded results (ops threshold only)

| Slice | Equalized Odds difference | Notes |
|-------|---------------------------|--------|
| Age (6 bands) | **≈ 0.156** | All bands kept |
| State | **≈ 0.318** | 38/55 states; 3,548 rows excluded for small-n |

The earlier age value of about 0.05 and unfiltered state value of 1.0 came from the first operating cut. The later state comparison also excludes sparse groups. The [committed JSON](../Sprint2/reports/fairlearn_equalized_odds.json) records a 100,000-row sample, minimum group size 500, threshold 0.700547993, and 3,548 excluded state rows. The notebook exports a detailed slice CSV, but it is absent from the public checkout. The summary cannot establish per-group rates, uncertainty, or outcomes for excluded groups.

---

## 4. Limitations

- No automated Fairlearn **ThresholdOptimizer** / in-training fairness constraint in Sprint 5.
- No production **release gate** that blocks deploy when EOD exceeds a bank limit — The project risk-review decision accepts periodic review and disclosure for the prototype (ADR 012, JR-OPEN-01); a hard gate can still be added later.
- Demo Glass-Box RBAC ≠ Entra; SQLite audit is a prototype trail.
- ZDR scrub ≠ demographic fairness — different control (PII to LLM vs slice disparity).


---

## 5. Risk review decisions

Closed in [ADR 012](../Architecture/ADRs/012-fairness-and-compliance-guardrails.md) (Accepted, 2026-07-17) · original draft: [08_jamie_followup_message.md](../StakeholderManagement/Meetings/08_jamie_followup_message.md)

- [x] Formal **EOD release gate** vs periodic review only? → **Periodic review and disclosure** is sufficient (JR-OPEN-01)
- [x] Attributes within the project evaluation scope: **age and state** (JR-OPEN-02). Other attributes were not assessed. This is a prototype scope decision, not a finding that these two attributes cover every production fairness requirement.
