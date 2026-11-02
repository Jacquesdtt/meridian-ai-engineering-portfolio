"""Scored customer cohort behind the prediction browser (brief: Sam's ML pages).

Source, in order:
1. ``Data/processed/prediction_cohort.csv`` (``PREDICTION_COHORT_PATH``), written by
   ``Code/Sprint5/build_prediction_cohort.py`` from the gitignored
   ``training_data.csv``. It holds raw features only.
2. Otherwise the two committed Sprint 4 demo fixtures, labelled as such, so a clean
   clone or the container still has something to browse.

Probabilities are always computed here from the raw features with the pinned ops
model. A probability column in the file is ignored, so a stale export cannot show
scores from a different run.
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional

import pandas as pd

from src.serving.explain import score_rows
from src.serving.model import OpsModel
from src.serving.paths import REPO_ROOT, prediction_cohort_path

FIXTURES_DIR = REPO_ROOT / "Docs" / "Sprint4" / "fixtures"
_FIXTURE_FILES = ("flagged_demo.json", "below_threshold_demo.json")


@dataclass(frozen=True)
class ScoredCustomer:
    customer_id: str
    month: Optional[str]
    churn_probability: float
    flagged: bool
    rank: int
    actual_churned: Optional[int]
    features: dict[str, Any]


@dataclass(frozen=True)
class Cohort:
    source: str
    is_fixture: bool
    month: Optional[str]
    rows: tuple[ScoredCustomer, ...]  # highest probability first

    @property
    def flagged_total(self) -> int:
        return sum(1 for r in self.rows if r.flagged)

    def get(self, customer_id: str) -> ScoredCustomer:
        for r in self.rows:
            if r.customer_id == customer_id:
                return r
        raise KeyError(customer_id)


_CACHE: dict[tuple, Cohort] = {}


def _records_from_csv(path: Path, model: OpsModel) -> tuple[list[dict[str, Any]], Optional[str]]:
    df = pd.read_csv(path)
    missing = [c for c in model.raw_feature_cols if c not in df.columns]
    if missing:
        raise ValueError(f"{path.name} is missing feature columns: {missing}")
    if "customer_id" not in df.columns:
        raise ValueError(f"{path.name} has no customer_id column")
    months = sorted(df["Month"].astype(str).unique()) if "Month" in df.columns else []
    records = []
    for rec in df.to_dict(orient="records"):
        records.append(
            {
                "customer_id": str(rec["customer_id"]),
                "month": str(rec["Month"]) if "Month" in rec else None,
                "actual_churned": (
                    int(rec["Is_Churned"])
                    if "Is_Churned" in rec and pd.notna(rec["Is_Churned"])
                    else None
                ),
                "features": {c: rec[c] for c in model.raw_feature_cols},
            }
        )
    month = months[0] if len(months) == 1 else (f"{months[0]}..{months[-1]}" if months else None)
    return records, month


def _records_from_fixtures(model: OpsModel) -> list[dict[str, Any]]:
    records = []
    for name in _FIXTURE_FILES:
        path = FIXTURES_DIR / name
        if not path.exists():
            continue
        payload = json.loads(path.read_text(encoding="utf-8"))
        feats = payload.get("features", payload)
        if any(c not in feats for c in model.raw_feature_cols):
            continue  # fixture does not match this model (e.g. tests' tiny model)
        records.append(
            {
                "customer_id": f"fixture:{payload.get('demo_id', path.stem)}",
                "month": None,
                "actual_churned": None,
                "features": {c: feats[c] for c in model.raw_feature_cols},
            }
        )
    return records


def load_cohort(model: OpsModel) -> Cohort:
    """Return the scored cohort, re-reading the CSV only when it changes."""
    path = prediction_cohort_path()
    mtime = path.stat().st_mtime if path.exists() else None
    key = (str(path), mtime, model.run_id, id(model))
    if key in _CACHE:
        return _CACHE[key]

    if mtime is not None:
        records, month = _records_from_csv(path, model)
        source = f"{path.name} ({len(records):,} customers)"
        is_fixture = False
    else:
        records, month = _records_from_fixtures(model), None
        source = (
            "Sprint 4 demo fixtures only: build Data/processed/prediction_cohort.csv "
            "with Code/Sprint5/build_prediction_cohort.py to browse real customers"
        )
        is_fixture = True

    probs = score_rows(model, [r["features"] for r in records])
    order = sorted(range(len(records)), key=lambda i: float(probs[i]), reverse=True)
    rows = tuple(
        ScoredCustomer(
            customer_id=records[i]["customer_id"],
            month=records[i]["month"],
            churn_probability=float(probs[i]),
            flagged=float(probs[i]) >= model.threshold,
            rank=rank,
            actual_churned=records[i]["actual_churned"],
            features=records[i]["features"],
        )
        for rank, i in enumerate(order, start=1)
    )
    cohort = Cohort(source=source, is_fixture=is_fixture, month=month, rows=rows)
    _CACHE.clear()  # one live cohort; old keys would only pin memory
    _CACHE[key] = cohort
    return cohort


def reset_cohort_cache() -> None:
    """Clear the cached cohort (tests)."""
    _CACHE.clear()
