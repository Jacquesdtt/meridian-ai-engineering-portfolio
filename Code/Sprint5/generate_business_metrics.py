"""Generate business metrics for Morgan's Streamlit view.

Processes a sample of training data through the ops model to calculate the
Tailored Cohort (Top 300 by expected-value loss) and Automated Cohort, plus
AUM-at-risk KPIs. Writes JSON for the Streamlit Business View to load.

This is a **demo metrics generator**, not production feature engineering.
Missing raw columns are filled with 0 only so the preprocessor can run on a
partial CSV sample — never treat those zeros as real balances.

Run:
    py -3.13 Code/Sprint5/generate_business_metrics.py
"""
from __future__ import annotations

import json
import logging
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import xgboost as xgb

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from src.serving.model import get_ops_model

DATA_PATH = REPO_ROOT / "Data" / "processed" / "training_data.csv"
OUT_PATH = REPO_ROOT / "Data" / "processed" / "business_metrics.json"

# Tailored cut = the pinned ops threshold from serving_meta.json (t≈0.70055),
# read at runtime so a re-export can never leave this script on a stale value.
# Broader cut for automated messaging (below tailored priority).
AUTOMATED_THRESHOLD = 0.50
MAX_TAILORED = 300


def main() -> None:
    """Score a training sample and write cohort KPIs to ``business_metrics.json``."""
    logger.info("Loading ops model...")
    model = get_ops_model()
    tailored_threshold = model.threshold

    logger.info("Loading sample of training data (50k rows)...")
    # 50k is enough to demonstrate cohorts without loading the full CSV into RAM.
    df = pd.read_csv(DATA_PATH, nrows=50000)

    # Demo-only: fill missing raw columns with 0 so ColumnTransformer can run.
    # Do NOT copy this into submission/FE paths — zeros would poison real scores.
    missing = [c for c in model.raw_feature_cols if c not in df.columns]
    if missing:
        logger.warning(
            "Missing columns %s, filling with 0 for demo purposes only.",
            missing,
        )
        for c in missing:
            df[c] = 0

    logger.info("Scoring dataframe...")
    X = model.preprocess.transform(df)
    dmat = xgb.DMatrix(np.asarray(X), feature_names=model.feature_names)
    df["churn_probability"] = model.booster.predict(dmat)

    # Expected Value ≈ P(churn) × balance — ranks who to call first in Tailored.
    balance_col = (
        "start_balance" if "start_balance" in df.columns else "Running_Balance_Rounded"
    )
    df["expected_value_loss"] = df["churn_probability"] * df[balance_col]

    # 1. Tailored candidates: at/above the strict ops cut.
    high_risk_df = df[df["churn_probability"] >= tailored_threshold].copy()

    # 2. Sort by EV loss and take Top 300 (agent capacity constraint).
    tailored_df = high_risk_df.sort_values(
        by="expected_value_loss", ascending=False
    ).head(MAX_TAILORED)
    tailored_indices = tailored_df.index

    # 3. Automated: above softer cut, excluding anyone already in Tailored.
    automated_df = df[
        (df["churn_probability"] >= AUTOMATED_THRESHOLD)
        & (~df.index.isin(tailored_indices))
    ].copy()

    # Morgan KPI: AUM Hit = sum of balances in each flagged cohort.
    total_aum_tailored = float(tailored_df[balance_col].sum())
    total_aum_automated = float(automated_df[balance_col].sum())
    total_ev_tailored = float(tailored_df["expected_value_loss"].sum())

    logger.info("Tailored Cohort size: %s", len(tailored_df))
    logger.info("Automated Cohort size: %s", len(automated_df))
    logger.info("Tailored AUM at Risk: $%s", f"{total_aum_tailored:,.2f}")

    top_10 = tailored_df.head(10)[
        ["customer_id", "churn_probability", balance_col, "expected_value_loss"]
    ].copy()

    metrics = {
        "scored_rows": len(df),
        "source": f"{DATA_PATH.name} (first {len(df):,} rows)",
        "run_id": model.run_id,
        "tailored_count": len(tailored_df),
        "automated_count": len(automated_df),
        "total_aum_tailored": total_aum_tailored,
        "total_aum_automated": total_aum_automated,
        "total_ev_tailored": total_ev_tailored,
        "tailored_threshold": tailored_threshold,
        "automated_threshold": AUTOMATED_THRESHOLD,
        "top_10_tailored": top_10.to_dict(orient="records"),
    }

    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)

    logger.info("Saved business metrics to %s", OUT_PATH)


if __name__ == "__main__":
    main()
