"""Build ``submission_df14.csv`` — May-2020 scores from frozen ``Models/ops/``.

Why this script exists
----------------------
Training / serving used observation months through **2020-04** (ops freeze).
Grading needs probabilities for **active accounts as of 2020-05-31**
(``StartingFiles/submission_sample.csv``). This path re-runs Sprint-1-style
temporal FE for observation month ``t=2020-05`` and scores with the portable
ops booster (ADR 005) — **probabilities only**, never the ops contact threshold.

Window (ADR 004 / ``ML_Anti_Patterns.md``)
-----------------------------------------
* Features: cash-flows and lags available through end of May 2020 only.
* ``gone_this_month`` is the left-looking state of month ``t`` (a feature, not
  the label). The trainer holds June (``t+1``) labels.
* Do **not** apply ``t≈0.701`` here — that cut is for Friction-Gate contact
  policy; the CSV column ``pred_churn`` must stay in ``[0, 1]``.

Run (AppLocker-safe, from repo root)
------------------------------------
::

    set PYTHONPATH=%CD%
    py -3.13 Code\\Sprint3\\create_submission.py
    py -3.13 StartingFiles\\validate_submission.py submission_df14.csv

Optional::

    py -3.13 Code\\Sprint3\\create_submission.py --allow-zero-fill
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import xgboost as xgb

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from Code.Sprint3.submission_helpers import (  # noqa: E402
    assemble_submission,
    assert_feature_cols_match_meta,
    load_raw_feature_cols,
    validate_submission_frame,
)

DATA_DIR = REPO_ROOT / "StartingFiles"
OUT_PATH = REPO_ROOT / "submission_df14.csv"
MODELS_DIR = REPO_ROOT / "Models" / "ops"
META_PATH = MODELS_DIR / "serving_meta.json"
OBS_MONTH = "2020-05"
ROLL_WINDOW = 3


def build_monthly_features(
    customers_df: pd.DataFrame, transactions_df: pd.DataFrame
) -> pd.DataFrame:
    """Customer × month panel with month-``t`` features only (Sprint 1 FE parity).

    Placeholder ``$0`` rows are excluded from *active* counts so inactivity is
    measurable (ADR 004). Lags / rolls use ``shift(1)`` so no ``t+1`` leakage.
    """
    tx = transactions_df.copy()
    cust = customers_df.copy()

    tx["transaction_date"] = pd.to_datetime(tx["transaction_date"])
    tx["Month"] = tx["transaction_date"].dt.to_period("M")
    cust["creation_date"] = pd.to_datetime(cust["creation_date"])
    cust["dob"] = pd.to_datetime(cust["dob"])

    # $0 placeholders pad quiet months — counting them as activity breaks the label.
    zero_mask = (tx["amount"] == 0) & (tx["deposit"] == 0) & (tx["withdrawal"] == 0)
    tx["is_active_tx"] = ~zero_mask

    monthly_tx = tx.groupby(["customer_id", "Month"], as_index=False).agg(
        Monthly_Transaction_Count=("amount", "size"),
        Monthly_Active_Txn_Count=("is_active_tx", "sum"),
        Monthly_Amount_Sum=("amount", "sum"),
        Monthly_Deposit_Sum=("deposit", "sum"),
        Monthly_Withdrawal_Sum=("withdrawal", "sum"),
    )

    cust_cols = cust[["customer_id", "start_balance", "creation_date", "dob", "state"]].copy()
    cust_cols["start_balance"] = cust_cols["start_balance"].fillna(0)
    monthly_tx = monthly_tx.merge(cust_cols, on="customer_id", how="left")
    monthly_tx = monthly_tx.sort_values(["customer_id", "Month"]).reset_index(drop=True)

    monthly_tx["Running_Balance"] = (
        monthly_tx["start_balance"]
        + monthly_tx.groupby("customer_id")["Monthly_Amount_Sum"].cumsum()
    )
    monthly_tx["Running_Balance_Rounded"] = monthly_tx["Running_Balance"].round(0)

    month_end = monthly_tx["Month"].dt.to_timestamp(how="end")
    monthly_tx["Months_Since_Creation"] = (
        (month_end.dt.year - monthly_tx["creation_date"].dt.year) * 12
        + (month_end.dt.month - monthly_tx["creation_date"].dt.month)
    )
    monthly_tx["gone_this_month"] = (
        (monthly_tx["Running_Balance_Rounded"] == 0)
        & (monthly_tx["Monthly_Active_Txn_Count"] == 0)
    ).astype(int)

    g = monthly_tx.groupby("customer_id", sort=False)
    monthly_tx["age_years"] = ((month_end - monthly_tx["dob"]).dt.days / 365.25).astype(
        "float32"
    )

    # Dynamics: prior months only (no t+1).
    monthly_tx["Balance_MoM_Change"] = monthly_tx["Running_Balance"] - g[
        "Running_Balance"
    ].shift(1)
    monthly_tx["Active_Txn_Lag1"] = g["Monthly_Active_Txn_Count"].shift(1)
    monthly_tx["Active_Txn_Lag2"] = g["Monthly_Active_Txn_Count"].shift(2)
    monthly_tx["Active_Txn_Lag3"] = g["Monthly_Active_Txn_Count"].shift(3)
    monthly_tx["Amount_Lag1"] = g["Monthly_Amount_Sum"].shift(1)

    def prior_roll_mean(col: str) -> pd.Series:
        # Vectorized groupby.rolling (same semantics as notebook lambda rolling).
        shifted = g[col].shift(1)
        rolled = (
            shifted.groupby(monthly_tx["customer_id"])
            .rolling(ROLL_WINDOW, min_periods=1)
            .mean()
        )
        return rolled.reset_index(level=0, drop=True)

    monthly_tx["Active_Txn_Roll3_Mean"] = prior_roll_mean("Monthly_Active_Txn_Count")
    monthly_tx["Amount_Roll3_Mean"] = prior_roll_mean("Monthly_Amount_Sum")
    monthly_tx["Balance_Roll3_Mean"] = prior_roll_mean("Running_Balance")

    monthly_tx["Is_Inactive_Month"] = (monthly_tx["Monthly_Active_Txn_Count"] == 0).astype(
        int
    )

    def inactive_streak(s: pd.Series) -> pd.Series:
        """Count consecutive inactive months, resetting when the customer is active.

        Classic streak trick (same as Sprint 1 FE notebook):
        - ``reset`` is True on active months → starts a new group id via cumsum.
        - Within each group of consecutive inactives, cumsum of 1s = streak length.
        - Active months get 0 (not a streak). Why: model needs "how long idle?",
          not a lifetime inactive count that would mix separate dormancy spells.
        """
        is_inactive = s.to_numpy(dtype=bool)
        reset = ~is_inactive
        group_ids = np.cumsum(reset)
        streak = pd.Series(is_inactive.astype(np.int32), index=s.index)
        streak = streak.groupby(group_ids).cumsum()
        return streak.where(is_inactive, 0).astype(np.int32)

    monthly_tx["Consecutive_Inactive_Months"] = g["Is_Inactive_Month"].transform(
        inactive_streak
    )
    monthly_tx["Inactive_Share_Prior3"] = prior_roll_mean("Is_Inactive_Month")

    withdraw_abs = monthly_tx["Monthly_Withdrawal_Sum"].abs()
    flow_denom = monthly_tx["Monthly_Deposit_Sum"] + withdraw_abs
    monthly_tx["Deposit_Share_Of_Flow"] = np.where(
        flow_denom > 0,
        monthly_tx["Monthly_Deposit_Sum"] / flow_denom,
        0.0,
    )
    return monthly_tx


def score_month(
    monthly_tx: pd.DataFrame,
    feature_cols: list[str],
    *,
    month: str = OBS_MONTH,
) -> pd.DataFrame:
    """Score one observation month with frozen preprocessor + booster."""
    cohort = monthly_tx[monthly_tx["Month"].astype(str) == month].copy()
    if cohort.empty:
        raise ValueError(f"No rows for observation month {month}")

    meta = json.loads(META_PATH.read_text(encoding="utf-8"))
    model_feature_names = list(meta["model_feature_names"])

    preprocessor = joblib.load(MODELS_DIR / "preprocessor.joblib")
    booster = xgb.Booster()
    booster.load_model(str(MODELS_DIR / "booster.json"))

    X = cohort[feature_cols]
    X_processed = preprocessor.transform(X)
    # Must match ADR 005 export names (no sklearn cat__/num__ prefixes) — same as serving.
    dmatrix = xgb.DMatrix(np.asarray(X_processed), feature_names=model_feature_names)
    # binary:logistic → probability in [0, 1]; do not threshold for grading CSV.
    cohort["pred_churn"] = booster.predict(dmatrix)
    return cohort


def main(argv: list[str] | None = None) -> int:
    """CLI entry: build May-2020 features, score, write ``submission_df14.csv``.

    Returns 0 on success. Prefer failing loud over ``--allow-zero-fill`` for grading.
    """
    parser = argparse.ArgumentParser(description="Export May-2020 submission probabilities.")
    parser.add_argument(
        "--allow-zero-fill",
        action="store_true",
        help="Fill missing May scores with 0.0 (NOT recommended for grading).",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=OUT_PATH,
        help=f"Output CSV path (default: {OUT_PATH})",
    )
    args = parser.parse_args(argv)

    print("Loading raw data...")
    customers_df = pd.read_csv(DATA_DIR / "customers_tm1_e.csv")
    transactions_df = pd.read_csv(DATA_DIR / "transactions_tm1_e.csv")
    submission_sample = pd.read_csv(DATA_DIR / "submission_sample.csv")

    feature_cols = load_raw_feature_cols(META_PATH)
    # Transition assert: document expected list still matches meta (SUB-FIX-03).
    expected_legacy = [
        "state",
        "age_years",
        "start_balance",
        "Months_Since_Creation",
        "Running_Balance",
        "Running_Balance_Rounded",
        "Monthly_Transaction_Count",
        "Monthly_Active_Txn_Count",
        "Monthly_Amount_Sum",
        "Monthly_Deposit_Sum",
        "Monthly_Withdrawal_Sum",
        "Deposit_Share_Of_Flow",
        "Is_Inactive_Month",
        "gone_this_month",
        "Balance_MoM_Change",
        "Active_Txn_Lag1",
        "Active_Txn_Lag2",
        "Active_Txn_Lag3",
        "Amount_Lag1",
        "Active_Txn_Roll3_Mean",
        "Amount_Roll3_Mean",
        "Balance_Roll3_Mean",
        "Consecutive_Inactive_Months",
        "Inactive_Share_Prior3",
    ]
    assert_feature_cols_match_meta(expected_legacy, feature_cols)

    print("Building monthly features (temporal FE)...")
    monthly_tx = build_monthly_features(customers_df, transactions_df)

    print(f"Scoring observation month {OBS_MONTH}...")
    scored = score_month(monthly_tx, feature_cols, month=OBS_MONTH)

    print("Assembling submission CSV (fail if sample coverage incomplete)...")
    submission = assemble_submission(
        submission_sample,
        scored[["customer_id", "pred_churn"]],
        allow_zero_fill=args.allow_zero_fill,
    )

    meta = json.loads(META_PATH.read_text(encoding="utf-8"))
    ops_t = float(meta["threshold"])
    preds = submission["pred_churn"].to_numpy(dtype=float)
    n_flagged = int((preds >= ops_t).sum())
    print(
        f"pred_churn stats: min={preds.min():.6f} max={preds.max():.6f} "
        f"mean={preds.mean():.6f} | n_flagged_at_ops_threshold(t={ops_t:.4f})={n_flagged} "
        f"(informational only — CSV stores probabilities)"
    )

    errors = validate_submission_frame(submission, submission_sample)
    if errors:
        print("VALIDATION FAILED before write:", file=sys.stderr)
        for err in errors:
            print(f"  - {err}", file=sys.stderr)
        return 1

    submission.to_csv(args.out, index=False)
    print(f"Wrote {args.out} ({len(submission)} rows)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
