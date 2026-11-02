"""Validate a Meridian churn ``submission_*.csv`` against ``submission_sample.csv``.

The submission guide advertises this script for pre-submit sanity checks
(schema, row count, probability bounds). It does **not** score against
held-out labels — those are held by the trainer.

Usage (from repo root, AppLocker-safe)::

    py -3.13 StartingFiles\\validate_submission.py submission_df14.csv
    py -3.13 StartingFiles\\validate_submission.py path\\to\\submission.csv --sample StartingFiles\\submission_sample.csv
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

import pandas as pd

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))

from Code.Sprint3.submission_helpers import validate_submission_frame  # noqa: E402


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Validate Meridian submission CSV schema.")
    parser.add_argument(
        "submission",
        type=Path,
        help="Path to submission_<team>.csv (e.g. submission_df14.csv)",
    )
    parser.add_argument(
        "--sample",
        type=Path,
        default=REPO_ROOT / "StartingFiles" / "submission_sample.csv",
        help="Path to submission_sample.csv",
    )
    args = parser.parse_args(argv)

    if not args.submission.exists():
        print(f"ERROR: submission not found: {args.submission}", file=sys.stderr)
        return 1
    if not args.sample.exists():
        print(f"ERROR: sample not found: {args.sample}", file=sys.stderr)
        return 1

    submission = pd.read_csv(args.submission)
    sample = pd.read_csv(args.sample)
    errors = validate_submission_frame(submission, sample)
    if errors:
        print("VALIDATION FAILED:", file=sys.stderr)
        for err in errors:
            print(f"  - {err}", file=sys.stderr)
        return 1

    print(
        f"OK: {args.submission.name} matches sample schema "
        f"({len(submission)} rows, pred_churn in [0, 1], date=2020-05-31)."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
