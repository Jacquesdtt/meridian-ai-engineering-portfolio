"""Retention email drafters: stub (default) + optional Azure OpenAI.

Uses the standard OpenAI client with base_url (enterprise gateway safe).
Azure system/user prompts come from ``prompts/retention_draft.prompty``
(prompt-as-code); on load/prepare failure we fall back to embedded strings.
On Azure failure, callers should fall back to stub (drafter_source=stub_fallback).

Sprint 5 red-team (RAG-01 / RAG-05): Tenacity retries on transient Azure errors;
logs ``prompt_tokens`` / ``completion_tokens`` for each completion.
"""
from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any, Optional

from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from src.core.config import config
from src.genai.azure_client import (
    call_with_key_fallback,
    chat_limit_params,
    make_openai_client,
)
from src.genai.pii_scrubber import scrub_mapping, scrub_text
from src.serving.schemas import RetentionDraftBody

logger = logging.getLogger(__name__)

MAX_RATE = 0.035
_PROMPTY_PATH = Path(__file__).resolve().parent / "prompts" / "retention_draft.prompty"
_PROMPTY_CACHE: Any = None
_PROMPTY_CACHE_PATH: Path | None = None


def _load_prompty():
    """Load + cache the retention .prompty (invalidate if path object changes)."""
    global _PROMPTY_CACHE, _PROMPTY_CACHE_PATH
    import prompty

    if _PROMPTY_CACHE is not None and _PROMPTY_CACHE_PATH == _PROMPTY_PATH:
        return _PROMPTY_CACHE
    if not _PROMPTY_PATH.is_file():
        raise FileNotFoundError(f"Missing prompty asset: {_PROMPTY_PATH}")
    _PROMPTY_CACHE = prompty.load(str(_PROMPTY_PATH))
    _PROMPTY_CACHE_PATH = _PROMPTY_PATH
    return _PROMPTY_CACHE


def clear_prompty_cache() -> None:
    """Test helper — force reload on next prepare."""
    global _PROMPTY_CACHE, _PROMPTY_CACHE_PATH
    _PROMPTY_CACHE = None
    _PROMPTY_CACHE_PATH = None


def sanitize_llm_draft(
    data: dict[str, Any],
    *,
    fallback_drivers: list[str],
) -> RetentionDraftBody:
    """Validate + ZDR-scrub LLM JSON before it becomes a persisted draft.

    Scrubs **subject and body** (Azure may invent emails/phones in either field).
    Rejects numeric rates above the cap and percentage claims above the offer.
    The caller uses the safe stub when generated output fails validation.
    """
    rate = float(data.get("offered_interest_rate", MAX_RATE))
    # Never trust LLM-returned drivers — freeze to server SHAP names (Jamie RT-J2-09).
    return RetentionDraftBody(
        subject=scrub_text(str(data.get("subject", "Retention offer")))[:120],
        body=scrub_text(str(data.get("body", "")))[:4000],
        offered_interest_rate=rate,
        drivers=list(fallback_drivers)[:5],
    )


def stub_draft(
    *,
    drivers: list[str],
    churn_probability: float,
    extra_context: Optional[dict[str, Any]] = None,
) -> RetentionDraftBody:
    """Deterministic compliant draft — no network, no PII."""
    _ = scrub_mapping(extra_context or {})
    driver_line = ", ".join(drivers[:5]) if drivers else "account activity"
    subject = "We're here if your savings goals have changed"
    body = (
        "Hello,\n\n"
        "Our retention team noticed signals that your account may need attention "
        f"(model drivers: {driver_line}; score={churn_probability:.2f}). "
        "We can review fee waivers or a loyalty rate up to the bank-approved cap. "
        "Please reply if you would like to talk with a relationship manager.\n\n"
        "— Meridian Savings Retention (draft for human review only)"
    )
    return sanitize_llm_draft(
        {
            "subject": subject,
            "body": body,
            "offered_interest_rate": MAX_RATE,
            "drivers": drivers[:5],
        },
        fallback_drivers=drivers[:5],
    )


def _fallback_chat_messages(
    *,
    drivers: list[str],
    churn_probability: float,
    safe_ctx: dict[str, Any],
) -> list[dict[str, str]]:
    """Embedded prompts used if .prompty load/prepare fails (AppLocker / missing file)."""
    user_payload = {
        "drivers": drivers[:5],
        "churn_probability": round(churn_probability, 4),
        "context": safe_ctx,
        "max_interest_rate": MAX_RATE,
        "instructions": (
            "Draft a short retention email. Do not invent personal names. "
            f"offered_interest_rate must be <= {MAX_RATE}. "
            "Return JSON with keys subject, body, offered_interest_rate, drivers."
        ),
    }
    return [
        {
            "role": "system",
            "content": (
                "You are a Meridian Savings retention drafting assistant. "
                "Never promise rates above 3.5%. Never invent PII. "
                "Output JSON only."
            ),
        },
        {"role": "user", "content": json.dumps(user_payload)},
    ]


def build_azure_chat_messages(
    *,
    drivers: list[str],
    churn_probability: float,
    safe_ctx: dict[str, Any],
) -> list[dict[str, str]]:
    """Render chat messages via .prompty (scrubbed inputs only); fallback if needed.

    ZDR: callers must pass already-scrubbed ``safe_ctx``. Drivers are model
    feature names, not customer PII.
    """
    try:
        import prompty

        prompt = _load_prompty()
        prepared = prompty.prepare(
            prompt,
            inputs={
                "drivers": drivers[:5],
                "churn_probability": round(churn_probability, 4),
                "context_json": json.dumps(safe_ctx, default=str),
                "max_interest_rate": MAX_RATE,
            },
        )
        messages: list[dict[str, str]] = []
        for item in prepared:
            role = str(item.get("role", "user"))
            content = item.get("content", "")
            if not isinstance(content, str):
                content = json.dumps(content, default=str)
            messages.append({"role": role, "content": content})
        if not messages:
            raise RuntimeError("prompty.prepare returned empty messages")
        return messages
    except Exception as exc:  # noqa: BLE001 — keep Azure path alive without Prompty
        logger.warning("Prompty render failed (%s); using embedded prompt fallback", exc)
        return _fallback_chat_messages(
            drivers=drivers,
            churn_probability=churn_probability,
            safe_ctx=safe_ctx,
        )


def _retryable_openai_errors() -> tuple[type[BaseException], ...]:
    """Lazy-import OpenAI transient error types for tenacity (RAG-01)."""
    from openai import APIConnectionError, APITimeoutError, InternalServerError, RateLimitError

    return (RateLimitError, APIConnectionError, APITimeoutError, InternalServerError)


def _make_openai_client(*, api_key: Optional[str] = None, timeout: float = 30.0) -> Any:
    """OpenAI-compatible client for Azure / Foundry (patch point for unit tests)."""
    return make_openai_client(api_key=api_key, timeout=timeout)


def _log_token_usage(usage: Any, *, component: str) -> None:
    """RAG-05: log token consumption for cost / silent-degradation visibility."""
    if usage is None:
        logger.info("%s completion had no usage telemetry", component)
        return
    logger.info(
        "%s token usage prompt_tokens=%s completion_tokens=%s total_tokens=%s",
        component,
        getattr(usage, "prompt_tokens", None),
        getattr(usage, "completion_tokens", None),
        getattr(usage, "total_tokens", None),
    )


@retry(
    retry=retry_if_exception_type(_retryable_openai_errors()),
    wait=wait_exponential(multiplier=1, min=1, max=20),
    stop=stop_after_attempt(5),
    reraise=True,
)
def _chat_completions_create(client: Any, **kwargs: Any) -> Any:
    """Azure chat create with exponential backoff on 429/5xx/timeouts."""
    return client.chat.completions.create(**kwargs)


def azure_draft(
    *,
    drivers: list[str],
    churn_probability: float,
    extra_context: Optional[dict[str, Any]] = None,
) -> RetentionDraftBody:
    """Call Azure OpenAI with structured JSON; raises on config/network errors."""
    if not config.azure_configured:
        raise RuntimeError("Azure OpenAI endpoint not configured")

    # Scrub BEFORE any prompt render / LLM call (Jamie ZDR).
    safe_ctx = scrub_mapping(extra_context or {})
    messages = build_azure_chat_messages(
        drivers=drivers,
        churn_probability=churn_probability,
        safe_ctx=safe_ctx,
    )

    model_name = config.azure_openai_deployment or "gpt-4o-mini"
    # Portal KEY 1 then KEY 2 on 401 (mslearn-style OpenAI client + local key fallback).
    completion = call_with_key_fallback(
        lambda client: _chat_completions_create(
            client,
            model=model_name,
            messages=messages,
            response_format={"type": "json_object"},
            **chat_limit_params(model_name, max_tokens=800, reasoning_max_tokens=3000),
        ),
        make_client=_make_openai_client,
        timeout=45.0,
    )
    _log_token_usage(getattr(completion, "usage", None), component="retention_drafter")
    raw = completion.choices[0].message.content or "{}"
    data = json.loads(raw)
    # Scrub LLM *outputs* too — ZDR is inbound + outbound (Jamie).
    return sanitize_llm_draft(data, fallback_drivers=drivers)


def create_draft(
    *,
    drivers: list[str],
    churn_probability: float,
    extra_context: Optional[dict[str, Any]] = None,
) -> tuple[RetentionDraftBody, str]:
    """Return (draft, drafter_source). Prefer Azure; fall back to stub."""
    if config.azure_configured:
        try:
            return azure_draft(
                drivers=drivers,
                churn_probability=churn_probability,
                extra_context=extra_context,
            ), "azure"
        except Exception as exc:  # noqa: BLE001 — compliance: never fail the gate
            logger.warning("Azure drafter failed (%s); using stub_fallback", exc)
            return stub_draft(
                drivers=drivers,
                churn_probability=churn_probability,
                extra_context=extra_context,
            ), "stub_fallback"
    return stub_draft(
        drivers=drivers,
        churn_probability=churn_probability,
        extra_context=extra_context,
    ), "stub"
