"""Unit tests for JR-REQ-19 attention / anti-rubber-stamp helpers."""
from src.serving.attention_gate import (
    FAST_DECIDE_SECONDS,
    attention_audit_detail,
    is_high_stakes,
)


def test_high_stakes_above_bar():
    assert is_high_stakes(0.85, 0.70) is True
    assert is_high_stakes(0.75, 0.70) is False  # needs max(t+0.1, 0.80)=0.80
    assert is_high_stakes(0.81, 0.70) is True


def test_attention_audit_detail_flags_fast_decide():
    d = attention_audit_detail(
        attention_ack=True,
        high_stakes=True,
        seconds_open=3.0,
    )
    assert d["attention_ack"] is True
    assert d["high_stakes"] is True
    assert d["anti_rubber_stamp"] is True
    assert d["fast_decide_warn"] is True
    assert d["seconds_open"] == 3.0
    slow = attention_audit_detail(
        attention_ack=True,
        high_stakes=False,
        seconds_open=FAST_DECIDE_SECONDS + 1,
    )
    assert slow["fast_decide_warn"] is False
