# Azure OpenAI & RAG Red Team Revision Plan

**Date:** 2026-07-17
**Context:** Red-teaming the new Azure OpenAI configuration (sharing `gpt-4o-mini` and `text-embedding-3-large` on the same resource) and the proposed pure-Python RAG and Container Apps hosting setup.

## Attack Note (Findings)
1. **[CRITICAL]** Shared Azure OpenAI endpoint lacks rate-limit resilience; 429 errors will crash the RAG bot and the retention email Drafter.
2. **[CRITICAL]** Azure Container Apps shared SMB volume will cause SQLite `database is locked` corruption if scaled > 1 replica.
3. **[HIGH]** Pure-Python RAG without index caching will result in massive latency and spike embedding API costs on every cold start.
4. **[MEDIUM]** Lack of token telemetry and SQLite lock monitoring masks silent degradation.

## Revision Checklist

| ID | Action | Status | Description / Success Criteria |
|---|---|---|---|
| RAG-01 | Implement | `[x]` | **Rate Limiting:** Wrap all OpenAI client calls (embedding & generation) in `tenacity` exponential backoff retries. |
| RAG-02 | Implement | `[x]` | **SQLite Safety:** Add `?journal_mode=WAL&timeout=5000` to SQLite connection strings. |
| RAG-03 | Implement | `[x]` | **Scaling Lock:** Explicitly document/enforce `maxReplicas: 1` in Azure Container Apps configuration/ADR. |
| RAG-04 | Implement | `[x]` | **Index Caching:** The RAG module must serialize its pure-Python index to a local `.pkl` or `.json` file to avoid re-embedding `final_report.md` on startup. |
| RAG-05 | Implement | `[x]` | **Telemetry:** Add `structlog` or standard logging for token consumption (`prompt_tokens`, `completion_tokens`) and SQLite `OperationalError`. |

**Sign-off:** Approved for implementation by Jacques (2026-07-17).

## Implementation evidence (2026-07-17)
- `src/genai/rag_engine.py` — Azure embeddings + cosine + JSON disk cache + Tenacity chat + token logs
- `src/genai/drafter.py` — Tenacity + token logs on Azure retention drafts
- `src/serving/draft_store.py` — `PRAGMA journal_mode=WAL`, `busy_timeout=5000`, OperationalError logging
- `infra/azure-container-app.yaml` + `docker-compose.yml` `deploy.replicas: 1`
- **ADRs:** [008](../Architecture/ADRs/008-split-brain-state.md) amended · [010](../Architecture/ADRs/010-applocker-safe-in-memory-rag.md) amended · **[013](../Architecture/ADRs/013-azure-openai-resilience-tenacity-telemetry.md)** new · [006](../Architecture/ADRs/006-sqlite-and-in-process-ui-for-friction-gate.md) follow-on pointer
- Tests: `tests/genai/test_rag_engine.py`, `test_azure_retries.py`, `tests/serving/test_sqlite_wal.py` — suite **47 passed**
- Retrieval: Azure `text-embedding-3-large` + pure-Python cosine (ADR 010); TF-IDF offline fallback
- **Follow-on (2026-07-17):** Chunk granularity fix — [rag_chunking_red_team.md](rag_chunking_red_team.md) · [rag_chunking_revision_plan.md](rag_chunking_revision_plan.md) (bounded chunks + cache `schema_version`; not a new Azure/TPM finding)
