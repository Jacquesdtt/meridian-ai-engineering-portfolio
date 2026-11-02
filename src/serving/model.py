"""Load XGBoost booster + sklearn preprocessor from Models/ops/."""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.compose import ColumnTransformer

from src.serving.paths import load_serving_meta, ops_dir


@dataclass
class OpsModel:
    """In-memory ops model: preprocessor, booster, and frozen meta."""

    preprocess: ColumnTransformer
    booster: xgb.Booster
    meta: dict[str, Any]
    ops_path: Path

    @property
    def threshold(self) -> float:
        return float(self.meta["threshold"])

    @property
    def run_id(self) -> str:
        return str(self.meta["run_id"])

    @property
    def threshold_rule(self) -> str:
        return str(self.meta["threshold_rule"])

    @property
    def feature_names(self) -> list[str]:
        return list(self.meta["model_feature_names"])

    @property
    def raw_feature_cols(self) -> list[str]:
        return list(self.meta["raw_feature_cols"])

    @property
    def top_shap_drivers(self) -> list[str]:
        top = self.meta.get("top_shap") or {}
        return list(top.keys())


_MODEL: OpsModel | None = None


def load_ops_model(ops_path: Path | None = None, *, force: bool = False) -> OpsModel:
    """Load (or return cached) portable ops model.

    Refuses to start if booster feature count != len(model_feature_names).
    """
    global _MODEL
    if _MODEL is not None and not force and ops_path is None:
        return _MODEL

    root = ops_path or ops_dir()
    meta = load_serving_meta(str(root))
    booster_path = root / "booster.json"
    prep_path = root / "preprocessor.joblib"
    if not booster_path.exists() or not prep_path.exists():
        raise FileNotFoundError(
            f"Missing booster/preprocessor under {root}. "
            "Run: py -3.13 Code\\Sprint3\\export_ops_model.py"
        )

    booster = xgb.Booster()
    booster.load_model(str(booster_path))
    preprocess: ColumnTransformer = joblib.load(prep_path)

    names = list(meta["model_feature_names"])
    n_boost = int(booster.num_features())
    if n_boost != len(names):
        raise RuntimeError(
            f"Feature mismatch: booster has {n_boost} features, "
            f"serving_meta lists {len(names)}. Re-export Models/ops/."
        )

    model = OpsModel(preprocess=preprocess, booster=booster, meta=meta, ops_path=root)
    _MODEL = model
    return model


def get_ops_model() -> OpsModel:
    """Lazy getter for FastAPI handlers / Streamlit (lifespan may not have run)."""
    global _MODEL
    if _MODEL is None:
        _MODEL = load_ops_model()
    return _MODEL


def reset_ops_model() -> None:
    """Clear cached model (tests)."""
    global _MODEL
    _MODEL = None


def score_raw_features(model: OpsModel, row: dict[str, Any]) -> tuple[float, bool]:
    """Transform one raw feature dict and return (probability, flagged).

    Missing raw columns raise KeyError; caller should map to HTTP 422.
    """
    cols = model.raw_feature_cols
    missing = [c for c in cols if c not in row]
    if missing:
        raise KeyError(f"Missing feature columns: {missing}")

    frame = pd.DataFrame([{c: row[c] for c in cols}])
    X = model.preprocess.transform(frame)
    dmat = xgb.DMatrix(np.asarray(X), feature_names=model.feature_names)
    prob = float(model.booster.predict(dmat)[0])
    flagged = prob >= model.threshold
    return prob, flagged
