"""Tests for per-model chat kwargs (gpt-5 deployments reject ``max_tokens``)."""
from __future__ import annotations

import pytest

from src.genai.azure_client import chat_limit_params


@pytest.mark.parametrize("model", ["gpt-5-mini", "GPT-5", "o3-mini", "o4-mini"])
def test_reasoning_models_get_completion_budget_and_no_temperature(model):
    params = chat_limit_params(model, max_tokens=400, reasoning_max_tokens=2000, temperature=0)
    assert params == {"max_completion_tokens": 2000}


def test_classic_models_keep_max_tokens_and_temperature():
    params = chat_limit_params("gpt-4o-mini", max_tokens=400, reasoning_max_tokens=2000, temperature=0)
    assert params == {"max_tokens": 400, "temperature": 0}


def test_temperature_omitted_when_not_requested():
    assert chat_limit_params("gpt-4o-mini", max_tokens=500, reasoning_max_tokens=2500) == {
        "max_tokens": 500
    }
