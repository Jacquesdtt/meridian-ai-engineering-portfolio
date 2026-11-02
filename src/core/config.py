"""Application configuration loaded from environment variables and ``.env``.

Azure OpenAI settings are **optional** so ``/score`` and stub GenAI drafts work
without credentials (Sprint 3). When endpoint + key are present, the Azure
drafter path is used; on failure the service falls back to the stub.

Env-name aliases (local ``.env`` often uses Foundry / SDK naming):
- ``AZURE_OPENAI_ENDPOINT`` **or** ``AZURE_OPENAI_BASE_URL``
- ``AZURE_OPENAI_DEPLOYMENT`` **or** ``AZURE_OPENAI_DEPLOYMENT_NAME``
- ``AZURE_OPENAI_API_KEY`` / ``AZURE_OPENAI_API_KEY_1`` (portal KEY 1)
- ``AZURE_OPENAI_API_KEY_2`` (portal KEY 2 — tried on 401)
"""
from typing import Optional

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Typed settings for Azure OpenAI, serving paths, and deployment environment.

    MLflow is not configured here: the Sprint 2 notebook and
    ``Code/Sprint3/export_ops_model.py`` use a local ``sqlite:///mlflow.db``
    store (ADR 009), and serving never talks to MLflow.
    """

    # --- Azure OpenAI (optional for Sprint 3 score + stub drafts) ---
    # BASE_URL alias: some local .env files use Azure SDK / Foundry naming.
    azure_openai_endpoint: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices(
            "AZURE_OPENAI_ENDPOINT",
            "azure_openai_endpoint",
            "AZURE_OPENAI_BASE_URL",
            "azure_openai_base_url",
        ),
    )
    # Portal KEY 1 (canonical) — also accepts *_API_KEY_1.
    azure_openai_api_key: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices(
            "AZURE_OPENAI_API_KEY",
            "azure_openai_api_key",
            "AZURE_OPENAI_API_KEY_1",
            "azure_openai_api_key_1",
        ),
    )
    # Portal KEY 2 — used only when KEY 1 returns AuthenticationError (401).
    azure_openai_api_key_2: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices(
            "AZURE_OPENAI_API_KEY_2",
            "azure_openai_api_key_2",
        ),
    )
    # DEPLOYMENT_NAME alias: matches common Azure portal / SDK env vars.
    azure_openai_deployment: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices(
            "AZURE_OPENAI_DEPLOYMENT",
            "azure_openai_deployment",
            "AZURE_OPENAI_DEPLOYMENT_NAME",
            "azure_openai_deployment_name",
        ),
    )
    azure_openai_embedding_deployment: Optional[str] = "text-embedding-3-large"
    azure_openai_api_version: str = "2024-10-21"

    # --- Paths (override in tests) ---
    models_ops_dir: Optional[str] = None
    draft_db_path: Optional[str] = None
    # Prediction browser cohort (Code/Sprint5/build_prediction_cohort.py output).
    prediction_cohort_path: Optional[str] = None

    # --- Friction-Gate UI -> API transport (ADR 006 follow-up) ---
    # "http": UI calls FastAPI at friction_gate_api_url (default).
    # "inprocess": UI drives the same FastAPI app via an ASGI test client (no socket;
    # for AppLocker demo machines that block localhost). Same code path either way.
    friction_gate_mode: str = "http"
    friction_gate_api_url: str = "http://127.0.0.1:8000"
    # Key the UI sends as X-API-Key (only needed when pointing at the Azure deploy).
    friction_gate_api_key: Optional[str] = None

    # --- API access key (ADR 016) ---
    # When set, every API request must carry a matching X-API-Key header. Unset
    # locally (tests, launch_all.ps1); the Azure Container App always sets it.
    api_access_key: Optional[str] = None

    # --- Environment ---
    environment: str = "development"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        populate_by_name=True,
    )

    @property
    def azure_configured(self) -> bool:
        """True when endpoint is set (key may be RBAC / empty for some gateways)."""
        return bool(self.azure_openai_endpoint)

    @property
    def azure_api_keys(self) -> list[str]:
        """Ordered unique API keys: portal KEY 1 then KEY 2 (skip blanks)."""
        keys: list[str] = []
        for candidate in (self.azure_openai_api_key, self.azure_openai_api_key_2):
            if not candidate:
                continue
            value = candidate.strip()
            if value and value not in keys:
                keys.append(value)
        return keys


# Created at import time — optional Azure fields so import never hard-fails.
config = Settings()
