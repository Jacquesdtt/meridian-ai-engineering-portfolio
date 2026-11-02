# ADR 013: Azure OpenAI Resilience (Tenacity + Token Telemetry)

**Date:** 2026-07-17  
**Status:** Accepted  
**Related:** [ADR 010](010-applocker-safe-in-memory-rag.md) · [ADR 003](003-friction-as-a-feature-genai-gating.md) · [revision plan](../../Sprint5/sprint5_azure_rag_revision_plan.md) (RAG-01, RAG-05)

## Context
One Azure OpenAI resource serves **two** live GenAI surfaces:
1. Retention drafts (`drafter.py` → `gpt-4o-mini`) — Friction-Gate path Jamie already approved under ADR 003.
2. Methodology RAG (`rag_engine.py` → embeddings + chat) — ADR 010.

Red-team finding: an unretried **429/5xx** on that shared resource fails the demo mid-Approve flow and makes the Q&A bot look “broken compliance software.” Missing **token logs** means we cannot answer Morgan/Jamie’s “what did that call cost / did it silently degrade?” questions with evidence.

This is a **client-resilience** decision, not a monitoring-platform decision.

## Decision
1. Add pure-Python **`tenacity`** (no native extensions — AppLocker-safe).
2. Retry Azure `chat.completions.create` and `embeddings.create` with exponential backoff (max 5 attempts) on `RateLimitError`, `APIConnectionError`, `APITimeoutError`, `InternalServerError`.
3. Keep the **OpenAI-compatible client + `base_url`** pattern (enterprise gateway safe); do not add a second SDK just for retries.
4. After success, log `prompt_tokens` / `completion_tokens` / `total_tokens` via standard `logging`.
5. **Do not change product semantics:** draft path still stub-falls-back; RAG returns a safe error string; still **no `/send`**.

## Alternatives considered
1. **Manual `time.sleep` loops** — Rejected. Easy to fork inconsistently between drafter and RAG; hard to unit-test.
2. **Fail fast, no retry** — Rejected. Turns shared-TPM noise into a demo/compliance incident.
3. **Azure SDK built-in retry only** — Rejected as the sole strategy. We standardize on OpenAI-compatible clients for gateway routing; Tenacity keeps policy identical across call sites.
4. **Full APM / structlog / App Insights now** — Deferred. Prototype needs *visible* token counts in logs, not an undeployed observability stack (anti-speculation).

## Trade-offs
We accept **extra latency under sustained 429s** in exchange for **demo survivability** and a single, explainable retry policy. We accept **stdlib logs** instead of a metrics backend so we do not invent cloud ops we have not deployed.

## What would force a revisit
*   Sustained 429s even with backoff → raise quota / split deployments / circuit-breaker UX.
*   Jamie requires immutable audit of every token bill → export logs to a retained store (new ADR).
*   Gateway mandates a different retry header contract → adjust client, keep Tenacity policy intent.

## Consequences
*   **Pros:** Shared-resource demos degrade gracefully; one policy for two call sites; testable.
*   **Cons:** Retries can delay a draft a few seconds; logs are not a finance-grade cost system.

## Implementation map
| Concern | Path |
|---------|------|
| Drafter | `src/genai/drafter.py` |
| RAG | `src/genai/rag_engine.py` |
| Dependency | `tenacity` in `requirements.txt` |
| Tests | `tests/genai/test_azure_retries.py`, `tests/genai/test_rag_engine.py` |

## Deployment note (2026-09-24)

The accepted retry and telemetry policy now serves the configured `gpt-5-mini` chat deployment, which replaced `gpt-4o-mini` in September 2026; `text-embedding-3-large` remains the RAG embedding deployment. The implementation chooses token parameters by model family through `chat_limit_params()`; this model update did not change the resilience decision.
