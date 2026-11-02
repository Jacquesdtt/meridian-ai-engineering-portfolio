"""Tests for Sprint 5 demo Glass-Box RBAC + audit trail."""
from __future__ import annotations

from pathlib import Path

import pytest

from src.serving import draft_store
from src.serving.rbac import PERMISSION_LABELS, ROLE_LABELS, Permission, Role, can, require
from src.serving.schemas import DraftStatus, RetentionDraftBody


def test_role_permission_matrix():
    assert can(Role.retention_agent, Permission.approve_reject)
    assert can(Role.retention_agent, Permission.edit_draft)
    assert can(Role.retention_agent, Permission.view_audit)

    assert can(Role.compliance_viewer, Permission.view_audit)
    assert can(Role.compliance_viewer, Permission.view_glass_box)
    assert not can(Role.compliance_viewer, Permission.approve_reject)
    assert not can(Role.compliance_viewer, Permission.create_draft)

    assert can(Role.data_scientist, Permission.view_glass_box)
    assert can(Role.data_scientist, Permission.score)
    assert not can(Role.data_scientist, Permission.approve_reject)

    # Customer-level scores + SHAP: Sam and compliance, not the agent queue.
    assert can(Role.data_scientist, Permission.explain_predictions)
    assert can(Role.compliance_viewer, Permission.explain_predictions)
    assert not can(Role.retention_agent, Permission.explain_predictions)


def test_every_permission_and_role_has_a_ui_label():
    # The Streamlit sidebar renders these; a missing key crashed the app on load.
    assert set(PERMISSION_LABELS) == set(Permission)
    assert set(ROLE_LABELS) == set(Role)


def test_require_raises_for_compliance_approve():
    with pytest.raises(PermissionError):
        require(Role.compliance_viewer, Permission.approve_reject)


def test_audit_trail_on_create_and_approve(tmp_path: Path):
    db = tmp_path / "draft_queue.db"
    draft = RetentionDraftBody(
        subject="Test",
        body="Body for human review only.",
        offered_interest_rate=0.035,
        drivers=["balance"],
    )
    rec = draft_store.insert_draft(
        churn_probability=0.75,
        threshold=0.70,
        run_id="test-run",
        drafter_source="stub",
        draft=draft,
        review_key="agent-1",
        actor_role=Role.retention_agent.value,
        db_path=db,
    )
    draft_store.update_draft(
        rec.id,
        status=DraftStatus.approved,
        actor_role=Role.retention_agent.value,
        actor_key="agent-1",
        db_path=db,
    )
    events = draft_store.list_audit_events(db_path=db)
    actions = [e["action"] for e in events]
    assert "create" in actions
    assert "approved" in actions
    assert all(e["actor_role"] == Role.retention_agent.value for e in events)
