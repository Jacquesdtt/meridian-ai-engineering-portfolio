# Revision Checklist — Educational Web App (post red-team)

| Field | Value |
|-------|-------|
| **Date** | 2026-07-20 |
| **Attack note** | [`red_team_attack_note.md`](./red_team_attack_note.md) |
| **Discipline** | `/docs-before-code` Phase 2–6 |
| **Code status** | **Wave A + B + C executed** (2026-07-20) |

> Do **not** cascade fixes into `Docs/Architecture/ADRs/` unless explicitly requested.
> Do **not** edit `.cursor/plans/educational_app_rewrite_1bfbb583.plan.md`.

---

## Label / ADR unlock gates

| Gate ID | Locked decision | May unlock? | Rule |
|---------|-----------------|-------------|------|
| **G-EDU-001** | ADR-EDU-001 static SPA / no Gemini | Only if we reintroduce a live LLM tutor | Default: **no unlock**. Deleting root Gemini scaffold **reinforces** the lock. |
| **G-EDU-002** | ADR-EDU-002 content-as-data (`facts.ts` SoT) | Soft unlock only to **extend** facts schema (e.g. EOD constants, feature breakdown) | Any new learner-visible metric must land in `FACT_SHEET.md` + `facts.ts` first. |
| **G-MAIN-003** | ADR 003 Approve ≠ Sent | **No** — teaching copy must not redefine Approve | |
| **G-MAIN-004** | ADR 004 churn label | **No** — unless Sam re-locks label | |
| **G-MAIN-008** | ADR 008 maxReplicas: 1 | **No** | |
| **G-MAIN-010** | ADR 010 no Chroma | **No** | |
| **G-MAIN-014** | ADR 014 continuous submission probs | **No** — quiz/copy must keep “do not apply ops cut to submission” | |
| **G-FACT** | FACT_SHEET locked numbers | Yes, **only** with explicit item + evidence (e.g. feature breakdown recount) | Update FACT_SHEET + `facts.ts` in same change; no silent UI-only edits. |

---

## Checklist

Status column: `[ ]` open · `[~]` in progress · `[x]` done · `[D]` deferred with owner/date.

| ID | Sev | Action | Item | Success criteria | Unlock gate | Status |
|----|-----|--------|------|------------------|-------------|--------|
| **RT-01** | P0 | **implement** | Delete or quarantine root AI Studio scaffold (`package.json`, `package-lock.json`, `index.html`, `metadata.json`, `tsconfig.json`, `vite.config.ts`, `src/App.tsx`, `src/main.tsx`, `src/index.css` at **repo root** — not under `educational_web_app/`) | Root no longer has Gemini/Express app; `src/` contains only Python packages; `educational_web_app/npm run dev` still works; optional: move reference dump to `.agents/scratch/` if retention needed | G-EDU-001 (reinforces) | `[x]` |
| **RT-02** | P0 | **implement** | After RT-01, confirm `.gitignore` / docs so scaffold cannot return via accidental AI Studio re-drop | README or edu WALKTHROUGH “run only from `educational_web_app/`”; root `npm` artifacts absent from git status | — | `[x]` |
| **RT-03** | P1 | **investigate** | Recount `Models/ops/serving_meta.json` `model_feature_names` → state vs numeric | Written count in checklist comment; if ≠ 55+24, mark RT-04 implement | G-FACT | `[x]` **Recount: 57 `state_*` + 23 other = 80** (≠ 55+24) |
| **RT-04** | P1 | **implement** | Fix FACT_SHEET (+ `facts.ts` if needed) feature breakdown to match ops meta | Sheet and any UI blurb match recounted split; total remains 80 unless meta changes | G-FACT | `[x]` |
| **RT-05** | P1 | **implement** | Disclose mastery rigor in `WALKTHROUGH.md` and/or ADR-EDU-002 | Explicit: gates = exposure checks; quiz answer key is client-side; not a proctored exam | G-EDU-002 | `[x]` |
| **RT-06** | P1 | **implement** *(optional harden)* | Strengthen ≥2 mastery gates so wrong path then correct path is required (recommend: Friction Compliance-deny then Approve; RAG Chroma-block then packed retrieve) | WALKTHROUGH gate table updated; cannot complete those gates with a single happy-path click | G-EDU-002 | `[x]` |
| **RT-07** | P1 | **implement** | Extend quiz (or anti-claim wall module) for missing traps: LightGBM, dormancy≠churn, TabFM, no ops cut on submission, no PostgreSQL store (pick ≥3) | New items import facts; distractors match FACT_SHEET anti-claims; `correctIndex` still OK if RT-05 disclosed | G-FACT / G-MAIN-014 | `[x]` (q9–q12: LightGBM, dormancy, submission cut, SQLite) |
| **RT-08** | P1 | **implement** | Fix DeployModule “60 passed” — drop numeral or sync to exact suite | On-screen command and result cannot be falsified by a 30s re-run | — | `[x]` |
| **RT-09** | P1 | **implement** | Replace hardcoded `0.701` strings in Problem/Serving with `MODEL.opsThreshold` (formatter) | Grep modules: no bare ops-cut literals outside `facts.ts` | G-EDU-002 | `[x]` |
| **RT-10** | P2 | **implement** | Correct GenAI cascade copy to Azure-prefer / stub offline / stub_fallback on failure | Matches `drafter.py` + ADR 013 story | — | `[x]` |
| **RT-11** | P2 | **implement** | GenAI gate also requires successful scrub **or** rename interaction away from “honestly” | Gate name and behavior aligned | G-EDU-002 | `[x]` (`validatedDraftWithScrub`) |
| **RT-12** | P2 | **implement** | Rename RAG interaction key / checklist semantics (`blockedChroma` vs packed success) | Progress labels match what learner did; WALKTHROUGH updated | G-EDU-002 | `[x]` (`completedRagPath`) |
| **RT-13** | P2 | **implement** | Align `tree.ts` StartingFiles names to real CSVs; ADR chip filenames optional full names | No paraphrased “demographics / account tables” | — | `[x]` |
| **RT-14** | P2 | **implement** | Sync `facts.ts` `ANTI_CLAIMS` to full FACT_SHEET list; render somewhere (Ethics or Mastery) | 16 anti-claims visible; single SoT | G-FACT | `[x]` |
| **RT-15** | P2 | **implement** | Toy SHAP: show rank score `0.xx`, not `%` | Copy consistent with “not calibrated probabilities” | — | `[x]` |
| **RT-16** | P2 | **investigate** | Pin Ethics EOD to Model Card (0.156 / 0.318) via `facts.ts` | Either exact or clearly “illustrative, see Model Card” | G-FACT | `[x]` (pinned `MODEL.eodAge` / `eodState`) |
| **RT-17** | P2 | **defer** | DataModule cell-order simulator redesign | Only if RT-06 capacity remains; toggle path already teaches leakage | — | `[D]` owner: TBD |
| **RT-18** | P3 | **defer** | Code-split / reduce bundle; rename package for consistency; Windows path disclosure | Polish after P0/P1 | — | `[D]` |
| **RT-19** | P3 | **implement** | Expand ADR drawer beyond one-liners | Clickable chips + tree ADR files show bundled full markdown from main ADRs | — | `[x]` |
| **IP-01** | P0 | **implement** | 02 Repo — drop tree `max-h-[520px]` / nested scroll | Tree grows with page scroll; no double-scroll truncation | — | `[x]` |
| **IP-02** | P0 | **implement** | 04 Data — `ResizableBottomPanel` defaultHeight ~180–200px | Notes panel readable on first paint; minHeight unchanged | — | `[x]` |
| **IP-03** | P0 | **implement** | 11 Deploy — single primary bypass CTA | Inline terminal button only applies bypass; bottom nav disabled “Waiting for tests…” until `testOk`, then Next; `honestDeploy` trigger unchanged | — | `[x]` |

---

## Suggested implementation waves (after sign-off)

1. **Wave A — safety:** RT-01, RT-02 (root scaffold). ✅
2. **Wave B — locked facts:** RT-03 → RT-04, RT-09, RT-14, RT-16. ✅
3. **Wave C — pedagogy:** RT-05, RT-06, RT-07, RT-08, RT-10–RT-15. ✅
4. **Wave D — polish:** RT-17–RT-18 deferred; RT-19 ADR drawer implemented (2026-07-20).
5. **Wave E — accuracy re-sync + teaching frame (2026-09-21):** see below.

### Wave E (2026-09-21) — plan: re-sync with Corrections_and_Future_Work.md, real data, concept teaching

| ID | Item | Status |
|----|------|--------|
| E1-01 | `scripts/export_teaching_data.py` → `generated/model_facts.json`; `facts.ts` MODEL imports it; `npm run facts:check` | `[x]` |
| E1-02 | Serving/tree/workflow/ADR-006 copy: UI → FastAPI via `client.py`; `http` default, `inprocess` ASGI fallback | `[x]` |
| E1-03 | GenAI: rate clamped (not rejected), no redraft loop, tenacity → `stub_fallback`, drafter uses no RAG, scrubber ported from `pii_scrubber.py` (no free-text names) | `[x]` |
| E1-04 | RAG corpus = `Docs/Final_Report_Official.md` only | `[x]` |
| E1-05 | Deploy: no CI; image = FastAPI only; Azure OpenAI live 2026-07-17; branch `main`; tests `pytest tests -q` = 75 passed 2026-09-21 | `[x]` |
| E1-06 | Friction: frozen global SHAP drivers; 8 s fast-decide soft warning; API-enforced roles | `[x]` |
| E1-07 | Anti-claims 17–26 added to FACT_SHEET + `facts.ts`; LightGBM “never trained” | `[x]` |
| E1-08 | ML: “how the model was really chosen” (one recipe, two runs, no CV, no registry) | `[x]` |
| E2-01 | Threshold explorer uses real anchor points + validation slice table (no interpolated curve) | `[x]` |
| E2-02 | Real global SHAP bars + notebook SHAP PNGs (copied by export script) | `[x]` |
| E2-03 | Fairness: fairlearn block + age-band selection rates; ADR 012 rationale quoted accurately | `[x]` |
| E3-01 | Learn / Explore / Check tabs; `lessons.ts` (objectives, primers, predict-then-reveal, takeaways, code refs) for 01–11 | `[x]` |
| E3-02 | Glossary drawer (41 terms, portal-rendered) | `[x]` |
| E4-01 | Persist progress in localStorage (`meridian-edu-progress`, v2; try/catch fallback to memory) | `[x]` 2026-09-22 |
| E4-02 | `questions.ts` (39 items: MCQ, false-claim, numeric) as per-module checks in the Check tab; sidebar tick = predict + gate + check | `[x]` 2026-09-22 |
| E4-03 | Practice → Spaced review (Leitner 0/1/3/7/14 days) over `REVIEW_POOL` (39 + 12 quiz); final quiz answers feed it | `[x]` 2026-09-22 |
| E4-04 | Practice → Explain it: 11 prompts, 15-word minimum before reveal, rubric self-grade saved | `[x]` 2026-09-22 |
| E5-01 | 13 Next Steps: 12 future-work cards (built vs next badges) from Corrections Part B11/C | `[x]` 2026-09-22 |
| E6-01 | Mastery requires demo gates + module checks + quiz | `[x]` 2026-09-22 |

### Wave F (2026-09-23) — Integrity, Progress & Accessibility (EDU-01…EDU-09)

| ID | Item | Status |
|----|------|--------|
| EDU-01 | Stale grade invalidation on answer edits, revision tracking, out-of-order rejection | `[x]` 2026-09-23 |
| EDU-02 | Validated progress state (v5), draft recovery from legacy/v4, guarded reset with confirmation, export/import | `[x]` 2026-09-23 |
| EDU-03 | Unified progress selectors (`progressSelectors.ts`), Progress drawer with remaining-work links, consistent labels across Header, Sidebar, and Mastery | `[x]` 2026-09-23 |
| EDU-04 | Marker readiness probe against `/health` (`azure_configured`), offline subtitle clarity, failure recovery states | `[x]` 2026-09-23 |
| EDU-05 | ARIA tablist arrow navigation (`App.tsx`), keyboard resizing for `ResizableBottomPanel`, Escape dismissal on all drawers | `[x]` 2026-09-23 |
| EDU-06 | Last lesson tab restoration (`lastTabs`), Next-step guidance card after module checks | `[x]` 2026-09-23 |
| EDU-07 | Shared simulation step cues (`GatePath`) for Friction and RAG prerequisites | `[x]` 2026-09-23 |
| EDU-08 | Vitest frontend test suite (21 unit/smoke tests covering grading, recovery, drawers, tabs, and reset); CI workflow added | `[x]` 2026-09-23 |
| EDU-09 | Local production startup/navigation baseline measured; [2026-10-20 report](validation_2026-10-20.md). Code splitting stays deferred per RT-18; participant trial remains open. | `[x]` 2026-10-20 |

---

## Explicitly out of scope (this checklist)

- Editing main-repo `Docs/Architecture/ADRs/*` (unless user asks).
- Editing the rewrite plan file.
- Changing Streamlit/FastAPI production behavior.
- Reintroducing Gemini or Azure calls into the teaching SPA.

---

## Sign-off

| | |
|--|--|
| **I have read** | `red_team_attack_note.md` & `improvement_attack_note_2026-09-23.md` |
| **Approved items for implementation** | Wave A–C (RT-01…RT-16); Wave 1 (IP-01…03); Wave E (E1…E6); Wave F (EDU-01…09) |
| **Deferred / rejected** | RT-17, RT-18 (code splitting deferred; EDU-09 baseline recorded) |
| **Signed** | User approval of `improvement_plan_2026-09-23.md` / `implementation_plan.md` |
| **Date** | 2026-09-23 |

**Agent instruction:** Until this section is filled (or the user replies in chat with an equivalent “execute RT-…” / “execute Wave A”), do **not** edit implementation files for these findings.

**Wave 1 (IP) close-out:** IP-01…IP-03 `[x]` 2026-07-20 — layout/CTA only; `honestDeploy` unchanged; lint+build exit 0.
**Wave F (EDU) current status, reconciled 2026-10-20:** EDU-01…08 implemented; EDU-09 local runtime baseline recorded. 26 Vitest tests pass alongside typecheck/build/facts checks; 127 backend tests pass. The 3–5 learner trial remains open by user agreement. Live viva revalidation failed with Azure HTTP 401; the earlier 87.5% benchmark is historical only. Backend code was unchanged in this pass. See [validation report](validation_2026-10-20.md).
