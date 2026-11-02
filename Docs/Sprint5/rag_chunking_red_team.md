# RAG Chunking Red Team (Attack Note)

**Date:** 2026-07-17  
**Attacker:** Demo UI observation (Methodology Q&A expander) + agent diagnosis  
**Artifact:** `src/genai/rag_engine.py` → `_chunk_markdown` · Streamlit Methodology tab  
**Related:** [ADR 010](../Architecture/ADRs/010-applocker-safe-in-memory-rag.md) · [revision plan](rag_chunking_revision_plan.md)

## What was attacked
The Methodology RAG Bot “View Retrieved Context Chunks” expander appeared to dump the **entire Official report** as context, with no useful chunking or reranking.

## Findings

| ID | Severity | Finding | Evidence | Falsifier |
|----|----------|---------|----------|-----------|
| RAG-CHUNK-01 | **High** | Chunker split only on `#` / `##`, ignoring `###` | Official report: **10** chunks, max **~5896** chars (`## 6. Implementation`) | Chunk count ≥20 and max ≤1200 on Official report |
| RAG-CHUNK-02 | **High** | `top_k=3` of chapter-sized chunks ≈ majority of report in prompt/expander | Ops-threshold TF-IDF retrieve coverage **~37.7%** of 27k-char report | Coverage &lt; 20% for same query |
| RAG-CHUNK-03 | **Medium** | Disk cache had no `schema_version` gate | Chunker upgrades left mtime unchanged → stale index kept serving | Cache with `schema_version=1` rejected when current is `3` |
| RAG-CHUNK-04 | **Low** | No cross-encoder rerank in Sprint 5 | By design (ADR 010 / Phase 6) — cosine / TF-IDF only | N/A — deferred, not a bug |

## Not the bug
- Retrieval was not “disabled” — it ranked and returned `top_k=3`.
- Cache was not a single whole-document blob (10 chapter chunks already present).
- Empty greeting queries on TF-IDF return `[]`; live Azure path still embeds and ranks (expected).

## Outcome
Signed checklist executed → [rag_chunking_revision_plan.md](rag_chunking_revision_plan.md). Regression: `tests/genai/test_rag_engine.py::test_chunk_markdown_splits_h3_and_bounds_size`.
