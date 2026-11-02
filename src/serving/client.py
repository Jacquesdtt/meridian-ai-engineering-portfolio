"""HTTP client the Streamlit UI uses to reach FastAPI (single enforcement point, F8).

The UI never imports ``draft_store`` / ``create_draft`` / the ops model; every
score, draft, edit, decision and audit read goes through the API, which alone
authenticates the demo role, re-scores, gates, drafts and writes the audit trail.

Transport (``FRICTION_GATE_MODE``):
- ``http`` (default): real HTTP to ``FRICTION_GATE_API_URL`` with timeouts and
  connect retries.
- ``inprocess``: AppLocker demo machines that block localhost. Drives the *same*
  FastAPI app through an ASGI test client (no socket), so every rule still runs
  in the API code path rather than being re-implemented in the UI.
"""
from __future__ import annotations

from typing import Any, Optional
from urllib.parse import quote

import httpx

from src.core.config import config
from src.serving.rbac import Role
from src.serving.schemas import (
    DraftPatchRequest,
    DraftRecord,
    DraftStatus,
    ExplainResponse,
    FairnessResponse,
    GlassBoxResponse,
    HealthResponse,
    PredictionPage,
    RagAskResponse,
    ScoreResponse,
)

_TIMEOUT = httpx.Timeout(30.0, connect=5.0)  # drafting calls Azure OpenAI


class ApiError(Exception):
    """Non-2xx API response; ``detail`` is the server's message."""

    def __init__(self, status_code: int, detail: Any) -> None:
        self.status_code = status_code
        self.detail = detail
        super().__init__(f"API {status_code}: {detail}")


class ApiUnavailable(Exception):
    """API could not be reached (connection refused, timeout)."""


class FrictionGateClient:
    """Typed wrapper over the FastAPI routes. Role is passed per call."""

    def __init__(self, http: Any) -> None:
        self._http = http

    @classmethod
    def from_config(cls) -> "FrictionGateClient":
        """Build a client for ``config.friction_gate_mode`` (``http`` | ``inprocess``)."""
        mode = (config.friction_gate_mode or "http").strip().lower()
        if mode == "inprocess":
            from fastapi.testclient import TestClient

            from src.serving.app import app

            http = TestClient(app)
            http.__enter__()  # run lifespan: load model + init draft DB
            return cls(http)
        if mode != "http":
            raise ValueError(
                f"FRICTION_GATE_MODE must be 'http' or 'inprocess', got {mode!r}"
            )
        return cls(
            httpx.Client(
                base_url=config.friction_gate_api_url.rstrip("/"),
                timeout=_TIMEOUT,
                transport=httpx.HTTPTransport(retries=2),
            )
        )

    def _request(
        self,
        method: str,
        path: str,
        role: Optional[Role] = None,
        **kwargs: Any,
    ) -> Any:
        headers = {"X-Demo-Role": role.value} if role is not None else {}
        if config.friction_gate_api_key:  # Azure deploy requires it (ADR 016)
            headers["X-API-Key"] = config.friction_gate_api_key
        try:
            resp = self._http.request(method, path, headers=headers, **kwargs)
        except httpx.TransportError as exc:
            raise ApiUnavailable(f"Cannot reach the API: {exc}") from exc
        if resp.status_code >= 400:
            try:
                detail = resp.json().get("detail", resp.text)
            except Exception:  # noqa: BLE001
                detail = resp.text
            raise ApiError(resp.status_code, detail)
        return resp.json()

    def health(self) -> HealthResponse:
        return HealthResponse(**self._request("GET", "/health"))

    def glass_box(self, role: Role) -> GlassBoxResponse:
        return GlassBoxResponse(**self._request("GET", "/model/glass-box", role))

    def fairness(self, role: Role) -> FairnessResponse:
        return FairnessResponse(**self._request("GET", "/model/fairness", role))

    def ask_rag(self, role: Role, query: str, top_k: int = 3) -> RagAskResponse:
        body = {"query": query, "top_k": top_k}
        return RagAskResponse(**self._request("POST", "/rag/ask", role, json=body))

    def predictions(
        self,
        role: Role,
        *,
        flagged_only: bool = False,
        min_probability: float = 0.0,
        customer_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> PredictionPage:
        params: dict[str, Any] = {
            "flagged_only": flagged_only,
            "min_probability": min_probability,
            "limit": limit,
            "offset": offset,
        }
        if customer_id:
            params["customer_id"] = customer_id
        return PredictionPage(**self._request("GET", "/predictions", role, params=params))

    def explain_customer(self, role: Role, customer_id: str, top_n: int = 10) -> ExplainResponse:
        path = f"/predictions/{quote(customer_id, safe='')}/explain"
        return ExplainResponse(**self._request("GET", path, role, params={"top_n": top_n}))

    def explain(self, role: Role, features: dict[str, Any], top_n: int = 10) -> ExplainResponse:
        body = {"features": features, "top_n": top_n}
        return ExplainResponse(**self._request("POST", "/explain", role, json=body))

    def score(self, role: Role, features: dict[str, Any]) -> ScoreResponse:
        return ScoreResponse(
            **self._request("POST", "/score", role, json={"features": features})
        )

    def create_draft(
        self, role: Role, features: dict[str, Any], review_key: Optional[str] = None
    ) -> DraftRecord:
        body: dict[str, Any] = {"features": features}
        if review_key:
            body["review_key"] = review_key
        return DraftRecord(**self._request("POST", "/drafts", role, json=body))

    def list_drafts(
        self, role: Role, status: Optional[DraftStatus] = None, limit: int = 50
    ) -> list[DraftRecord]:
        params: dict[str, Any] = {"limit": limit}
        if status is not None:
            params["status"] = status.value
        rows = self._request("GET", "/drafts", role, params=params)
        return [DraftRecord(**r) for r in rows]

    def patch_draft(
        self, role: Role, draft_id: str, patch: DraftPatchRequest
    ) -> DraftRecord:
        payload = patch.model_dump(mode="json", exclude_none=True)
        return DraftRecord(
            **self._request("PATCH", f"/drafts/{draft_id}", role, json=payload)
        )

    def audit_events(
        self, role: Role, limit: int = 100, draft_id: Optional[str] = None
    ) -> list[dict[str, Any]]:
        params: dict[str, Any] = {"limit": limit}
        if draft_id:
            params["draft_id"] = draft_id
        return self._request("GET", "/audit/events", role, params=params)
