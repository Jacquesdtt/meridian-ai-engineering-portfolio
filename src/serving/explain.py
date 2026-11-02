"""Per-customer SHAP explanations for the ops model (brief: "SHAP explanations per customer").

Uses XGBoost's built-in TreeSHAP (``Booster.predict(pred_contribs=True)``): exact
Shapley values for tree ensembles, with no extra ``shap`` dependency in the
serving image. Values are in **log-odds** (margin) units, so

    base_value + sum(contributions) == logit(churn_probability)

holds exactly. The one-hot ``state_*`` columns are summed back into one ``state``
contribution, so the explanation lists the 24 raw features a person recognises,
not 80 encoded columns.
"""
from __future__ import annotations

import math
from typing import Any

import numpy as np
import pandas as pd
import xgboost as xgb

from src.serving.model import OpsModel
from src.serving.schemas import ExplainResponse, FeatureContribution


def json_safe(value: Any) -> Any:
    """Native Python scalar; NaN → None (JSON has no NaN; XGBoost scores it as missing)."""
    if hasattr(value, "item"):
        value = value.item()
    if isinstance(value, float) and math.isnan(value):
        return None
    return value


def _encode(model: OpsModel, rows: list[dict[str, Any]]) -> xgb.DMatrix:
    cols = model.raw_feature_cols
    missing = sorted({c for row in rows for c in cols if c not in row})
    if missing:
        raise KeyError(f"Missing feature columns: {missing}")
    frame = pd.DataFrame([{c: row[c] for c in cols} for row in rows])
    X = model.preprocess.transform(frame)
    return xgb.DMatrix(np.asarray(X), feature_names=model.feature_names)


def score_rows(model: OpsModel, rows: list[dict[str, Any]]) -> np.ndarray:
    """Vectorised probabilities for many raw rows (prediction browser load)."""
    if not rows:
        return np.zeros(0)
    return model.booster.predict(_encode(model, rows))


def _raw_feature_for(model: OpsModel, encoded_name: str) -> str:
    """Map an encoded column (``state_Texas``) back to its raw feature (``state``)."""
    for cat in model.meta.get("cat_cols") or []:
        if encoded_name.startswith(f"{cat}_"):
            return cat
    return encoded_name


def explain_raw_features(
    model: OpsModel, row: dict[str, Any], *, top_n: int | None = None
) -> ExplainResponse:
    """TreeSHAP breakdown of one customer's score, grouped by raw feature.

    ``top_n`` keeps the largest |SHAP| features and folds the rest into
    ``other_contribution`` so the sum identity still holds.
    """
    dmat = _encode(model, [row])
    contribs = model.booster.predict(dmat, pred_contribs=True)[0]
    prob = float(model.booster.predict(dmat)[0])
    base_value = float(contribs[-1])  # last column is the bias term

    grouped: dict[str, float] = {}
    for name, value in zip(model.feature_names, contribs[:-1]):
        raw = _raw_feature_for(model, name)
        grouped[raw] = grouped.get(raw, 0.0) + float(value)

    ranked = sorted(grouped.items(), key=lambda kv: abs(kv[1]), reverse=True)
    keep = ranked if top_n is None else ranked[:top_n]
    other = float(sum(v for _, v in ranked[len(keep):]))

    contributions = [
        FeatureContribution(feature=name, value=json_safe(row.get(name)), shap=value)
        for name, value in keep
    ]
    margin = base_value + sum(grouped.values())
    return ExplainResponse(
        churn_probability=prob,
        flagged=prob >= model.threshold,
        threshold=model.threshold,
        threshold_logit=math.log(model.threshold / (1.0 - model.threshold)),
        run_id=model.run_id,
        base_value=base_value,
        margin=margin,
        contributions=contributions,
        other_contribution=other,
    )
