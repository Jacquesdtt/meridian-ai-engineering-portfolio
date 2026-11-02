# ADR 006: SQLite Draft Store and In-Process Streamlit UI

**Date:** 2026-07-14
**Status:** Accepted

## Context
Sprint 3 introduces a "Friction-Gate" Streamlit application for human review of GenAI retention drafts. Red-team evaluation uncovered two significant architectural risks:
1. **Split-Brain State:** Storing draft state in-memory (e.g., a Python dictionary) in the FastAPI process means the Streamlit UI—which runs in a separate process—will lose access to the queue upon restart, leading to state synchronization issues.
2. **AppLocker & Loopback Constraints:** Making HTTP requests from Streamlit to the FastAPI server on `127.0.0.1` frequently triggers corporate loopback and AppLocker restrictions on Windows.

## Decision
1. **SQLite State Backend:** We will use a lightweight SQLite database (e.g., `Data/processed/draft_queue.db`) shared by both the FastAPI backend and the Streamlit UI to store GenAI drafts.
2. **In-Process Service Layer:** The Streamlit application will bypass network requests entirely. It will import the draft creation and update functions directly from the backend service module (`src/serving/drafts.py`) and interact with the SQLite database directly.

## Consequences
*   **Pros:** Resolves state loss on process restarts; completely circumvents AppLocker and corporate proxy issues with `localhost` networking; eliminates the need for both `uvicorn` and `streamlit` to be running simultaneously for the UI demo.
*   **Cons:** Streamlit must run on the same filesystem/machine as the database (monolithic deployment), which is acceptable for this prototype but would need revision (e.g., transitioning to a proper PostgreSQL backend + resilient HTTP clients) for a highly scaled production deployment. FastAPI remains the HTTP surface strictly for testing and API Definition of Done.

## Follow-on (Sprint 5)
Cloud split-brain, WAL / busy_timeout, and **`maxReplicas: 1`** are documented and enforced under **[ADR 008](008-split-brain-state.md)** — do not reopen SQLite vs PostgreSQL here unless Sam unlocks production HA.

## Follow-on (2026-09-18): FastAPI is the single enforcement point (F8)
Decision point 2 above (Streamlit imports the service layer and writes SQLite directly) is **superseded**. It left two write paths, so the score gate, role checks and audit trail were only as strong as the weakest one, and the rules could drift apart (the UI path passed no `extra_context` to the drafter).

- The Streamlit UI now talks to FastAPI only, through `src/serving/client.py` (`FrictionGateClient`). It no longer imports `draft_store`, `create_draft`, the ops model or `score_raw_features`; `tests/serving/test_friction_gate_client.py` fails if it does.
- The API alone authenticates the demo role, re-scores, applies the ops gate (422 and no LLM call when unflagged), drafts, caps the rate and writes the audit row. New API surface: `GET /model/glass-box` and an audit-only `seconds_open` on `PATCH /drafts/{id}` so the fast-decide cue is still logged.
- **AppLocker exception (the original reason for this ADR):** set `FRICTION_GATE_MODE=inprocess` and the client drives the *same* FastAPI app through an ASGI test client with no socket. Nothing is re-implemented in the UI, so the gate still runs in the API code path. Off by default; the default `http` mode needs `uvicorn` running at `FRICTION_GATE_API_URL` (default `http://127.0.0.1:8000`).
- Still open (F8): role identity is the demo `X-Demo-Role` header (ADR 007, Entra ID later), and the database write credential is not yet API-only (SQLite file, ADR 008). Until then this is a code-path guarantee, not a network-level one.
