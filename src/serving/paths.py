"""Paths and serving_meta.json loader for the portable ops model."""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from src.core.config import config

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_OPS_DIR = REPO_ROOT / "Models" / "ops"


def ops_dir() -> Path:
    """Return the Models/ops directory (overridable via MODELS_OPS_DIR)."""
    if config.models_ops_dir:
        return Path(config.models_ops_dir)
    return DEFAULT_OPS_DIR


@lru_cache(maxsize=4)
def load_serving_meta(ops_path: str | None = None) -> dict[str, Any]:
    """Load and cache serving_meta.json.

    Args:
        ops_path: Optional override directory (string for lru_cache hashability).
    """
    root = Path(ops_path) if ops_path else ops_dir()
    meta_path = root / "serving_meta.json"
    if not meta_path.exists():
        raise FileNotFoundError(
            f"Missing {meta_path}. Run: py -3.13 Code\\Sprint3\\export_ops_model.py"
        )
    return json.loads(meta_path.read_text(encoding="utf-8"))


def prediction_cohort_path() -> Path:
    """CSV of raw feature rows for the prediction browser (gitignored; built locally)."""
    if config.prediction_cohort_path:
        return Path(config.prediction_cohort_path)
    return REPO_ROOT / "Data" / "processed" / "prediction_cohort.csv"


def draft_db_path() -> Path:
    """SQLite path for the Friction-Gate draft queue."""
    if config.draft_db_path:
        return Path(config.draft_db_path)
    return REPO_ROOT / "Data" / "processed" / "draft_queue.db"
