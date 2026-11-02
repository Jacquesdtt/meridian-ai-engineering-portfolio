"""SQLite-backed Friction-Gate draft queue (shared by FastAPI + Streamlit).

Also stores a lightweight **audit_events** trail for Sprint 5 Glass-Box RBAC
(demo roles — not production IdP).

Store-level policy (Jamie round-2): pending cap, terminal immutability, and
draft+audit atomicity apply to **every** writer (API and Streamlit).

Sprint 5 red-team (RAG-02 / RAG-05): WAL journal mode, busy_timeout=5000ms,
and explicit logging of ``sqlite3.OperationalError`` (lock / I/O failures).
"""
from __future__ import annotations

import json
import logging
import sqlite3
import uuid
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from src.serving.paths import draft_db_path
from src.serving.schemas import DraftRecord, DraftStatus, RetentionDraftBody, normalize_review_key

logger = logging.getLogger(__name__)

# Soft queue limit — same number API previously enforced (capacity discipline).
SOFT_PENDING_CAP = 500
# RAG-02: wait up to 5s for writers on shared volume / multi-process access.
_SQLITE_BUSY_TIMEOUT_MS = 5000
_SQLITE_CONNECT_TIMEOUT_S = 5.0


class PendingCapError(RuntimeError):
    """Raised when pending_review count would exceed SOFT_PENDING_CAP."""


class TerminalDraftError(ValueError):
    """Raised when editing or re-deciding a non-pending draft."""


def _utc_now() -> str:
    """ISO-8601 UTC timestamp for created_at / updated_at / audit rows."""
    return datetime.now(timezone.utc).isoformat()


def _connect(db_path: Path | None = None) -> sqlite3.Connection:
    """Open SQLite with WAL + busy timeout (ADR 008 / RAG-02).

    WAL reduces writer/reader blocking on the shared Docker volume. ``timeout``
    on ``connect`` and ``PRAGMA busy_timeout`` both target ~5s lock waits.
    """
    path = db_path or draft_db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    try:
        conn = sqlite3.connect(
            str(path),
            check_same_thread=False,
            timeout=_SQLITE_CONNECT_TIMEOUT_S,
        )
        conn.row_factory = sqlite3.Row
        # journal_mode returns the mode string; assert callers can PRAGMA-read it.
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute(f"PRAGMA busy_timeout={_SQLITE_BUSY_TIMEOUT_MS}")
        return conn
    except sqlite3.OperationalError:
        logger.exception(
            "SQLite OperationalError opening %s (database locked or I/O failure)",
            path,
        )
        raise


def init_db(db_path: Path | None = None) -> None:
    """Create draft + audit tables if missing."""
    with closing(_connect(db_path)) as conn, conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS drafts (
                id TEXT PRIMARY KEY,
                status TEXT NOT NULL,
                churn_probability REAL NOT NULL,
                threshold REAL NOT NULL,
                run_id TEXT NOT NULL,
                review_key TEXT,
                drafter_source TEXT NOT NULL,
                draft_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS audit_events (
                id TEXT PRIMARY KEY,
                draft_id TEXT,
                action TEXT NOT NULL,
                actor_role TEXT,
                actor_key TEXT,
                detail_json TEXT,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.commit()


def _insert_audit_row(
    conn: sqlite3.Connection,
    *,
    action: str,
    draft_id: Optional[str] = None,
    actor_role: Optional[str] = None,
    actor_key: Optional[str] = None,
    detail: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    """Append one audit row on an open connection (caller commits)."""
    event_id = str(uuid.uuid4())
    now = _utc_now()
    detail_json = json.dumps(detail or {}, default=str)
    conn.execute(
        """
        INSERT INTO audit_events (
            id, draft_id, action, actor_role, actor_key, detail_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (event_id, draft_id, action, actor_role, actor_key, detail_json, now),
    )
    return {
        "id": event_id,
        "draft_id": draft_id,
        "action": action,
        "actor_role": actor_role,
        "actor_key": actor_key,
        "detail": detail or {},
        "created_at": now,
    }


def record_audit(
    *,
    action: str,
    draft_id: Optional[str] = None,
    actor_role: Optional[str] = None,
    actor_key: Optional[str] = None,
    detail: Optional[dict[str, Any]] = None,
    db_path: Path | None = None,
) -> dict[str, Any]:
    """Append one audit row (Jamie glass-box trail)."""
    init_db(db_path)
    with closing(_connect(db_path)) as conn, conn:
        event = _insert_audit_row(
            conn,
            action=action,
            draft_id=draft_id,
            actor_role=actor_role,
            actor_key=actor_key,
            detail=detail,
        )
        conn.commit()
    return event


def list_audit_events(
    *,
    draft_id: Optional[str] = None,
    limit: int = 100,
    db_path: Path | None = None,
) -> list[dict[str, Any]]:
    """Return recent audit events (newest first) for the Glass-Box trail.

    Args:
        draft_id: If set, only events for that draft; otherwise all drafts.
        limit: Max rows (API/UI typically pass 100).
        db_path: Override DB location (tests); default is ``Data/processed/draft_queue.db``.

    Returns:
        List of plain dicts with parsed ``detail`` JSON (not sqlite Rows).
    """
    init_db(db_path)
    with closing(_connect(db_path)) as conn, conn:
        if draft_id is None:
            rows = conn.execute(
                "SELECT * FROM audit_events ORDER BY created_at DESC LIMIT ?",
                (limit,),
            ).fetchall()
        else:
            rows = conn.execute(
                """
                SELECT * FROM audit_events
                WHERE draft_id = ?
                ORDER BY created_at DESC LIMIT ?
                """,
                (draft_id, limit),
            ).fetchall()
    out: list[dict[str, Any]] = []
    for row in rows:
        out.append(
            {
                "id": row["id"],
                "draft_id": row["draft_id"],
                "action": row["action"],
                "actor_role": row["actor_role"],
                "actor_key": row["actor_key"],
                "detail": json.loads(row["detail_json"] or "{}"),
                "created_at": row["created_at"],
            }
        )
    return out


def _row_to_record(row: sqlite3.Row) -> DraftRecord:
    """Map one drafts SQLite row → ``DraftRecord`` (re-validates draft JSON)."""
    draft = RetentionDraftBody.model_validate_json(row["draft_json"])
    return DraftRecord(
        id=row["id"],
        status=DraftStatus(row["status"]),
        churn_probability=float(row["churn_probability"]),
        threshold=float(row["threshold"]),
        run_id=row["run_id"],
        review_key=row["review_key"],
        drafter_source=row["drafter_source"],
        draft=draft,
        created_at=datetime.fromisoformat(row["created_at"]),
        updated_at=datetime.fromisoformat(row["updated_at"]),
    )


def insert_draft(
    *,
    churn_probability: float,
    threshold: float,
    run_id: str,
    drafter_source: str,
    draft: RetentionDraftBody,
    review_key: Optional[str] = None,
    actor_role: Optional[str] = None,
    db_path: Path | None = None,
    pending_cap: int = SOFT_PENDING_CAP,
) -> DraftRecord:
    """Insert a new pending_review draft (cap + audit in one transaction)."""
    init_db(db_path)
    review_key = normalize_review_key(review_key)
    draft_id = str(uuid.uuid4())
    now = _utc_now()
    # Re-validate bounds before persist
    draft = RetentionDraftBody.model_validate(draft.model_dump())
    with closing(_connect(db_path)) as conn, conn:
        # Reserve the writer before counting so concurrent inserts cannot exceed the cap.
        conn.execute("BEGIN IMMEDIATE")
        n = conn.execute(
            "SELECT COUNT(*) AS n FROM drafts WHERE status = ?",
            (DraftStatus.pending_review.value,),
        ).fetchone()["n"]
        if int(n) >= pending_cap:
            raise PendingCapError(
                f"Pending draft cap ({pending_cap}) reached — review the Friction-Gate queue."
            )
        conn.execute(
            """
            INSERT INTO drafts (
                id, status, churn_probability, threshold, run_id,
                review_key, drafter_source, draft_json, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                draft_id,
                DraftStatus.pending_review.value,
                churn_probability,
                threshold,
                run_id,
                review_key,
                drafter_source,
                draft.model_dump_json(),
                now,
                now,
            ),
        )
        _insert_audit_row(
            conn,
            action="create",
            draft_id=draft_id,
            actor_role=actor_role,
            actor_key=review_key,
            detail={
                "churn_probability": churn_probability,
                "drafter_source": drafter_source,
                "status": DraftStatus.pending_review.value,
            },
        )
        conn.commit()
    return get_draft(draft_id, db_path=db_path)


def get_draft(draft_id: str, db_path: Path | None = None) -> DraftRecord:
    """Fetch one draft by id.

    Raises:
        KeyError: If no row exists (API maps this to HTTP 404).
    """
    init_db(db_path)
    with closing(_connect(db_path)) as conn, conn:
        row = conn.execute(
            "SELECT * FROM drafts WHERE id = ?", (draft_id,)
        ).fetchone()
    if row is None:
        raise KeyError(draft_id)
    return _row_to_record(row)


def list_drafts(
    *,
    status: Optional[DraftStatus] = None,
    limit: int = 100,
    db_path: Path | None = None,
) -> list[DraftRecord]:
    """List drafts newest-first, optionally filtered by Friction-Gate status.

    Args:
        status: If None, return all statuses; else only that lifecycle state.
        limit: Cap row count (queue UIs should stay small).
        db_path: Override for tests.
    """
    init_db(db_path)
    with closing(_connect(db_path)) as conn, conn:
        if status is None:
            rows = conn.execute(
                "SELECT * FROM drafts ORDER BY created_at DESC LIMIT ?",
                (limit,),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM drafts WHERE status = ? ORDER BY created_at DESC LIMIT ?",
                (status.value, limit),
            ).fetchall()
    return [_row_to_record(r) for r in rows]


def update_draft(
    draft_id: str,
    *,
    status: Optional[DraftStatus] = None,
    subject: Optional[str] = None,
    body: Optional[str] = None,
    offered_interest_rate: Optional[float] = None,
    actor_role: Optional[str] = None,
    actor_key: Optional[str] = None,
    audit_extra: Optional[dict[str, Any]] = None,
    db_path: Path | None = None,
) -> DraftRecord:
    """Patch fields then re-validate full RetentionDraftBody (rate cap on edit).

    Terminal drafts (approved / rejected) are immutable — decide once (Jamie RT-J2-03).
    ``audit_extra`` merges into the audit detail (e.g. attention_ack for JR-REQ-19).
    """
    current = get_draft(draft_id, db_path=db_path)
    if current.status != DraftStatus.pending_review:
        raise TerminalDraftError(
            f"Draft {draft_id} is {current.status.value} — terminal drafts are "
            "immutable (Friction-Gate: Approve/Reject once; no re-open)."
        )
    if status is not None and status == DraftStatus.pending_review:
        # No-op status; still allow body edits below.
        status = None
    if status is not None and status not in (
        DraftStatus.approved,
        DraftStatus.rejected,
    ):
        raise ValueError(
            f"Invalid status transition pending_review → {status.value}"
        )

    data = current.draft.model_dump()
    if subject is not None:
        data["subject"] = subject
    if body is not None:
        data["body"] = body
    if offered_interest_rate is not None:
        data["offered_interest_rate"] = offered_interest_rate
    new_draft = RetentionDraftBody.model_validate(data)
    new_status = status or current.status
    now = _utc_now()
    try:
        actor_key = normalize_review_key(actor_key) if actor_key else None
    except ValueError:
        actor_key = None  # do not fail a decide path on a bad optional key
    actor_key = actor_key or current.review_key

    detail: dict[str, Any] = {
        "from_status": current.status.value,
        "to_status": new_status.value,
        "subject_edited": subject is not None,
        "body_edited": body is not None,
        "rate_edited": offered_interest_rate is not None,
    }
    if audit_extra:
        detail.update(audit_extra)

    with closing(_connect(db_path)) as conn, conn:
        updated = conn.execute(
            """
            UPDATE drafts
            SET status = ?, draft_json = ?, updated_at = ?
            WHERE id = ? AND status = ? AND updated_at = ?
            """,
            (
                new_status.value, new_draft.model_dump_json(), now, draft_id,
                DraftStatus.pending_review.value, current.updated_at.isoformat(),
            ),
        )
        if updated.rowcount != 1:
            raise ValueError("Draft changed during review; reload it before editing or deciding.")
        action = "edit"
        if status is not None and status != current.status:
            action = status.value  # approved | rejected
        _insert_audit_row(
            conn,
            action=action,
            draft_id=draft_id,
            actor_role=actor_role,
            actor_key=actor_key,
            detail=detail,
        )
        conn.commit()
    return get_draft(draft_id, db_path=db_path)


def pending_count(db_path: Path | None = None) -> int:
    """How many drafts are still ``pending_review`` (used by soft-cap checks / UI)."""
    init_db(db_path)
    with closing(_connect(db_path)) as conn, conn:
        row = conn.execute(
            "SELECT COUNT(*) AS n FROM drafts WHERE status = ?",
            (DraftStatus.pending_review.value,),
        ).fetchone()
    return int(row["n"])
