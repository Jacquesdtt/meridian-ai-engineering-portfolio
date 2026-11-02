# Code Walkthrough (Junior Engineer Guide)

> **Agent note:** Read this before editing `01_data_integrity_and_eda.ipynb`, regenerating the notebook, or any code that touches `StartingFiles/*.csv`.  
> **Mirrors:** Keep `Docs/Engineering/Code_Walkthrough.md` and `.agents/Code_Walkthrough.md` in sync.

This page maps the main EDA notebook, related docs, and project Python so you can navigate without reading everything at once.

## Start here

| Artifact | What it does |
|----------|----------------|
| `Code/Sprint1/01_data_integrity_and_eda.ipynb` | Sprint 1 EDA → locked `Is_Churned` + revision §9 (P-01…P-12) — **ran 2026-07-10** |
| `Code/Sprint1/02_feature_engineering.ipynb` | Month-`t` features + export `training_data.csv` — **ran 2026-07-10** |
| `Data/processed/training_data.csv` | FE export (gitignored): **2,263,608 × 27**, pos **11.7601%** |
| `Code/Sprint2/01_modeling_and_rai.ipynb` | Temporal XGBoost + MLflow + SHAP/RAI — **ran 2026-07-14** (ops run `3f575754`) |
| `Models/ops/` | Portable booster + OHE + `serving_meta.json` (Sprint 3 serve source of truth) |
| `src/serving/app.py` | FastAPI `/health` `/score` `/drafts` `/audit/events` — ops threshold; demo `X-Demo-Role`; no `/send` |
| `Code/Sprint3/friction_gate_app.py` | Streamlit Friction-Gate + demo Glass-Box RBAC (ADR 007) + Methodology RAG tab |
| `src/genai/rag_engine.py` | AppLocker-safe RAG (ADR 010): bounded markdown chunks ≤1200 · Azure embed + cosine · TF-IDF fallback · disk cache `schema_version` |
| `src/genai/prompts/retention_draft.prompty` | Sprint 5 prompt-as-code for Azure drafts |
| `Docs/Final_Report_Official.md` | Official handover report (RAG corpus for Methodology tab) |
| `Docs/Sprint5/progress.md` | Sprint 5 mid-sprint status (active) |
| `Docs/Sprint5/rag_chunking_revision_plan.md` | Chunk granularity fix (2026-07-17) — attack → checklist → cascade |
| `Docs/Architecture/ADRs/007-demo-glass-box-rbac.md` | Demo RBAC (UI + API); not Entra ID |
| `Docs/Architecture/ADRs/010-applocker-safe-in-memory-rag.md` | Pure-Python RAG (no Chroma/FAISS) |
| `Docs/Model_Card_Template.md` | Sprint 2 metrics + serving / Friction-Gate / Sprint 5 RBAC note |
| `Docs/Sprint2/ML_Learnings.md` | **Presentation deep-dive:** first run → ops policy |
| `Docs/Presentations/generate_presentation.py` | **Live handover deck SoT** (Kubrick → dual PPTX) |
| `Docs/Sprint4/presentation.md` | **Legacy** Marp crib (Milestone 4 freeze; do not treat as live deck) |
| `Docs/Sprint4/final_report.md` | Final report + artifact index (Milestone 4 freeze; §9 points to Sprint 5) |
| `Docs/Sprint4/demo_runbook.md` | Live demo script (`/health` → Below → Flagged → Approve; + role switch) |
| `Docs/Sprint4/fixtures/` | Demo JSON presets (below ~0.21 / flagged ~0.75) |
| `Docs/Sprint1/walkthrough.md` | Full Sprint 1 execution narrative (EDA + FE) |
| `Docs/Sprint2/walkthrough.md` | Sprint 2 modeling execution narrative |
| `Docs/Sprint3/walkthrough.md` | Sprint 3 serve + Friction-Gate narrative |
| `Docs/Sprint4/walkthrough.md` | Sprint 4 handover narrative — **closed 2026-07-14** |
| `Docs/Sprint2/sprint_plan.md` | Sprint 2 plan (DoD checked for modeling milestone) |
| `Docs/Sprint3/sprint_plan.md` | Sprint 3 plan (DoD checked; closed 2026-07-14) |
| `Docs/Sprint4/sprint_plan.md` | Sprint 4 plan (DoD checked; Milestone 4 met 2026-07-14) |
| `Docs/Sprint5/sprint_plan.md` | Sprint 5 plan (active; WS-1/WS-4 done) |
| `Docs/Sprint0/project_schedule.md` | Gantt + sprint status board |
| `Docs/Sprint1/churn_definition.md` | Post-Sam → EDA v1 + v1.1 revision findings |
| `Docs/Sprint1/ML_Learnings.md` | ML insights + red-team → revision outcomes |
| `Docs/Sprint1/ai_engineering_learnings.md` | Docs-before-code process |
| `Docs/Sprint1/ai_bp_learnings.md` | Morgan / Jamie / Sam framing |
| `Docs/StakeholderManagement/Meetings/02_eda_notebook_red_team.md` | Red-team of EDA v1 (attack log) |
| `Docs/Sprint1/eda_revision_plan.md` | P-01…P-12 checklist (**all closed**) |
| `Docs/Product/Product_Requirements_Document.md` | Primary metric ≈ **$7.27M** AUM at risk (P-02) |
| `Docs/Architecture/ADRs/004-churn-target-and-predictive-window.md` | Formal churn / window decision record |
| `Docs/Data/Data_Dictionary.md` | Raw + engineered column names |
| `.cursor/skills/validate-csv-schema/` | Blocks hallucinated CSV column names |

## Notebook flow (`01_data_integrity_and_eda.ipynb`)

Path: `Code/Sprint1/01_data_integrity_and_eda.ipynb`  
CSVs load via `Path('../..') / 'StartingFiles'` (cwd-independent).

| § | Section | What it does |
|---|---------|----------------|
| 1 | Load Data | `customers_df`, `transactions_df` |
| 2 | Inspect Schema & Missing Values | dtypes / nulls; 3 null `start_balance` → **`fillna(0)` (Sam-confirmed)** |
| 2.1 | Integrity checklist | **P-08 / P-10** DQ + 1:1 accounts |
| 3 | Zero-Amount Placeholders | Flag `$0` month-end rows; `is_active_tx` |
| 4 | Aggregate & Running Balance | `monthly_tx` with `Monthly_Active_Txn_Count`, `Running_Balance`, tenure |
| 4.1 | Panel continuity | **P-01** gap check (0% gaps → no reindex) |
| 5 | Churn Definition EDA | Thresholds, streaks, grace, 1m vs 2m; §5e coarse AUM proxy (superseded by §9) |
| 6 | Visualizations | Balance + active-txn distributions |
| 7 | Decision Rationale | Why the locked rule (table) |
| 8 | Locked `Is_Churned` | Next-month label + `Is_Train_Eligible` (`GRACE_MONTHS = 2`) |
| 8.1 | Label interpretability | **P-04 / P-05 / P-11** prevalence, impending, time series |
| 9 | Revision batch | **P-02 / P-03 / P-07 / P-09** AUM, ops timing, negatives, age/state |

**Locked label (summary):** at month `t` (tenure ≥ 2), `Is_Churned = 1` iff month `t+1` has `Running_Balance_Rounded == 0` **and** `Monthly_Active_Txn_Count == 0`.

**Key locked numbers (v1.1):** prevalence **11.76%**; AUM-at-risk **~$7.27M** (prior-3-month max); prior-month `$0`-cross **34%** by day 14.

**Why this notebook:** Evidence for the churn rule (thresholds, streaks, grace, 1m vs 2m), integrity checks, and stakeholder metrics (AUM / ops / fairness) — **not** the training export.

Kernel: **Python 3.13** (system install, not `.venv` — AppLocker blocks venv).

```cmd
cd Code\Sprint1
py -3.13 -m nbconvert --to notebook --execute --inplace 01_data_integrity_and_eda.ipynb
py -3.13 -m nbconvert --to notebook --execute --inplace 02_feature_engineering.ipynb
```

## Notebook flow (`02_feature_engineering.ipynb`)

**Why this notebook:** Independently rebuild the ADR 004 panel from raw CSVs, engineer month-`t`-only features, and write `training_data.csv` for Sprint 2. Does not read EDA notebook state.

| § | Section | What it does |
|---|---------|----------------|
| 1 | Load raw CSVs | Same `StartingFiles` as EDA (141,576 cust / 6.4M tx) |
| 2 | Monthly panel + locked label | Rebuild ADR 004 `Is_Churned` / `Is_Train_Eligible` → 2.26M eligible @ **11.7601%** |
| 3 | Feature engineering | Demographics, level, lags/rolls, dormancy (month `t` only) |
| 4 | Assemble & export | Eligible rows → `Data/processed/training_data.csv` (27 cols, ~417 MB) |
| 5 | Sanity checks (anti-leakage) | Grace; `gone_this_month` separation **81.75%**; name check; **RF Gini screen** top=`Running_Balance_Rounded` **0.273** (≪ 0.50) — **passed** |

**Modeling notes from last run:** `Active_Txn_Lag3` ~138k NaNs; balance extremes ±1e10; split on `Month`. Gini top-3 = rounded balance / balance / `Balance_Roll3_Mean` (expected for this label).

Regenerate notebook JSON from template:

```cmd
py -3.13 .agents\scratch\rebuild_fe_notebook.py
```

## Python modules

### `src/core/config.py`

Loads settings from environment / `.env` using **pydantic-settings**. Azure OpenAI fields are **optional** (Sprint 3) so `/score` and stub drafts work without credentials.

### `src/serving/` + `src/genai/`

| Module | Role |
|--------|------|
| `serving/model.py` | Load `Models/ops/` booster + preprocessor; score raw feature rows |
| `serving/draft_store.py` | SQLite Friction-Gate queue + `audit_events` |
| `serving/rbac.py` | Demo Glass-Box roles / permissions (not SSO) |
| `serving/app.py` | FastAPI routes (`X-Demo-Role`, `/audit/events`) |
| `genai/pii_scrubber.py` | ZDR redaction before LLM |
| `genai/drafter.py` | Stub / Azure / stub_fallback; `.prompty` render for Azure messages |
| `genai/prompts/retention_draft.prompty` | Prompt-as-code asset (Sprint 5) |

```cmd
set PYTHONPATH=%CD%
py -3.13 -m uvicorn src.serving.app:app
py -3.13 -m streamlit run Code\Sprint3\friction_gate_app.py
py -3.13 -m pytest tests\serving -q
py -3.13 .agents\scratch\verify_s4_fixtures.py
py -3.13 Code\Sprint3\export_ops_model.py
```

### Notebook regenerator

Prefer editing the notebook directly. To regenerate from the template script:

```cmd
py -3.13 .agents\scratch\rebuild_eda_notebook.py
```

`create_nb.py` (archived to `.agents/scratch/create_nb_sprint0_outdated.py`) is an **older** generator (outdated paths / churn logic). Do not use it unless you intentionally sync and update that template first — it can overwrite the Sprint 1 notebook with stale content.

### `.cursor/skills/validate-csv-schema/scripts/validate_schema.py`

CI-style check: CSV headers match `schema.json`; notebooks/scripts do not use hallucinated names like `'Transaction Date'`.

```cmd
py -3.13 .cursor\skills\validate-csv-schema\scripts\validate_schema.py
py -3.13 .cursor\skills\validate-csv-schema\tests\test_validate_schema.py -v
```

## Scratch scripts (diagnostics only)

Under `.agents/scratch/` — **not** production. Useful ones:

| Script | Purpose |
|--------|---------|
| `rebuild_eda_notebook.py` | Rebuild `01_data_integrity_and_eda.ipynb` |
| `rebuild_fe_notebook.py` | Rebuild `02_feature_engineering.ipynb` |
| `churn_threshold_analysis.py` | Full-file threshold / streak / label-rate diagnostics |
| `append_pbatch_cells.py` / `patch_pbatch_p02_p03.py` | §9 revision-batch helpers |

Do not import scratch scripts from `src/`.

## Common pitfalls

1. **Wrong column names** — use `transaction_date`, not `Transaction Date`
2. **Balance without `start_balance`** — cumsum of amounts alone is not account balance; use `fillna(0)` on the 3 nulls (Sam)
3. **Raw txn count for inactivity** — `$0` placeholders (~8% of rows) make `count == 0` impossible; use `Monthly_Active_Txn_Count`
4. **Target leakage** — features only through month `t`; label is state in `t+1`
5. **High-balance dormancy ≠ churn** — inactive with large balance still holds AUM
6. **AUM window** — do not use prior-month-only or `start_balance` for Morgan; use prior-3-month max (~$7.27M)
7. **Ops timing** — exit months have 0 active txs; time drains on the **prior** month
8. **AppLocker** — use `py -3.13 -m ...`, not `.venv\Scripts\python.exe` or `jupyter` CLI

## Documentation standard (when adding code)

- **Notebooks:** markdown for purpose / I/O; comments for *why* (business rules), not every pandas line
- **Python modules:** module docstring + public function docstrings
- **After CSV-facing edits:** run `validate_schema.py`
- **Churn rule changes:** update ADR 004 + `Docs/Sprint1/churn_definition.md` in the same change
