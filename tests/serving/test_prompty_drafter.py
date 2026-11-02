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
