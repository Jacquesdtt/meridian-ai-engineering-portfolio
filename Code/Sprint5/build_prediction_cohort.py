"""Build the prediction browser cohort from ``training_data.csv``.

Writes ``Data/processed/prediction_cohort.csv``: one row per customer for one
month, with ``customer_id``, ``Month``, ``Is_Churned`` (the observed label, shown
beside the score) and the model's raw feature columns. No probabilities are
written: the API re-scores every row with the pinned ops model on load, so this
file cannot drift from the served model.

Default month is the latest month in the file (the most "current" book). The
output is gitignored like the rest of ``Data/``.

Run:
    uv run python Code/Sprint5/build_prediction_cohort.py
    uv run python Code/Sprint5/build_prediction_cohort.py --month 2019-12 --max-rows 5000
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

import pandas as pd

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from src.serving.explain import score_rows  # noqa: E402
from src.serving.model import get_ops_model  # noqa: E402
from src.serving.paths import prediction_cohort_path  # noqa: E402

TRAINING_CSV = REPO_ROOT / "Data" / "processed" / "training_data.csv"


def build(
    source: Path, out: Path, *, month: str | None, max_rows: int | None
) -> pd.DataFrame:
    """Select one month of customers and write the raw-feature cohort CSV."""
    model = get_ops_model()
    wanted = ["customer_id", "Month", "Is_Churned", *model.raw_feature_cols]
    header = pd.read_csv(source, nrows=0).columns
    missing = [c for c in model.raw_feature_cols + ["customer_id", "Month"] if c not in header]
    if missing:
        raise SystemExit(f"{source.name} is missing columns: {missing}")

    df = pd.read_csv(source, usecols=[c for c in wanted if c in header])
    df["Month"] = pd.to_datetime(df["Month"]).dt.to_period("M").astype(str)
    chosen = month or df["Month"].max()
    cohort = df[df["Month"] == chosen].copy()
    if cohort.empty:
        raise SystemExit(f"No rows for Month={chosen}. Available: {df['Month'].min()}..{df['Month'].max()}")

    if max_rows and len(cohort) > max_rows:
        # Keep every customer the ops model would queue, then fill with a seeded
        # sample so the browser shows both sides of the threshold.
        probs = score_rows(model, cohort[model.raw_feature_cols].to_dict(orient="records"))
        cohort["_p"] = probs
        flagged = cohort[cohort["_p"] >= model.threshold]
        rest = cohort[cohort["_p"] < model.threshold]
        n_rest = max(0, max_rows - len(flagged))
        cohort = pd.concat([flagged, rest.sample(min(n_rest, len(rest)), random_state=42)])
        cohort = cohort.drop(columns="_p")

    out.parent.mkdir(parents=True, exist_ok=True)
    cohort.to_csv(out, index=False)
    return cohort


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--source", type=Path, default=TRAINING_CSV)
    parser.add_argument("--out", type=Path, default=None)
    parser.add_argument("--month", default=None, help="YYYY-MM; default = latest month")
    parser.add_argument("--max-rows", type=int, default=None)
    args = parser.parse_args()

    if not args.source.exists():
        print(
            f"ERROR: {args.source} not found. Run Code/Sprint1/02_feature_engineering.ipynb first.",
            file=sys.stderr,
        )
        return 1
    out = args.out or prediction_cohort_path()
    cohort = build(args.source, out, month=args.month, max_rows=args.max_rows)
    print(f"Wrote {len(cohort):,} customers for Month={cohort['Month'].iloc[0]} to {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
