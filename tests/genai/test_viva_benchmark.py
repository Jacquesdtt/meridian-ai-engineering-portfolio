"""Regression checks for the labelled Explain-it semantic benchmark corpus."""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parents[2]))

from src.genai.viva_grader import MIN_WORDS


CORPUS = Path(__file__).with_name("viva_benchmark.json")
EXPECTED_PROMPTS = {
    "v-calibration": 6,
    "v-learning-rate": 5,
    "v-test-discipline": 6,
    "v-rag-chunking": 7,
}


def test_benchmark_has_positive_and_negative_labels_for_each_new_prompt():
    cases = json.loads(CORPUS.read_text(encoding="utf-8"))
    by_prompt = {}
    for case in cases:
        by_prompt.setdefault(case["prompt_id"], []).append(case)
        assert len(case["answer"].split()) >= MIN_WORDS
        assert len(case["covered"]) == EXPECTED_PROMPTS[case["prompt_id"]]

    assert set(by_prompt) == set(EXPECTED_PROMPTS)
    for prompt_id, prompt_cases in by_prompt.items():
        assert {case["answer_id"] for case in prompt_cases} == {"positive", "negative"}
        assert all(prompt_id == case["prompt_id"] for case in prompt_cases)


def test_gold_labels_are_deliberately_separated():
    cases = json.loads(CORPUS.read_text(encoding="utf-8"))
    for prompt_id in EXPECTED_PROMPTS:
        positive = next(case for case in cases if case["prompt_id"] == prompt_id and case["answer_id"] == "positive")
        negative = next(case for case in cases if case["prompt_id"] == prompt_id and case["answer_id"] == "negative")
        assert all(positive["covered"])
        # A negative answer may accidentally make one narrow point (the
        # calibration sample intentionally says that scores order a queue),
        # but it must not satisfy the whole rubric.
        assert sum(negative["covered"]) < len(negative["covered"])
