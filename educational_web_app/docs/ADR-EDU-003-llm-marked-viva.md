# ADR-EDU-003: LLM-Marked Explain-it Answers (supersedes part of ADR-EDU-001)

## Status

Accepted (2026-09-23) — amends [ADR-EDU-001](ADR-EDU-001-static-teaching-spa.md), which remains in force for
everything except Explain-it marking.

## Context

The Explain-it (viva) practice surface asked learners to grade their own free-text answers by ticking rubric
points. That is the weakest link in the study loop: the rubric is visible while you tick it, so it measures
generosity as much as recall, and it puts the marking chore on the person least able to be impartial about it.
Once Explain-it became part of the Mastery gate, a self-ticked pass was gating on nothing.

[ADR-EDU-001](ADR-EDU-001-static-teaching-spa.md) decided the teaching app ships fully static with no live LLM,
and explicitly rejected "Proxy to Azure OpenAI — secrets + TPM complexity". Two things have changed since:

1. The reasoning in ADR-EDU-001 was about adding a **second cloud provider** (Gemini) and about **learner
   secrets**. Marking through Meridian's own FastAPI service introduces neither — the SPA holds no key.
2. [ADR 015](../../Docs/Architecture/ADRs/015-hybrid-rag-rerank-fairness-consolidation.md) established FastAPI
   as the single enforcement point for every model- and Azure-touching action. A marker that calls the API is
   consistent with that; one that called Azure from the browser would not be.

ADR-EDU-001 already says learners run the real Streamlit/FastAPI stack when they want live Azure. This makes
one teaching feature do exactly that.

## Decision

Explain-it answers are **marked by `POST /viva/grade`** on the Meridian FastAPI service.

- **The SPA holds no secret and never calls Azure.** It posts `{prompt_id, prompt, rubric, answer}` and renders
  the verdict. The key stays server-side, as it does for drafts and RAG.
- **Marking is per-rubric-point entailment, not a score.** The model answers one question per point — "is this
  point actually made, and which sentence makes it?" — because that is an extraction task with an auditable
  result. Every `covered` verdict carries the learner's own sentence back as evidence, so a wrong mark is
  visible rather than hidden behind a number. The model is never asked for a holistic grade, which is where LLM
  marking is least reliable and would hand a learner false confidence.
- **A point the model omits or malforms defaults to not covered.** A marker that loses track of a point must
  not silently award it.
- **Unavailable is not failed.** Azure unconfigured, a malformed reply, or an error surviving the retry budget
  returns HTTP 200 with `available: false` and a reason. The SPA then shows a "marker offline" banner and falls
  back to the old self-check list, clearly labelled as not counting toward the Mastery gate. A guessed grade is
  worse than an honest "not marked".
- **Only marked passes clear a prompt.** `vivaCleared` reads the stored verdict, never the self-ticks.
- **Resilience follows [ADR 013](../../Docs/Architecture/ADRs/013-azure-openai-resilience-tenacity-telemetry.md):**
  Tenacity retries on transient errors, token telemetry through stdlib logging, no new provider and no new
  native dependency.
- **RBAC follows [ADR 007](../../Docs/Architecture/ADRs/007-demo-glass-box-rbac.md):** a new
  `use_viva_grader` permission, granted to all three demo roles for the same reason as `use_rag_assistant` —
  it is a read-only study aid, not a mutate action.
- **CORS is localhost-only**, no credentials, `Content-Type` and `X-Demo-Role` headers only. The teaching SPA
  runs on its own Vite origin; this is not a public CORS policy.

## Alternatives considered

1. **Keyword / regex rubric matcher, fully offline** — rejected as the primary mechanism. It grades phrasing,
   not substance: a correct point worded differently is marked wrong, and keyword-stuffing passes. For viva
   rehearsal that is the wrong signal and arguably worse than honest self-grading.
2. **SPA calls Azure directly with a learner-supplied key in `localStorage`** — rejected. Puts a key in a
   browser, gives no ZDR guarantee, and re-opens precisely the secrets concern ADR-EDU-001 raised.
3. **Require the API with no fallback at all** — rejected. The SPA is used offline and on the AppLocker
   machine; losing the whole surface when uvicorn is not running costs more than a clearly-labelled self-check.
4. **Keep self-grading and drop Explain-it from the gate** — rejected. The gate would then test recognition
   only, which is the gap this work exists to close.

## Consequences

- **Pro:** the weakest link in the study loop is gone; a cleared prompt now means a marker read the answer and
  found the points. Feedback names what is missing instead of leaving you to decide.
- **Pro:** no new provider, no new secret in the browser, no new native dependency; the marker rides the Azure
  deployment, retry policy and token telemetry that already exist.
- **Con:** the SPA is no longer fully self-contained for this one feature — clearing prompts needs the API
  running. The rest of the app is unchanged and still works offline.
- **Con:** the marker is an LLM, not an examiner. It can be wrong, and its verdict is visible-but-appealable
  only by rewriting and re-submitting. The evidence quotes exist so the learner can see when it is wrong.
- **Con:** this is still not proctored. Rubrics and model answers ship in the client bundle, so a learner who
  wants to paste the model answer can. It removes the chore and the temptation to tick generously; it does not
  turn a study tool into an exam, and the Mastery disclosure still says so.
- Local progress was reset (`meridian-edu-progress` v3 → v4): self-ticked passes cannot be mapped onto the
  stricter rule, so they are discarded rather than mis-credited.
- **Measured (2026-09-24):** a labelled benchmark (`tests/genai/viva_benchmark.json`: one strong and one weak
  answer for each of `v-calibration`, `v-learning-rate`, `v-test-discipline`, `v-rag-chunking`, 48 rubric-point
  labels) run live through `scripts/evaluate_viva_benchmark.py` (`npm run viva:benchmark`) scored **87.5%** label
  accuracy with `gpt-5-mini`, against an 80% bar. Small sample; the other seven prompts are not measured. The
  deployment change to a reasoning model also needed `chat_limit_params()` (`max_completion_tokens`, no
  temperature) in `viva_grader.py`, or every mark would have failed with HTTP 400.

## What would force a revisit

- Marking quality proves unreliable on real answers → tighten the prompt, or fall back to showing evidence
  without a pass/fail verdict.
- The SPA needs to be genuinely standalone again (public hosting with no API) → either drop the gate
  requirement or ship a small hosted marking endpoint, which would be a new ADR.
- Per-answer marking cost becomes material at classroom scale → batch rubric points into one call per answer
  (already the case) and cache verdicts per answer hash.

## Implementation map

| Concern | Path |
|---------|------|
| Marking logic | `src/genai/viva_grader.py` (`grade_answer`, `_verdicts_from_payload`) |
| Endpoint | `src/serving/app.py` → `POST /viva/grade` |
| Schemas | `src/serving/schemas.py` — `VivaGradeRequest` / `VivaGradeResponse` |
| RBAC | `src/serving/rbac.py` — `Permission.use_viva_grader` |
| CORS | `src/serving/app.py` — localhost-only `CORSMiddleware` |
| SPA client | `educational_web_app/src/lib/vivaGrader.ts` |
| Clear rule | `educational_web_app/src/content/viva.ts` — `vivaCleared` |
| SPA UI | `educational_web_app/src/modules/PracticeModule.tsx` |
| Tests | `tests/genai/test_viva_grader.py`, `tests/serving/test_api.py`, `tests/genai/test_viva_benchmark.py` (corpus shape) |
| Live benchmark | `scripts/evaluate_viva_benchmark.py` over `tests/genai/viva_benchmark.json` (`--require-live` to fail when Azure is absent) |
