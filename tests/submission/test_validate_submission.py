"""TDD: submission CSV schema helpers + ADR 005 feature-col loader (SUB-FIX-06)."""
from __future__ import annotations

import json
from pathlib import Path

import pandas as pd
import pytest

from Code.Sprint3.submission_helpers import (
    REQUIRED_COLUMNS,
    assemble_submission,
    load_raw_feature_cols,
    validate_submission_frame,
)


def _sample_frame() -> pd.DataFrame:
    return pd.DataFrame(
        {
            "customer_id": [1, 2, 3],
            "account_id": [10, 20, 30],
            "date": ["2020-05-31", "2020-05-31", "2020-05-31"],
            "pred_churn": [0.5, 0.5, 0.5],
        }
    )


def test_required_columns_order() -> None:
    assert REQUIRED_COLUMNS == ["customer_id", "account_id", "date", "pred_churn"]


def test_validate_ok_matches_sample() -> None:
    sample = _sample_frame()
    sub = sample.copy()
    sub["pred_churn"] = [0.1, 0.9, 0.0]
    errors = validate_submission_frame(sub, sample)
    assert errors == []


def test_validate_rejects_wrong_columns() -> None:
    sample = _sample_frame()
    bad = sample.rename(columns={"pred_churn": "churn_probability"})
    errors = validate_submission_frame(bad, sample)
    assert any("column" in e.lower() for e in errors)


def test_validate_rejects_rowcount_mismatch() -> None:
    sample = _sample_frame()
    short = sample.iloc[:2].copy()
    errors = validate_submission_frame(short, sample)
    assert any("row" in e.lower() for e in errors)


def test_validate_rejects_bad_date() -> None:
    sample = _sample_frame()
    bad = sample.copy()
    bad.loc[1, "date"] = "2020-04-30"
    errors = validate_submission_frame(bad, sample)
    assert any("date" in e.lower() for e in errors)


def test_validate_rejects_pred_outside_unit_interval() -> None:
    sample = _sample_frame()
    bad = sample.copy()
    bad.loc[0, "pred_churn"] = 1.5
    errors = validate_submission_frame(bad, sample)
    assert any("pred_churn" in e.lower() for e in errors)


def test_validate_rejects_nan_pred() -> None:
    sample = _sample_frame()
    bad = sample.copy()
    bad.loc[2, "pred_churn"] = float("nan")
    errors = validate_submission_frame(bad, sample)
    assert any("pred_churn" in e.lower() or "nan" in e.lower() for e in errors)


def test_validate_rejects_identity_drift() -> None:
    sample = _sample_frame()
    bad = sample.copy()
    bad.loc[0, "account_id"] = 999
    errors = validate_submission_frame(bad, sample)
    assert any("account_id" in e.lower() for e in errors)


def test_assemble_fails_loudly_on_missing_may_rows() -> None:
    sample = _sample_frame()
    preds = pd.DataFrame({"customer_id": [1, 2], "pred_churn": [0.2, 0.3]})
    with pytest.raises(ValueError, match="missing May-2020"):
        assemble_submission(sample, preds, allow_zero_fill=False)


def test_assemble_preserves_sample_order_and_ids() -> None:
    sample = _sample_frame()
    preds = pd.DataFrame(
        {"customer_id": [3, 1, 2], "pred_churn": [0.9, 0.1, 0.2]}
    )
    out = assemble_submission(sample, preds, allow_zero_fill=False)
    assert list(out["customer_id"]) == list(sample["customer_id"])
    assert list(out["account_id"]) == list(sample["account_id"])
    assert list(out["date"]) == list(sample["date"])
    assert list(out["pred_churn"]) == [0.1, 0.2, 0.9]


def test_assemble_zero_fill_opt_in() -> None:
    sample = _sample_frame()
    preds = pd.DataFrame({"customer_id": [1], "pred_churn": [0.4]})
    out = assemble_submission(sample, preds, allow_zero_fill=True)
    assert out.loc[out["customer_id"] == 1, "pred_churn"].iloc[0] == 0.4
    assert out.loc[out["customer_id"] == 2, "pred_churn"].iloc[0] == 0.0


def test_load_raw_feature_cols_from_meta(tmp_path: Path) -> None:
    meta = {
        "raw_feature_cols": ["state", "age_years", "gone_this_month"],
        "threshold": 0.7,
    }
    path = tmp_path / "serving_meta.json"
    path.write_text(json.dumps(meta), encoding="utf-8")
    cols = load_raw_feature_cols(path)
    assert cols == ["state", "age_years", "gone_this_month"]


def test_load_raw_feature_cols_rejects_empty(tmp_path: Path) -> None:
    path = tmp_path / "serving_meta.json"
    path.write_text(json.dumps({"raw_feature_cols": []}), encoding="utf-8")
    with pytest.raises(ValueError, match="raw_feature_cols"):
        load_raw_feature_cols(path)
