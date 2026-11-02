# ADR 010: AppLocker-Safe RAG (Azure Embeddings + Pure-Python Rank)

**Date:** 2026-07-17  
**Status:** Accepted (amended 2026-07-17 — dense embed path; amended again 2026-07-17 — bounded chunking + cache schema)  
**Related:** [ADR 013](013-azure-openai-resilience-tenacity-telemetry.md) · [Phase 6 RAG roadmap](../Phase6_Production_RAG_Roadmap.md) · [Azure RAG plan](../../Sprint5/sprint5_azure_rag_revision_plan.md) · [chunking plan](../../Sprint5/rag_chunking_revision_plan.md)

## Context
Jamie and Sam both need a **methodology Q&A** surface in the Friction-Gate demo: “Why 0.701?”, “What fairness checks ran?”, grounded in `Docs/Final_Report_Official.md` — not the model’s free recall.

Industry default is Chroma/FAISS. On this laptop those stacks need native C++/DLL install paths that **AppLocker blocks** (same class of failure as ADR 001). Separately, a shared Azure OpenAI resource will **429** if every Streamlit cold start re-embeds the report.

We need a design that is (1) deployable under AppLocker, (2) semantically better than keyword-only when Azure is up, (3) honest when Azure is down.

## Decision
**No local vector database.** Retrieval lives in `src/genai/rag_engine.py`:

| Layer | Choice | Why |
|-------|--------|-----|
| Embed | Azure `text-embedding-3-large` | Approved cloud path; no local native indexers |
| Chunk | ATX headers `#`–`######`, then paragraph pack ≤1200 chars | Avoids H2-only “whole chapter” chunks that looked like the full report in the UI |
| Rank | Pure-Python cosine (no cross-encoder rerank in Sprint 5) | AppLocker-safe; no FAISS/Chroma |
| Cache | `Data/processed/rag_index_cache.json` (mtime + model + **schema_version**) | Stops cold-start re-embed / TPM storms (RAG-04); schema bump invalidates after chunker changes |
| Answer | `gpt-4o-mini` grounded on retrieved chunks only | Hallucination control for Jamie |
| Offline | TF-IDF fallback | Demo/tests never hard-require network |

Streamlit Methodology tab loads via disk cache + `@st.cache_resource`. Retries/telemetry → **ADR 013**.

## Alternatives considered
1. **Chroma / FAISS / local LanceDB** — Rejected. Native deps trigger AppLocker; fails the “it must run in the demo environment” bar.
2. **TF-IDF only (no embeddings)** — Rejected as the *primary* path. Fine offline; too weak for Jamie’s “explain the methodology” questions when Azure is available. Kept as **fallback only**.
3. **Azure AI Search / managed vector store now** — Deferred to [Phase 6](../Phase6_Production_RAG_Roadmap.md). Correct for production scale; out of Sprint 5 scope and would invent infra we have not deployed (anti-speculation).
4. **Re-embed on every UI rerun** — Rejected. Burns shared TPM; flaky demos under rate limits.

## Trade-offs
We trade managed-vector polish and multi-doc scale for **guaranteed local demoability** and a **single-file cache**. That is the right trade for a prototype whose binding constraint is AppLocker + one shared Azure resource — not corpus size.

## What would force a revisit
*   AppLocker policy changes and a managed vector service is available → execute Phase 6.
*   Corpus grows beyond one report and JSON cache becomes unwieldy → managed index.
*   Jamie requires citation-level audit of every chunk shown → add explicit citation IDs to the UI (product change, not this ADR’s core).

## Consequences
*   **Pros:** Deployable; grounded; cache-safe under shared TPM; offline-safe; retrieval units are section-sized (not whole chapters).
*   **Cons:** Not a production knowledge base; embedding quality depends on Azure; TF-IDF fallback is weaker; **no cross-encoder rerank** until Phase 6.

## Amendment (2026-09-22) — Hybrid search + reranking (ADR 015)
The original dense-or-TF-IDF retrieval is superseded by [ADR 015](015-hybrid-rag-rerank-fairness-consolidation.md): every index has BM25; Azure configuration can add dense embeddings, RRF fusion and an optional LLM-scored rerank pass. Offline retrieval uses BM25. A dedicated cross-encoder remains unimplemented. The API retains `tfidf` as its legacy keyword-only mode label.

## Amendment (2026-07-17) — Bounded chunking
**Problem:** H1/H2-only splits produced ~10 chapter chunks (max ~6k chars). With `top_k=3` the Streamlit expander looked like the full report ([attack note](../../Sprint5/rag_chunking_red_team.md)).

**Decision unchanged:** Still pure-Python cosine / TF-IDF, no vector DB. Chunking and cache invalidation refined inside this ADR:
* ATX `#`–`######` + paragraph pack ≤1200 chars
* `_CACHE_SCHEMA_VERSION` so mtime-stable source files still invalidate after chunker upgrades

## Implementation map
| Concern | Path |
|---------|------|
| Engine | `src/genai/rag_engine.py` |
| UI | `Code/Sprint3/friction_gate_app.py` → Methodology Q&A Bot |
| Cache | `Data/processed/rag_index_cache.json` (gitignored; schema_version + mtime + model) |
| Config | `AZURE_OPENAI_EMBEDDING_DEPLOYMENT` / `azure_openai_embedding_deployment` |
| Tests | `tests/genai/test_rag_engine.py` (incl. chunk bound + schema invalidation) |
| Attack / plan | [rag_chunking_red_team.md](../../Sprint5/rag_chunking_red_team.md) · [rag_chunking_revision_plan.md](../../Sprint5/rag_chunking_revision_plan.md) |

## Deployment note (2026-09-24)

The configured Azure chat deployment for answers and the optional rerank step is now `gpt-5-mini`; it replaced `gpt-4o-mini` in September 2026. Retrieval still uses `text-embedding-3-large` when Azure is available and falls back to BM25-only ranking offline. This updates the deployed model name, not the retrieval decision in this ADR; hybrid fusion and reranking are detailed in ADR 015.
