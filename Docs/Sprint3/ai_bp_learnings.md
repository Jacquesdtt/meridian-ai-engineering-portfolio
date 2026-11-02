# Sprint 3: AI Business Partner Learnings

## Pointers
- PRD roadmap: [../Product/Product_Requirements_Document.md](../Product/Product_Requirements_Document.md) (Phase 3 done)
- Model card: [../Model_Card_Template.md](../Model_Card_Template.md)
- Ops policy story: [../Sprint2/ML_Learnings.md](../Sprint2/ML_Learnings.md) §2 / §2.4a
- Walkthrough / debrief: [walkthrough.md](walkthrough.md) · [sprint_debrief.md](sprint_debrief.md)
- Aggregate outcomes: [../AIEngineeringLearnings/ai_business_partner_learning_outcomes.md](../AIEngineeringLearnings/ai_business_partner_learning_outcomes.md)

## 1. Contact policy is the product dial (Morgan / Sam)
- Sprint 2 proved **ranking** (PR-AUC 0.219 vs heuristic 0.151).
- Sprint 3 made the **top-5% / t≈0.701** cut the only path into the retention queue (~23% precision, ~20k FP on test — not the max-F1 ~249k FP flood).
- A mid-score demo row (~0.21) correctly produces **no** draft — that is **capacity discipline**, not a broken model. Say this out loud in demos.

## 2. Friction-Gate language for Jamie (Risk)
| Phrase | Meaning |
|--------|---------|
| Drafts only | GenAI never auto-mails customers |
| Approve ≠ Sent | Approve marks ready for a **human** to send outside the AI system |
| ZDR | No PII to the LLM; scrubber + blocked keys |
| Rate cap ≤ 3.5% | Pydantic hard-fails hallucinations on create and edit |
| No `/send` | Architecture cannot dispatch even if UI is misused |

## 3. How to brief stakeholders on the live system
* **Morgan:** Queue is Friction-Gate-sized; model routes who enters review, humans decide outreach. Historical AUM-at-risk context still ~$7.27M (Sprint 1) — serving does not invent new AUM.
* **Sam:** `/health` shows pinned ops run + threshold; scores are ranks (`scale_pos_weight`), not calibrated probabilities — precision floor ~23% inside top 5% unless calibration/model lift is a new work item.
* **Jamie:** Human-in-the-loop is enforceable in code (status machine + no send), not just a slide. Sprint 5 adds demo Glass-Box RBAC (compliance cannot Approve; denied mutates audited) — pedagogical, not Entra (ADR 007).

## 4. Stakeholder demo sequence (keep)
1. `/health` — run id + `fallback_quantile_top5pct` + threshold.
2. One **below-threshold** refusal (proves the gate) — Streamlit preset / [below_threshold_demo.json](../Sprint4/fixtures/below_threshold_demo.json).
3. One **flagged** draft → Approve/Edit/Reject — preset / [flagged_demo.json](../Sprint4/fixtures/flagged_demo.json).
4. Explicit line: “Approved is not sent.”

Full script: [../Sprint4/demo_runbook.md](../Sprint4/demo_runbook.md).

## 5. What we did *not* promise
- 40% precision inside the contact budget (infeasible on these scores — see ML_Learnings §2.4a).
- Autonomous outreach or production SSO (demo Glass-Box RBAC shipped in Sprint 5 — pedagogical `X-Demo-Role`, not Entra).
