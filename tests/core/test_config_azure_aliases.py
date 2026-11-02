"""Config env-alias loading for Azure OpenAI (BASE_URL / DEPLOYMENT_NAME)."""
from __future__ import annotations

from pathlib import Path

from src.core.config import Settings


def test_settings_accepts_base_url_and_deployment_name_aliases(tmp_path: Path, monkeypatch):
    """Local .env often uses Foundry/SDK names; config must map them."""
    env_file = tmp_path / ".env"
    env_file.write_text(
        "\n".join(
            [
                "AZURE_OPENAI_BASE_URL=https://example.openai.azure.com/openai/v1",
                "AZURE_OPENAI_API_KEY=test-key",
                "AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4.1-mini",
            ]
        )
        + "\n",
        encoding="utf-8",
    )
    # Isolate from the real process / project .env.
    for key in list(__import__("os").environ):
        if key.upper().startswith("AZURE_OPENAI"):
            monkeypatch.delenv(key, raising=False)

    settings = Settings(_env_file=str(env_file))
    assert settings.azure_configured is True
    assert settings.azure_openai_endpoint.endswith("/openai/v1")
    assert settings.azure_openai_api_key == "test-key"
    assert settings.azure_openai_deployment == "gpt-4.1-mini"


def test_settings_canonical_endpoint_and_deployment_still_work(tmp_path: Path, monkeypatch):
    env_file = tmp_path / ".env"
    env_file.write_text(
        "\n".join(
            [
                "AZURE_OPENAI_ENDPOINT=https://example.openai.azure.com/",
                "AZURE_OPENAI_DEPLOYMENT=gpt-4o-mini",
            ]
        )
        + "\n",
        encoding="utf-8",
    )
    for key in list(__import__("os").environ):
        if key.upper().startswith("AZURE_OPENAI"):
            monkeypatch.delenv(key, raising=False)

    settings = Settings(_env_file=str(env_file))
    assert settings.azure_configured is True
    assert settings.azure_openai_endpoint == "https://example.openai.azure.com/"
    assert settings.azure_openai_deployment == "gpt-4o-mini"
