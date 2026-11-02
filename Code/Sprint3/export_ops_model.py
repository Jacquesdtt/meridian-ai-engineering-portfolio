"""Export portable ops model artifacts for Sprint 3 serving.

Loads the Sprint 2 ops-threshold booster from local MLflow (sqlite mlflow.db),
re-fits the same temporal OHE preprocessor on training_data.csv (read-only;
no re-tune), and writes committed Models/ops/ artifacts.

Usage:
    py -3.13 Code\\Sprint3\\export_ops_model.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import joblib
import mlflow
import mlflow.xgboost
import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder

REPO_ROOT = Path(__file__).resolve().parents[2]
RUN_ID = "3f575754ae9a42c5a21ea5e476c0af37"
SUMMARY_V2 = REPO_ROOT / "Docs" / "Sprint2" / "reports" / "sprint2_run_summary_v2.json"
TRAINING_CSV = REPO_ROOT / "Data" / "processed" / "training_data.csv"
OUT_DIR = REPO_ROOT / "Models" / "ops"
MLFLOW_URI = f"sqlite:///{(REPO_ROOT / 'mlflow.db').as_posix()}"

TARGET = "Is_Churned"
ID_COLS = ["customer_id", "Month"]
CAT_COLS = ["state"]


def main() -> int:
    """Export booster + preprocessor + meta into ``Models/ops/`` for serving.

    Returns 0 on success; non-zero exit codes for missing inputs / load failures.
    """
    if not SUMMARY_V2.exists():
        print(f"ERROR: missing {SUMMARY_V2}", file=sys.stderr)
        return 1
    summary = json.loads(SUMMARY_V2.read_text(encoding="utf-8"))
    threshold = float(summary["threshold"])
    threshold_rule = summary["threshold_rule"]
    top_shap = summary.get("top_shap", {})
    run_id = summary.get("run_id", RUN_ID)

    print(f"MLflow URI={MLFLOW_URI}")
    print(f"run_id={run_id} threshold={threshold} rule={threshold_rule}")
    mlflow.set_tracking_uri(MLFLOW_URI)

    # --- Booster from MLflow ---
    model_uri = f"runs:/{run_id}/model"
    try:
        booster = mlflow.xgboost.load_model(model_uri)
    except Exception as exc:  # noqa: BLE001 — surface load failure clearly
        print(f"ERROR: could not load {model_uri}: {exc}", file=sys.stderr)
        print(
            "Ensure local mlflow.db contains the ops run model artifact.",
            file=sys.stderr,
        )
        return 2

    # --- Preprocessor: same temporal fit recipe as Sprint 2 notebook ---
    if not TRAINING_CSV.exists():
        print(f"ERROR: missing {TRAINING_CSV}", file=sys.stderr)
        return 1

    print(f"Loading {TRAINING_CSV} …")
    df = pd.read_csv(TRAINING_CSV, parse_dates=["Month"])
    df["Month"] = pd.PeriodIndex(df["Month"], freq="M")

    # Temporal split mirrors Sprint 2: fit OHE only on early train months so
    # category levels do not leak from the held-out val/test months. We do NOT
    # re-tune hyperparameters here — only re-fit the preprocessor for portability.
    months_sorted = sorted(df["Month"].unique())
    n_months = len(months_sorted)
    n_train_months = int(np.floor(0.80 * n_months))
    n_val_months = max(1, int(np.floor(0.10 * n_train_months)))
    train_months_all = months_sorted[:n_train_months]
    fit_months = train_months_all[:-n_val_months]
    fit_df = df[df["Month"].isin(fit_months)].copy()

    feature_cols = [c for c in df.columns if c not in ID_COLS + [TARGET]]
    num_cols = [c for c in feature_cols if c not in CAT_COLS]
    preprocess = ColumnTransformer(
        [
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), CAT_COLS),
            ("num", "passthrough", num_cols),
        ]
    )
    X_fit = fit_df[feature_cols]
    preprocess.fit(X_fit)
    ohe = preprocess.named_transformers_["cat"]
    ohe_names = list(ohe.get_feature_names_out(CAT_COLS))
    model_feature_names = ohe_names + num_cols

    # Sanity: booster feature count matches
    n_boost = int(booster.num_features())
    if n_boost != len(model_feature_names):
        print(
            f"ERROR: booster n_features={n_boost} != meta names={len(model_feature_names)}",
            file=sys.stderr,
        )
        return 3

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    booster_path = OUT_DIR / "booster.json"
    prep_path = OUT_DIR / "preprocessor.joblib"
    meta_path = OUT_DIR / "serving_meta.json"

    booster.save_model(str(booster_path))
    joblib.dump(preprocess, prep_path)

    meta = {
        "run_id": run_id,
        "threshold": threshold,
        "threshold_rule": threshold_rule,
        "model_feature_names": model_feature_names,
        "raw_feature_cols": feature_cols,
        "num_cols": num_cols,
        "cat_cols": CAT_COLS,
        "top_shap": top_shap,
        "fit_months": f"{fit_months[0]}:{fit_months[-1]}",
        "n_fit_rows": int(len(fit_df)),
        "source_summary": str(SUMMARY_V2.relative_to(REPO_ROOT).as_posix()),
    }
    meta_path.write_text(json.dumps(meta, indent=2), encoding="utf-8")

    # Smoke score one fit row
    X1 = preprocess.transform(X_fit.iloc[:1])
    dmat = xgb.DMatrix(X1, feature_names=model_feature_names)
    prob = float(booster.predict(dmat)[0])
    print(f"Wrote {booster_path}")
    print(f"Wrote {prep_path}")
    print(f"Wrote {meta_path}")
    print(f"smoke_prob[0]={prob:.6f} flagged={prob >= threshold}")
    print("OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
