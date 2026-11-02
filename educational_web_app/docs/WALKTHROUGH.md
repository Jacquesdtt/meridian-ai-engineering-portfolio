# Facilitator Walkthrough

Current technical checks and local performance baseline: [2026-10-20 validation](validation_2026-10-20.md). Learner trial remains open; live marker revalidation currently returns Azure HTTP 401. The walkthrough below describes the learning flow, not a measured learner outcome.

~25–35 minutes for a full pass; ~10 minutes for a demo spine.

> **Run only from this folder:** `cd educational_web_app` then `npm run dev`.
> There is **no** Node/Vite app at the Meridian repo root — an abandoned AI Studio scaffold was removed after red-team (do not re-drop `package.json` / `src/App.tsx` next to Python `src/`).

## Mastery rigor (read before claiming "certified")

- Interaction gates are **exposure checks**, not a proctored exam.
- Hardened gates (Friction, RAG) require a **wrong path then correct path**.
- Quiz answer key (`correctIndex`) ships in the client Vite bundle — honor system / DevTools-trivial.
- Do **not** call SPA mastery a certification in a viva.

## Lesson frame, practice, and integrity (2026-09-23)

- Modules 01–11 have three tabs: **1 · Learn & predict** (objectives, concept primers, one predict-then-reveal question), **2 · Explore** (the demo; the demo gate lives here) and **3 · Check** (a module check of 2–6 questions, takeaways, explain-it prompts, code references). Keyboard users can navigate tabs via `ArrowLeft` / `ArrowRight` / `Home` / `End`.
- A module gets its sidebar tick when you have predicted, completed the demo gate **and** passed the module check (every question last answered correctly on first try).
- **Practice** (pinned at the top of the sidebar, with a due count):
  - *Spaced review*: Leitner boxes — a wrong answer is due again now; right answers come back after 1, 3, 7 and 14 days. Covers the 39 module questions plus the 12 final-quiz questions.
  - *Explain it* (ADR-EDU-003): 11 viva-style prompts. Write at least 40 words and submit for marking via FastAPI `/viva/grade` (the configured Azure OpenAI chat deployment, `gpt-5-mini` since September 2026; a labelled benchmark on four prompts measured 87.5% label accuracy, `npm run viva:benchmark`). Requires clearing at least 7 of 11 prompts with ≥80% rubric coverage for the Mastery gate. If the marker is offline or unconfigured, an offline self-check fallback appears but is labeled as not counting toward the gate. Stale grades are invalidated whenever an answer is edited.
- **Simulation step cues**: Friction and RAG feature accessible `GatePath` cues indicating prerequisite steps (e.g. non-approver deny before retention approve; Chroma blocked before packed retrieve).
- **Keyboard & accessibility**: Overlays (Progress drawer and Glossary) dismiss cleanly with `Escape`. The `ResizableBottomPanel` in Data module can be adjusted using `ArrowUp` / `ArrowDown` (or `Shift + Arrow` for 40px steps, `Home`/`End` for min/max).
- **Progress preservation & recovery**: Progress is saved under schema version 5. Header opens a detailed **Learning progress drawer** showing separate Exploration, Predictions, Checks, and Marked Explanation metrics. The drawer offers progress export/import, raw legacy data recovery, and a guarded reset requiring confirmation.
- **13 Next Steps** lists future work only (never teach as built).
- **Glossary** (header) has 41 terms, searchable, accessible with `Escape` dismissal.
- **Bundle baseline (EDU-09)**: Single client chunk build is ~872 kB (272 kB gzip), loading in sub-second time. Code-splitting remains deferred (RT-18) to avoid async navigation dead ends.

## Quick path (demo spine)

1. **01 Problem** — click Jamie, then Morgan; note ~$7.3M (not $84M).
2. **02 Repo** — expand `Architecture/ADRs/` (all 14 files); click ADR 003 chip or tree file to scroll the full markdown drawer; spot-check StartingFiles CSV names.
3. **03 Working** — toggle Split-Executor vs Hybrid system flow; click hotspots on the real presentation flowcharts; confirm Split-Executor ≠ split-brain callouts.
4. **05 Model** — compare the three threshold rules (max-F1 → recall ≈ 1.0 / 249k FP; 40% floor → infeasible table; top-5% capacity → 20k FP); show real global SHAP and the notebook plots; feature split 57 state OHE + 23 other.
5. **07 Friction** — Approve as Compliance (403) → flip to Retention agent → ack → Approve ≠ Sent.
6. **09 RAG** — open **With vs without Chroma** tab (side-by-side); then **Exposure check** tab: toggle Chroma (blocked) → packed chunks retrieve (both required for gate; comparison tab’s Chroma run also counts).
7. **11 Deploy** — walk to Hosting status: pending, maxReplicas: 1, no fake prod URL; tests show green without a frozen count.
8. **12 Mastery** — optional if time; disclose exposure-check rigor.

## Full mastery gates

| Gate | How to complete |
|------|-----------------|
| viewedPersonas | Click a persona card in 01 |
| exploredTree | Click a folder with philosophy **or** an ADR file/chip in 02 |
| completedWorkflow | Explore every hotspot on the **Split-Executor** flowchart in 03 (optional: Hybrid system flow) |
| simulatedLeakage | Enable future-feature toggle **or** out-of-order notebook cells in 04 |
| adjustedThreshold | Open **both** the Max-F1 and Top-5% capacity rules in 05 |
| understoodServing | Pick `http` (default) or `inprocess` (AppLocker fallback) in 06 |
| rbacFrictionApproved | **Deny as Compliance/DS first**, then Approve as Retention agent with attention ack in 07 |
| validatedDraftWithScrub | Scrub the context **then** run `sanitize_llm_draft` (rate clamp) in 08 |
| completedRagPath | **Chroma AppLocker block** (exposure tab or comparison tab), then **packed retrieve on Exposure check** tab in 09 |
| viewedFairness | Acknowledge model card in 10 (anti-claims wall + Model Card EOD) |
| honestDeploy | Reach hosting step in 11 (after AppLocker pytest + dockerignore) |
| passedQuiz | All demo gates + all module checks + full quiz (includes LightGBM / dormancy / submission cut / SQLite traps) |

## Commands to show afterward

```bash
cd educational_web_app
npm install
npm run dev
```

Real stack (main repo):

```bash
py -3.13 -m uvicorn src.serving.app:app          # start the API first (FRICTION_GATE_MODE=http default)
py -3.13 -m streamlit run Code\Sprint3\friction_gate_app.py
# non-AppLocker machine: use python -m … inside a venv / uv env
```
