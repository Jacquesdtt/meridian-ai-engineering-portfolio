"""TDD: SQLite WAL + busy timeout for draft store (RAG-02 / RAG-05)."""
from __future__ import annotations

import logging
import sqlite3
from pathlib import Path
from unittest.mock import patch

import pytest

from src.serving import draft_store


def test_connect_enables_wal_and_busy_timeout(tmp_path: Path):
    db = tmp_path / "drafts.db"
    draft_store.init_db(db_path=db)
    with draft_store._connect(db) as conn:
        mode = conn.execute("PRAGMA journal_mode").fetchone()[0]
        busy = conn.execute("PRAGMA busy_timeout").fetchone()[0]
    assert str(mode).lower() == "wal"
    assert int(busy) >= 5000


def test_operational_error_is_logged(tmp_path: Path, caplog: pytest.LogCaptureFixture):
    """RAG-05: SQLite OperationalError must be logged (not swallowed silently)."""
    db = tmp_path / "drafts.db"
    with patch(
        "sqlite3.connect",
        side_effect=sqlite3.OperationalError("database is locked"),
    ):
        with caplog.at_level(logging.ERROR, logger="src.serving.draft_store"):
            with pytest.raises(sqlite3.OperationalError):
                draft_store.init_db(db_path=db)

    joined = " ".join(r.message for r in caplog.records)
    assert "OperationalError" in joined or "database is locked" in joined.lower()
