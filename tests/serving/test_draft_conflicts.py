"""Concurrent writers must not replace a decision or exceed queue capacity."""
from concurrent.futures import ThreadPoolExecutor
from threading import Event, current_thread

import pytest

from src.serving import draft_store
from src.serving.schemas import DraftStatus, RetentionDraftBody


def test_stale_edit_cannot_reopen_approved_draft(tmp_path, monkeypatch):
    """Pause an edit after its read, approve elsewhere, then resume the edit."""
    path = tmp_path / "drafts.db"
    original = draft_store.insert_draft(
        churn_probability=0.9, threshold=0.7, run_id="test",
        drafter_source="stub", db_path=path,
        draft=RetentionDraftBody(subject="Offer", body="Original", offered_interest_rate=0.03),
    )
    read_pending, resume_edit = Event(), Event()
    get_draft = draft_store.get_draft

    def pause_edit(*args, **kwargs):
        record = get_draft(*args, **kwargs)
        if current_thread().name.startswith("stale-edit") and not read_pending.is_set():
            read_pending.set()
            assert resume_edit.wait(5), "Approval did not complete"
        return record

    monkeypatch.setattr(draft_store, "get_draft", pause_edit)
    with ThreadPoolExecutor(max_workers=1, thread_name_prefix="stale-edit") as pool:
        edit = pool.submit(draft_store.update_draft, original.id, body="Stale edit", db_path=path)
        try:
            assert read_pending.wait(5), "Edit did not read the pending draft"
            draft_store.update_draft(original.id, status=DraftStatus.approved, db_path=path)
        finally:
            resume_edit.set()
        with pytest.raises(ValueError, match="changed|immutable"):
            edit.result(timeout=5)

    stored = get_draft(original.id, db_path=path)
    assert stored.status == DraftStatus.approved
    assert stored.draft.body == "Original"
    assert {e["action"] for e in draft_store.list_audit_events(db_path=path)} == {"create", "approved"}
