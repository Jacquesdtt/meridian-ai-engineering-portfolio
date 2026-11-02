"""PII scrubbing before any LLM payload (ZDR / Jamie compliance)."""
from __future__ import annotations

import re
from typing import Any

# Conservative patterns — prefer over-redacting before Azure OpenAI.
_EMAIL = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")
_PHONE = re.compile(r"(?:\b|(?<=\s)|(?<=^))(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b")
_SSN_LIKE = re.compile(r"\b\d{3}-\d{2}-\d{4}\b")
_LONG_DIGIT = re.compile(r"\b\d{8,}\b")
_DOB_LIKE = re.compile(
    r"\b(?:19|20)\d{2}[-/](?:0?[1-9]|1[0-2])[-/](?:0?[1-9]|[12]\d|3[01])\b"
)

# Keys that must never appear in LLM context.
_BLOCKED_KEYS = frozenset(
    {
        "customer_id",
        "Customer_ID",
        "email",
        "Email",
        "name",
        "Name",
        "full_name",
        "dob",
        "date_of_birth",
        "ssn",
        "phone",
        "account_number",
    }
)


def scrub_text(text: str) -> str:
    """Redact common PII patterns from free text."""
    out = _EMAIL.sub("[REDACTED_EMAIL]", text)
    out = _PHONE.sub("[REDACTED_PHONE]", out)
    out = _SSN_LIKE.sub("[REDACTED_SSN]", out)
    out = _DOB_LIKE.sub("[REDACTED_DATE]", out)
    out = _LONG_DIGIT.sub("[REDACTED_ID]", out)
    return out


def scrub_mapping(payload: dict[str, Any]) -> dict[str, Any]:
    """Drop blocked keys and scrub string values for LLM-safe context."""
    clean: dict[str, Any] = {}
    for key, value in payload.items():
        if key in _BLOCKED_KEYS:
            continue
        if isinstance(value, str):
            clean[key] = scrub_text(value)
        elif isinstance(value, (int, float, bool)) or value is None:
            clean[key] = value
        elif isinstance(value, list):
            clean[key] = [
                scrub_text(v) if isinstance(v, str) else v for v in value
            ]
        # Skip nested dicts / objects — keep LLM context flat and small.
    return clean
