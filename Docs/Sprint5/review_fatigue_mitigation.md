# Review Fatigue & Rubber-Stamping Mitigation (Jamie / RAI)

**Status:** Adopted for Sprint 5 prototype (2026-07-16) — **JR-REQ-19**  
**Problem:** Human-in-the-loop fails if agents Approve AI drafts by habit (“normally right”).  
**Related:** ADR 003 · [jamie_requirements_register.md](jamie_requirements_register.md) · JR-OPEN-03 (second mailer approve — resolved: one human approval is sufficient, ADR 012)

---

## 1. Principle

> Friction-Gate must make **attention** cheap to prove and **rubber-stamping** visible — without turning every draft into busywork.

---

## 2. What we ship now (proportionate)

| Control | Behaviour | Why |
|---------|-----------|-----|
| **Capacity dial** (existing) | Top ~5% contact only | Less volume → less fatigue |
| **Attention acknowledgement** | Approve requires `attention_ack=true` (UI checkbox + API field) | Stops one-click Approve with zero affirmation |
| **High-stakes cue** | Stronger banner when score is well above ops cut (`p ≥ max(t+0.10, 0.80)`) | Extra attention where contact impact is highest |
| **Fast-decide soft warn** | UI warns if Approve attempted &lt; ~8s after draft opened in session | Detects haste; does **not** hard-block (avoid rage-clicks) |
| **Audit detail** | Approve events log `attention_ack`, `high_stakes`, `seconds_open` | Compliance can spot rubber-stamp patterns |
| **Precision humility** | Glass-box + queue copy: scores are ranks; precision in contact set ~23% | Undercuts “model is usually right” |

---

## 3. Explicitly deferred (need Jamie / Morgan)

| Control | Why deferred |
|---------|--------------|
| Random challenge rate (hide Approve until edit) | Ops capacity + UX; pick % with Morgan |
| Dual control / second approver at mailer | JR-OPEN-03 |
| Daily Approve budget per agent | Org policy |
| Auto-escalate if approve-rate ≈ 100% | Needs production metrics pipeline |

---

## 4. Assessor one-liner

> “HITL is not a rubber stamp: Approves require an attention check, high-score drafts get a stronger cue, and the audit trail records how fast people decided — while capacity limits keep the queue reviewable.”

---

## 5. Implementation pointers

| Piece | Location |
|-------|----------|
| Policy helpers | `src/serving/attention_gate.py` |
| API | `DraftPatchRequest.attention_ack` · enforced on `status=approved` |
| UI | `Code/Sprint3/friction_gate_app.py` Review queue |
| ADR | [003](../Architecture/ADRs/003-friction-as-a-feature-genai-gating.md) §Amendment |
| Tests | `tests/serving/test_api.py` (approve without ack → 422) |
