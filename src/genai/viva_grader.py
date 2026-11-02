"""LLM marking for Explain-it (viva) answers — ADR-EDU-003.

The educational SPA used to ask learners to grade their own free-text answers
against a rubric. Self-grading is the weakest link in that loop: the rubric is
visible while you tick it, so it measures generosity as much as recall. This
module marks the answer instead.

Scope is deliberately narrow. The model is **not** asked for a holistic score —
that is where LLM grading is least reliable and would hand a learner false
confidence. It is asked one entailment question per rubric point ("is this
point actually made in the answer, and which sentence makes it?"), which is an
extraction task with an auditable result: every ``covered`` verdict carries the
learner's own words back as evidence, so a wrong mark is visible rather than
hidden behind a number.

Resilience follows ADR 013: Tenacity retries on transient Azure errors, token
telemetry through stdlib logging, and no new provider. When Azure is not
configured the caller gets ``available=False`` rather than a fabricated mark —
the SPA then falls back to self-grading with a banner (ADR-EDU-003), because a
guessed grade is worse than an honest "not marked".

Example::

    from src.genai.viva_grader import grade_answer
    result = grade_answer(
        prompt="How did you make sure the model never saw the future?",
        rubric=["Label is month t+1; features stop at month t", ...],
        answer="The label is next month's state ...",
    )
    result.covered_count, result.points[0].evidence
"""
from __future__ import annotations

import json
import logging
from typing import Any, Optional

from pydantic import BaseModel, Field
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

logger = logging.getLogger(__name__)

#: Rubric coverage required for a prompt to count as cleared (mirrors the SPA).
PASS_RATIO = 0.8
#: Below this the answer is too short to mark meaningfully; the SPA enforces it too.
MIN_WORDS = 40

_MAX_ANSWER_CHARS = 6000
_MAX_RUBRIC_POINTS = 12


class RubricVerdict(BaseModel):
    """One rubric point, marked."""

    index: int
    point: str
    covered: bool
    #: The learner's own sentence that makes the point — empty when not covered.
    evidence: str = ""
    #: Why it was not accepted, when it was not. One short sentence.
    comment: str = ""


class GradeResult(BaseModel):
    """Marking outcome for one Explain-it answer."""

    available: bool
    points: list[RubricVerdict] = Field(default_factory=list)
    #: Model's short note on what is missing or wrong. Never a score.
    feedback: str = ""
    #: Set when ``available`` is False — why marking could not run.
    reason: str = ""

    @property
    def covered_count(self) -> int:
        return sum(1 for p in self.points if p.covered)

    @property
    def cleared(self) -> bool:
        """True when enough rubric points were genuinely made."""
        if not self.available or not self.points:
            return False
        import math

        return self.covered_count >= math.ceil(len(self.points) * PASS_RATIO)


def _retryable_openai_errors() -> tuple[type[BaseException], ...]:
    """Lazy-import OpenAI transient error types for tenacity (ADR 013)."""
    from openai import APIConnectionError, APITimeoutError, InternalServerError, RateLimitError

    return (RateLimitError, APIConnectionError, APITimeoutError, InternalServerError)


def _make_openai_client(*, api_key: Optional[str] = None, timeout: float = 60.0) -> Any:
    """Build OpenAI-compatible client (patch point for unit tests)."""
    return make_openai_client(api_key=api_key, timeout=timeout)


def _log_token_usage(usage: Any, *, component: str) -> None:
    """ADR 013: token telemetry through stdlib logging, not an APM stack."""
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


_SYSTEM_PROMPT = (
    "You mark a student's spoken-style answer against a fixed rubric. "
    "For EACH numbered rubric point decide whether the student's answer actually "
    "makes that point. Judge the substance, not the wording: a correct point made "
    "in different words, or with a paraphrased number, is covered. A point that is "
    "merely gestured at, contradicted, or absent is NOT covered. Do not reward "
    "keywords that appear without the claim attached.\n"
    "Reply with ONLY a JSON object of the form "
    '{"points": [{"index": 0, "covered": true, "evidence": "<exact sentence from '
    'the student answer>", "comment": "<one short sentence, only when not covered>"}], '
    '"feedback": "<two sentences on what is missing or wrong>"} '
    "— one entry per rubric point, in order, and no prose outside the JSON. "
    "The evidence must be copied verbatim from the student's answer, never invented."
)


def _unfence(raw: str) -> str:
    """Strip a ```json fence if the model wrapped its reply in one."""
    text = raw.strip()
    if not text.startswith("```"):
        return text
    text = text.strip("`")
    return text.split("\n", 1)[1] if "\n" in text else text


def _word_count(text: str) -> int:
    return len(text.split())


def grade_answer(*, prompt: str, rubric: list[str], answer: str) -> GradeResult:
    """Mark ``answer`` against ``rubric``, one entailment verdict per point.

    Args:
        prompt: The viva question the learner was answering (marking context).
        rubric: Ordered rubric points, as shown in the SPA.
        answer: The learner's free text.

    Returns:
        A ``GradeResult``. ``available=False`` (with ``reason``) whenever marking
        could not run — Azure unconfigured, a malformed reply, or an error that
        survived the retry budget. Callers must treat that as "not marked", never
        as a fail: the SPA falls back to self-grading and says so.
    """
    if not rubric:
        return GradeResult(available=False, reason="No rubric points to mark against.")
    if _word_count(answer) < MIN_WORDS:
        return GradeResult(
            available=False,
            reason=f"Answer is under {MIN_WORDS} words — too short to mark.",
        )
    if not config.azure_configured:
        return GradeResult(
            available=False,
            reason="Azure OpenAI is not configured, so answers cannot be marked.",
        )

    points = rubric[:_MAX_RUBRIC_POINTS]
    numbered = "\n".join(f"[{i}] {p}" for i, p in enumerate(points))
    user_content = (
        f"QUESTION THE STUDENT WAS ASKED:\n{prompt}\n\n"
        f"RUBRIC POINTS:\n{numbered}\n\n"
        f"STUDENT ANSWER:\n{answer[:_MAX_ANSWER_CHARS]}"
    )
    messages = [
        {"role": "system", "content": _SYSTEM_PROMPT},
        {"role": "user", "content": user_content},
    ]

    try:
        model_name = config.azure_openai_deployment or "gpt-4o-mini"
        # Reasoning models count hidden reasoning tokens inside the limit;
        # 900 can leave no room for the required JSON response.
        limits = chat_limit_params(
            model_name, max_tokens=900, reasoning_max_tokens=2000, temperature=0
        )
        completion = call_with_key_fallback(
            lambda client: _chat_completions_create(
                client,
                model=model_name,
                messages=messages,
                **limits,
            ),
            make_client=_make_openai_client,
            timeout=45.0,
        )
        _log_token_usage(getattr(completion, "usage", None), component="viva_grader")
        payload = json.loads(_unfence(completion.choices[0].message.content or "{}"))
    except Exception as exc:  # noqa: BLE001 — an unmarked answer is not a failed answer
        logger.warning("Viva marking failed (%s); caller falls back to self-grading", exc)
        return GradeResult(
            available=False,
            reason="The marker could not be reached. Falling back to self-grading.",
        )

    return _verdicts_from_payload(payload, points)


def _verdicts_from_payload(payload: Any, points: list[str]) -> GradeResult:
    """Map a model reply onto one verdict per rubric point.

    A point the model omitted or malformed defaults to **not covered**: a marker
    that loses track of a point must not silently award it.
    """
    if not isinstance(payload, dict):
        return GradeResult(available=False, reason="The marker returned an unreadable reply.")

    by_index: dict[int, dict] = {}
    for item in payload.get("points") or []:
        if isinstance(item, dict) and isinstance(item.get("index"), int):
            by_index[item["index"]] = item

    verdicts: list[RubricVerdict] = []
    for i, point in enumerate(points):
        item = by_index.get(i, {})
        verdicts.append(
            RubricVerdict(
                index=i,
                point=point,
                covered=bool(item.get("covered")),
                evidence=str(item.get("evidence") or "")[:400],
                comment=str(item.get("comment") or "")[:300],
            )
        )
    return GradeResult(
        available=True,
        points=verdicts,
        feedback=str(payload.get("feedback") or "")[:800],
    )
