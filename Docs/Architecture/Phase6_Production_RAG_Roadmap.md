# Phase 6 / Production Roadmap: Advanced RAG Architecture

**Update (2026-09-22, [ADR 015](ADRs/015-hybrid-rag-rerank-fairness-consolidation.md)):** Section B (hybrid search) and section C (reranking) are implemented in a form that fits this project's constraints — BM25+dense fused with RRF, and an LLM-scored rerank pass instead of a managed reranker API — without standing up new infra. Section A (query rewriting) and section 3 (RAGAS evaluation gates) remain **not implemented**; the managed vector store / Azure AI Search migration in §B/§4 remains deferred as originally scoped here.

**Date:** 2026-07-17  
**Original context (2026-07-17):** ADR 010 used dense-or-TF-IDF retrieval. **Current implementation (ADR 015):** bounded chunks (≤1200 chars), BM25 offline, optional Azure embeddings + RRF fusion and LLM reranking, with a versioned disk cache. A dedicated cross-encoder, query rewriting and a measured retrieval/answer-quality evaluation remain unimplemented.

## 1. The Production Mandate
The Sprint 5 engine is a **deployable prototype** (no Chroma/FAISS; no whole-report stuffing). **Production still requires a richer retrieval pipeline before the LLM is trusted at scale** — including measured retrieval and answer quality. Hybrid fusion and LLM reranking have since been implemented; their presence alone does not establish quality.

A managed index and query rewriting are possible next steps if corpus size or measured retrieval failures justify them. The options below need evaluation on representative questions. A vector store or reranker does not guarantee retrieval quality.

## 2. Proposed architecture options (not current capabilities)

### A. Query Rewriting (Pre-Retrieval)
A lightweight LLM router could rewrite queries before retrieval. This is a proposed experiment.
*   **Purpose:** Resolves anaphora (e.g., "how does *it* work" -> "how does *the churn heuristic* work"), injects domain-specific synonyms, and expands the query into multiple search vectors.
*   **Measurement:** Compare rewritten and original queries on retrieval relevance, latency and cost.

### B. Hybrid Search Index (Vector + Keyword)
If the corpus outgrows the current in-memory hybrid index, evaluate a managed search service (e.g., Azure AI Search, Pinecone, or managed Qdrant) that bypasses local AppLocker installation constraints.
*   **Vector Search (Dense):** Captures semantic intent and conceptual similarities using embedding models (e.g., `text-embedding-3-small`).
*   **Keyword Search (Sparse/BM25):** Can retrieve exact terms such as "ADR 008" that dense retrieval may rank poorly; relevance and coverage still need measurement.
*   **Fusion:** Combines both scores using Reciprocal Rank Fusion (RRF) to retrieve the best candidates from both paradigms.

### C. Cross-Encoder Reranking (Post-Retrieval)
The initial Hybrid Search will return a broad set of candidate chunks.
*   **Mechanism:** A dedicated reranker model (e.g., Cohere Rerank or BGE-Reranker) will estimate a relevance score between the rewritten query and each retrieved chunk.
*   **Purpose:** A dedicated reranker scores query-passage pairs. Compare it with the existing LLM rerank on representative questions before claiming an accuracy gain.

## 3. Evaluation & Quality Gates
Before this system is trusted to generate answers, we must implement a RAGAS (RAG Assessment) evaluation pipeline.
*   **Context Precision & Recall:** We must measure whether the reranker successfully placed the exact correct chunks at the top of the context window.
*   **Faithfulness:** We must measure if the LLM's final answer is strictly derived from the retrieved chunks without hallucinating external knowledge.

## 4. Implementation Phasing (Post-Sprint 5)
1. **Infra Provisioning:** Stand up an Azure AI Search instance (or equivalent managed vector store) to avoid local DLL/AppLocker compilation blocks.
2. **Ingestion Pipeline:** Build a batch job to chunk `Docs/Final_Report_Official.md` (and future docs) with production chunker settings, embed via an embedding endpoint, and load into the hybrid index.
3. **Retrieval Pipeline:** Build the Query Rewriter -> Hybrid Search -> Reranker execution graph.
4. **Integration:** Hot-swap the `rag_engine.py` backend from the pure-Python matcher to the new API-driven retrieval graph.
