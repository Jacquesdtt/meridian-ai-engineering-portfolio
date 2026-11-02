# ADR 015: Hybrid Search + Reranking, Fairness Consolidation, FastAPI for RAG (F8 follow-up)

**Date:** 2026-09-22
**Status:** Accepted
**Related:** [ADR 010](010-applocker-safe-in-memory-rag.md) · [ADR 012](012-fairness-and-compliance-guardrails.md) · [Phase 6 RAG roadmap](../Phase6_Production_RAG_Roadmap.md) · [F8 commit](../../../) (`feat: make FastAPI the single enforcement point for Friction-Gate drafts`)

## Context
Three gaps were called out for closure:

1. **Hybrid search + reranking.** ADR 010 shipped dense-*or*-sparse retrieval (embeddings when Azure is up, TF-IDF fallback otherwise) — never both together — and explicitly deferred reranking to "Phase 6". The [Phase 6 roadmap](../Phase6_Production_RAG_Roadmap.md) calls for dense+BM25 fusion (RRF) and cross-encoder reranking, but assumes new infra (Azure AI Search, Cohere Rerank / BGE-Reranker) that is out of scope and, per ADR 001/010, risks AppLocker-blocked native installs.
2. **Fairness consolidation.** The only fairness computation is the Sprint 2 notebook, writing `Docs/Sprint2/reports/fairlearn_equalized_odds.json`. Several docs (`ai_bp_learnings.md`, `Model_Card.md`, the Streamlit dashboard) quote its numbers by hand with no code path back to the source — which already caused one real drift, caught in red-team review RT-J-04 (`Docs/StakeholderManagement/Meetings/06_jamie_serving_readiness_red_team.md`).
3. **FastAPI as the single enforcement point.** F8 made this true for scoring and drafts — the Streamlit UI now only calls `FrictionGateClient`, never `draft_store` / the ops model directly. The Methodology Q&A (RAG) bot was the one remaining exception: it called `rag_engine.build_index/retrieve/ask_rag_bot` straight from `Code/Sprint3/friction_gate_app.py`, bypassing FastAPI (and its RBAC/audit gate) entirely.

## Decision

### Hybrid search (dense + BM25, fused with RRF)
`src/genai/rag_engine.py` now always builds **both** signals in one `build_index()` call: real Okapi BM25 (`_bm25_score` — raw term counts + `doc_len`, replacing the old ungrounded tf·idf sum) and, when Azure is configured, dense embeddings. `retrieve()` ranks each signal independently (`_rank_bm25_ids`, `_rank_embedding_ids`) and fuses them with **Reciprocal Rank Fusion** (`_reciprocal_rank_fusion`) — no managed vector store required, because both rankings already live in the same in-memory index. When only one signal is available (offline, or a failed query-embed call) that ranking is used directly; behavior degrades, it never hard-fails.

### Reranking, without a new native dependency
`_rerank_with_llm` reuses the **same Azure chat deployment** already wired for grounded answers (Tenacity-retried, same as `ask_rag_bot`) to score the fused candidate pool's relevance to the query in one call, then reorders. This gets the cross-encoder's core benefit — scoring query and document *together* rather than via cosine similarity of separately-computed vectors — without adding Cohere/BGE-Reranker/rank_bm25/sentence-transformers, all of which either need a paid API or a native model download blocked by the same AppLocker constraint ADR 010 exists to route around. Any failure (bad JSON, Azure down, timeout) falls back to the fused hybrid order — an answer is never blocked on a flaky reranker.

`_CACHE_SCHEMA_VERSION` bumped 3→4: `DocumentChunk.tf` changed meaning (raw counts, not normalized frequency) to support BM25, so old disk caches are invalidated rather than silently misread.

### Fairness: one canonical accessor
`src/serving/fairness.py` is now the only thing that reads `Docs/Sprint2/reports/fairlearn_equalized_odds.json`. It is exposed via `GET /model/fairness` (same `view_glass_box` RBAC gate as `/model/glass-box`, since both are ADR 012 disclosure surfaces) and consumed by the Streamlit Glass-box page through `FrictionGateClient.fairness()` — replacing a static prose sentence with the live numbers. This does not touch the Sprint 2 notebook or `educational_web_app`'s existing `export_teaching_data.py` pipeline (which already has its own correct single-source pattern for the SPA); it closes the gap for every *other* Python/dashboard consumer that previously had no shared code path to the report.

### RAG through FastAPI (F8 completed)
`POST /rag/ask` (gated by a new `use_rag_assistant` permission, granted to all three demo roles — it is read-only methodology Q&A, not a mutate action) wraps `rag_engine.answer_question()`, a new composed helper (`build_index` → hybrid `retrieve(use_rerank=True)` → `ask_rag_bot`). `Code/Sprint3/friction_gate_app.py` no longer imports `rag_engine` at all — the Methodology Q&A Bot page calls `FrictionGateClient.ask_rag()`, exactly like every other Friction-Gate action. FastAPI is now the single enforcement point for every model-touching or Azure-touching action, with no remaining dashboard-only path.

## Alternatives considered
1. **Stand up Azure AI Search / a managed vector store now**, per the Phase 6 roadmap's literal text — rejected as premature infra for this stage; would invent a dependency not yet deployed, same anti-speculation reasoning ADR 010 used to reject Chroma/FAISS.
2. **Cohere Rerank / BGE-Reranker** — rejected for now: either a new paid external API or a native model download, both against the AppLocker-safe constraint. The LLM-rerank approach is the pragmatic middle ground and is swappable later without changing `retrieve()`'s public shape.
3. **Leave fairness as hand-copied prose** — rejected; it already drifted once (RT-J-04) and will again without a single code path.

## Consequences
* **Pros:** Hybrid retrieval and reranking now measurably improve over cosine-only ranking, with zero new infra or native dependencies; fairness numbers cannot silently drift between the API/dashboard and the source report; RAG is now under the same RBAC/audit-capable enforcement point as scoring and drafts.
* **Cons:** The reranker is an LLM call, not a purpose-built cross-encoder — it adds one Azure chat round-trip per query and is best-effort accuracy, not a benchmarked reranking model. BM25 and dense signals are still capped by the same in-memory, single-document scope as ADR 010 (no multi-document corpus, no Azure AI Search) — that remains genuine future work if the corpus grows.

## What would force a revisit
* Corpus grows beyond one report, or query volume makes per-query LLM reranking too slow/costly → swap in a real cross-encoder or managed hybrid search service (Phase 6 roadmap's original shape); `retrieve()`/`_rerank_with_llm` are isolated enough to replace independently.
* RAGAS-style precision/recall/faithfulness measurement (Phase 6 roadmap §3) is still not implemented — still open.

## Implementation map
| Concern | Path |
|---------|------|
| Hybrid retrieval + rerank | `src/genai/rag_engine.py` (`_bm25_score`, `_rank_bm25_ids`, `_rank_embedding_ids`, `_reciprocal_rank_fusion`, `_rerank_with_llm`, `answer_question`) |
| RAG endpoint | `src/serving/app.py` → `POST /rag/ask` |
| Fairness accessor | `src/serving/fairness.py` |
| Fairness endpoint | `src/serving/app.py` → `GET /model/fairness` |
| RBAC | `src/serving/rbac.py` — `Permission.use_rag_assistant` |
| Client | `src/serving/client.py` — `ask_rag()`, `fairness()` |
| UI | `Code/Sprint3/friction_gate_app.py` — Methodology Q&A Bot + Glass-box fairness table |
| Tests | `tests/genai/test_rag_engine.py`, `tests/serving/test_api.py` |
