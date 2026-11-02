"""Marking for Explain-it answers (ADR-EDU-003).

The behaviour that matters here is what happens when marking goes wrong: an
unmarked answer must never be reported as a failed one, and a marker that loses
track of a rubric point must not silently award it.
"""
from __future__ import annotations

import json
from types import SimpleNamespace

import pytest

from src.genai import viva_grader
from src.genai.viva_grader import GradeResult, grade_answer

RUBRIC = [
    "Label is month t+1; features stop at month t",
    "Lags and rolls are shifted before rolling",
    "Chronological split, no shuffling, no CV folds",
    "Threshold chosen on validation only; test used once",
]

ANSWER = (
    "The label is the state of the following month, so every feature is computed from "
    "month t or earlier and the lag and rolling columns are shifted before they are "
    "rolled. We split the data by time rather than shuffling it, and there are no "
    "cross-validation folds at all. The threshold came off the validation window and "
    "was frozen before we touched the test months even once."
)


def _completion(payload: dict) -> SimpleNamespace:
    return SimpleNamespace(
        choices=[SimpleNamespace(message=SimpleNamespace(content=json.dumps(payload)))],
        usage=SimpleNamespace(prompt_tokens=10, completion_tokens=20, total_tokens=30),
    )


def _set_azure_configured(monkeypatch, value: bool) -> None:
    """``Settings.azure_configured`` is a read-only property — patch it on the class."""
    monkeypatch.setattr(
        type(viva_grader.config), "azure_configured", property(lambda self: value)
    )


def _patch_azure(monkeypatch, completion):
    _set_azure_configured(monkeypatch, True)
    monkeypatch.setattr(
        viva_grader.config, "azure_openai_deployment", "gpt-4o-mini", raising=False
    )
    monkeypatch.setattr(viva_grader, "_make_openai_client", lambda **kw: object())
    monkeypatch.setattr(
        viva_grader,
        "call_with_key_fallback",
        lambda operation, **kw: completion if not callable(completion) else completion(),
    )


def test_marks_each_rubric_point_with_evidence(monkeypatch):
    payload = {
        "points": [
            {"index": i, "covered": True, "evidence": f"sentence {i}"} for i in range(4)
        ],
        "feedback": "Complete.",
    }
    _patch_azure(monkeypatch, _completion(payload))

    result = grade_answer(prompt="Leakage?", rubric=RUBRIC, answer=ANSWER)

    assert result.available is True
    assert result.covered_count == 4
    assert result.cleared is True
    assert [p.point for p in result.points] == RUBRIC
    assert result.points[0].evidence == "sentence 0"


def test_pass_ratio_is_enforced(monkeypatch):
    """4 points at 0.8 needs all 4 — three covered is not cleared."""
    payload = {
        "points": [{"index": i, "covered": i < 3, "evidence": ""} for i in range(4)],
        "feedback": "One point missing.",
    }
    _patch_azure(monkeypatch, _completion(payload))

    result = grade_answer(prompt="Leakage?", rubric=RUBRIC, answer=ANSWER)

    assert result.covered_count == 3
    assert result.cleared is False


def test_omitted_point_defaults_to_not_covered(monkeypatch):
    """A marker that drops a point must not hand the learner a free pass."""
    payload = {"points": [{"index": 0, "covered": True, "evidence": "x"}], "feedback": ""}
    _patch_azure(monkeypatch, _completion(payload))

    result = grade_answer(prompt="Leakage?", rubric=RUBRIC, answer=ANSWER)

    assert len(result.points) == len(RUBRIC)
    assert result.covered_count == 1
    assert all(p.covered is False for p in result.points[1:])
    assert result.cleared is False


def test_unconfigured_azure_is_unavailable_not_failed(monkeypatch):
    _set_azure_configured(monkeypatch, False)

    result = grade_answer(prompt="Leakage?", rubric=RUBRIC, answer=ANSWER)

    assert result.available is False
    assert result.cleared is False
    assert "not configured" in result.reason
    assert result.points == []


def test_azure_error_degrades_to_unavailable(monkeypatch):
    def _boom(operation, **kw):
        raise RuntimeError("429 after retries")

    _set_azure_configured(monkeypatch, True)
    monkeypatch.setattr(viva_grader, "_make_openai_client", lambda **kw: object())
    monkeypatch.setattr(viva_grader, "call_with_key_fallback", _boom)

    result = grade_answer(prompt="Leakage?", rubric=RUBRIC, answer=ANSWER)

    assert result.available is False
    assert "could not be reached" in result.reason


def test_malformed_reply_is_unavailable(monkeypatch):
    bad = SimpleNamespace(
        choices=[SimpleNamespace(message=SimpleNamespace(content="not json at all"))],
        usage=None,
    )
    _patch_azure(monkeypatch, bad)

    result = grade_answer(prompt="Leakage?", rubric=RUBRIC, answer=ANSWER)

    assert result.available is False


def test_fenced_json_is_accepted(monkeypatch):
    payload = {"points": [{"index": i, "covered": True} for i in range(4)], "feedback": ""}
    fenced = SimpleNamespace(
        choices=[
            SimpleNamespace(message=SimpleNamespace(content=f"```json\n{json.dumps(payload)}\n```"))
        ],
        usage=None,
    )
    _patch_azure(monkeypatch, fenced)

    result = grade_answer(prompt="Leakage?", rubric=RUBRIC, answer=ANSWER)

    assert result.available is True
    assert result.covered_count == 4


def test_short_answer_is_rejected_before_any_azure_call(monkeypatch):
    def _never(*a, **kw):  # pragma: no cover - must not run
        raise AssertionError("Azure must not be called for a too-short answer")

    _set_azure_configured(monkeypatch, True)
    monkeypatch.setattr(viva_grader, "call_with_key_fallback", _never)

    result = grade_answer(prompt="Leakage?", rubric=RUBRIC, answer="Too short.")

    assert result.available is False
    assert str(viva_grader.MIN_WORDS) in result.reason


def test_empty_rubric_is_unavailable():
    result = grade_answer(prompt="Leakage?", rubric=[], answer=ANSWER)
    assert result.available is False


@pytest.mark.parametrize(
    ("covered", "total", "expected"),
    [(8, 10, True), (7, 10, False), (4, 4, True), (3, 4, False)],
)
def test_cleared_threshold_matches_spa_pass_ratio(covered, total, expected):
    """0.8 rounded up — the SPA uses the same rule so the two never disagree."""
    points = [
        {"index": i, "point": f"p{i}", "covered": i < covered, "evidence": ""}
        for i in range(total)
    ]
    assert GradeResult(available=True, points=points).cleared is expected
