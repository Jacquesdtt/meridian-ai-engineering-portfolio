"""TDD: Azure OpenAI tenacity retries + token telemetry for retention drafter (RAG-01/05)."""
from __future__ import annotations

import logging
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest

from src.genai import drafter as drafter_mod
from src.genai.drafter import azure_draft


@pytest.fixture(autouse=True)
def _fast_tenacity_waits():
    """Unit tests should not sleep on exponential backoff."""
    from tenacity import wait_none

    original = drafter_mod._chat_completions_create.retry.wait
    drafter_mod._chat_completions_create.retry.wait = wait_none()
    yield
    drafter_mod._chat_completions_create.retry.wait = original


def test_azure_draft_retries_on_rate_limit(monkeypatch: pytest.MonkeyPatch):
    import httpx
    from openai import RateLimitError

    monkeypatch.setattr(
        drafter_mod.config,
        "azure_openai_endpoint",
        "https://example.openai.azure.com",
        raising=False,
    )
    monkeypatch.setattr(drafter_mod.config, "azure_openai_api_key", "k", raising=False)
    monkeypatch.setattr(drafter_mod.config, "azure_openai_deployment", "gpt-4o-mini", raising=False)

    calls = {"n": 0}

    def _rate_limit() -> RateLimitError:
        request = httpx.Request("POST", "https://example.openai.azure.com/v1/chat/completions")
        response = httpx.Response(429, request=request)
        return RateLimitError("429", response=response, body=None)

    def flaky_create(**kwargs):
        calls["n"] += 1
        if calls["n"] < 2:
            raise _rate_limit()
        raw = (
            '{"subject":"Hello","body":"Draft body for review only.",'
            '"offered_interest_rate":0.03,"drivers":["balance_led"]}'
        )
        usage = SimpleNamespace(prompt_tokens=11, completion_tokens=9, total_tokens=20)
        return SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(content=raw))],
            usage=usage,
        )

    mock_client = MagicMock()
    mock_client.chat.completions.create.side_effect = flaky_create

    with patch.object(drafter_mod, "_make_openai_client", return_value=mock_client):
        draft = azure_draft(drivers=["balance_led"], churn_probability=0.75)

    assert draft.offered_interest_rate <= 0.035
    assert calls["n"] == 2


def test_azure_draft_logs_token_usage(monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture):
    monkeypatch.setattr(
        drafter_mod.config,
        "azure_openai_endpoint",
        "https://example.openai.azure.com",
        raising=False,
    )
    monkeypatch.setattr(drafter_mod.config, "azure_openai_api_key", "k", raising=False)
    monkeypatch.setattr(drafter_mod.config, "azure_openai_deployment", "gpt-4o-mini", raising=False)

    raw = (
        '{"subject":"Hi","body":"Body","offered_interest_rate":0.02,'
        '"drivers":["x"]}'
    )
    usage = SimpleNamespace(prompt_tokens=33, completion_tokens=4, total_tokens=37)
    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = SimpleNamespace(
        choices=[SimpleNamespace(message=SimpleNamespace(content=raw))],
        usage=usage,
    )

    with patch.object(drafter_mod, "_make_openai_client", return_value=mock_client):
        with caplog.at_level(logging.INFO, logger="src.genai.drafter"):
            azure_draft(drivers=["x"], churn_probability=0.8)

    joined = " ".join(r.message for r in caplog.records)
    assert "prompt_tokens" in joined
    assert "33" in joined
