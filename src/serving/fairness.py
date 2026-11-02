"""Single canonical accessor for fairness/disclosure numbers (ADR 015).

Before this module existed, the Fairlearn Equalized Odds numbers computed in
``Code/Sprint2/01_modeling_and_rai.ipynb`` were quoted by hand in several
places (``Docs/Sprint2/ai_bp_learnings.md``, ``Docs/Model_Card.md``, the
Streamlit dashboard) with no shared code path back to the source artifact.
That already drifted once — a stale ``age EOD ≈ 0.05`` sat uncorrected in the
BP-learnings doc until a red-team pass caught it against the JSON report
(``Docs/StakeholderManagement/Meetings/06_jamie_serving_readiness_red_team.md``,
finding RT-J-04).

This module reads the one committed report file and is the only thing any
Python caller (FastAPI, the Streamlit dashboard, doc-generation scripts)
should import to get fairness numbers — mirroring the pattern
``educational_web_app/scripts/export_teaching_data.py`` already uses for SHAP
and threshold facts.
"""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

from pydantic import BaseModel

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_FAIRNESS_REPORT = (
    REPO_ROOT / "Docs" / "Sprint2" / "reports" / "fairlearn_equalized_odds.json"
)


class FairnessReport(BaseModel):
    """Equalized Odds disclosure at the ops threshold (ADR 012), one canonical shape."""

    n_sample: int
    min_group_n: int
    threshold: float
    selection_rate_diff_age: float
    equalized_odds_difference_age: float
    equalized_odds_ratio_age: float
    equalized_odds_difference_state: float
    equalized_odds_ratio_state: float
    state_groups_total: int
    state_groups_kept: int
    state_rows_excluded: int
    source: str


@lru_cache(maxsize=4)
def load_fairness_report(report_path: str | None = None) -> FairnessReport:
    """Load and cache the Fairlearn Equalized Odds report (ADR 012 disclosure).

    Args:
        report_path: Optional override path (string for ``lru_cache`` hashability).
    """
    path = Path(report_path) if report_path else DEFAULT_FAIRNESS_REPORT
    if not path.exists():
        raise FileNotFoundError(
            f"Missing fairness report {path}. Run Code/Sprint2/01_modeling_and_rai.ipynb."
        )
    raw = json.loads(path.read_text(encoding="utf-8"))
    state_filter = raw.get("state_filter", {})
    return FairnessReport(
        n_sample=raw["n_sample"],
        min_group_n=raw["min_group_n"],
        threshold=raw["threshold"],
        selection_rate_diff_age=raw["selection_rate_diff_age"],
        equalized_odds_difference_age=raw["equalized_odds_difference_age"],
        equalized_odds_ratio_age=raw["equalized_odds_ratio_age"],
        equalized_odds_difference_state=raw["equalized_odds_difference_state"],
        equalized_odds_ratio_state=raw["equalized_odds_ratio_state"],
        state_groups_total=state_filter.get("n_groups_total", 0),
        state_groups_kept=state_filter.get("n_groups_kept", 0),
        state_rows_excluded=state_filter.get("n_rows_excluded", 0),
        source=(
            path.relative_to(REPO_ROOT).as_posix()
            if path.is_relative_to(REPO_ROOT)
            else path.as_posix()
        ),
    )
