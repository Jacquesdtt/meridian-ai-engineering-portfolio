# RAG Chunking Revision Plan

**Date:** 2026-07-17  
**Context:** Demo showed Methodology RAG expander returning near-whole-report context.  
**Attack note:** [rag_chunking_red_team.md](rag_chunking_red_team.md)  
**Sign-off:** Approved for implementation by Jacques (2026-07-17) — bugfix after live demo symptom.

## Checklist

| ID | Action | Status | Success criteria |
|----|--------|--------|------------------|
| RAG-CHUNK-01 | Implement | `[x]` | `_chunk_markdown` splits on `#`–`######` and paragraph-packs to ≤1200 chars |
| RAG-CHUNK-02 | Implement | `[x]` | Official-report retrieve (`top_k=3`) coverage &lt; 20% for ops-threshold query |
| RAG-CHUNK-03 | Implement | `[x]` | Cache `schema_version` bumped; stale schema rejected in `load_index_cache` |
| RAG-CHUNK-04 | Defer | `[~]` | Cross-encoder rerank → Phase 6 ([Phase6_Production_RAG_Roadmap.md](../Architecture/Phase6_Production_RAG_Roadmap.md)); Sprint 5 remains cosine / TF-IDF |
| RAG-CHUNK-05 | Cascade | `[x]` | ADR 010 · Official report §6.5 · walkthrough · progress · learnings · Jamie crib · presentation SoT · MEMORY |

## Implementation evidence
- `src/genai/rag_engine.py` — `_MAX_CHUNK_CHARS=1200`, `_CACHE_SCHEMA_VERSION=3`, `_pack_paragraphs`
- Tests: `test_chunk_markdown_splits_h3_and_bounds_size`, `test_cache_rejects_stale_schema_version` — suite green
- Probe: 44 chunks on Official report; ops-threshold coverage ~3.6% (was ~38%)
- Stale `Data/processed/rag_index_cache.json` deleted (rebuild on next Streamlit load)

## Doc cascade (this change)
| Doc | Update |
|-----|--------|
| [ADR 010](../Architecture/ADRs/010-applocker-safe-in-memory-rag.md) | Chunk + schema_version layers; amendment note |
| [Final_Report_Official.md](../Final_Report_Official.md) §6.5 | Chunking / cache / no-rerank honesty |
| [walkthrough.md](walkthrough.md) | §3d narrative |
| [progress.md](progress.md) | Shipped row + demo path corpus name |
| [ai_engineering_learnings.md](ai_engineering_learnings.md) | Process + technical entry |
| [04_jamie_demo_cheat_sheet.md](../StakeholderManagement/Meetings/04_jamie_demo_cheat_sheet.md) | Talk track |
| [Presentations/presentation.md](../Presentations/presentation.md) + `generate_presentation.py` | Current RAG state accuracy |
| [Engineering/Code_Walkthrough.md](../Engineering/Code_Walkthrough.md) (+ `.agents` mirror) | RAG engine row |
| `.agents/MEMORY.md` | Current state + next step |
