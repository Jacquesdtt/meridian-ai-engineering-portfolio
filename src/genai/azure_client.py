"""Shared Azure / Foundry OpenAI-compatible client helpers.

Pattern notes (from ``mslearn-agent-quickstart`` + portal Keys & Endpoint):
- Prefer the Foundry host ``*.services.ai.azure.com`` (OpenAI-compatible ``/openai/v1``)
  when that is what the portal shows under the Foundry tab.
- Auth may be an API key **or** Entra (quickstart uses DefaultAzureCredential).
  Meridian still uses API keys for local demos; portal exposes KEY 1 and KEY 2 so
  we try key-1 then key-2 on ``AuthenticationError`` (401).

Example::

    from src.genai.azure_client import call_with_key_fallback, make_openai_client

    def _work(client):
        return client.chat.completions.create(...)

    completion = call_with_key_fallback(_work, make_client=make_openai_client)
"""
from __future__ import annotations

import logging
from collections.abc import Callable
from typing import Any, Optional, TypeVar

from src.core.config import config

logger = logging.getLogger(__name__)

T = TypeVar("T")


def normalize_openai_base_url(endpoint: str) -> str:
    """Ensure OpenAI SDK ``base_url`` ends with ``/v1`` (Azure/Foundry shape).

    A Foundry *project* endpoint (``…/api/projects/<name>``) is reduced to the
    resource root: the project-scoped ``/openai/v1`` route serves chat but returns
    404 for embeddings, which silently pushed RAG onto its TF-IDF fallback.
    """
    base = endpoint.rstrip("/")
    if "/api/projects/" in base:
        base = base.split("/api/projects/", 1)[0]
    if not base.endswith("/v1"):
        base = base + "/openai/v1"
    return base


def make_openai_client(
    *,
    api_key: Optional[str] = None,
    timeout: float = 60.0,
) -> Any:
    """Build OpenAI-compatible client pointed at Azure OpenAI / Foundry.

    Args:
        api_key: Explicit key slot; defaults to primary configured key (or ``unused``
            for Entra/gateway placeholders).
        timeout: HTTP timeout seconds.
    """
    from openai import OpenAI

    endpoint = config.azure_openai_endpoint
    if not endpoint:
        raise RuntimeError("Azure OpenAI endpoint not configured")
    key = api_key if api_key is not None else (config.azure_openai_api_key or "unused")
    return OpenAI(
        api_key=key,
        base_url=normalize_openai_base_url(endpoint),
        timeout=timeout,
    )


_REASONING_PREFIXES = ("gpt-5", "o1", "o3", "o4")


def is_reasoning_model(model_name: str) -> bool:
    """True for deployments that reject ``max_tokens`` / non-default ``temperature``."""
    return model_name.lower().startswith(_REASONING_PREFIXES)


def chat_limit_params(
    model_name: str,
    *,
    max_tokens: int,
    reasoning_max_tokens: int,
    temperature: Optional[float] = None,
) -> dict[str, Any]:
    """Token-limit and sampling kwargs that the deployed model accepts.

    Reasoning models (``gpt-5*``, ``o*``) return 400 on ``max_tokens`` and count
    hidden reasoning inside ``max_completion_tokens``, so they get the larger
    ``reasoning_max_tokens`` budget and no ``temperature``.
    """
    if is_reasoning_model(model_name):
        return {"max_completion_tokens": reasoning_max_tokens}
    params: dict[str, Any] = {"max_tokens": max_tokens}
    if temperature is not None:
        params["temperature"] = temperature
    return params


def call_with_key_fallback(
    operation: Callable[[Any], T],
    *,
    make_client: Callable[..., Any],
    timeout: float = 60.0,
) -> T:
    """Run ``operation(client)``, retrying with KEY 2 if KEY 1 returns 401.

    Args:
        operation: Callable that receives an OpenAI client and returns a result.
        make_client: Factory ``(*, api_key=..., timeout=...) -> client``. Callers
            usually pass their module-local ``_make_openai_client`` so tests can
            patch it.
        timeout: Forwarded to ``make_client``.
    """
    from openai import AuthenticationError

    keys = config.azure_api_keys or ["unused"]
    last_exc: Optional[BaseException] = None
    for index, key in enumerate(keys):
        client = make_client(api_key=key, timeout=timeout)
        try:
            return operation(client)
        except AuthenticationError as exc:
            last_exc = exc
            if index + 1 < len(keys):
                logger.warning(
                    "Azure auth failed for API key slot %s/%s; trying next key",
                    index + 1,
                    len(keys),
                )
                continue
            raise
    # Unreachable when keys non-empty; keeps type-checkers happy.
    raise last_exc or RuntimeError("Azure OpenAI call failed with no API keys")
