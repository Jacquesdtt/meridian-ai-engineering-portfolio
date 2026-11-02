"""Tests for Azure KEY 1 → KEY 2 auth fallback."""
from __future__ import annotations

from pathlib import Path
from unittest.mock import MagicMock

import httpx
import pytest
from openai import AuthenticationError

from src.core.config import Settings
from src.genai import azure_client as azure_client_mod
from src.genai.azure_client import call_with_key_fallback, normalize_openai_base_url


def test_normalize_strips_foundry_project_path():
    # Project-scoped /openai/v1 404s on embeddings; the resource root serves both.
    assert (
        normalize_openai_base_url(
            "https://example.services.ai.azure.com/api/projects/my-project/"
        )
        == "https://example.services.ai.azure.com/openai/v1"
    )


def test_normalize_appends_openai_v1():
    assert (
        normalize_openai_base_url("https://example.services.ai.azure.com")
        == "https://example.services.ai.azure.com/openai/v1"
    )
    assert (
        normalize_openai_base_url("https://example.services.ai.azure.com/openai/v1")
        == "https://example.services.ai.azure.com/openai/v1"
    )


def test_settings_loads_key1_and_key2(tmp_path: Path, monkeypatch):
    env_file = tmp_path / ".env"
    env_file.write_text(
        "\n".join(
            [
                "AZURE_OPENAI_BASE_URL=https://example.services.ai.azure.com/openai/v1",
                "AZURE_OPENAI_API_KEY_1=key-one",
                "AZURE_OPENAI_API_KEY_2=key-two",
            ]
        )
        + "\n",
        encoding="utf-8",
    )
    for key in list(__import__("os").environ):
        if key.upper().startswith("AZURE_OPENAI"):
            monkeypatch.delenv(key, raising=False)

    settings = Settings(_env_file=str(env_file))
    assert settings.azure_openai_api_key == "key-one"
    assert settings.azure_openai_api_key_2 == "key-two"
    assert settings.azure_api_keys == ["key-one", "key-two"]


def _auth_error() -> AuthenticationError:
    request = httpx.Request("POST", "https://example/openai/v1/chat/completions")
    response = httpx.Response(401, request=request)
    return AuthenticationError("401", response=response, body=None)


def test_call_with_key_fallback_tries_second_key_on_401(monkeypatch):
    monkeypatch.setattr(azure_client_mod.config, "azure_openai_api_key", "bad-key", raising=False)
    monkeypatch.setattr(azure_client_mod.config, "azure_openai_api_key_2", "good-key", raising=False)

    clients_seen: list[str] = []

    def make_client(*, api_key: str, timeout: float = 60.0):
        clients_seen.append(api_key)
        mock = MagicMock()
        mock.api_key = api_key
        return mock

    def operation(client):
        if client.api_key == "bad-key":
            raise _auth_error()
        return "ok"

    result = call_with_key_fallback(operation, make_client=make_client, timeout=12.0)
    assert result == "ok"
    assert clients_seen == ["bad-key", "good-key"]


def test_call_with_key_fallback_reraises_when_all_keys_fail(monkeypatch):
    monkeypatch.setattr(azure_client_mod.config, "azure_openai_api_key", "bad-a", raising=False)
    monkeypatch.setattr(azure_client_mod.config, "azure_openai_api_key_2", "bad-b", raising=False)

    def make_client(*, api_key: str, timeout: float = 60.0):
        return MagicMock()

    with pytest.raises(AuthenticationError):
        call_with_key_fallback(
            lambda _client: (_ for _ in ()).throw(_auth_error()),
            make_client=make_client,
        )
