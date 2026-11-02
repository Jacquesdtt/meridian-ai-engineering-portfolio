"""Pure-Python Retrieval-Augmented Generation (RAG) Engine (ADR 010, ADR 015).

AppLocker-safe: no Chroma/FAISS. Retrieval uses Azure OpenAI embeddings
(``text-embedding-3-large``) with pure-Python cosine similarity when Azure is
configured; falls back to BM25 when offline so demos still work.

Sprint 5 red-team hardening (``sprint5_azure_rag_revision_plan.md``):
- RAG-01: Tenacity exponential backoff on Azure embedding + chat calls
- RAG-04: Disk-serialized index cache (JSON) keyed by source mtime + model
- RAG-05: Log ``prompt_tokens`` / ``completion_tokens`` (and embedding totals)

Phase 6 roadmap follow-through (ADR 015 — see
``Docs/Architecture/Phase6_Production_RAG_Roadmap.md``):
- Hybrid search: dense (embedding cosine) + sparse (BM25) fused with
  Reciprocal Rank Fusion (RRF) — both signals come from the *same* in-memory
  index, so no managed vector store is required to get hybrid retrieval.
- Reranking: an optional LLM-scored rerank pass over the fused candidate pool
  (``use_rerank=True``), reusing the existing Azure chat deployment instead of
  a new native cross-encoder dependency (AppLocker-safe, per ADR 010).

Example (offline BM25 retrieve)::

    from src.genai.rag_engine import build_index, retrieve
    index = build_index("Docs/Sprint4/final_report.md", use_cache=False)
    chunks = retrieve("What is the ops threshold?", index)
"""
from __future__ import annotations

import json
import logging
import math
import re
from collections import Counter
from pathlib import Path
from typing import Any, Optional

from pydantic import BaseModel, Field
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from src.core.config import config
from src.genai.azure_client import (
    call_with_key_fallback,
    chat_limit_params,
    make_openai_client,
)

logger = logging.getLogger(__name__)

_DEFAULT_CACHE_DIR = Path("Data") / "processed"
_DEFAULT_CACHE_NAME = "rag_index_cache.json"
# Bump when chunking / index shape changes so disk cache cannot serve stale chunks
# after a code upgrade that leaves the source markdown mtime unchanged.
# v4 (ADR 015): DocumentChunk.tf switched from normalized frequency to raw term
# counts + doc_len, required for real BM25 scoring — old caches are incompatible.
_CACHE_SCHEMA_VERSION = 4
_MAX_CHUNK_CHARS = 1200
_MIN_CHUNK_CHARS = 40
_BM25_K1 = 1.5
_BM25_B = 0.75
_RRF_K = 60


class DocumentChunk(BaseModel):
    """A chunk of markdown with raw term counts (BM25) and optional dense embedding."""

    id: int
    content: str
    tf: dict[str, float] = Field(default_factory=dict)  # raw term counts, not normalized
    doc_len: int = 0
    embedding: list[float] = Field(default_factory=list)


class RagIndex(BaseModel):
    """Retrieval index over document chunks (TF-IDF and/or dense embeddings)."""

    chunks: list[DocumentChunk]
    idf: dict[str, float] = Field(default_factory=dict)
    avg_doc_len: float = 0.0
    embedding_model: Optional[str] = None
    retrieval_mode: str = "tfidf"  # "tfidf" | "embedding"


class _CachedIndexPayload(BaseModel):
    """On-disk cache envelope — mtime + embedding model for invalidation."""

    source_path: str
    source_mtime: float
    index: RagIndex
    schema_version: int = _CACHE_SCHEMA_VERSION


def _tokenize(text: str) -> list[str]:
    """Simple alphanumeric tokenizer (drops pure-numeric tokens)."""
    return [w.lower() for w in re.findall(r"\w+", text) if not w.isnumeric()]


def _pack_paragraphs(text: str, *, max_chars: int) -> list[str]:
    """Greedily pack paragraphs into chunks no larger than ``max_chars``."""
    paras = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    if not paras:
        return []

    packed: list[str] = []
    buf = ""
    for para in paras:
        candidate = f"{buf}\n\n{para}".strip() if buf else para
        if len(candidate) <= max_chars:
            buf = candidate
            continue
        if buf and len(buf) >= _MIN_CHUNK_CHARS:
            packed.append(buf)
        if len(para) <= max_chars:
            buf = para
            continue
        # Hard-split a single oversized paragraph (tables, long lists).
        for i in range(0, len(para), max_chars):
            piece = para[i : i + max_chars].strip()
            if len(piece) >= _MIN_CHUNK_CHARS:
                packed.append(piece)
        buf = ""
    if buf and len(buf) >= _MIN_CHUNK_CHARS:
        packed.append(buf)
    return packed


def _chunk_markdown(content: str, *, max_chars: int = _MAX_CHUNK_CHARS) -> list[str]:
    """Split markdown into retrieval-sized chunks.

    Strategy (why this exists): H1/H2-only splits left whole chapters (e.g. §6
    Implementation ~6k chars) as a single "chunk". With ``top_k=3`` the expander
    then looked like the entire report. We split on any ATX header (#–######)
    and further pack oversized sections by paragraph to a max char budget.
    """
    if not content.strip():
        return []

    sections = re.split(r"(?=^#{1,6}\s+)", content, flags=re.MULTILINE)
    sections = [s.strip() for s in sections if s.strip()]

    chunks: list[str] = []
    for section in sections:
        if len(section) <= max_chars:
            if len(section) >= _MIN_CHUNK_CHARS:
                chunks.append(section)
            continue
        chunks.extend(_pack_paragraphs(section, max_chars=max_chars))
    return chunks


def _cosine(a: list[float], b: list[float]) -> float:
    """Pure-Python cosine similarity (ADR 010 — no FAISS)."""
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = 0.0
    na = 0.0
    nb = 0.0
    for x, y in zip(a, b):
        dot += x * y
        na += x * x
        nb += y * y
    if na <= 0.0 or nb <= 0.0:
        return 0.0
    return dot / (math.sqrt(na) * math.sqrt(nb))


def _build_tfidf_parts(raw_chunks: list[str]) -> tuple[list[DocumentChunk], dict[str, float], float]:
    """Build the sparse (BM25) index structures — raw term counts + doc length.

    Always computed, even when embeddings are also built, so every index
    carries both a dense and a sparse signal for hybrid retrieval (ADR 015).
    """
    chunks: list[DocumentChunk] = []
    doc_freq: Counter[str] = Counter()
    total_len = 0

    for i, text in enumerate(raw_chunks):
        tokens = _tokenize(text)
        if not tokens:
            continue
        total_len += len(tokens)
        counts = Counter(tokens)
        chunks.append(
            DocumentChunk(id=i, content=text, tf=dict(counts), doc_len=len(tokens))
        )
        for unique_term in set(tokens):
            doc_freq[unique_term] += 1

    n_docs = len(chunks)
    avg_doc_len = total_len / max(1, n_docs)
    # Robertson/Sparck-Jones BM25 idf (clamped >= 0 via the +1 inside the log).
    idf = {
        term: math.log((n_docs - df + 0.5) / (df + 0.5) + 1.0)
        for term, df in doc_freq.items()
    }
    return chunks, idf, avg_doc_len


def _bm25_score(
    query_tokens: list[str],
    chunk: DocumentChunk,
    idf: dict[str, float],
    avg_doc_len: float,
) -> float:
    """Okapi BM25 score of ``chunk`` for ``query_tokens`` (pure Python, no rank_bm25)."""
    if not query_tokens or not chunk.doc_len:
        return 0.0
    dl = chunk.doc_len
    norm = _BM25_K1 * (1 - _BM25_B + _BM25_B * dl / max(avg_doc_len, 1e-9))
    score = 0.0
    for term in query_tokens:
        freq = chunk.tf.get(term)
        if not freq:
            continue
        term_idf = idf.get(term, 0.0)
        score += term_idf * (freq * (_BM25_K1 + 1)) / (freq + norm)
    return score


def _default_cache_path() -> Path:
    """On-disk path for the RAG index cache (mtime-keyed; see ``load_index_cache``)."""
    return _DEFAULT_CACHE_DIR / _DEFAULT_CACHE_NAME


def load_index_cache(
    cache_path: Path,
    source_path: Path,
    *,
    embedding_model: Optional[str] = None,
) -> Optional[RagIndex]:
    """Load cached index if present and source mtime (+ model) still match."""
    if not cache_path.is_file():
        return None
    try:
        payload = _CachedIndexPayload.model_validate_json(
            cache_path.read_text(encoding="utf-8")
        )
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        logger.warning("RAG cache unreadable (%s); rebuilding", exc)
        return None

    try:
        current_mtime = source_path.stat().st_mtime
    except OSError:
        return None

    if payload.schema_version != _CACHE_SCHEMA_VERSION:
        logger.info(
            "RAG cache schema %s != %s; rebuilding",
            payload.schema_version,
            _CACHE_SCHEMA_VERSION,
        )
        return None
    if payload.source_mtime != current_mtime:
        logger.info("RAG cache stale (mtime changed); rebuilding")
        return None
    if embedding_model and payload.index.embedding_model != embedding_model:
        logger.info("RAG cache embedding model mismatch; rebuilding")
        return None

    logger.info(
        "RAG index loaded from cache %s (%d chunks, mode=%s)",
        cache_path,
        len(payload.index.chunks),
        payload.index.retrieval_mode,
    )
    return payload.index


def save_index_cache(
    index: RagIndex,
    cache_path: Path,
    source_path: Path,
    source_mtime: float,
) -> None:
    """Serialize index (incl. embeddings) to JSON for cold-start reuse."""
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    payload = _CachedIndexPayload(
        source_path=str(source_path),
        source_mtime=source_mtime,
        index=index,
        schema_version=_CACHE_SCHEMA_VERSION,
    )
    cache_path.write_text(payload.model_dump_json(), encoding="utf-8")
    logger.info(
        "RAG index cached to %s (%d chunks, mode=%s)",
        cache_path,
        len(index.chunks),
        index.retrieval_mode,
    )


def _retryable_openai_errors() -> tuple[type[BaseException], ...]:
    """Lazy-import OpenAI transient error types for tenacity (RAG-01)."""
    from openai import APIConnectionError, APITimeoutError, InternalServerError, RateLimitError

    return (RateLimitError, APIConnectionError, APITimeoutError, InternalServerError)


def _make_openai_client(*, api_key: Optional[str] = None, timeout: float = 60.0) -> Any:
    """Build OpenAI-compatible client (patch point for unit tests)."""
    return make_openai_client(api_key=api_key, timeout=timeout)


def _log_token_usage(usage: Any, *, component: str) -> None:
    """RAG-05: surface token telemetry for cost and degradation monitoring."""
    if usage is None:
        logger.info("%s completion had no usage telemetry", component)
        return
    logger.info(
        "%s token usage prompt_tokens=%s completion_tokens=%s total_tokens=%s",
        component,
        getattr(usage, "prompt_tokens", None),
        getattr(usage, "completion_tokens", None),
        getattr(usage, "total_tokens", None),
    )


@retry(
    retry=retry_if_exception_type(_retryable_openai_errors()),
    wait=wait_exponential(multiplier=1, min=1, max=20),
    stop=stop_after_attempt(5),
    reraise=True,
)
def _chat_completions_create(client: Any, **kwargs: Any) -> Any:
    """Azure chat create with exponential backoff on 429/5xx/timeouts."""
    return client.chat.completions.create(**kwargs)


@retry(
    retry=retry_if_exception_type(_retryable_openai_errors()),
    wait=wait_exponential(multiplier=1, min=1, max=20),
    stop=stop_after_attempt(5),
    reraise=True,
)
def _embeddings_create(client: Any, **kwargs: Any) -> Any:
    """Azure embeddings create with exponential backoff (RAG-01)."""
    return client.embeddings.create(**kwargs)


def _embed_texts(client: Any, texts: list[str], *, model: str) -> list[list[float]]:
    """Embed a batch of texts; logs total_tokens when the API returns usage."""
    if not texts:
        return []
    response = _embeddings_create(client, model=model, input=texts)
    _log_token_usage(getattr(response, "usage", None), component="rag_embeddings")
    # OpenAI returns data sorted by index
    ordered = sorted(response.data, key=lambda d: d.index)
    return [list(item.embedding) for item in ordered]


def build_index(
    file_path: str,
    *,
    cache_path: Path | None = None,
    use_cache: bool = True,
    prefer_embeddings: bool = True,
) -> RagIndex:
    """Build (or load from disk) a retrieval index for a markdown file.

    When Azure is configured and ``prefer_embeddings`` is True, chunks are
    embedded via ``azure_openai_embedding_deployment`` and cached (ADR 010).
    Otherwise a TF-IDF-only index is built (offline / stub demos).

    Args:
        file_path: Absolute or relative path to the markdown document.
        cache_path: Optional JSON cache path.
        use_cache: When True, read/write the disk cache (RAG-04).
        prefer_embeddings: Prefer Azure dense retrieval when configured.

    Returns:
        A populated RagIndex Pydantic model.
    """
    path = Path(file_path)
    resolved_cache = cache_path if cache_path is not None else _default_cache_path()
    emb_model = (
        (config.azure_openai_embedding_deployment or "text-embedding-3-large")
        if (prefer_embeddings and config.azure_configured)
        else None
    )

    if use_cache and path.exists():
        cached = load_index_cache(
            resolved_cache, path, embedding_model=emb_model
        )
        if cached is not None:
            # Offline cache may be TF-IDF; accept it when embeddings unavailable.
            if emb_model is None or cached.retrieval_mode == "embedding":
                return cached

    if not path.exists():
        return RagIndex(chunks=[], idf={}, avg_doc_len=0.0)

    content = path.read_text(encoding="utf-8")
    raw_chunks = _chunk_markdown(content)
    chunks, idf, avg_doc_len = _build_tfidf_parts(raw_chunks)

    if emb_model and chunks:
        try:
            vectors = call_with_key_fallback(
                lambda client: _embed_texts(
                    client, [c.content for c in chunks], model=emb_model
                ),
                make_client=_make_openai_client,
                timeout=60.0,
            )
            for chunk, vec in zip(chunks, vectors):
                chunk.embedding = vec
            index = RagIndex(
                chunks=chunks,
                idf=idf,
                avg_doc_len=avg_doc_len,
                embedding_model=emb_model,
                retrieval_mode="embedding",
            )
        except Exception as exc:  # noqa: BLE001 — never block UI on embed failure
            logger.warning("Embedding index failed (%s); using TF-IDF fallback", exc)
            index = RagIndex(
                chunks=chunks,
                idf=idf,
                avg_doc_len=avg_doc_len,
                embedding_model=None,
                retrieval_mode="tfidf",
            )
    else:
        index = RagIndex(
            chunks=chunks,
            idf=idf,
            avg_doc_len=avg_doc_len,
            embedding_model=None,
            retrieval_mode="tfidf",
        )

    if use_cache and index.chunks:
        try:
            save_index_cache(index, resolved_cache, path, path.stat().st_mtime)
        except OSError as exc:
            logger.warning("Could not write RAG cache (%s)", exc)

    return index


def retrieve(
    query: str,
    index: RagIndex,
    top_k: int = 3,
    *,
    use_rerank: bool = False,
    rerank_pool_size: Optional[int] = None,
) -> list[str]:
    """Hybrid retrieve: dense (embedding) + sparse (BM25) fused via RRF (ADR 015).

    Both signals are computed from the same in-memory ``index`` — BM25
    structures (``tf``/``idf``/``doc_len``) are always built by ``build_index``,
    even when dense embeddings are also present — so hybrid fusion needs no
    extra network round-trip or managed vector store. When only one signal is
    available (offline BM25-only index, or a failed query embed call) that
    single ranking is used directly.

    ``use_rerank=True`` runs an additional LLM cross-encoder-style rerank pass
    (see ``_rerank_with_llm``) over the fused candidate pool before truncating
    to ``top_k`` — the Phase 6 roadmap's "post-retrieval reranking" step.
    """
    if not index.chunks:
        return []

    pool_size = rerank_pool_size or max(top_k * 3, top_k)
    query_tokens = _tokenize(query)
    bm25_ids = _rank_bm25_ids(query_tokens, index, pool_size)

    dense_ids: Optional[list[int]] = None
    if index.retrieval_mode == "embedding" and any(c.embedding for c in index.chunks):
        dense_ids = _rank_embedding_ids(query, index, pool_size)

    if dense_ids is None:
        fused_ids = bm25_ids
    elif not bm25_ids:
        fused_ids = dense_ids
    else:
        fused_ids = _reciprocal_rank_fusion([dense_ids, bm25_ids])

    by_id = {chunk.id: chunk for chunk in index.chunks}
    candidates = [by_id[cid].content for cid in fused_ids[:pool_size] if cid in by_id]

    if use_rerank and len(candidates) > top_k:
        candidates = _rerank_with_llm(query, candidates, top_k=top_k)

    return candidates[:top_k]


def _rank_bm25_ids(query_tokens: list[str], index: RagIndex, top_n: int) -> list[int]:
    """Sparse (BM25) ranking — chunk ids only, highest score first."""
    if not query_tokens:
        return []
    scored = [
        (_bm25_score(query_tokens, chunk, index.idf, index.avg_doc_len), chunk.id)
        for chunk in index.chunks
    ]
    scored = [(s, cid) for s, cid in scored if s > 0]
    scored.sort(key=lambda x: x[0], reverse=True)
    return [cid for _, cid in scored[:top_n]]


def _rank_embedding_ids(query: str, index: RagIndex, top_n: int) -> Optional[list[int]]:
    """Dense ranking via Azure embedding + cosine. ``None`` signals a failed embed
    (distinct from "no chunks matched"), so callers can fall back to BM25-only.
    """
    model = index.embedding_model or config.azure_openai_embedding_deployment or "text-embedding-3-large"
    try:
        q_vecs = call_with_key_fallback(
            lambda client: _embed_texts(client, [query], model=model),
            make_client=_make_openai_client,
            timeout=60.0,
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("Query embedding failed (%s); dense ranking unavailable", exc)
        return None

    if not q_vecs:
        return None
    q = q_vecs[0]
    scored = [
        (_cosine(q, chunk.embedding), chunk.id)
        for chunk in index.chunks
        if chunk.embedding
    ]
    scored = [(s, cid) for s, cid in scored if s > 0]
    scored.sort(key=lambda x: x[0], reverse=True)
    return [cid for _, cid in scored[:top_n]]


def _reciprocal_rank_fusion(rankings: list[list[int]], k: int = _RRF_K) -> list[int]:
    """Combine multiple ranked-id lists with Reciprocal Rank Fusion (RRF).

    ``score(id) = Σ 1 / (k + rank)`` over every ranking the id appears in — the
    standard hybrid-search fusion (Phase 6 roadmap §B). An id absent from a
    ranking simply contributes 0 from that ranking, so results found by only
    one retriever are not discarded, just ranked lower than results both
    retrievers agree on.
    """
    scores: dict[int, float] = {}
    for ranking in rankings:
        for rank, cid in enumerate(ranking):
            scores[cid] = scores.get(cid, 0.0) + 1.0 / (k + rank + 1)
    return [cid for cid, _ in sorted(scores.items(), key=lambda item: item[1], reverse=True)]


def _rerank_with_llm(query: str, candidates: list[str], *, top_k: int) -> list[str]:
    """LLM-scored rerank over the fused candidate pool (Phase 6 roadmap §C).

    A managed cross-encoder (Cohere Rerank / BGE-Reranker) needs either a paid
    API or a native model download — both out of reach under AppLocker (ADR
    001/010). This reuses the Azure chat deployment already wired for grounded
    answers to score each candidate's relevance to the query, which gives the
    same "look at query and document together" benefit as a cross-encoder
    without a new dependency. Any failure (bad JSON, Azure down, timeout)
    falls back to the fused hybrid order so a flaky reranker never blocks an
    answer.
    """
    if not config.azure_configured or len(candidates) <= 1:
        return candidates[:top_k]

    numbered = "\n\n".join(f"[{i}] {c}" for i, c in enumerate(candidates))
    messages = [
        {
            "role": "system",
            "content": (
                "You are a retrieval reranker. Score how relevant each numbered "
                "passage is to the query, from 0 (irrelevant) to 10 (directly "
                "answers it). Reply with ONLY a JSON array like "
                '[{"index": 0, "score": 7}, ...] — one entry per passage, no prose.'
            ),
        },
        {"role": "user", "content": f"QUERY: {query}\n\nPASSAGES:\n{numbered}"},
    ]
    try:
        model_name = config.azure_openai_deployment or "gpt-4o-mini"
        completion = call_with_key_fallback(
            lambda client: _chat_completions_create(
                client,
                model=model_name,
                messages=messages,
                **chat_limit_params(
                    model_name, max_tokens=400, reasoning_max_tokens=2000, temperature=0
                ),
            ),
            make_client=_make_openai_client,
            timeout=30.0,
        )
        _log_token_usage(getattr(completion, "usage", None), component="rag_rerank")
        raw = (completion.choices[0].message.content or "[]").strip()
        if raw.startswith("```"):
            raw = raw.strip("`")
            raw = raw.split("\n", 1)[1] if "\n" in raw else raw
        scored = json.loads(raw)
        ranked = sorted(scored, key=lambda item: item.get("score", 0), reverse=True)
        ordered = [
            candidates[item["index"]]
            for item in ranked
            if isinstance(item.get("index"), int) and 0 <= item["index"] < len(candidates)
        ]
        seen = set(ordered)
        ordered.extend(c for c in candidates if c not in seen)
        return ordered[:top_k]
    except Exception as exc:  # noqa: BLE001 — never block the answer on a bad rerank
        logger.warning("LLM rerank failed (%s); using fused hybrid order", exc)
        return candidates[:top_k]


def ask_rag_bot(query: str, context_chunks: list[str]) -> str:
    """Call Azure OpenAI strictly grounded on the retrieved context chunks."""
    if not config.azure_configured:
        return "Azure OpenAI is not configured. Please set credentials in .env."

    if not context_chunks:
        return "I could not find any relevant information in the methodology documents."

    context_str = "\n\n---\n\n".join(context_chunks)
    messages = [
        {
            "role": "system",
            "content": (
                "You are the Meridian AI Methodology Assistant. "
                "Answer the user's question STRICTLY based on the provided context below. "
                "If the answer is not contained in the context, say "
                "'I cannot answer this based on the available documentation.'\n\n"
                f"CONTEXT:\n{context_str}"
            ),
        },
        {"role": "user", "content": query},
    ]

    try:
        model_name = config.azure_openai_deployment or "gpt-4o-mini"
        completion = call_with_key_fallback(
            lambda client: _chat_completions_create(
                client,
                model=model_name,
                messages=messages,
                **chat_limit_params(model_name, max_tokens=500, reasoning_max_tokens=2500),
            ),
            make_client=_make_openai_client,
            timeout=60.0,
        )
        _log_token_usage(getattr(completion, "usage", None), component="rag_bot")
        return completion.choices[0].message.content or "No response generated."
    except Exception as exc:  # noqa: BLE001 — UI must never crash on LLM failure
        logger.exception("RAG Azure call failed")
        return f"Error communicating with Azure OpenAI: {exc}"


class RagAnswer(BaseModel):
    """Result of :func:`answer_question` — answer plus the chunks that grounded it."""

    answer: str
    sources: list[str]
    retrieval_mode: str
    hybrid: bool
    reranked: bool


def answer_question(
    query: str,
    doc_path: str,
    *,
    top_k: int = 3,
    cache_path: Optional[Path] = None,
    use_rerank: bool = True,
) -> RagAnswer:
    """One-call retrieve + answer, for the FastAPI ``/rag/ask`` route (ADR 015).

    Builds (or loads from disk cache) the index for ``doc_path``, retrieves via
    hybrid dense+BM25 fusion, optionally reranks, then asks the grounded bot.
    This is the single code path both the API and the Streamlit UI should use
    so retrieval/rerank behavior cannot drift between the two callers.
    """
    index = build_index(doc_path, cache_path=cache_path, use_cache=True)
    hybrid = index.retrieval_mode == "embedding" and any(c.embedding for c in index.chunks)
    chunks = retrieve(query, index, top_k=top_k, use_rerank=use_rerank)
    answer = ask_rag_bot(query, chunks)
    return RagAnswer(
        answer=answer,
        sources=chunks,
        retrieval_mode=index.retrieval_mode,
        hybrid=hybrid,
        reranked=use_rerank and config.azure_configured and len(chunks) > 1,
    )
