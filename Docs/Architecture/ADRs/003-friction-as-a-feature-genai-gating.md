# ADR 003: "Friction as a Feature" (GenAI Human-in-the-Loop Gating)

## Status
Accepted

## Context
The project utilizes Azure OpenAI to draft highly personalized retention emails based on SHAP churn values. The Risk and Compliance team (represented by the "Jamie" persona) considers autonomous AI communication with retail banking clients an unacceptable liability due to the risk of hallucinations (e.g., promising unapproved interest rates).

## Decision
We will intentionally design the architecture around **"Friction as a Feature."** 
The system will **never** send an email automatically — there is **no `/send` route** and no mailer integration. The Generative AI component acts strictly as a *drafter*. FastAPI + Streamlit share a "Pending Review" queue (Friction-Gate). A human retention agent may review, edit, and click **Approve** or **Reject**. **Approve ≠ Sent:** Approved means the draft is ready for a human to send **outside** this system. Terminal statuses are immutable (decide once).

## Alternatives Considered
1.  **Fully Autonomous Dispatch:** Rejected. Fails compliance immediately.
2.  **No GenAI (Rules-based templates):** Rejected. Fails to provide the hyper-personalization required to improve retention rates.

## Consequences
*   **Pros:** Gives Risk a concrete HITL control (drafts-only + no dispatch path). Keeps a human accountable for any outbound that happens outside this prototype.
*   **Cons:** Reduces the ultimate speed and scale of the system compared to full automation.

## Trade-offs
We are trading maximum throughput/automation for regulatory compliance and stakeholder approval. In financial services, this is a mandatory trade-off.

## Amendment (2026-07-16) — Review fatigue / rubber-stamping

**Context:** HITL fails if agents Approve drafts by habit (“the model is usually right”). Jamie’s fairness/HITL story requires **attention**, not a confirm button.

**Decision (prototype):**
1. **Attention acknowledgement** — Approving a draft requires an explicit `attention_ack` (UI checkbox + API field). Approve without ack → rejected (422).
2. **High-stakes cue** — Drafts with scores well above the ops cut show a stronger “read carefully” banner (`src/serving/attention_gate.py`).
3. **Fast-decide soft warn** — UI warns if Approve is attempted within ~8s of opening the draft; does not hard-block.
4. **Audit** — Approve events record `attention_ack`, `high_stakes`, `seconds_open` for Compliance sampling.
5. **Still deferred:** random challenge rates, daily Approve budgets, dual mailer approval (JR-OPEN-03) — need Jamie/Morgan policy.

**Doc:** [Docs/Sprint5/review_fatigue_mitigation.md](../../Sprint5/review_fatigue_mitigation.md) · **JR-REQ-19**.
