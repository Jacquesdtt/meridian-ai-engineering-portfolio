"""TDD tests for Sprint 5 RAG engine (ADR 010 + azure_rag revision plan).

Covers:
- TF-IDF retrieve (pure-Python, no vector DB)
- Disk index cache (RAG-04) with mtime invalidation
- Tenacity retries on Azure chat (RAG-01)
- Token usage telemetry (RAG-05)
"""
from __future__ import annotations

import json
import logging
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest

from src.genai import rag_engine


@pytest.fixture(autouse=True)
def _fast_tenacity_waits():
    """Unit tests should not sleep on exponential backoff."""
    from tenacity import wait_none

    original = rag_engine._chat_completions_create.retry.wait
    rag_engine._chat_completions_create.retry.wait = wait_none()
    yield
    rag_engine._chat_completions_create.retry.wait = original


@pytest.fixture
def sample_report(tmp_path: Path) -> Path:
    """Minimal markdown with two ## sections for TF-IDF retrieval."""
    report = tmp_path / "final_report.md"
    report.write_text(
        "# Title\n\n"
        "## Ops Threshold\n\n"
        "The operational contact threshold is approximately 0.701, chosen for "
        "precision under review capacity constraints. This is not the max-F1 cut.\n\n"
        "## Fairness\n\n"
        "Equalized odds and anti-discrimination narrative are required for Jamie "
        "before final presentation. Age bands were audited with Fairlearn.\n",
        encoding="utf-8",
    )
    return report


def test_build_index_and_retrieve_ops_threshold(sample_report: Path):
    index = rag_engine.build_index(
        str(sample_report), use_cache=False, prefer_embeddings=False
    )
    assert len(index.chunks) >= 2
    assert index.retrieval_mode == "tfidf"
    hits = rag_engine.retrieve("What is the operational contact threshold?", index, top_k=2)
    assert hits
    assert "0.701" in hits[0] or any("0.701" in h for h in hits)


def test_chunk_markdown_splits_h3_and_bounds_size():
    """Regression: H2-only chunking made whole sections the 'context' (full-report feel)."""
    report = Path("Docs/Final_Report_Official.md")
    if not report.is_file():
        pytest.skip("Final_Report_Official.md not present")
    content = report.read_text(encoding="utf-8")
    chunks = rag_engine._chunk_markdown(content)
    assert len(chunks) >= 20, f"expected H3-aware chunks, got {len(chunks)}"
    assert max(len(c) for c in chunks) <= rag_engine._MAX_CHUNK_CHARS
    # Top-k retrieve must not dump a majority of the report into the prompt.
    index = rag_engine.build_index(
        str(report), use_cache=False, prefer_embeddings=False
    )
    hits = rag_engine.retrieve("What is the operational contact threshold?", index, top_k=3)
    assert hits
    coverage = sum(len(h) for h in hits) / max(1, len(content))
    assert coverage < 0.20, f"retrieved coverage {coverage:.2%} too high (coarse chunks)"


def test_cache_rejects_stale_schema_version(sample_report: Path, tmp_path: Path):
    """Chunker upgrades must invalidate disk cache even when source mtime is unchanged."""
    cache_path = tmp_path / "rag_index_cache.json"
    index = rag_engine.build_index(
        str(sample_report),
        cache_path=cache_path,
        use_cache=True,
        prefer_embeddings=False,
    )
    payload = json.loads(cache_path.read_text(encoding="utf-8"))
    payload["schema_version"] = 1  # older than current
    cache_path.write_text(json.dumps(payload), encoding="utf-8")
    loaded = rag_engine.load_index_cache(cache_path, sample_report)
    assert loaded is None
    # Rebuild still works and writes current schema.
    rebuilt = rag_engine.build_index(
        str(sample_report),
        cache_path=cache_path,
        use_cache=True,
        prefer_embeddings=False,
    )
    assert len(rebuilt.chunks) == len(index.chunks)
    fresh = json.loads(cache_path.read_text(encoding="utf-8"))
    assert fresh["schema_version"] == rag_engine._CACHE_SCHEMA_VERSION


def test_index_cache_roundtrip_avoids_rebuild(sample_report: Path, tmp_path: Path):
    cache_path = tmp_path / "rag_index_cache.json"
    index1 = rag_engine.build_index(
        str(sample_report),
        cache_path=cache_path,
        use_cache=True,
        prefer_embeddings=False,
    )
    assert cache_path.is_file()
    payload = json.loads(cache_path.read_text(encoding="utf-8"))
    assert "index" in payload and "chunks" in payload["index"]
    assert "source_mtime" in payload

    index2 = rag_engine.build_index(
        str(sample_report),
        cache_path=cache_path,
        use_cache=True,
        prefer_embeddings=False,
    )
    assert index2.model_dump() == index1.model_dump()


def test_index_cache_invalidates_on_mtime_change(sample_report: Path, tmp_path: Path):
    cache_path = tmp_path / "rag_index_cache.json"
    rag_engine.build_index(
        str(sample_report),
        cache_path=cache_path,
        use_cache=True,
        prefer_embeddings=False,
    )
    sample_report.write_text(
        "# Title\n\n## New Section\n\nCompletely different content about calibration "
        "and precision recall curves for Meridian Savings churn.\n",
        encoding="utf-8",
    )
    index = rag_engine.build_index(
        str(sample_report),
        cache_path=cache_path,
        use_cache=True,
        prefer_embeddings=False,
    )
    blob = " ".join(c.content for c in index.chunks)
    assert "calibration" in blob.lower() or "precision" in blob.lower()


def test_embedding_index_cached_and_retrieves(monkeypatch: pytest.MonkeyPatch, sample_report: Path, tmp_path: Path):
    """ADR 010: dense embeddings via Azure; RAG-04 caches vectors to disk."""
    monkeypatch.setattr(
        rag_engine.config,
        "azure_openai_endpoint",
        "https://example.openai.azure.com",
        raising=False,
    )
    monkeypatch.setattr(rag_engine.config, "azure_openai_api_key", "k", raising=False)
    monkeypatch.setattr(
        rag_engine.config,
        "azure_openai_embedding_deployment",
        "text-embedding-3-large",
        raising=False,
    )

    # Two orthogonal unit vectors so cosine ranking is deterministic.
    vec_a = [1.0, 0.0, 0.0]
    vec_b = [0.0, 1.0, 0.0]
    call_n = {"n": 0}

    def fake_embed(client, texts, *, model):
        call_n["n"] += 1
        out = []
        for t in texts:
            if "0.701" in t or "threshold" in t.lower():
                out.append(vec_a)
            elif "Fairness" in t or "Equalized" in t:
                out.append(vec_b)
            else:
                # query about threshold → closer to vec_a
                out.append([0.9, 0.1, 0.0] if "threshold" in t.lower() else vec_b)
        return out

    monkeypatch.setattr(rag_engine, "_embed_texts", fake_embed)
    cache_path = tmp_path / "emb_cache.json"
    index = rag_engine.build_index(
        str(sample_report),
        cache_path=cache_path,
        use_cache=True,
        prefer_embeddings=True,
    )
    assert index.retrieval_mode == "embedding"
    assert cache_path.is_file()
    first_calls = call_n["n"]
    # Second build hits cache — no new embed batch for documents
    index2 = rag_engine.build_index(
        str(sample_report),
        cache_path=cache_path,
        use_cache=True,
        prefer_embeddings=True,
    )
    assert index2.retrieval_mode == "embedding"
    assert call_n["n"] == first_calls

    hits = rag_engine.retrieve("Tell me about the ops threshold 0.701", index2, top_k=1)
    assert hits
    assert "0.701" in hits[0]


def test_ask_rag_bot_retries_on_rate_limit(monkeypatch: pytest.MonkeyPatch):
    """RAG-01: 429 / RateLimitError must retry via tenacity before succeeding."""
    import httpx
    from openai import RateLimitError

    monkeypatch.setattr(
        rag_engine.config,
        "azure_openai_endpoint",
        "https://example.openai.azure.com",
        raising=False,
    )
    monkeypatch.setattr(rag_engine.config, "azure_openai_api_key", "test-key", raising=False)
    monkeypatch.setattr(rag_engine.config, "azure_openai_deployment", "gpt-4o-mini", raising=False)

    calls = {"n": 0}

    def _rate_limit() -> RateLimitError:
        request = httpx.Request("POST", "https://example.openai.azure.com/v1/chat/completions")
        response = httpx.Response(429, request=request)
        return RateLimitError("rate limited", response=response, body=None)

    def flaky_create(**kwargs):
        calls["n"] += 1
        if calls["n"] < 3:
            raise _rate_limit()
        usage = SimpleNamespace(prompt_tokens=10, completion_tokens=5, total_tokens=15)
        msg = SimpleNamespace(content="Grounded answer about the 0.701 threshold.")
        choice = SimpleNamespace(message=msg)
        return SimpleNamespace(choices=[choice], usage=usage)

    mock_client = MagicMock()
    mock_client.chat.completions.create.side_effect = flaky_create

    with patch.object(rag_engine, "_make_openai_client", return_value=mock_client):
        answer = rag_engine.ask_rag_bot(
            "What is the ops threshold?",
            ["The operational contact threshold is approximately 0.701."],
        )

    assert "0.701" in answer or "threshold" in answer.lower()
    assert calls["n"] == 3


def test_ask_rag_bot_logs_token_usage(monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture):
    """RAG-05: prompt_tokens / completion_tokens must appear in logs."""
    monkeypatch.setattr(
        rag_engine.config,
        "azure_openai_endpoint",
        "https://example.openai.azure.com",
        raising=False,
    )
    monkeypatch.setattr(rag_engine.config, "azure_openai_api_key", "k", raising=False)
    monkeypatch.setattr(rag_engine.config, "azure_openai_deployment", "gpt-4o-mini", raising=False)

    usage = SimpleNamespace(prompt_tokens=42, completion_tokens=7, total_tokens=49)
    msg = SimpleNamespace(content="Answer from context.")
    completion = SimpleNamespace(
        choices=[SimpleNamespace(message=msg)],
        usage=usage,
    )
    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = completion

    with patch.object(rag_engine, "_make_openai_client", return_value=mock_client):
        with caplog.at_level(logging.INFO, logger="src.genai.rag_engine"):
            rag_engine.ask_rag_bot("Q?", ["context chunk about churn"])

    joined = " ".join(r.message for r in caplog.records)
    assert "prompt_tokens" in joined
    assert "42" in joined
    assert "completion_tokens" in joined


def test_ask_rag_bot_without_azure_returns_message(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(
        type(rag_engine.config),
        "azure_configured",
        property(lambda self: False),
    )
    out = rag_engine.ask_rag_bot("Q?", ["some context"])
    assert "not configured" in out.lower()


# --- ADR 015: hybrid search (BM25 + dense RRF) + reranking -----------------


def test_bm25_scores_exact_term_match_over_unrelated_chunk(sample_report: Path):
    """BM25 (not naive tf-sum) should clearly separate matching vs unrelated chunks."""
    index = rag_engine.build_index(str(sample_report), use_cache=False, prefer_embeddings=False)
    threshold_chunk = next(c for c in index.chunks if "0.701" in c.content)
    fairness_chunk = next(c for c in index.chunks if "Fairlearn" in c.content)
    query_tokens = rag_engine._tokenize("What is the operational contact threshold?")
    s_hit = rag_engine._bm25_score(query_tokens, threshold_chunk, index.idf, index.avg_doc_len)
    s_miss = rag_engine._bm25_score(query_tokens, fairness_chunk, index.idf, index.avg_doc_len)
    assert s_hit > 0
    assert s_hit > s_miss


def test_reciprocal_rank_fusion_prefers_ids_both_rankings_agree_on():
    dense = [3, 1, 2]
    sparse = [1, 3, 4]
    fused = rag_engine._reciprocal_rank_fusion([dense, sparse])
    # id 1 and 3 both appear near the top of both rankings -> should out-rank id 2/4.
    assert fused[0] in (1, 3)
    assert set(fused[:2]) == {1, 3}


def test_retrieve_hybrid_fuses_dense_and_bm25(monkeypatch: pytest.MonkeyPatch, sample_report: Path):
    """When an index has both signals, retrieve() must not silently drop BM25."""
    monkeypatch.setattr(
        rag_engine.config, "azure_openai_endpoint", "https://example.openai.azure.com", raising=False
    )
    monkeypatch.setattr(rag_engine.config, "azure_openai_api_key", "k", raising=False)

    def fake_embed(client, texts, *, model):
        # Deliberately uninformative dense signal (all identical vectors) so a
        # correct result here can only come from the fused BM25 ranking.
        return [[1.0, 0.0] for _ in texts]

    monkeypatch.setattr(rag_engine, "_embed_texts", fake_embed)
    index = rag_engine.build_index(str(sample_report), use_cache=False, prefer_embeddings=True)
    assert index.retrieval_mode == "embedding"

    hits = rag_engine.retrieve("What is the operational contact threshold?", index, top_k=1)
    assert hits and "0.701" in hits[0]


def test_rerank_with_llm_reorders_by_score(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(
        rag_engine.config, "azure_openai_endpoint", "https://example.openai.azure.com", raising=False
    )
    monkeypatch.setattr(rag_engine.config, "azure_openai_api_key", "k", raising=False)

    candidates = ["irrelevant passage", "the answer is 0.701", "also irrelevant"]

    def fake_create(**kwargs):
        msg = SimpleNamespace(
            content=json.dumps(
                [{"index": 0, "score": 1}, {"index": 1, "score": 9}, {"index": 2, "score": 2}]
            )
        )
        return SimpleNamespace(choices=[SimpleNamespace(message=msg)], usage=None)

    mock_client = MagicMock()
    mock_client.chat.completions.create.side_effect = fake_create

    with patch.object(rag_engine, "_make_openai_client", return_value=mock_client):
        ordered = rag_engine._rerank_with_llm("threshold?", candidates, top_k=2)

    assert ordered[0] == "the answer is 0.701"
    assert len(ordered) == 2


def test_rerank_with_llm_falls_back_on_bad_json(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(
        rag_engine.config, "azure_openai_endpoint", "https://example.openai.azure.com", raising=False
    )
    monkeypatch.setattr(rag_engine.config, "azure_openai_api_key", "k", raising=False)
    candidates = ["a", "b", "c"]

    def fake_create(**kwargs):
        msg = SimpleNamespace(content="not json at all")
        return SimpleNamespace(choices=[SimpleNamespace(message=msg)], usage=None)

    mock_client = MagicMock()
    mock_client.chat.completions.create.side_effect = fake_create

    with patch.object(rag_engine, "_make_openai_client", return_value=mock_client):
        ordered = rag_engine._rerank_with_llm("q", candidates, top_k=3)

    assert ordered == candidates  # fused order preserved, never crashes


def test_rerank_skipped_without_azure(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(
        type(rag_engine.config), "azure_configured", property(lambda self: False)
    )
    candidates = ["a", "b"]
    assert rag_engine._rerank_with_llm("q", candidates, top_k=2) == candidates


def test_answer_question_composes_retrieve_and_ask(monkeypatch: pytest.MonkeyPatch, sample_report: Path, tmp_path: Path):
    monkeypatch.setattr(
        type(rag_engine.config), "azure_configured", property(lambda self: False)
    )
    result = rag_engine.answer_question(
        "What is the operational contact threshold?",
        str(sample_report),
        top_k=2,
        cache_path=tmp_path / "cache.json",
        use_rerank=True,
    )
    assert isinstance(result, rag_engine.RagAnswer)
    assert result.sources
    assert result.retrieval_mode == "tfidf"
    assert result.hybrid is False
    assert result.reranked is False  # no Azure configured -> rerank skipped
    assert "not configured" in result.answer.lower()
