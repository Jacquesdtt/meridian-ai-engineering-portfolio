"""X-API-Key gate for the cloud deploy (ADR 016)."""
from __future__ import annotations

import shlex
import urllib.request
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from tests.serving.test_api import client, tiny_ops_dir  # noqa: F401  (fixtures)

KEY = "k" * 40


@pytest.fixture()
def keyed(client: TestClient, monkeypatch: pytest.MonkeyPatch):  # noqa: F811
    from src.core import config as cfg_mod

    monkeypatch.setattr(cfg_mod.config, "api_access_key", KEY)
    return client


def test_no_key_configured_leaves_local_api_open(client: TestClient):  # noqa: F811
    assert client.get("/health").status_code == 200


def test_every_route_needs_the_key(keyed: TestClient):
    for path in ("/health", "/", "/docs", "/openapi.json"):
        assert keyed.get(path).status_code == 401, path
    assert keyed.get("/health", headers={"X-API-Key": "wrong"}).status_code == 401
    assert keyed.get("/health", headers={"X-API-Key": KEY}).status_code == 200
    # Key and demo role are separate checks: a valid key does not grant a role.
    assert keyed.get("/drafts", headers={"X-API-Key": KEY}).status_code == 400


def test_cors_preflight_is_not_blocked(keyed: TestClient):
    r = keyed.options(
        "/viva/grade",
        headers={
            "Origin": "http://localhost:3005",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type,x-demo-role",
        },
    )
    assert r.status_code == 200


def test_client_sends_key_when_configured(keyed: TestClient, monkeypatch: pytest.MonkeyPatch):
    from src.core import config as cfg_mod
    from src.serving.client import ApiError, FrictionGateClient

    api = FrictionGateClient(keyed)
    with pytest.raises(ApiError) as exc:
        api.health()
    assert exc.value.status_code == 401
    monkeypatch.setattr(cfg_mod.config, "friction_gate_api_key", KEY)
    assert api.health().status == "ok"


@pytest.mark.parametrize("access_key", [None, KEY])
def test_docker_health_command_works_with_optional_key(client, monkeypatch, access_key):
    """Run the real Docker probe command against the ASGI health route."""
    from src.core.config import config

    monkeypatch.setattr(config, "api_access_key", access_key)
    if access_key:
        monkeypatch.setenv("API_ACCESS_KEY", access_key)
    else:
        monkeypatch.delenv("API_ACCESS_KEY", raising=False)

    def open_health(request, timeout):
        assert timeout == 4
        headers = dict(request.header_items()) if isinstance(request, urllib.request.Request) else {}
        return SimpleNamespace(status=client.get("/health", headers=headers).status_code)

    monkeypatch.setattr(urllib.request, "urlopen", open_health)
    dockerfile = Path(__file__).resolve().parents[2] / "Dockerfile"
    command = next(
        line.strip() for line in dockerfile.read_text().splitlines()
        if line.strip().startswith("CMD python -c")
    )
    with pytest.raises(SystemExit) as exit_status:
        exec(shlex.split(command)[3], {})
    assert exit_status.value.code == 0
