# Phase 6 / Production Roadmap: Advanced RAG Architecture

**Update (2026-09-22, [ADR 015](ADRs/015-hybrid-rag-rerank-fairness-consolidation.md)):** Section B (hybrid search) and section C (reranking) are implemented in a form that fits this project's constraints — BM25+dense fused with RRF, and an LLM-scored rerank pass instead of a managed reranker API — without standing up new infra. Section A (query rewriting) and section 3 (RAGAS evaluation gates) remain **not implemented**; the managed vector store / Azure AI Search migration in §B/§4 remains deferred as originally scoped here.

**Date:** 2026-07-17  
**Context:** Sprint 5 ships an AppLocker-safe RAG engine ([ADR 010](ADRs/010-applocker-safe-in-memory-rag.md)): Azure embeddings + pure-Python cosine over **bounded** markdown chunks (≤1200 chars), TF-IDF offline, disk cache with `schema_version`. That is enough for demo grounding; production still needs hybrid search + **cross-encoder reranking** + measured retrieval quality.

## 1. The Production Mandate
The Sprint 5 engine is a **deployable prototype** (no Chroma/FAISS; no whole-report stuffing). **Production still requires a richer retrieval pipeline before the LLM is trusted at scale** — especially reranking and hybrid fusion, which Sprint 5 explicitly deferred.

To safely scale this system, we must migrate to a true vector-backed architecture that incorporates Hybrid Search, Reranking, and Query Rewriting. This ensures we can measure and guarantee retrieval quality independently of the LLM generation phase.

## 2. Target Architecture Components

### A. Query Rewriting (Pre-Retrieval)
Before a user's raw query hits the index, it must be intercepted and rewritten by a lightweight LLM router.
*   **Purpose:** Resolves anaphora (e.g., "how does *it* work" -> "how does *the churn heuristic* work"), injects domain-specific synonyms, and expands the query into multiple search vectors.
*   **Measurement:** Ensures the search engine receives highly optimized, context-aware keywords and embeddings.

### B. Hybrid Search Index (Vector + Keyword)
We must replace the in-memory string matcher with a managed enterprise vector database (e.g., Azure AI Search, Pinecone, or managed Qdrant) that bypasses local AppLocker installation constraints.
*   **Vector Search (Dense):** Captures semantic intent and conceptual similarities using embedding models (e.g., `text-embedding-3-small`).
*   **Keyword Search (Sparse/BM25):** Ensures highly specific domain terms, acronyms, or exact stakeholder names (e.g., "Morgan", "ADR 008") are never missed by the semantic fuzziness of vector search.
*   **Fusion:** Combines both scores using Reciprocal Rank Fusion (RRF) to retrieve the best candidates from both paradigms.

### C. Cross-Encoder Reranking (Post-Retrieval)
The initial Hybrid Search will return a broad set of candidate chunks.
*   **Mechanism:** A dedicated reranker model (e.g., Cohere Rerank or BGE-Reranker) will compute an exact relevance score between the rewritten query and each retrieved chunk.
*   **Purpose:** Rerankers evaluate the interaction between every token in the query and every token in the document, providing massively superior accuracy compared to standard cosine similarity. It filters out tangential noise before the context window is populated.

## 3. Evaluation & Quality Gates
Before this system is trusted to generate answers, we must implement a RAGAS (RAG Assessment) evaluation pipeline.
*   **Context Precision & Recall:** We must measure whether the reranker successfully placed the exact correct chunks at the top of the context window.
*   **Faithfulness:** We must measure if the LLM's final answer is strictly derived from the retrieved chunks without hallucinating external knowledge.

## 4. Implementation Phasing (Post-Sprint 5)
1. **Infra Provisioning:** Stand up an Azure AI Search instance (or equivalent managed vector store) to avoid local DLL/AppLocker compilation blocks.
2. **Ingestion Pipeline:** Build a batch job to chunk `Docs/Final_Report_Official.md` (and future docs) with production chunker settings, embed via an embedding endpoint, and load into the hybrid index.
3. **Retrieval Pipeline:** Build the Query Rewriter -> Hybrid Search -> Reranker execution graph.
4. **Integration:** Hot-swap the `rag_engine.py` backend from the pure-Python matcher to the new API-driven retrieval graph.
