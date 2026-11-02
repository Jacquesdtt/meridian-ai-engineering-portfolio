"""Prediction browser + per-customer SHAP (GET /predictions, /explain)."""
from __future__ import annotations

import json
import math
from pathlib import Path

import pandas as pd
import pytest
from fastapi.testclient import TestClient

from src.serving.cohort import FIXTURES_DIR, load_cohort, reset_cohort_cache
from src.serving.explain import explain_raw_features
from src.serving.model import load_ops_model, reset_ops_model
from src.serving.paths import DEFAULT_OPS_DIR
from tests.serving.test_api import client, tiny_ops_dir  # noqa: F401  (fixtures)

SCIENTIST = {"X-Demo-Role": "data_scientist"}
COMPLIANCE = {"X-Demo-Role": "compliance_viewer"}
AGENT = {"X-Demo-Role": "retention_agent"}


def _logit(p: float) -> float:
    return math.log(p / (1.0 - p))


@pytest.fixture()
def cohort_csv(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    """Tiny-model cohort; the bogus ``churn_probability`` column must be ignored."""
    path = tmp_path / "prediction_cohort.csv"
    pd.DataFrame(
        {
            "customer_id": [101, 102, 103, 104],
            "Month": ["2020-04"] * 4,
            "Is_Churned": [0, 1, 0, 1],
            "state": ["CA", "NY", "CA", "TX"],
            "x": [0.0, 2.0, 0.5, float("nan")],
            "churn_probability": [0.99, 0.0, 0.99, 0.0],
        }
    ).to_csv(path, index=False)
    from src.core import config as cfg_mod

    monkeypatch.setattr(cfg_mod.config, "prediction_cohort_path", str(path))
    reset_cohort_cache()
    yield path
    reset_cohort_cache()


def test_shap_sums_to_score_logit(tiny_ops_dir: Path):  # noqa: F811
    model = load_ops_model(tiny_ops_dir, force=True)
    for row in ({"state": "NY", "x": 2.0}, {"state": "CA", "x": 0.0}):
        e = explain_raw_features(model, row)
        total = e.base_value + sum(c.shap for c in e.contributions) + e.other_contribution
        assert total == pytest.approx(_logit(e.churn_probability), abs=1e-4)
        assert e.margin == pytest.approx(total, abs=1e-6)
        # One-hot state_* columns fold back into one raw feature.
        assert {c.feature for c in e.contributions} == {"state", "x"}
    reset_ops_model()


def test_top_n_folds_rest_into_other(tiny_ops_dir: Path):  # noqa: F811
    model = load_ops_model(tiny_ops_dir, force=True)
    full = explain_raw_features(model, {"state": "NY", "x": 2.0})
    top1 = explain_raw_features(model, {"state": "NY", "x": 2.0}, top_n=1)
    assert len(top1.contributions) == 1
    assert top1.contributions[0].feature == full.contributions[0].feature
    assert top1.other_contribution == pytest.approx(full.contributions[1].shap)
    reset_ops_model()


def test_real_model_fixtures_explain_exactly():
    """Pinned ops model: SHAP reproduces the fixture scores (0.2074 / 0.7509)."""
    reset_ops_model()
    model = load_ops_model(DEFAULT_OPS_DIR, force=True)
    for name, flagged in (("flagged_demo.json", True), ("below_threshold_demo.json", False)):
        feats = json.loads((FIXTURES_DIR / name).read_text(encoding="utf-8"))["features"]
        e = explain_raw_features(model, feats, top_n=5)
        assert e.flagged is flagged
        total = e.base_value + sum(c.shap for c in e.contributions) + e.other_contribution
        assert total == pytest.approx(_logit(e.churn_probability), abs=1e-4)
        assert len(e.contributions) == 5
    reset_ops_model()


def test_fixture_fallback_when_no_cohort(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    from src.core import config as cfg_mod

    monkeypatch.setattr(cfg_mod.config, "prediction_cohort_path", str(tmp_path / "absent.csv"))
    reset_cohort_cache()
    reset_ops_model()
    cohort = load_cohort(load_ops_model(DEFAULT_OPS_DIR, force=True))
    assert cohort.is_fixture
    assert [r.flagged for r in cohort.rows] == [True, False]  # sorted high → low
    assert cohort.rows[0].customer_id.startswith("fixture:")
    reset_cohort_cache()
    reset_ops_model()


def test_predictions_rbac(client: TestClient, cohort_csv: Path):  # noqa: F811
    assert client.get("/predictions").status_code == 400
    assert client.get("/predictions", headers=AGENT).status_code == 403
    assert client.post("/explain", json={"features": {}}, headers=AGENT).status_code == 403
    assert client.get("/predictions", headers=COMPLIANCE).status_code == 200
    denied = client.get("/audit/events", headers=COMPLIANCE).json()
    assert any(
        e["action"] == "denied" and "explain_predictions" in json.dumps(e) for e in denied
    )


def test_predictions_rescored_and_ranked(client: TestClient, cohort_csv: Path):  # noqa: F811
    body = client.get("/predictions", headers=SCIENTIST).json()
    assert body["cohort_is_fixture"] is False
    assert body["total"] == 4 and body["month"] == "2020-04"
    probs = [r["churn_probability"] for r in body["rows"]]
    assert probs == sorted(probs, reverse=True)
    assert [r["rank"] for r in body["rows"]] == [1, 2, 3, 4]
    # The file's churn_probability column (0.99 / 0.0) is ignored.
    assert all(p not in (0.99, 0.0) for p in probs)
    nan_row = next(r for r in body["rows"] if r["customer_id"] == "104")
    assert nan_row["features"]["x"] is None  # NaN serialised as null
    assert {r["actual_churned"] for r in body["rows"]} == {0, 1}

    flagged = client.get("/predictions", params={"flagged_only": True}, headers=SCIENTIST).json()
    assert flagged["matched"] == body["flagged_total"]
    assert all(r["flagged"] for r in flagged["rows"])

    one = client.get("/predictions", params={"customer_id": "102"}, headers=SCIENTIST).json()
    assert [r["customer_id"] for r in one["rows"]] == ["102"]

    paged = client.get("/predictions", params={"limit": 1, "offset": 1}, headers=SCIENTIST).json()
    assert paged["rows"][0]["rank"] == 2 and paged["matched"] == 4


def test_explain_customer_and_features(client: TestClient, cohort_csv: Path):  # noqa: F811
    listed = client.get("/predictions", headers=SCIENTIST).json()["rows"]
    top = listed[0]
    e = client.get(f"/predictions/{top['customer_id']}/explain", headers=SCIENTIST).json()
    assert e["customer_id"] == top["customer_id"]
    assert e["churn_probability"] == pytest.approx(top["churn_probability"])
    total = e["base_value"] + sum(c["shap"] for c in e["contributions"]) + e["other_contribution"]
    assert total == pytest.approx(_logit(e["churn_probability"]), abs=1e-4)

    nan_e = client.get("/predictions/104/explain", headers=SCIENTIST)
    assert nan_e.status_code == 200
    assert client.get("/predictions/999/explain", headers=SCIENTIST).status_code == 404

    posted = client.post(
        "/explain", json={"features": {"state": "NY", "x": 2.0}}, headers=SCIENTIST
    )
    assert posted.status_code == 200
    assert client.post(
        "/explain", json={"features": {"state": "NY"}}, headers=SCIENTIST
    ).status_code == 422


def test_build_prediction_cohort_script(tmp_path: Path):
    """Builder keeps one month, drops probabilities, and caps rows keeping flagged ones."""
    from Code.Sprint5.build_prediction_cohort import build

    reset_ops_model()
    feats = {
        name: json.loads((FIXTURES_DIR / f).read_text(encoding="utf-8"))["features"]
        for name, f in (("hi", "flagged_demo.json"), ("lo", "below_threshold_demo.json"))
    }
    rows = []
    for i in range(6):
        kind = "hi" if i == 0 else "lo"
        rows.append({"customer_id": i, "Month": "2020-04-01", "Is_Churned": 0, **feats[kind]})
    rows.append({"customer_id": 99, "Month": "2020-03-01", "Is_Churned": 1, **feats["hi"]})
    src = tmp_path / "training_data.csv"
    pd.DataFrame(rows).to_csv(src, index=False)

    out = tmp_path / "cohort.csv"
    cohort = build(src, out, month=None, max_rows=3)
    assert set(cohort["Month"]) == {"2020-04"}
    assert len(cohort) == 3 and 0 in set(cohort["customer_id"])  # flagged row kept
    assert "churn_probability" not in pd.read_csv(out).columns
    reset_ops_model()
