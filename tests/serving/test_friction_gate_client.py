"""F8: the Streamlit UI reaches FastAPI only through ``FrictionGateClient``."""
from __future__ import annotations

import ast
from pathlib import Path

import pytest

from src.serving.client import ApiError, ApiUnavailable, FrictionGateClient
from src.serving.rbac import Role
from src.serving.schemas import DraftPatchRequest, DraftStatus
from tests.serving.test_api import client, tiny_ops_dir  # noqa: F401  (fixtures)

REPO_ROOT = Path(__file__).resolve().parents[2]
UI_FILE = REPO_ROOT / "Code" / "Sprint3" / "friction_gate_app.py"

# Anything that lets UI code score, draft or write without passing the API gate.
FORBIDDEN_UI_IMPORTS = {
    "src.serving.draft_store",
    "src.genai.drafter",
    "src.serving.model",
}
FORBIDDEN_UI_NAMES = {"draft_store", "create_draft", "score_raw_features", "get_ops_model"}


def _imports(tree: ast.AST) -> tuple[set[str], set[str]]:
    modules: set[str] = set()
    names: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            modules.update(a.name for a in node.names)
        elif isinstance(node, ast.ImportFrom):
            modules.add(node.module or "")
            names.update(a.name for a in node.names)
            if node.module == "src.serving":
                modules.update(f"src.serving.{a.name}" for a in node.names)
    return modules, names


def test_ui_does_not_import_write_or_scoring_paths():
    tree = ast.parse(UI_FILE.read_text(encoding="utf-8"))
    modules, names = _imports(tree)
    assert not (modules & FORBIDDEN_UI_IMPORTS), modules & FORBIDDEN_UI_IMPORTS
    assert not (names & FORBIDDEN_UI_NAMES), names & FORBIDDEN_UI_NAMES


@pytest.fixture()
def api(client, monkeypatch):  # noqa: F811
    """Client wired to the test app through the same ASGI transport as inprocess mode."""
    return FrictionGateClient(client)


FEATS = {"state": "NY", "x": 2.0}


def test_health_and_glass_box(api):
    assert api.health().run_id == "test-run-tiny"
    gb = api.glass_box(Role.compliance_viewer)
    assert gb.threshold == pytest.approx(0.3)
    assert gb.top_shap_drivers == ["x"]


def test_fairness_through_client(api):
    fair = api.fairness(Role.compliance_viewer)
    assert fair.equalized_odds_difference_age == pytest.approx(0.15599544740011842)
    assert fair.source.endswith("fairlearn_equalized_odds.json")


def test_ask_rag_through_client(api, monkeypatch):
    import src.serving.app as serving_app

    monkeypatch.setattr(
        serving_app.rag_engine,
        "answer_question",
        lambda *a, **k: serving_app.rag_engine.RagAnswer(
            answer="Grounded answer.",
            sources=["chunk one"],
            retrieval_mode="tfidf",
            hybrid=False,
            reranked=False,
        ),
    )
    result = api.ask_rag(Role.retention_agent, "What is the ops threshold?")
    assert result.answer == "Grounded answer."
    assert result.sources == ["chunk one"]


def test_score_denied_for_compliance(api):
    with pytest.raises(ApiError) as exc:
        api.score(Role.compliance_viewer, FEATS)
    assert exc.value.status_code == 403


def test_unflagged_draft_is_rejected_by_api(api, monkeypatch):
    import src.serving.app as serving_app

    monkeypatch.setattr(serving_app, "score_raw_features", lambda m, r: (0.01, False))
    with pytest.raises(ApiError) as exc:
        api.create_draft(Role.retention_agent, FEATS, "agent-1")
    assert exc.value.status_code == 422
    assert "Not in contact queue" in str(exc.value.detail)


def test_draft_lifecycle_through_client_with_audit_seconds(api, monkeypatch):
    import src.serving.app as serving_app

    monkeypatch.setattr(serving_app, "score_raw_features", lambda m, r: (0.9, True))
    rec = api.create_draft(Role.retention_agent, FEATS, "agent-1")
    assert rec.status == DraftStatus.pending_review

    assert [d.id for d in api.list_drafts(Role.compliance_viewer)] == [rec.id]

    with pytest.raises(ApiError) as exc:  # compliance cannot decide
        api.patch_draft(
            Role.compliance_viewer,
            rec.id,
            DraftPatchRequest(status=DraftStatus.rejected),
        )
    assert exc.value.status_code == 403

    done = api.patch_draft(
        Role.retention_agent,
        rec.id,
        DraftPatchRequest(
            status=DraftStatus.approved, attention_ack=True, seconds_open=2.0
        ),
    )
    assert done.status == DraftStatus.approved

    events = api.audit_events(Role.compliance_viewer, draft_id=rec.id)
    approve = next(e for e in events if e["action"] == "approved")
    assert approve["detail"]["seconds_open"] == 2.0
    assert approve["detail"]["fast_decide_warn"] is True
    assert any(e["action"] == "denied" for e in api.audit_events(Role.compliance_viewer))


def test_unreachable_api_raises_api_unavailable():
    import httpx

    dead = FrictionGateClient(
        httpx.Client(base_url="http://127.0.0.1:9", timeout=httpx.Timeout(1.0))
    )
    with pytest.raises(ApiUnavailable):
        dead.health()


def test_from_config_rejects_unknown_mode(monkeypatch):
    from src.core import config as cfg_mod

    monkeypatch.setattr(cfg_mod.config, "friction_gate_mode", "carrier-pigeon")
    with pytest.raises(ValueError):
        FrictionGateClient.from_config()
