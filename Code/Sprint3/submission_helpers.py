"""Submission CSV helpers for Meridian grading export (ADR 004 / ADR 005).

Pure functions used by ``create_submission.py`` and ``StartingFiles/validate_submission.py``.
Kept free of FE / XGBoost so unit tests stay fast.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Sequence

import pandas as pd

REQUIRED_COLUMNS: list[str] = ["customer_id", "account_id", "date", "pred_churn"]
EXPECTED_DATE = "2020-05-31"


def load_raw_feature_cols(meta_path: Path | str) -> list[str]:
    """Load ops ``raw_feature_cols`` from ADR 005 ``serving_meta.json``.

    Args:
        meta_path: Path to ``Models/ops/serving_meta.json``.

    Returns:
        Ordered list of raw feature names expected by the frozen preprocessor.

    Raises:
        ValueError: If ``raw_feature_cols`` is missing or empty.
    """
    path = Path(meta_path)
    meta = json.loads(path.read_text(encoding="utf-8"))
    cols = meta.get("raw_feature_cols")
    if not isinstance(cols, list) or not cols:
        raise ValueError(f"raw_feature_cols missing or empty in {path}")
    return list(cols)


def validate_submission_frame(
    submission: pd.DataFrame,
    sample: pd.DataFrame,
    *,
    expected_date: str = EXPECTED_DATE,
) -> list[str]:
    """Return human-readable errors if *submission* fails the grading schema.

    Checks column names/order, row count, date, probability bounds, and that
    ``customer_id`` / ``account_id`` match the sample row order exactly.
    """
    errors: list[str] = []

    actual_cols = list(submission.columns)
    if actual_cols != REQUIRED_COLUMNS:
        errors.append(
            f"column names/order mismatch: expected {REQUIRED_COLUMNS}, got {actual_cols}"
        )

    if len(submission) != len(sample):
        errors.append(
            f"row count mismatch: submission has {len(submission)}, sample has {len(sample)}"
        )

    if "date" in submission.columns:
        dates = submission["date"].astype(str)
        bad_dates = int((dates != expected_date).sum())
        if bad_dates:
            errors.append(
                f"date: {bad_dates} row(s) are not {expected_date} "
                f"(unique={sorted(dates.unique().tolist())[:5]})"
            )

    if "pred_churn" in submission.columns:
        preds = pd.to_numeric(submission["pred_churn"], errors="coerce")
        n_nan = int(preds.isna().sum())
        if n_nan:
            errors.append(f"pred_churn: {n_nan} non-finite / NaN value(s)")
        if n_nan < len(preds):
            finite = preds.dropna()
            n_oob = int(((finite < 0.0) | (finite > 1.0)).sum())
            if n_oob:
                errors.append(
                    f"pred_churn: {n_oob} value(s) outside [0, 1] "
                    f"(min={float(finite.min())}, max={float(finite.max())})"
                )

    # Identity: only when lengths already match and columns present.
    if len(submission) == len(sample):
        for col in ("customer_id", "account_id"):
            if col not in submission.columns or col not in sample.columns:
                continue
            if not submission[col].astype(str).equals(sample[col].astype(str)):
                errors.append(
                    f"{col}: sequence does not match submission_sample row order"
                )

    return errors


def assemble_submission(
    sample: pd.DataFrame,
    preds: pd.DataFrame,
    *,
    allow_zero_fill: bool = False,
) -> pd.DataFrame:
    """Left-join May scores onto the grading sample; fail if coverage is incomplete.

    Why fail by default: ``fillna(0.0)`` invents a “definitely stay” score for
    missing customers, which silently poisons grading rows (SUB-01).

    Args:
        sample: ``submission_sample.csv`` frame (defines cohort + ``account_id``).
        preds: Must contain ``customer_id`` and ``pred_churn`` (probabilities).
        allow_zero_fill: Opt-in only; fills missing preds with 0.0.

    Returns:
        Frame with ``REQUIRED_COLUMNS`` in sample row order.

    Raises:
        ValueError: Duplicate sample customers, or missing May preds without fill.
    """
    if sample["customer_id"].duplicated().any():
        n_dup = int(sample["customer_id"].duplicated().sum())
        raise ValueError(
            f"submission_sample has {n_dup} duplicate customer_id row(s); "
            "merge-on-customer_id would mis-assign account_id"
        )

    pred_cols = preds[["customer_id", "pred_churn"]].drop_duplicates(
        subset=["customer_id"], keep="last"
    )
    base = sample.drop(columns=["pred_churn"], errors="ignore").copy()
    out = base.merge(pred_cols, on="customer_id", how="left")

    missing_mask = out["pred_churn"].isna()
    n_missing = int(missing_mask.sum())
    if n_missing and not allow_zero_fill:
        missing_ids = out.loc[missing_mask, "customer_id"].head(10).tolist()
        raise ValueError(
            f"missing May-2020 scores for {n_missing} sample customer(s); "
            f"examples={missing_ids}. Re-run FE or pass allow_zero_fill=True "
            "(not recommended for grading)."
        )
    if n_missing and allow_zero_fill:
        out["pred_churn"] = out["pred_churn"].fillna(0.0)

    # Preserve sample column order exactly.
    return out[REQUIRED_COLUMNS].reset_index(drop=True)


def assert_feature_cols_match_meta(
    feature_cols: Sequence[str], meta_cols: Sequence[str]
) -> None:
    """Raise if hardcoded FE cols drift from serving_meta (transition assert)."""
    if list(feature_cols) != list(meta_cols):
        only_fe = [c for c in feature_cols if c not in meta_cols]
        only_meta = [c for c in meta_cols if c not in feature_cols]
        raise ValueError(
            "FEATURE_COLS drifted from serving_meta.raw_feature_cols: "
            f"only_in_fe={only_fe} only_in_meta={only_meta}"
        )
