# ⚠️ Corrections, Needed Updates & Future Work

> **Status:** OPEN review register · **Created:** 2026-09-15 · **Source:** project review session (code + docs cross-checked against notebooks, `src/`, ADRs, MLflow usage)
>
> This file lists places where the **documentation does not match the code**, **stale or missing items**, and **future work**. It does not replace [Technical_Debt_and_Limitations.md](Technical_Debt_and_Limitations.md). Items stay here until fixed; tick the box and add the commit or date when done.
>
> **Reconciled 2026-10-20:** Remaining: A7 (spoken talk track), B1 (conditional registry requirement), B2 backup, B3 (next training run), B11 cloud key verification / real cohort / regression automation. B10 cleanup and WS-2 deployment documentation are complete. Learning-app technical validation is recorded in `educational_web_app/docs/validation_2026-10-20.md`; real learner trial and live marker revalidation remain open (no participants; Azure HTTP 401 respectively).

**Legend**

| Marker | Meaning |
|---|---|
| 🔴 **CORRECTION** | A doc or talk track states something the code does not do. Fix before presenting or submitting. |
| 🟠 **UPDATE** | Stale status, missing deliverable, or repo hygiene. |
| 🔵 **FUTURE WORK** | Not built. May be described only as *next steps*, never as done. |
| **P1 / P2 / P3** | Priority (P1 = could mislead an assessor or stakeholder) |

---

## Part A — 🔴 CORRECTIONS (docs / talk tracks that overstate or misstate the build)

### A1. Model selection talk track — overstates what was done · **P1**

- [x] Replace any use of the following wording in the presentation, report or interview prep. *(2026-09-15: the wording does not appear in any repo file — it was a verbal talk track. Use the approved replacement below when presenting.)*

> ~~"I wouldn't simply choose the run with the highest AUC. I'd treat model selection as a constrained multi-objective optimisation problem. First I'd define non-negotiable governance thresholds, such as fairness and calibration requirements. Among the models that pass those gates, I'd compare the Pareto frontier across predictive performance, latency, cost and business value…"~~

**Why it is wrong (evidence):**

| Claim | Reality | Evidence |
|---|---|---|
| Several runs/models compared | **One** XGBoost recipe. The two MLflow runs (`7134cee0`, `3f575754`) have identical PR-AUC 0.219 / ROC-AUC 0.723; only the threshold rule differs. | `Docs/Sprint2/reports/sprint2_run_summary_v2.json` → `before_after` |
| Fairness is a non-negotiable gate | Fairness is **measured and disclosed, not gated**. | ADR 012 §Decision 1 |
| Calibration requirement | Scores are **deliberately uncalibrated** (`scale_pos_weight`) and treated as ranks. | `Docs/Sprint2/ML_Learnings.md` §2.4a, `red_team_sprint2_plan.md` #2 |
| Pareto across latency / cost / business value | **Not measured.** Business value entered only as a **capacity cap** (top 5%). | Notebook cell `a4cc443a` |

**Approved replacement wording:**

> "I didn't just take the run with the best AUC, and I didn't use F1 either. I separated two questions. First, does the model rank customers better than a realistic baseline? On a time-based holdout, XGBoost beat the 'gone this month' rule on PR-AUC (0.219 vs 0.151) and ROC-AUC (0.723 vs 0.551). Second, who should actually be contacted? I treated that as a constrained optimisation on validation data only: maximise recall subject to a 40% precision floor and a 5% contact cap. The precision floor turned out to be impossible to reach on these scores (the top 1% was only about 24% precise), so rather than fake it, I documented that and set the threshold by team capacity: the top 5% of scores (t ≈ 0.701). That cut false positives from 249k to 20k without changing ranking quality. Fairness by age and state, plus SHAP, was reported to Risk for periodic review rather than used as an automatic gate, and every flagged customer still goes through human approval."

Optional forward-looking tail (label as next steps, see F1–F3):

> "…For production I'd extend this to a proper model comparison: calibrate the probabilities, make fairness limits a hard release gate once Risk agrees on thresholds, and compare candidate models on ranking quality, calibration, latency and serving cost before picking one with stakeholders."

### A2. "MLflow tracks temporal cross-validation folds" — false · **P1**

There is **one** time-based split (fit 2007-03→2016-08 / val 2016-09→2017-08 / test 2017-09→2020-04), with no cross-validation folds.

- [x] `Docs/Presentations/generate_presentation.py:135` — change "temporal CV folds" to "time-based fit / validation / test split". Regenerate both PPTX files. *(2026-09-15; both PPTX regenerated, 36 slides each)*
- [x] `Docs/Presentations/project_crash_course.md:16` — same fix. *(2026-09-15)*
- [x] `.agents/AGENTS.md:12` — same fix, so agents stop repeating the claim. *(2026-09-15; mirrored in `.cursorrules`, which is an identical copy)*
- [x] (P3, historical plan, optional) `Docs/Sprint0/pre_project_planning.md:100` — add a note: "implemented as a single chronological split, not CV". *(2026-09-15)*

### A3. "MLflow Model Registry" shown as existing — false · **P1**

No model is registered: there is no `register_model` call anywhere in the repo.

- [x] `Docs/Presentations/project_crash_course.md:134` — the diagram node `MLflow[(MLflow Model Registry)]` should become `MLflow[(MLflow Tracking — SQLite)]`, or be marked planned. *(2026-09-15; diagram now shows MLflow → `export_ops_model.py` → `Models/ops/` → model)*
- [ ] See **B1** for the deliverable itself.

### A4. LightGBM presented as part of the model · **P2**

The shipped model is XGBoost only; LightGBM was never trained. The educational fact sheet already refutes this.

- [x] `Docs/Presentations/project_crash_course.md:14` — "XGBoost/LightGBM" → "XGBoost". *(2026-09-15)*
- [x] `Docs/Presentations/project_crash_course.md:135` — diagram node "XGBoost / LightGBM Model" → "XGBoost Model". *(2026-09-15)*
- [x] `Docs/Presentations/generate_presentation.py:119,126` — acceptable as written ("LightGBM considered in-family; shipped model is XGBoost"). Keep it that way.
- [x] *(found 2026-09-15)* `.agents/AGENTS.md:11` / `.cursorrules:11` — "e.g., XGBoost or LightGBM" → shipped model is XGBoost; LightGBM never trained.

### A5. dtreeviz presented as a working explainer · **P2**

dtreeviz **is attempted** in Sprint 2 notebook §10, but it **fails and is skipped** because of NaNs in `Active_Txn_Lag3`, so no diagram was produced. SHAP is the only interpretation method that actually ran.

- [x] `README.md:16` — "SHAP and dtreeviz" → "SHAP (dtreeviz attempted, skipped: Lag3 NaNs)". *(2026-09-15)*
- [x] `Docs/Presentations/project_crash_course.md:19,136` — same. *(2026-09-15)*
- [x] `Docs/Presentations/generate_presentation.py:121,127` — "SHAP + dtreeviz integrate…" → "SHAP (plus a dtreeviz surrogate, not yet rendered)". *(2026-09-15; worded as "dtreeviz attempted, skipped: Lag3 NaNs")*
- [x] `Docs/Presentations/presentation.md:57`, `Docs/Presentations/emily_presentation_summary.md:23` — soften "integrates perfectly with SHAP and dtreeviz". *(2026-09-15)*
- [x] `.agents/AGENTS.md:14` — note that dtreeviz currently fail-softs. *(2026-09-15)*

### A6. RAG described as retrieving past retention emails — false · **P1**

`src/genai/rag_engine.py` indexes **`Docs/Final_Report_Official.md` only** and powers the Methodology Q&A tab. The email drafter (`src/genai/drafter.py`) uses **no RAG**; it takes frozen SHAP driver names, the score, and a scrubbed context.

- [x] `Docs/Presentations/project_crash_course.md:43` — rewrite as: "RAG grounds the Methodology Q&A bot on the official report (Azure embeddings + cosine, TF-IDF fallback; ADR 010). Retention drafts are not RAG-grounded; they are constrained by `.prompty`, PII scrubbing, a 3.5% rate cap and server-side SHAP drivers." *(2026-09-15)*
- [x] *(found 2026-09-15)* `.agents/AGENTS.md:72` / `.cursorrules:72` — the "RAG Context Injection" rule told agents to retrieve Morgan's past emails; now states what is built and marks email retrieval as future work.

### A7. MLflow one-liner for presentations (approved wording) · **P2**

- [ ] Use this wording wherever MLflow is described. *(2026-09-15: crash course, AGENTS.md, README and model card now match these facts; adopt the spoken wording when presenting.)*

> "I used MLflow, with a SQLite backend because of corporate antivirus limits (ADR 009), to track my XGBoost runs. Each run holds the hyperparameters, the time-based split, the metrics against the baseline, the threshold rule, and the SHAP, fairness and drift reports. The served model is exported from a specific run into a portable folder (ADR 005), and that run ID is returned by the API and saved on every draft, so any score traces back to its training run. Registering the model with promotion stages would be the next MLOps step."

### A8. Further mismatches found during the 2026-09-15 corrections pass

All fixed on 2026-09-15 unless marked open.

| # | Where | Doc said | Code does | Fix |
|---|---|---|---|---|
| a | `project_crash_course.md` diagrams | "Approve & Send Email" | Approve ≠ Sent; no `/send` (ADR 003) | [x] Relabelled; added "Approved ≠ Sent" bullet |
| b | `project_crash_course.md` §7.2 | Failed schema → retry LLM | No retry: rate is clamped; Azure failure → `stub_fallback` (`drafter.py`) | [x] Removed retry loop; added stub path |
| c | `project_crash_course.md` §1/§7.1 | SHAP explains why each account was flagged | Drafts carry **frozen global** SHAP driver names from `serving_meta.json` | [x] Reworded; node "Frozen global SHAP drivers" |
| d | `project_crash_course.md` §3 | 5% offer is "rejected" | `sanitize_llm_draft` clamps to 3.5%; Pydantic rejects only unclamped values | [x] Reworded |
| e | `project_crash_course.md` §4 | Fast decision "preventing instant approvals" | Soft warn only (`FAST_DECIDE_SECONDS=8`, not a hard block) | [x] Reworded |
| f | `project_crash_course.md` §6 | Start API, then Streamlit; tests = serving+genai; Docker/WS-5 "transitioning" | Streamlit runs in-process (ADR 006); suite includes core + submission; compose + WS-5 done | [x] Rewritten |
| g | `README.md`, `.agents/skills/windows-environment-bypass/SKILL.md` | `streamlit run app.py` | No root `app.py`; UI is `Code/Sprint3/friction_gate_app.py` | [x] Fixed (ADR 001 left as historical) |
| h | `README.md` §4 | `StartingFiles/` contains raw CSVs | `StartingFiles/*.csv` gitignored | [x] Noted; CLONE_GUIDE §3 table |
| i | `sprint_methodology_report.md`, `fairness_anti_discrimination_narrative.md` | Relative links | 8 broken links after the files moved | [x] Fixed; link check clean |
| j | `Sprint5/progress.md:17`, `fairness_anti_discrimination_narrative.md` §4/§7, `review_fatigue_mitigation.md:5`, `Final_Report_Official.md:357` | JR-OPEN-01…05 "open" | ADR 012 Accepted; register marks them Resolved/Deferred | [x] Updated. [x] **Re-rendered `churn_report_df14.pdf`** from the Official report (2026-09-24) |
| k | `Docs/Model_Card.md` | Live Azure endpoint "still open"; no MLflow caveats | Azure live 2026-07-17; nothing registered; preprocessor not logged | [x] Updated |
| l | `requirements.txt` / `pyproject.toml` | Unpinned `prompty` | `prompty` 2.x fails to render `retention_draft.prompty` (drafter silently uses embedded prompt; `test_prompty_drafter` fails). The `Dockerfile` installs `requirements.txt`, so the image was affected | [x] Pinned `prompty<2` |
| m | `CLONE_GUIDE.md` | `pip install -r requirements.txt` only | `requirements.lock` is Windows-compiled (`pywin32`) — not usable in Docker/Linux | [x] Documented which file to use. [x] `Dockerfile` no longer copies `requirements.lock` (2026-09-18). [x] 2026-09-24: the image now installs `requirements.serving.txt`, compiled for Linux with `-c requirements.lock` so scikit-learn matches the pickled preprocessor (DK-07 in `Docs/Sprint5/docker_smoke_checklist.md`) |
| n | `.env.example` | `MLFLOW_TRACKING_URI=http://localhost:5000` | Not read anywhere (see B5) | [x] Removed |
| o | `.agents/AGENTS.md:47` | `create_nb.py` as a "root script" | It lives in `Code/Sprint0/` and is outdated | [x] Example changed to `export_ops_model.py` |
| p | `Final_Report_Official.md` §6.4 (Server-side re-score row) *(found 2026-09-17)* | "Draft create always re-scores via FastAPI/`Models/ops/` — UI cannot bypass `t ≈ 0.70055`" | True for `POST /drafts` only. The Streamlit UI does not call FastAPI: it imports `score_raw_features`, `create_draft` and `draft_store` and runs them in-process (ADR 006), so for UI-created drafts the gate is an `if flagged:` check in `friction_gate_app.py`, not a server rule | [x] *(2026-09-18)* Reworded in the Official report to: "`POST /drafts` re-scores from raw features and rejects client-supplied scores (`extra="forbid"`); the demo Streamlit UI runs the same model, threshold and checks in-process (ADR 006)". Target design → **F8**. [ ] Re-render the PDF afterwards |

---

## Part B — 🟠 NEEDED UPDATES (stale status, missing deliverables, hygiene)

### B1. MLflow Model Registry deliverable missing · **P1 (if `[MLOps]` applies)**

The brief (`StartingFiles/banking-churn-genai-project.md:113`, `:119`) says: *"register the final model in the MLflow Model Registry"*. The submission guide (`StartingFiles/submission-guide.md:15`) requires a registry link *"Versioned with promotion stage"*. Both are tagged `[MLOps]`. The repo also ships FastAPI, Docker and ACA work, so this module may apply.

- [ ] Confirm with the trainer whether `[MLOps]` is active for DF14.
- [ ] If yes: register run `3f575754` as `meridian-churn` v1 and set alias `champion`. MLflow 3 aliases replace the deprecated Staging/Production stages. This requires the original `mlflow.db` + `mlartifacts/`, or a notebook re-run to recreate them.
- No MLflow server or endpoint is needed: the Model Registry works on the local SQLite store. Full selection + promotion design: [MLflow_Model_Selection_Roadmap.md](../Architecture/MLflow_Model_Selection_Roadmap.md) §1.1, §5.

### B2. MLflow run not reproducible from a clean clone · **P2**

- `mlflow.db` and `mlartifacts/` are gitignored and **absent on this machine**. The notebook ran under a different Windows user (`C:\Users\JacquesduToit\…`).
- `Code/Sprint3/export_ops_model.py` would exit with code 2 on a fresh clone. Serving still works because `Models/ops/` is committed.
- [ ] Back up `mlflow.db` + `mlartifacts/` somewhere durable, or document the rebuild procedure: run `02_feature_engineering` → `01_modeling_and_rai` → `export_ops_model.py`. *(Rebuild procedure documented 2026-09-15 in CLONE_GUIDE §3 and Technical Debt §1; backup still open.)*
- [x] Add a note to `CLONE_GUIDE.md` that the MLflow store and data files are not in git. *(2026-09-15)*

### B3. Preprocessor not logged to MLflow · **P2**

Only the booster is logged (`mlflow.xgboost.log_model`). `export_ops_model.py` **re-fits** the one-hot encoder on the same fit months, so the MLflow run alone cannot rebuild the served pipeline.

- [ ] On the next training run, log the preprocessor (`mlflow.log_artifact(preprocessor.joblib)`) or log the full pipeline as one pyfunc model with a signature. See F4. *(Tracked as debt 2026-09-15.)*
- [ ] Also replace the deprecated `artifact_path="model"` with `name="model"` (the notebook output shows this warning).

### B4. Max-F1 (v1) training code only survives in scratch · **P3**

Running the Sprint 2 notebook again replaced the `xgb_temporal_v1` cell. The v1 code only exists in `.agents/scratch/build_sprint2_modeling_nb.py`.

- [x] Add one line to `Docs/Sprint2/ML_Learnings.md` §1 pointing to where the v1 code lives. *(2026-09-15)*

### B5. Unused MLflow config · **P3**

- [x] `src/core/config.py:65` defines `mlflow_tracking_uri = "http://localhost:5000"`, but nothing reads it (the notebook and export use `sqlite:///mlflow.db`). Remove it, or wire it up and set the default to the SQLite URI. *(2026-09-15: removed from `config.py` and `.env.example`; `extra="ignore"` keeps old `.env` files working.)*

### B6. README is stale / misleading as the front door · **P1**

- [x] `README.md:8` — status note is dated 2026-07-14 and says `pytest tests/serving` **15 passed** (Sprint 5 progress says 60). Refresh after re-running tests (see B12). *(2026-09-15: 68 passed)*
- [x] `README.md:14` — "Planned Architecture" → "Architecture" (it is built). *(2026-09-15)*
- [x] `README.md:34-53` — folder map: *(2026-09-15)*
  - It lists `src/features/`, `src/models/`, `src/utils/` as holding logic, but they are **empty placeholder packages**.
  - It omits `educational_web_app/`, `infra/`, `tests/`, `Dockerfile` / `docker-compose.yml`, `Code/Sprint5/`, and `src/genai/rag_engine.py`.
- [x] `README.md:96` — Model Card link points to `Docs/Model_Card_Template.md`, but `Docs/Model_Card.md` also exists. Pick one source of truth. *(2026-09-15: the files were identical; `Model_Card.md` is canonical (the edu app already used it) and `Model_Card_Template.md` is now a pointer so older links resolve.)*
- [x] Add a short "How it works" overview at the top: problem → pipeline diagram → components → current status → run commands. Keep the doc links below it. *(2026-09-15)*

### B7. PRD roadmap stale · **P2**

- [x] `Docs/Product/Product_Requirements_Document.md:53` says "Still open: Docker Compose scaffolding and multi-page Streamlit refactor". `docker-compose.yml` exists, and `Docs/Sprint5/progress.md` marks WS-5 Streamlit refactor **Done**. Also mention the submission pipeline and RAG chunking as landed. *(2026-09-15)*

### B8. Technical debt register stale · **P2**

- [x] `Technical_Debt_and_Limitations.md:6` — "Pay down when Sprint 5 containerizes FastAPI (WS-2 still open as of 2026-07-14)". A Dockerfile and compose file now exist; only the ACA deploy is open. *(2026-09-15)*
- [x] `Technical_Debt_and_Limitations.md:12` — "Local `.env` may lack `AZURE_OPENAI_ENDPOINT`". Progress records the Azure live path working on 2026-07-17. *(2026-09-15)*
- [x] Add B2 / B3 (MLflow reproducibility, preprocessor not logged) as tracked debt. *(2026-09-15)*

### B9. `task.md` vs ADR 012 inconsistency · **P1**

- `task.md:5` says *"Wait for Jamie/Arvind's reply… to close out JR-OPEN-01...05"* (unchecked).
- ADR 012 (dated 2026-07-17, **Accepted**) records decisions for JR-OPEN-01 to 05 "based on the stakeholder consultation (Arvind/Jamie)".
- [x] Decide which is true. If sign-off happened, tick `task.md:5` and update `Docs/Sprint5/jamie_requirements_register.md`. If not, mark ADR 012 as *Proposed*. *(2026-09-15: the register already marks JR-OPEN-01…03 Resolved and 04–05 Deferred with its checklist ticked, so sign-off happened; `task.md` was the stale file and is now ticked. Other stale "open" mentions: see A8-j.)*

### B10. Tracked scratch files at repo root · **P2**

The submission guide requires a "clean commit history", and these files are committed:

| File | Content | Action |
|---|---|---|
| `scratch_jamie.txt` (36 KB) | Agent session transcript with old user paths. No obvious secrets found by pattern scan. | [x] Moved to `.agents/scratch/` (2026-09-18) |
| `python_procs.txt` | `'wmic' is not recognized` error output | [x] Deleted (2026-09-18) |
| `install.log` | pip upgrade notices. Already in `.gitignore` but still tracked; the `applocker-safe-install` skill writes it at runtime | [x] Untracked; `*.log` now in `.gitignore` (2026-09-18) |
| `test_azure.py` | Ad-hoc Azure connectivity check (not a pytest test despite its name; a bare `pytest` run from the root would collect it) | [x] Moved to `.agents/scratch/test_azure_root_copy.py` (2026-09-18) |
| `Code/Sprint0/create_nb.py` | Outdated notebook generator; can overwrite the Sprint 1 notebook with stale logic (warned in Code_Walkthrough) | [x] Archived to `.agents/scratch/create_nb_sprint0_outdated.py` (2026-09-18) |

*(Done 2026-09-18; confirmed in the committed tree during reconciliation on 2026-10-20.)*

### B11. Sprint 5 open items (carried from `task.md` / `progress.md`) · **P2**

- [x] WS-2 local Docker smoke (2026-09-24): all checklist §3 steps pass; DK-07…DK-11 fixed. See `Docs/Sprint5/docker_smoke_checklist.md` §4.
- [x] WS-2 Azure Container Apps deploy and documentation: deployed, verified and torn down 2026-09-24. ADR 016 + Sprint 5 debrief §7 record the actual evidence. The hand-written manifest is marked superseded. No standing URL.
- [ ] Verify the subsequently added `X-API-Key` gate on the next Azure deployment. Local tests cover it; the previous live deployment preceded the gate.
- [ ] Build the real prediction cohort when `training_data.csv` is available; currently the browser uses two labelled fixtures.
- [ ] Add the retrospective's live integration script, committed Streamlit page matrix and Python CI.
- [x] Azure embeddings 404 → RAG on TF-IDF (DK-13). Cause: Foundry project endpoint in `.env`; fixed in `normalize_openai_base_url()` (2026-09-24). RAG is hybrid again.
- [x] WS-3 `azd` scaffolding (2026-09-24): `azure.yaml` + `infra/main.bicep`, `resources.bicep`, `main.parameters.json`; `azd provision --preview` OK. Not blocked by credentials after all (`azd` uses the Azure CLI login). Foundry already hosts both model deployments.
- [x] Brief gap: Sam's "prediction browser" and "SHAP explanations per customer" (2026-09-24). `GET /predictions`, `/predictions/{id}/explain`, `POST /explain`; Streamlit page; ADR 007 follow-on. Real cohort not yet built (needs `training_data.csv`).
- [x] Sprint 5 close-out: `sprint_debrief.md` + `sprint_retrospective.md` + `walkthrough.md` refresh (2026-09-24).
- [ ] ~~Run `/review-presentation` against Sam / Morgan / Jamie requirements after A1–A7 are fixed.~~ Descoped by the owner (2026-09-24).

### B12. Historical environment blockers (2026-09-15; resolved for local tests)

Historical snapshot checked on 2026-09-15 (user `jacqu`); not current runtime status. On 2026-10-20, `uv run python -m pytest tests -q` passes all 127 tests. Source data and MLflow store are still absent, so training/rebuild remains unavailable:

| Check | Result |
|---|---|
| `py` launcher | **Not found.** `python` → 3.13.15 (uv, `~\.local\bin`) |
| `pytest` | **Not installed**, so the test count claimed in progress (60) is **unverified** |
| `Data/processed/training_data.csv` | Absent (gitignored) |
| `StartingFiles/*.csv` raw data | Absent (gitignored) |
| `submission_df14.csv` | Absent (gitignored by `*.csv`; must be attached to the submission separately) |
| `mlflow.db` / `mlartifacts/` | Absent |

- [x] Install deps (`python -m pip install --user -r requirements.txt`), run `python -m pytest tests -q`, and record the real count in README and progress. *(2026-09-15: the uv-managed Python refuses `pip --user` (PEP 668), so tests ran in a throwaway venv. Result: **68 passed** once `prompty<2` is used — see A8-l. Recorded in README, progress and CLONE_GUIDE.)*
- [x] `CLONE_GUIDE.md`: note that there is no `py` launcher on non-AppLocker machines, that data files must be obtained separately, and where `submission_df14.csv` comes from. *(2026-09-15)*

---

## Part C — 🔵 FUTURE WORK (not built; present only as next steps)

### F1. MLflow-driven constrained model selection · **P2**

Build what the A1 statement described, so it becomes true: compare several candidate models under stakeholder-agreed gates, keep the Pareto frontier, choose with agreed weights, test once, and promote through the Model Registry after human review.

**Full design → [MLflow_Model_Selection_Roadmap.md](../Architecture/MLflow_Model_Selection_Roadmap.md)** (run structure, scorecard, gates, frontier, rules, registry, serving change, open decisions, before/after talk track). No MLflow endpoint is needed: local SQLite supports the registry (roadmap §1.1).

- [ ] Restore data + MLflow store (B2 / B12)
- [ ] Selection script: parent run, nested candidates, `log_input`, validation scorecard (roadmap §3.1–3.2)
- [ ] Gates as params/tags → `search_runs` Pareto frontier → `selection_rationale.json` (roadmap §3.3–3.5); needs F2, F3, F5, F6
- [ ] Test the winner once; register as `challenger`; human review → `champion` (roadmap §4–5)
- [ ] `export_ops_model.py` loads `models:/meridian-churn@champion`; version in `serving_meta.json` + `/health` (roadmap §6)

### F2. Probability calibration · **P2**

*Prerequisite for the calibration gate in the [MLflow roadmap](../Architecture/MLflow_Model_Selection_Roadmap.md) §3.3.*

- [ ] Isotonic (or Platt) calibration fitted on an early validation window. Isotonic is monotonic, so the top-5% queue and PR-AUC are unchanged, but scores become meaningful.
- [ ] Enables Morgan's **High / Medium / Low** buckets (brief `banking-churn-genai-project.md:99`) and expected-value maths.
- [ ] Revisit the unreachable 40% precision floor after calibration and/or model lift (`ML_Learnings.md` §2.4a).

### F3. Fairness limits as an agreed gate · **P2**

*Prerequisite for the fairness gate in the [MLflow roadmap](../Architecture/MLflow_Model_Selection_Roadmap.md) §3.3 / §8.*

- [ ] Agree numeric limits with Jamie (e.g. max EOD for age and state). **Amend ADR 012** if fairness becomes a hard release gate; today it is disclosure-only.
- [ ] Investigate the age skew at the ops cut. Selection rate is **14.6% for 65+** and **8.3% for 56–65**, vs about **4.6–4.9%** for other bands. Age EOD is **0.156**, above the notebook's own "flag > 0.10 for Jamie" note. Determine whether this is a true prevalence difference or model bias, and document the finding.

### F4. Log the complete serving pipeline to MLflow · **P3**

*Needed so the registered model in the [MLflow roadmap](../Architecture/MLflow_Model_Selection_Roadmap.md) §5 rebuilds what `/score` serves.*

- [ ] Wrap preprocessor + booster (+ calibrator) as one `mlflow.pyfunc` model with an input signature, so the run can rebuild exactly what `/score` serves. Keep the `Models/ops/` portable export (ADR 005) as the serving source of truth.

### F5. Business value metric with Morgan's assumptions · **P3**

*Feeds the business-value objective in the [MLflow roadmap](../Architecture/MLflow_Model_Selection_Roadmap.md) §3.2.*

- [ ] Get save rate and cost per contact from Morgan and log them as params. Compute expected AUM saved per threshold and run a sensitivity analysis. Reuse the P-02 AUM method (prior-3-month max balance, about $7.27M baseline).

### F6. Operational metrics · **P3**

*Feeds the latency and cost objectives in the [MLflow roadmap](../Architecture/MLflow_Model_Selection_Roadmap.md) §3.2.*

- [ ] Measure `/score` p50/p95 latency and `/drafts` latency when Azure is live. Technical debt §2 already proposes a task queue + 202 if drafting exceeds 5 s.
- [ ] Aggregate the drafter's token telemetry into cost per approved draft.

### F7. Existing roadmap items (already documented elsewhere) · **P3**

- [ ] Phase 6 RAG: hybrid search, query rewriting, cross-encoder re-ranking → [Phase6_Production_RAG_Roadmap.md](../Architecture/Phase6_Production_RAG_Roadmap.md)
- [ ] Entra ID / SSO to replace demo RBAC (ADR 007 / ADR 012 §5)
- [ ] Enterprise audit: immutable staff IDs, prompt/payload hashing, encrypted retention (ADR 012 §4)
- [ ] Remote MLflow tracking server (ADR 009, Alternatives §2). Not available; URI kept as placeholder `<REPLACE_WITH_SHARED_MLFLOW_TRACKING_URI>` → [roadmap §1.1](../Architecture/MLflow_Model_Selection_Roadmap.md#11-does-this-need-an-mlflow-endpoint)
- [ ] Drift monitoring script (brief `[MLOps]` stretch). Evidently train-vs-test exists; scheduled monitoring does not.

### F8. Make FastAPI the single enforcement point for drafts · **P2** · *code done 2026-09-18 (DB-credential split still open)*

*Found 2026-09-17. Related: A8-p, ADR 006, ADR 007, ADR 008.*

**Today:** two paths create drafts. `POST /drafts` ([app.py](../../src/serving/app.py)) takes raw features only (`DraftCreateRequest`, `extra="forbid"`), re-scores with `Models/ops/`, refuses unflagged rows with 422, then drafts and stores. The Streamlit UI ([friction_gate_app.py](../../Code/Sprint3/friction_gate_app.py)) skips HTTP. It calls the same functions in-process and writes to SQLite directly. ADR 006 chose this on purpose because corporate AppLocker blocked `localhost` HTTP calls, and it is acceptable for a single-machine demo.

**Why it matters in production:** the score gate, role checks and audit trail are only as strong as the weakest path that can write a draft. With in-process UI code:
- anyone who can edit or run the UI, or who has write access to the SQLite file, can create a draft without passing the gate;
- role checks run inside the UI, not behind an authenticated API;
- the rules are repeated in two places and can drift apart. For example, the UI path already passes no `extra_context` to the drafter, unlike the API path.

**Target design:** every client (Streamlit, a future web UI, batch jobs) calls the API over HTTP. Only the API holds database credentials and writes drafts.

```text
Streamlit / web UI / batch job
        │  HTTPS: raw features + user identity (Entra ID token, see F7)
        ▼
FastAPI  (the only thing allowed to write drafts)
   1. authenticate + authorise the role
   2. validate input (Pydantic, extra="forbid": no client score accepted)
   3. re-score: preprocessor → booster → score
   4. gate: score ≥ serving_meta threshold, otherwise 422 and no LLM call
   5. PII scrub → prompt → LLM (stub fallback) → Pydantic rate cap ≤ 3.5%
   6. insert pending_review draft + audit event (run_id, threshold, drafter_source)
        │
        ▼
Database (Postgres once there is more than one replica, see ADR 008)
```

- [x] *(2026-09-18, `src/serving/client.py`)* Add a small HTTP client module for Streamlit (`/score`, `/drafts`, `/drafts/{id}` PATCH, `/audit/events`) with timeouts and retries. Remove the direct `draft_store` and `create_draft` imports from `friction_gate_app.py`.
- [x] *(2026-09-18; implemented as an ASGI test client on the same FastAPI app, so no rules are duplicated)* Keep an explicit in-process fallback for AppLocker demo machines only, behind a clearly named setting (e.g. `FRICTION_GATE_MODE=inprocess`), off by default. Document it in an ADR 006 follow-up.
- [x] *(2026-09-18)* Role enforcement is API-only in effect: the UI has no write path. Real identity still needs Entra ID (F7).
- [ ] Give database write credentials to the API service only. *(Open: needs Postgres / separate service identity, ADR 008; the SQLite file is still shared on one host.)*
- [x] *(2026-09-18, `tests/serving/test_friction_gate_client.py`)* Add a test that fails if UI code imports `draft_store` write functions or `create_draft` directly.
- [x] A8-p wording fixed 2026-09-18, then updated the same day once F8 landed (report now says the UI calls the API). Re-render the PDF.
