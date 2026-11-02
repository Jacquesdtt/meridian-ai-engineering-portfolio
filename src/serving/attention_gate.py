"""Attention / anti-rubber-stamp helpers for Friction-Gate Approves (JR-REQ-19).

HITL fails if agents Approve AI drafts by habit. These helpers classify
high-stakes scores and define the fast-decide soft-warn window used by the
Streamlit UI. API enforcement of ``attention_ack`` lives on DraftPatchRequest.
"""

from __future__ import annotations

# Soft warn only (UI) — do not hard-block; avoid rage-click workarounds.
FAST_DECIDE_SECONDS = 8.0


def is_high_stakes(churn_probability: float, threshold: float) -> bool:
    """True when score sits clearly above the ops contact cut.

    Uses max(threshold + 0.10, 0.80) so demos near t≈0.70 still get a cue
    for clearly elevated ranks without flagging every borderline contact.
    """
    bar = max(float(threshold) + 0.10, 0.80)
    return float(churn_probability) >= bar


def attention_audit_detail(
    *,
    attention_ack: bool,
    high_stakes: bool,
    seconds_open: float | None = None,
) -> dict:
    """Fields merged into approve audit ``detail_json`` for Compliance review."""
    detail: dict = {
        "attention_ack": bool(attention_ack),
        "high_stakes": bool(high_stakes),
        "anti_rubber_stamp": True,
    }
    if seconds_open is not None:
        detail["seconds_open"] = round(float(seconds_open), 2)
        detail["fast_decide_warn"] = float(seconds_open) < FAST_DECIDE_SECONDS
    return detail
