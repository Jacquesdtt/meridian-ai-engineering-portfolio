"""Unit tests for the OpsModel wrapper."""
from __future__ import annotations

import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import pytest
import xgboost as xgb
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder

from src.serving.model import load_ops_model, reset_ops_model, score_raw_features


@pytest.fixture()
def tiny_ops_dir(tmp_path: Path) -> Path:
    """Minimal portable ops export for isolated tests (no MLflow)."""
    cat_cols = ["state"]
    num_cols = ["x"]
    raw_cols = cat_cols + num_cols
    df = pd.DataFrame({"state": ["CA", "NY", "CA", "TX"], "x": [0.0, 1.0, 0.5, 2.0]})
    y = np.array([0, 1, 0, 1])
    preprocess = ColumnTransformer(
        [
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), cat_cols),
            ("num", "passthrough", num_cols),
        ]
    )
    X = preprocess.fit_transform(df)
    ohe = preprocess.named_transformers_["cat"]
    names = list(ohe.get_feature_names_out(cat_cols)) + num_cols
    dtrain = xgb.DMatrix(X, label=y, feature_names=names)
    booster = xgb.train(
        {"max_depth": 2, "eta": 0.5, "objective": "binary:logistic", "verbosity": 0},
        dtrain,
        num_boost_round=20,
    )
    threshold = 0.3
    meta = {
        "run_id": "test-run-tiny",
        "threshold": threshold,
        "threshold_rule": "test_threshold",
        "model_feature_names": names,
        "raw_feature_cols": raw_cols,
        "num_cols": num_cols,
        "cat_cols": cat_cols,
        "top_shap": {"x": 1.0},
    }
    ops = tmp_path / "ops"
    ops.mkdir()
    booster.save_model(str(ops / "booster.json"))
    joblib.dump(preprocess, ops / "preprocessor.joblib")
    (ops / "serving_meta.json").write_text(json.dumps(meta), encoding="utf-8")
    return ops


def test_load_ops_model(tiny_ops_dir: Path):
    reset_ops_model()
    model = load_ops_model(tiny_ops_dir, force=True)
    assert model.run_id == "test-run-tiny"
    assert model.threshold == 0.3
    assert model.threshold_rule == "test_threshold"
    assert "state" in model.raw_feature_cols
    assert "x" in model.raw_feature_cols
    assert model.top_shap_drivers == ["x"]


def test_score_raw_features(tiny_ops_dir: Path):
    reset_ops_model()
    model = load_ops_model(tiny_ops_dir, force=True)
    
    # Missing columns should raise KeyError
    with pytest.raises(KeyError) as exc_info:
        score_raw_features(model, {"state": "CA"})
    assert "Missing feature columns" in str(exc_info.value)
    
    # Valid row below threshold
    prob_low, flagged_low = score_raw_features(model, {"state": "CA", "x": 0.0})
    assert 0.0 <= prob_low <= 1.0
    
    # Valid row above threshold
    prob_high, flagged_high = score_raw_features(model, {"state": "NY", "x": 2.0})
    assert 0.0 <= prob_high <= 1.0
    
    # At least one should be properly flagged or not flagged based on probability vs threshold
    assert flagged_low == (prob_low >= 0.3)
    assert flagged_high == (prob_high >= 0.3)

def test_ops_model_properties_match(tiny_ops_dir: Path):
    reset_ops_model()
    model = load_ops_model(tiny_ops_dir, force=True)
    # Validate feature alignment
    assert len(model.feature_names) == int(model.booster.num_features())
