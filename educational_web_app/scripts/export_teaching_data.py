"""Export locked model facts from committed Meridian artifacts for the teaching SPA.

Reads only committed files (no data CSVs, no MLflow store) so it runs on a fresh
clone and under AppLocker (stdlib only):

    uv run --directory . python educational_web_app/scripts/export_teaching_data.py

Writes ``src/content/generated/model_facts.json`` and copies the SHAP PNGs into
``public/assets/``. ``npm run facts:check`` re-runs this and fails if the output
changed, so the SPA cannot silently drift from ``Models/ops/``.
"""

from __future__ import annotations

import json
import shutil
from pathlib import Path

EDU_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = EDU_ROOT.parent

SERVING_META = REPO_ROOT / "Models" / "ops" / "serving_meta.json"
RUN_SUMMARY = REPO_ROOT / "Docs" / "Sprint2" / "reports" / "sprint2_run_summary_v2.json"
REPORTS_DIR = REPO_ROOT / "Docs" / "Sprint2" / "reports"
OUT_JSON = EDU_ROOT / "src" / "content" / "generated" / "model_facts.json"
ASSETS_DIR = EDU_ROOT / "public" / "assets"
SHAP_PNGS = ("shap_summary.png", "shap_waterfall_high_risk.png", "shap_waterfall_low_risk.png")


def _r(x: float, nd: int = 3) -> float:
    return round(float(x), nd)


def build() -> dict:
    meta = json.loads(SERVING_META.read_text(encoding="utf-8"))
    run = json.loads(RUN_SUMMARY.read_text(encoding="utf-8"))

    names = meta["model_feature_names"]
    state_count = sum(1 for n in names if n.startswith("state_"))
    before = run["before_after"]["before"]
    after = run["before_after"]["after"]
    fair = run["fairlearn"]

    return {
        "_source": [
            "Models/ops/serving_meta.json",
            "Docs/Sprint2/reports/sprint2_run_summary_v2.json",
        ],
        "runId": meta["run_id"],
        "firstRunId": run["first_run_id"],
        "fitMonths": meta["fit_months"],
        "testMonths": run["test_months"],
        "nFitRows": meta["n_fit_rows"],
        "featureCount": len(names),
        "stateOheCount": state_count,
        "numericFeatureCount": len(names) - state_count,
        "rawFeatureCols": meta["raw_feature_cols"],
        "threshold": {
            "ops": _r(meta["threshold"], 3),
            "opsPrecise": _r(meta["threshold"], 5),
            "rule": meta["threshold_rule"],
            "maxF1": _r(before["threshold"], 3),
        },
        "test": {
            "model": {k: _r(run["xgboost"][k]) for k in ("pr_auc", "roc_auc", "precision", "recall", "accuracy")},
            "heuristic": {
                k: _r(run["baseline_heuristic"][k]) for k in ("pr_auc", "roc_auc", "precision", "recall", "accuracy")
            },
            "maxF1Rule": {
                "precision": _r(before["test_precision"]),
                "recall": _r(before["test_recall"]),
                "fp": before["test_fp"],
            },
            "opsRule": {
                "precision": _r(after["test_precision"]),
                "recall": _r(after["test_recall"]),
                "fp": after["test_fp"],
            },
        },
        "topShap": {k: _r(v) for k, v in meta["top_shap"].items()},
        "fairness": {
            "nSample": fair["n_sample"],
            "minGroupN": fair["min_group_n"],
            "eodAge": _r(fair["equalized_odds_difference_age"]),
            "eodState": _r(fair["equalized_odds_difference_state"]),
            "selectionRateDiffAge": _r(fair["selection_rate_diff_age"]),
            "stateGroupsTotal": fair["state_filter"]["n_groups_total"],
            "stateGroupsKept": fair["state_filter"]["n_groups_kept"],
        },
    }


def main() -> None:
    facts = build()
    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(facts, indent=2) + "\n", encoding="utf-8")
    ASSETS_DIR.mkdir(parents=True, exist_ok=True)
    for name in SHAP_PNGS:
        shutil.copyfile(REPORTS_DIR / name, ASSETS_DIR / name)
    print(f"wrote {OUT_JSON.relative_to(REPO_ROOT)} and {len(SHAP_PNGS)} SHAP images")


if __name__ == "__main__":
    main()
