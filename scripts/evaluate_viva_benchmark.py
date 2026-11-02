"""Evaluate the live viva marker against the checked-in labelled corpus.

Run from the repository root with ``uv run python scripts/evaluate_viva_benchmark.py``.
The command exits successfully with a clear SKIPPED result when Azure is not
configured; pass ``--require-live`` when a release gate must require a live
semantic-accuracy measurement.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parents[1]))

from src.core.config import config
from src.genai.viva_grader import grade_answer


CORPUS = Path(__file__).parents[1] / "tests" / "genai" / "viva_benchmark.json"
PASS_ACCURACY = 0.8


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--require-live", action="store_true")
    args = parser.parse_args()

    if not config.azure_configured:
        print("SKIPPED: Azure OpenAI is not configured; no semantic accuracy claim was made.")
        return 2 if args.require_live else 0

    cases = json.loads(CORPUS.read_text(encoding="utf-8"))
    prompt_text = {
        "v-calibration": "Why can't you tell an interviewer that a Meridian score of 0.8 means an 80% churn probability?",
        "v-learning-rate": "What happens to XGBoost if you dramatically reduce the learning rate but keep the number of boosting rounds fixed?",
        "v-test-discipline": 'An engineer claims: "Running scoring code twice on the test set invalidates the holdout." How do you correct them?',
        "v-rag-chunking": "Why did returning three chunks in the original RAG design still produce poor retrieval precision?",
    }
    total = covered = 0
    for case in cases:
        # The rubric is carried in the corpus so the benchmark is independent
        # of frontend build tooling and can be run against the live backend.
        result = grade_answer(prompt=prompt_text[case["prompt_id"]], rubric=case["rubric"], answer=case["answer"])
        if not result.available:
            print(f"FAIL: {case['prompt_id']}/{case['answer_id']}: {result.reason}")
            return 1
        expected = case["covered"]
        actual = [point.covered for point in result.points]
        total += len(expected)
        covered += sum(expected_index == actual_index for expected_index, actual_index in zip(expected, actual))
        print(f"{case['prompt_id']}/{case['answer_id']}: {sum(expected_index == actual_index for expected_index, actual_index in zip(expected, actual))}/{len(expected)} labels correct")

    accuracy = covered / total if total else 0.0
    print(f"Semantic label accuracy: {accuracy:.1%} (required {PASS_ACCURACY:.1%})")
    return 0 if accuracy >= PASS_ACCURACY else 1


if __name__ == "__main__":
    sys.exit(main())
