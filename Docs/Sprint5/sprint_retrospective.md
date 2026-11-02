# Sprint 5 Retrospective — Secure Cloud Deploy + GenAIOps Depth

**Maintenance reflection — 2026-10-20:** keep dated evidence separate from active status; the old close-time cloud checklist and marker next-step had drifted behind later results. Keep repeatable browser timing alongside build size, and record service failures honestly (current Azure 401). Stop treating automated checks as learner-trial evidence. Start future status reviews from `task.md` and the dated validation report. Skillification deferred: this pass introduces no recurring workflow beyond the existing docs-before-code/precommit rules. No architectural decision was made. Delivery details are in the [debrief addendum](sprint_debrief.md).

**Sprint goal:** Move the Friction-Gate stack toward cloud hosting and GenAIOps depth without reopening the model.
**Delivery record:** [sprint_debrief.md](sprint_debrief.md) (not interchangeable with this file).

## What went well
- **Docs-before-code paid off.** Jamie rounds 1–2, Azure RAG, RAG chunking and submission inference each went attack note → signed checklist → code, and each closed without rework.
- **F8 made the system easier to reason about.** Once FastAPI was the only writer, the container, the dashboard and the RBAC story all had one place to verify.
- **Model locks held.** Ten weeks of GenAI and UI work never touched the ops threshold, the v1 metrics freeze or feature engineering.
- **End-to-end verification found real bugs.** Running the real stack (container + live Azure + every dashboard page) in one pass surfaced eight defects that unit tests had not.

## What went wrong / friction

| Problem | Impact |
|---------|--------|
| Silent fallbacks hid broken integrations | Azure drafts ran on `stub_fallback` and RAG ran on keyword-only retrieval with no visible error. Both "worked" in demos while the headline GenAI features were off. |
| An external change broke code with no test catching it | The Azure deployment moved to `gpt-5-mini`, which rejects `max_tokens`. Mocked tests passed; only a live call exposed it. |
| A small enum addition crashed the whole dashboard | Adding `use_viva_grader` without a UI label took down every page. Nothing exercised the Streamlit script in CI or tests. |
| Docker was blocked for most of the sprint | The smoke checklist sat unrun from July to September, so packaging bugs (unpinned deps, missing runtime files) waited two months. |
| Docs drifted from code | The official report still described cosine-only RAG after ADR 015, a two-service compose file, and a "prediction browser" that never existed. |
| One critique went straight to code (2026-07-16) | Backfilled the same day, but the process slipped once under time pressure. |
| An agent claim was wrong until checked | During close-out the ROC image was briefly reported missing because a truncated `ls \| head` hid it. Checking `git ls-files` caught the mistake before it shipped. |

## Keep / Stop / Start

| | Action |
|---|--------|
| **Keep** | Docs-before-code for critiques of shipped work · FastAPI as the single enforcement point · frozen model locks · dated follow-ons on ADRs instead of rewrites |
| **Stop** | Treating a successful demo as proof that live integrations work (`stub_fallback` and `hybrid=false` look "fine") · leaving a smoke checklist unrun for weeks · quoting file lists through `head` without checking the count |
| **Start** | A live smoke step after any `.env` or deployment change that asserts `drafter_source=azure` and `hybrid=true` · a Streamlit `AppTest` page matrix in `tests/` so a UI crash fails the suite · a docs sweep (report, guides, teaching app) whenever an ADR changes behaviour · CI for the Python suite (still none) |

## Skillification decisions

| Candidate | Decision |
|-----------|----------|
| Docker smoke run (build → health → RBAC → fixtures → volume) | **Defer.** [docker_smoke_checklist.md](docker_smoke_checklist.md) is enough until the ACA deploy adds cloud steps |
| "Live integration check" (assert Azure path, hybrid RAG) | **Start as a test/script next sprint.** Skillify only if it repeats across projects |
| Streamlit role × page `AppTest` matrix | **Promote to `tests/`** rather than a skill; it is project-specific |
| Doc-drift sweep after an ADR | **Skip skillify.** Already covered by AGENTS.md §7 (anti-speculation) and the documentation cascade in `ai_engineering_learning_outcomes.md` §7 |
| Safe re-render of the assessor PDF | **Done in the script** (temp file + isolated Edge profile); no skill needed |

## Cross-link
Debrief and results: [sprint_debrief.md](sprint_debrief.md) §6 · [walkthrough.md](walkthrough.md) · [docker_smoke_checklist.md](docker_smoke_checklist.md) §4.
