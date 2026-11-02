"""Unit tests for Sprint 5 prompt-as-code wiring (no Azure network)."""
from __future__ import annotations

from pathlib import Path

import pytest

from src.genai import drafter as drafter_mod
from src.genai.drafter import (
    MAX_RATE,
    _fallback_chat_messages,
    build_azure_chat_messages,
    clear_prompty_cache,
    stub_draft,
)


def test_stub_draft_rate_capped_and_offline():
    draft = stub_draft(
        drivers=["balance_led", "inactivity"],
        churn_probability=0.75,
        extra_context={"note": "ok"},
    )
    assert draft.offered_interest_rate <= MAX_RATE
    assert "human review" in draft.body.lower() or "retention" in draft.body.lower()


@pytest.mark.parametrize("text", ["9.5% loyalty rate", "We offer 9,5 percent interest.", "Rate: 9.5 per cent"])
def test_generated_rate_promises_above_cap_are_rejected(text):
    """The email text must not contradict the validated numeric offer."""
    with pytest.raises(ValueError):
        drafter_mod.sanitize_llm_draft(
            {"subject": text, "body": text, "offered_interest_rate": 0.035},
            fallback_drivers=[],
        )


@pytest.mark.parametrize("text", [
    "1,000% interest", "9.5e0% interest", "1 000% interest", "nine percent interest",
    "1\u202f000% interest", "1\n000% interest",
])
def test_ambiguous_percentage_claims_are_rejected(text):
    with pytest.raises(ValueError):
        drafter_mod.sanitize_llm_draft(
            {"subject": "Loyalty offer", "body": text, "offered_interest_rate": 0.035},
            fallback_drivers=[],
        )


@pytest.mark.parametrize("text", ["3% interest", "3,0 percent interest", ".5% interest", "3e0% interest"])
def test_valid_percentage_claims_within_offer_are_accepted(text):
    draft = drafter_mod.sanitize_llm_draft(
        {"subject": "Loyalty offer", "body": text, "offered_interest_rate": 0.03},
        fallback_drivers=[],
    )
    assert draft.body == text


def test_invalid_generated_rate_uses_safe_fallback(monkeypatch):
    monkeypatch.setattr(type(drafter_mod.config), "azure_configured", property(lambda self: True))
    monkeypatch.setattr(drafter_mod, "azure_draft", lambda **kwargs: drafter_mod.sanitize_llm_draft(
        {"subject": "Loyalty offer", "body": "We guarantee 9.5% interest.", "offered_interest_rate": 0.095},
        fallback_drivers=[],
    ))
    draft, source = drafter_mod.create_draft(drivers=[], churn_probability=0.9)
    assert source == "stub_fallback"
    assert "9.5" not in draft.body
    assert draft.offered_interest_rate <= MAX_RATE


def test_prompty_build_messages_uses_prompty_asset():
    clear_prompty_cache()
    messages = build_azure_chat_messages(
        drivers=["balance_led"],
        churn_probability=0.7509,
        safe_ctx={"month": "2024-06"},
    )
    assert isinstance(messages, list)
    assert len(messages) >= 2
    roles = {m["role"] for m in messages}
    assert "system" in roles
    assert "user" in roles
    blob = " ".join(m["content"] for m in messages)
    # Phrase unique to retention_draft.prompty (not the embedded fallback).
    assert "already scrubbed aggregates" in blob.lower()
    assert "balance_led" in blob
    assert "0.035" in blob or str(MAX_RATE) in blob
    assert "/send" not in blob.lower()


def test_prompty_missing_file_falls_back(monkeypatch: pytest.MonkeyPatch, tmp_path: Path):
    clear_prompty_cache()
    missing = tmp_path / "nope.prompty"
    monkeypatch.setattr(drafter_mod, "_PROMPTY_PATH", missing)
    messages = build_azure_chat_messages(
        drivers=["x"],
        churn_probability=0.5,
        safe_ctx={},
    )
    fallback = _fallback_chat_messages(drivers=["x"], churn_probability=0.5, safe_ctx={})
    assert messages == fallback
    clear_prompty_cache()
