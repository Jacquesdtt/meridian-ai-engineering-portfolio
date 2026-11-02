# Red-Team Attack Note — Meridian Educational Web App

| Field | Value |
|-------|-------|
| **Date** | 2026-07-20 |
| **Artifact** | `educational_web_app/` (static Vite + React teaching SPA) |
| **Reviewer role** | Principal engineer + bootcamp assessor |
| **Discipline** | `/docs-before-code` Phase 1 — **no implementation edits in this pass** |
| **Build evidence** | `npm run lint` (tsc) **PASS**; `npm run build` **PASS** (chunk >500kB warning only) |

## Verdict (one paragraph)

Inside `educational_web_app/` the rewrite largely **honors** `FACT_SHEET.md` / `facts.ts`: XGBoost, ~$7.3M, t≈0.701, Approve ≠ Sent, no Chroma, ACA pending, Jamie↔Arvind / Morgan↔Andy are correct, and modules import locked metrics rather than inventing ROC-AUC fantasy numbers. **P0 risk is outside the folder but still in the repo:** an abandoned Google AI Studio scaffold at the **repo root** (`package.json` + `src/App.tsx`) still teaches `$84.0M`, accuracy-as-success, wrong personas, and “Queued for Sending.” An assessor who opens the wrong tree or runs `npm run dev` from the repo root will see the opposite of Meridian policy. Inside the SPA, remaining issues are mostly **pedagogy rigor**, **quiz coverage gaps**, and a few **content-as-data / FACT_SHEET** drifts — not wholesale anti-claim collapse.

---

## Severity rubric (this review)

- **P0** — teaches the opposite of Meridian policy (auto-send, wrong AUM, fake prod, leakage OK)
- **P1** — material metric / persona / ADR error an assessor would catch
- **P2** — incomplete pedagogy / weak interactive / copy drift
- **P3** — polish, a11y, chunk size, unused deps

---

## P0 findings

### P0-01 — Root AI Studio scaffold still present (wrong AUM, Approve→Send, Gemini)

| | |
|--|--|
| **Attacked** | Repo root: `package.json`, `index.html`, `metadata.json`, `src/App.tsx` (sibling of production `src/core/`, `src/genai/`, `src/serving/`) |
| **Evidence** | Root `package.json` depends on `@google/genai`, `express`, `motion`; `index.html` title `"My Google AI Studio App"`; `metadata.json` capability `MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API`. `src/App.tsx` renders **`$84.0M`** AUM, **Validation Accuracy** toy metrics (e.g. 82.4% / 99.8%), personas **Jamie = Executive Sponsor** / **Morgan = Relationship Manager**, and Approve flips status to **“Queued for Sending.”** |
| **Why wrong** | Directly violates FACT_SHEET anti-claims #5, #16 (and adjacent #4 accuracy, wrong personas). Contradicts ADR-EDU-001 (“No Gemini… README must not mention Gemini”). Pollutes the Python package namespace (`src/`) documented by the teaching tree as “Production Python packages.” |
| **Project truth** | Locked AUM ≈ $7.27M; Approve ≠ Sent (ADR 003); personas Jamie↔Arvind Risk / Morgan↔Andy Product; GenAI = Azure only. Canonical teaching app is **`educational_web_app/`** only. |
| **Falsify if** | Root scaffold deleted or moved to `.agents/scratch/` and no longer runnable; or proven never reachable from any documented run path **and** `.gitignore`d so `git add -A` cannot commit it. |

### P0-02 — Assessor demo landmine: two apps, opposite Friction-Gate lessons

| | |
|--|--|
| **Attacked** | Same as P0-01 vs `educational_web_app/src/modules/FrictionModule.tsx` |
| **Evidence** | Edu app: status after Approve = `"Approved (ready for human outbound)"` + Callout “Approve ≠ Sent.” Root scaffold: `"Queued for Sending"`. |
| **Why wrong** | Viva / pair-demo risk: facilitator or peer opens wrong entrypoint and Meridian “proves” autonomous send. |
| **Project truth** | `Code/Sprint3/friction_gate_app.py` module docstring and Review UI: Approve does not send; no `/send`. |
| **Falsify if** | Root scaffold gone or clearly quarantined with a README trap warning that blocks accidental `npm run dev`. |

> **Note:** No P0 anti-claim was found **inside** `educational_web_app/src/modules/*` when run via that folder’s `package.json`. P0 is “repo adjacency + wrong entrypoint,” not “shipped SPA copy is inverted.”

---

## P1 findings

### P1-01 — FACT_SHEET feature breakdown disagrees with `serving_meta.json`

| | |
|--|--|
| **Attacked** | `educational_web_app/docs/FACT_SHEET.md` (“**80** inputs (55 state OHE + 24 numeric)”); mirrored narrative in teaching spine |
| **Evidence** | `Models/ops/serving_meta.json` → `model_feature_names` length **80**, of which **`state_*` ≈ 57** and non-state ≈ **23** (dirty state strings: `CALIFORNIA`/`California`, `MASS`, `NY`, `TX`, `Australia`, `-999`, `UNK`, etc.). |
| **Why wrong** | Assessor who opens Model Card / ops meta and hears “55 + 24” catches a locked-sheet error. Total 80 is fine; parenthetical is not. |
| **Project truth** | 80 model inputs after train-fit OHE; breakdown must match `serving_meta.json`, not a round number. |
| **Falsify if** | Recount confirms 55+24, or FACT_SHEET / `facts.ts` updated to accurate split (or drop the parenthetical). |

### P1-02 — Mastery “certification” is click-through + client-side answer key

| | |
|--|--|
| **Attacked** | `src/modules/MasteryModule.tsx`, `src/content/quiz.ts`, all module `setInteraction(...)` gates; `docs/WALKTHROUGH.md` gate table |
| **Evidence** | Gates fire on single DOM actions (persona click, any tree node, mode toggle, preset threshold buttons, Chroma **or** packed retrieve, one “Acknowledge” click). Quiz ships `correctIndex` in the Vite bundle. Checklist labels use module names via `interactionLabel`, not learning outcomes. |
| **Why wrong** | Claiming “Mastery unlocked” in a bootcamp viva overstates rigor. Gates do not require reading Callouts; quiz is honor-system / DevTools-trivial. |
| **Project truth** | Acceptable for self-serve SPA **if disclosed**; ADR-EDU-001/002 do not currently document this limitation. |
| **Falsify if** | Facilitator docs explicitly label gates as “exposure check, not exam,” **or** gates/quiz hardened (e.g. require wrong-path then fix; server-less challenge questions without plain `correctIndex`; cover more anti-claims). |

### P1-03 — Quiz / anti-claim coverage gaps an assessor will probe

| | |
|--|--|
| **Attacked** | `src/content/quiz.ts` (8 questions); `facts.ts` `ANTI_CLAIMS` (10 items, **unused in any module UI**); FACT_SHEET anti-claims 1–16 |
| **Evidence** | Quiz covers AUM, Jamie, threshold, Approve, Chroma, Split-Executor vs split-brain, PR/ROC vs accuracy, ACA pending. **Missing:** LightGBM-as-shipped, high-balance dormancy ≠ churn, TabFM/foundation for core, PostgreSQL draft store, ops threshold on submission CSV (ADR 014), Entra-as-prod RBAC, automated remediator. |
| **Why wrong** | Viva questions often hit exactly these traps; the SPA teaches them weakly or only in prose Callouts that gates skip. |
| **Project truth** | FACT_SHEET anti-claims list is the assessor trap catalog. |
| **Falsify if** | Quiz / mastery wall surfaces the missing anti-claims, or Facilitator WALKTHROUGH marks them as verbal-only with crib answers. |

### P1-04 — Deploy module invents a test count for a narrower command

| | |
|--|--|
| **Attacked** | `src/modules/DeployModule.tsx` step 1 success copy |
| **Evidence** | UI shows `py -3.13 -m pytest tests/serving tests/genai -q` → **`60 passed`**. Project MEMORY / recent submission work attributes **60 passed** to `tests/submission tests/serving tests/genai` (includes submission). |
| **Why wrong** | Hardcoded green count tied to the wrong (or incomplete) command is a factual landmine if an assessor re-runs the shown command. |
| **Project truth** | Prefer “tests green via `py -3.13 -m pytest …`” without a frozen count, or sync count to the exact suite named. |
| **Falsify if** | Re-running the exact on-screen command yields 60, or copy drops the numeral. |

### P1-05 — Content-as-data holes: thresholds hardcoded outside `facts.ts`

| | |
|--|--|
| **Attacked** | `ProblemModule.tsx` (`t≈0.701` string); `ServingModule.tsx` (`p ≥ 0.701`); ADR-EDU-002 contract |
| **Evidence** | ADR-EDU-002 / FACT_SHEET lag policy: UI should import from `facts.ts`. MlModule correctly uses `MODEL.*`; Problem/Serving still hardcode ops cut. |
| **Why wrong** | Next threshold tweak (or displayExact change) will desync hero copy from the locked sheet — the failure mode ADR-EDU-002 exists to prevent. |
| **Project truth** | `MODEL.opsThreshold` / `opsThresholdPrecise` are SoT in `facts.ts`. |
| **Falsify if** | All learner-visible ops-cut strings import `MODEL` (or a single formatter). |

---

## P2 findings

### P2-01 — GenAI path cascade wording vs real drafter preference

| | |
|--|--|
| **Attacked** | `GenaiModule.tsx` subtitle: “Path cascade: stub → azure → stub_fallback” |
| **Evidence** | `src/genai/drafter.py`: prefer Azure; on failure return `stub_fallback`. Stub is the offline/demo path, not the first hop of a live cascade. |
| **Why wrong** | Learners may think production prefers stub first. |
| **Project truth** | Azure when configured; stub offline; stub_fallback after Azure failure (ADR 013 resilience story). |

### P2-02 — GenAI mastery gate does not require ZDR scrub

| | |
|--|--|
| **Attacked** | `GenaiModule.tsx` — `approvedDraftHonestly` only needs `rate ≤ 3.5%` + Validate |
| **Evidence** | PII scrubber is optional UI; gate name implies “honest draft.” |
| **Why wrong** | Gate overclaims; Jamie’s ZDR story can be skipped. |

### P2-03 — DataModule cell-order path is decorative

| | |
|--|--|
| **Attacked** | `DataModule.tsx` `execute()` condition `newOrder[2] === 2 && newOrder[1] !== 1` |
| **Evidence** | Future-feature toggle alone sets `simulatedLeakage`. Correct cell order never gates; only one rare wrong order does. |
| **Why wrong** | WALKTHROUGH offers cell-order as a real path; in practice everyone toggles leakage. |

### P2-04 — RAG gate name `blockedChroma` also fires on packed success

| | |
|--|--|
| **Attacked** | `RagModule.tsx` + `modules.ts` interaction key |
| **Evidence** | Packed retrieve sets `blockedChroma` without Chroma. Checklist label becomes the module title, not “blocked native vector DB.” |
| **Why wrong** | Confusing progress semantics; learner can “complete RAG” without seeing the AppLocker block. |

### P2-05 — StartingFiles tree uses paraphrased filenames

| | |
|--|--|
| **Attacked** | `src/content/tree.ts` |
| **Evidence** | `"demographics / account tables"` vs real `customers_tm1_e.csv` / `transactions_tm1_e.csv`; ADR file chips use shortened names vs `Docs/Architecture/ADRs/*.md`. |
| **Why wrong** | Architecture module claims “real folder layout”; mild honesty gap. |

### P2-06 — `ANTI_CLAIMS` export unused; FACT_SHEET list longer than `facts.ts`

| | |
|--|--|
| **Attacked** | `facts.ts` `ANTI_CLAIMS` (10) vs FACT_SHEET (16) |
| **Evidence** | Grep: `ANTI_CLAIMS` only defined, never rendered. |
| **Why wrong** | Content-as-data drift between sheet and TS; missed teaching surface. |

### P2-07 — Toy SHAP score shown as percent

| | |
|--|--|
| **Attacked** | `MlModule.tsx` `score ≈ {(score * 100).toFixed(1)}%` |
| **Evidence** | Copy elsewhere correctly says ranks / not calibrated; UI still presents `%`. |
| **Why wrong** | Reinforces probability reading despite disclaimers (real Friction-Gate is careful that `p` is a rank score). |

### P2-08 — Ethics EOD shown as illustrative rounded magnitudes only

| | |
|--|--|
| **Attacked** | `EthicsModule.tsx` “age ≈ 0.16, state ≈ 0.32” |
| **Evidence** | Model Card: age EOD ≈ **0.156**, state ≈ **0.318**. |
| **Why wrong** | Acceptable if labeled illustrative (it is); risk if learner quotes 0.16/0.32 as locked. Prefer Model Card figures or `facts.ts` constants. |

### P2-09 — Windows-only run command copy

| | |
|--|--|
| **Attacked** | `facts.ts` `RUN_COMMANDS.ui` uses `Code\\Sprint3\\...` |
| **Evidence** | Fine for this AppLocker Windows lab; not disclosed as Windows-oriented. |
| **Why wrong** | Minor if peers are on Mac/Linux CI. |

---

## P3 findings

### P3-01 — Bundle size warning on build (`index-*.js` ~646 kB)

Vite warns >500 kB; recharts + confetti likely. Polish / code-split later.

### P3-02 — Package naming inconsistency

`meridian-educational-tour` vs folder `educational_web_app` vs metadata title variants.

### P3-03 — Root `vite.config.ts` mojibake comment

Encoding artifact on abandoned scaffold (`Do not modifyâfile…`) — cleanup with P0-01.

### P3-04 — `tests/core` omitted from canonical test command

`RUN_COMMANDS.tests` lists serving + genai only; submission/core exist. Incomplete crib, not false.

### P3-05 — ADR drawer one-liners are accurate but shallow

All 001–014 present in `facts.ts`; good coverage, weak depth (expected for chips).

---

## What is *not* broken (credit / non-findings)

- **No LightGBM-as-shipped, no ROC>0.85 claim, no Chroma-as-prod, no live ACA URL, no Entra-as-prod** inside `educational_web_app/` modules (grep: only appear as refutations / distractors).
- **Personas** match `Docs/StakeholderManagement/README.md` roleplay map.
- **Split-Executor vs split-brain** correctly separated in `WorkflowsModule`.
- **Friction RBAC** roles (`retention_agent` / `compliance_viewer` / `data_scientist`) match ADR 007 / Streamlit app.
- **Ops metrics** (PR-AUC 0.219 / 0.151, ROC-AUC 0.723 / 0.551, FP 20,127 vs 248,778, t 0.475 vs ≈0.701) match Model Card when imported from `facts.ts`.
- **Edu package.json** has **no** `@google/genai` / Express (clean relative to ADR-EDU-001).
- **Serving “p ≥ 0.701”** language matches Friction-Gate’s own “`p` = risk rank score” crib (not automatically an anti-claim).

---

## Assessor embarrassment scenarios (ranked)

1. Run `npm run dev` from **repo root** → Gemini scaffold + $84M + Queued for Sending (**P0**).
2. Call mastery a **certification** in a viva; student clicks through in <2 minutes (**P1**).
3. Assessor asks “55 state + 24 numeric?” while screen-sharing `serving_meta.json` (**P1**).
4. Assessor asks “Is LightGBM production?” / “Is dormancy churn?” / “Did you threshold the submission CSV?” and quiz never forced those answers (**P1**).
5. Deploy step quotes **60 passed** for serving+genai; live re-run differs (**P1**).

---

## Method notes

1. Read FACT_SHEET + `facts.ts`; skim all 12 modules + content packs + edu ADRs + WALKTHROUGH.
2. Spot-checked Model Card, ADR titles 001–014, Stakeholder README, `friction_gate_app.py`, `serving_meta.json`, `drafter.py`.
3. Grep anti-claim terms under `educational_web_app/` (clean except intentional refutations).
4. Explored root scaffold leftovers (git status `??` at conversation start).
5. `npm run lint` + `npm run build` in `educational_web_app/` — pass.

**Stop condition:** Phase 2 checklist written; **await sign-off before any code deletion or module edits.**

---

## Addendum — IP-03 Deploy CTA dedupe (2026-07-20)

| Field | Value |
|-------|-------|
| **Trigger** | Screenshot polish Wave 1 (`improvement_plan_from_screenshots.md` IP-03) |
| **Attacked** | `DeployModule.tsx` step 1 — two affordances both called `applyBypass()` (inline terminal Play button + bottom `Next → Apply AppLocker bypass`) |
| **Severity** | P2 UX confusion (reads as a bug); **not** a gate/fidelity regression |
| **Falsify if** | Exactly one primary CTA applies the bypass; bottom nav stays disabled until `testOk`; `honestDeploy` still fires only after AppLocker pytest path + dockerignore confirm (unchanged trigger) |
| **Unlock gates** | None — no FACT_SHEET / ADR / mastery-id changes |
| **Sign-off** | User chat: execute improvement-plan Wave 1 (P0) |

---

## Addendum — IP-01 / IP-02 layout-only (2026-07-20)

Pure CSS/prop polish: drop Repo tree `max-h-[520px]` nested scroll; bump Data `ResizableBottomPanel` `defaultHeight` to ~190px. No gate logic touched.
