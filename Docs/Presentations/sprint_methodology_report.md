# Meridian Savings Churn — Final Report & Handover

> **Status clarification, 2 November 2026:** This is a historical sprint summary. PII filtering is based on keys and patterns, not a guarantee of complete de-identification or provider Zero Data Retention. Retention drafts use prompts and validation; only methodology Q&A uses document retrieval. Current retrieval and hosting status are recorded in the [technical status](../Portfolio/TECHNICAL_STATUS.md).


**Project:** InnovatorProjectDF14 · Meridian Savings retail churn ranking + GenAI Friction-Gate  
**Report date:** 2026-07-14  
**Status:** Sprint 0–4 **closed** — Milestone 4 handover pack complete  
**Owner:** Jacques du Toit (DF-14)

---

## 1. Executive summary

Meridian needs a **leakage-safe** way to rank customers likely to enter next-month left-looking churn (rounded balance `$0` **and** inactive), then draft retention outreach **without** autonomous send.

| Outcome | Result |
|---------|--------|
| Training export | `Data/processed/training_data.csv` — 2,263,608 × 27; pos **11.7601%** (ADR 004); regenerate via `Code/Sprint1/02_feature_engineering.ipynb` if absent locally |
| Ranking DoD | XGBoost **beats** `gone_this_month`: PR-AUC **0.219 vs 0.151**, ROC-AUC **0.723 vs 0.551** |
| Ops contact policy | Val top-5% quantile **`t≈0.701`** (prec ≥ 40% infeasible); test FP **248,778 → 20,127** |
| Serving | Portable `Models/ops/` + FastAPI + Streamlit Friction-Gate; **no `/send`** |
| Tests | `pytest tests/serving` — **7 passed** |
| MLflow ops run | `3f575754ae9a42c5a21ea5e476c0af37` |
| Model version | `1.1.0-sprint3-serving` |

**Application:** [Application guide](../Portfolio/DEMO_GUIDE.md) · **ML deep-dive:** [../Sprint2/ML_Learnings.md](../Sprint2/ML_Learnings.md) · **Demo:** [demo_runbook.md](../Sprint4/demo_runbook.md) · **Fixtures:** [fixtures/](../Sprint4/fixtures/) · **Red-team:** [sprint4_handover_red_team.md](../Sprint4/sprint4_handover_red_team.md)

---

## 2. Problem & success criteria

### Business
* Validated historical AUM at risk ≈ **$7.27M / ~$7.3M** (Sprint 1 EDA — not recomputed in serve).
* Retention agents need ranked candidates and draft emails; capacity is finite.
* Compliance: drafts only; human Approve/Edit/Reject; ZDR; offered rate ≤ 3.5%.

### Technical (what we actually measured)
* Primary ranking metrics: **PR-AUC** then **ROC-AUC** vs a real heuristic — not accuracy.
* Operating point: validation-only threshold, frozen for test; ops = capacity dial.
* Serving: score at ops cut; server re-score before any GenAI side effect.

> Note: PRD lists aspirational ROC-AUC > 0.85. Shipped DoD for modeling was **beat heuristic**; ops success was **Friction-Gate-sized queue**, not that AUC target.

---

## 3. Data & churn definition

| Item | Detail |
|------|--------|
| Sources | `StartingFiles/customers_tm1_e.csv`, `transactions_tm1_e.csv` |
| Churn (ADR 004) | Next month: `Running_Balance_Rounded == 0` **and** no active txns |
| Grain | Customer × month; features through month `t`; label = `t+1` |
| Split | Chronological on `Month` only — **no shuffle** |
| Leak screen | Sprint 1 Gini — top feature ≪ 0.50 |
| Dictionary | [../Data/Data_Dictionary.md](../Data/Data_Dictionary.md) |

Anti-patterns enforced: [../Sprint1/ML_Anti_Patterns.md](../Sprint1/ML_Anti_Patterns.md).

---

## 4. Modeling (Sprint 2)

**Notebook:** `Code/Sprint2/01_modeling_and_rai.ipynb`  
**Algorithm:** XGBoost `binary:logistic` with `scale_pos_weight` (treat scores as **ranks** unless calibrated).

### 4.1 Ranking (unchanged across threshold policies)

| Model | PR-AUC | ROC-AUC |
|-------|--------|---------|
| Always-negative | 0.132 | n/a |
| `gone_this_month` | 0.151 | 0.551 |
| XGBoost | **0.219** | **0.723** |

### 4.2 Operating points

| | First run `7134cee0` | Ops run `3f575754` |
|--|----------------------|---------------------|
| Rule | max F1 on val | `fallback_quantile_top5pct` |
| `t` | 0.475 | ≈ **0.70055** |
| Test precision | 0.211 | **0.229** |
| Test recall | 0.9997 | **0.090** |
| Test FP | 248,778 | **20,127** |
| Test TP / FN | 66,485 / 17 | **5,964 / 60,538** |

Canonical ops JSON: [../Sprint2/reports/sprint2_run_summary_v2.json](../Sprint2/reports/sprint2_run_summary_v2.json).  
**Do not overwrite** first-run freeze: `sprint2_run_summary.json`.

### 4.3 Why not 40% precision

Precision@k on validation plateaus ~**0.23–0.24** even at top 1%. Floor of 40% ∩ 5% contact was **infeasible**; capacity (top 5%) shipped instead. Full argument: [ML_Learnings.md §2.4a](../Sprint2/ML_Learnings.md).

### 4.4 RAI pack — fairness & anti-discrimination

Jamie’s core assessor requirement: show **how fairness was ensured / discrimination constrained**, not only that HITL exists.

**Posture:** measurement + capacity + governance + disclosure (not a claim of zero disparity). Canonical write-up: [Sprint5/fairness_anti_discrimination_narrative.md](../Sprint5/fairness_anti_discrimination_narrative.md).

| Layer | What we did | Evidence |
|-------|-------------|----------|
| Measure at serving cut | Fairlearn Equalized Odds on age + state at ops `t≈0.701` | `Docs/Sprint2/reports/fairlearn_equalized_odds.json` |
| Honest group sizes | Min group **n ≥ 500**; reject sparse state EOD = 1.0 artifact | Filtered state EOD ≈ **0.32** (38/55 states) |
| Limit contact harm | Top ~5% capacity dial | `Models/ops/` · Friction-Gate below-threshold refuse |
| Behaviour-led explainability | SHAP balance / withdrawal / activity | `Docs/Sprint2/reports/shap_*.png` |
| Human governance | No `/send`; Approve ≠ Sent; demo Compliance cannot Approve | ADR 003 · ADR 007 |
| Disclose residual gaps | Age EOD ≈ **0.16**; state EOD ≈ **0.32** | Model card · this section |

Also: Evidently drift HTML; Yellowbrick diagnostics under `Docs/Sprint2/reports/`.

**Not claimed:** automated fairness remediator or hard EOD release gate (policy open with Risk).

---

## 5. Serving & GenAI (Sprint 3)

### 5.1 Portable artifacts
`Models/ops/` — `booster.json` + `preprocessor.joblib` + `serving_meta.json`  
Re-export (needs local MLflow once): `py -3.13 Code\Sprint3\export_ops_model.py`

### 5.2 API (`src/serving/app.py`)
| Method | Path | Role |
|--------|------|------|
| GET | `/`, `/health`, `/docs` | Landing / health / OpenAPI |
| POST | `/score` | Ops-threshold score |
| POST/GET/PATCH | `/drafts` | Draft queue (SQLite) |
| — | `/send` | **Absent** (ADR 003) |

### 5.3 GenAI (`src/genai/`)
* Paths: `stub` → `azure` when configured → `stub_fallback` on failure
* ZDR scrubber; Pydantic rate ≤ 3.5% on create **and** PATCH
* Always **re-score server-side** before draft create

### 5.4 Friction-Gate UI
`Code/Sprint3/friction_gate_app.py` — in-process import of serving/genai (no localhost dependency).  
Statuses: `pending_review` | `approved` | `rejected`. **Approved ≠ Sent.**

### 5.5 Architecture commitments (Jamie)

Application workflow: [Application guide](../Portfolio/DEMO_GUIDE.md). Requirements: [jamie_requirements_register.md](../Sprint5/jamie_requirements_register.md).

| Commitment | ADR |
|------------|-----|
| HITL / no `/send` / Approve ≠ Sent | [003](../Architecture/ADRs/003-friction-as-a-feature-genai-gating.md) |
| Anti rubber-stamp (attention ack, high-stakes cue, audit timing) | ADR 003 amendment · [JR-REQ-19](../Sprint5/review_fatigue_mitigation.md) |
| Pydantic rate ≤ 3.5% | [002](../Architecture/ADRs/002-pydantic-strict-io.md) |
| Demo Glass-Box RBAC (not Entra) | [007](../Architecture/ADRs/007-demo-glass-box-rbac.md) |
| Split-brain if UI ≠ API host | [008](../Architecture/ADRs/008-split-brain-state.md) |

### 5.6 Evidence
* pytest: **36 passed** (`tests/serving` + `tests/genai`)
* `/health`: `model_loaded=true`, run `3f575754…`, `t≈0.70055`, `azure_configured=false` in demo env
* Streamlit smoke: **Below threshold** fixture p≈0.21 → not flagged; **Flagged** fixture p≈0.75 → draft path
* Demo fixtures: [fixtures/](../Sprint4/fixtures/)

Detail: [../Sprint3/sprint_debrief.md](../Sprint3/sprint_debrief.md) · [../Sprint3/walkthrough.md](../Sprint3/walkthrough.md)

---

## 6. Architecture decisions (must keep)

| ADR | Title | Implication |
|-----|-------|-------------|
| [002](../Architecture/ADRs/002-pydantic-strict-io.md) | Pydantic strict I/O | Bounds on GenAI / API payloads |
| [003](../Architecture/ADRs/003-friction-as-a-feature-genai-gating.md) | Friction as a Feature | Drafts only; no autonomous send |
| [004](../Architecture/ADRs/004-churn-target-and-predictive-window.md) | Churn definition lock | Label + FE contract |
| [005](../Architecture/ADRs/005-portable-model-export-for-serving.md) | Portable model export | `Models/ops/` is serve source of truth |
| [006](../Architecture/ADRs/006-sqlite-and-in-process-ui-for-friction-gate.md) | SQLite + in-process UI | Shared draft queue; AppLocker-friendly Streamlit |

Engineering standards: [../Engineering/Engineering_Standards.md](../Engineering/Engineering_Standards.md).  
Debt register: [../Engineering/Technical_Debt_and_Limitations.md](../Engineering/Technical_Debt_and_Limitations.md).

---

## 7. How to run (summary)

```cmd
set PYTHONPATH=%CD%
py -3.13 -m pip install --user -r requirements.txt
py -3.13 -m pytest tests\serving -q
py -3.13 -m uvicorn src.serving.app:app
py -3.13 -m streamlit run Code\Sprint3\friction_gate_app.py
```

Full scripted demo: [demo_runbook.md](../Sprint4/demo_runbook.md).  
AppLocker: use `py -3.13 -m …` — never `.venv\Scripts\python.exe`.

---

## 8. Stakeholder briefing cards

**Morgan:** Queue sized to ~top 5% of scores; model routes who enters review; humans decide outreach. AUM context still ~$7.3M historical baseline.

**Sam:** Ranking cleared heuristic. Ops cut is capacity, not a 40% precision promise. Scores are ranks unless calibrated. Higher precision inside the same budget requires ranking improvement. Calibration is separate probability-quality work; it does not improve precision for the same selected cases.

**Jamie:** Human-in-the-loop is in code (status machine + no `/send` + ZDR + rate cap), not only in slides.

---

## 9. Limitations & recommended next work

| Item | Priority | Notes |
|------|----------|-------|
| Probability calibration | Future work | Needed before interpreting scores as probabilities; no promised ranking lift |
| Model improvement | Future work | Needed to investigate higher precision at the same review capacity |
| Live Azure `.env` draft path | Open (Sprint 5) | Stub path DoD-complete; endpoint still unset on local probe |
| `.prompty` prompt-as-code | **Done (Sprint 5)** | `src/genai/prompts/retention_draft.prompty` |
| Demo Glass-Box RBAC | **Done (Sprint 5)** | ADR 007 — UI roles + `X-Demo-Role` + audit (not Entra ID) |
| Microsoft Foundry / `azd` agents | Open (Sprint 5) | Learning-outcome target; best-effort |
| Azure Container Apps | Open (Sprint 5) | Cloud hosting — no speculative runbook yet |

> Milestone 4 content above remains frozen. Sprint 5 living status: [../Sprint5/progress.md](../Sprint5/progress.md).

---

## 10. AI Orchestration & Agentic Tunnel Vision

A major learning from the MLflow-to-SQLite transition (Sprint 2) was the phenomenon of "Agentic Tunnel Vision." AI agents excel at tactically solving errors (like bypassing EDR restrictions) but often fail to elevate macro shifts to Architecture Decision Records (ADRs). 

To prevent this and elevate the AI workflow to a Systems Architect level, we implemented a **4-Part Circuit Breaker**:
1. **Docs-Before-Code:** Explicitly diagnosing major blockers (e.g., via `/docs-before-code`) and proposing architecture changes *before* editing implementation.
2. **Architectural Triggers:** Strict global rules (`AGENTS.md`) forcing the agent to pause and ask for ADR authorization on dependency or DB changes.
3. **End-of-Session Reflection:** Forcing the agent to explicitly reflect on its context window to catch undocumented structural shifts before close-out.
4. **Human-in-the-Loop Diff Reviews:** Treating the git diff as the orchestrator's final safety net.

---

## 11. Artifact index

| Artifact | Path |
|----------|------|
| Current standalone slides | [Meridian_Presentation_Standalone.pptx](Meridian_Presentation_Standalone.pptx) |
| Historical presentation | Sprint 4 Marp working document; not included in this public checkout |
| This report | `Docs/Sprint4/final_report.md` |
| Demo runbook | `Docs/Sprint4/demo_runbook.md` |
| Demo fixtures | `Docs/Sprint4/fixtures/` |
| Red-team / revision | `Docs/Sprint4/sprint4_handover_red_team.md` · `sprint4_revision_plan.md` |
| Sprint 4 plan | `Docs/Sprint4/sprint_plan.md` |
| ML presentation narrative | `Docs/Sprint2/ML_Learnings.md` |
| Ops metrics JSON | `Docs/Sprint2/reports/sprint2_run_summary_v2.json` |
| First-run freeze JSON | `Docs/Sprint2/reports/sprint2_run_summary.json` |
| Model card | `Docs/Model_Card_Template.md` |
| Training data | `Data/processed/training_data.csv` |
| Ops model bundle | `Models/ops/` |
| FastAPI | `src/serving/app.py` |
| Friction-Gate | `Code/Sprint3/friction_gate_app.py` |
| Sprint 5 progress (living) | `Docs/Sprint5/progress.md` |
| ADR 007 demo RBAC | `Docs/Architecture/ADRs/007-demo-glass-box-rbac.md` |
| Agent state | `.agents/MEMORY.md` |

---

## 12. Document control

| Version | Date | Notes |
|---------|------|-------|
| 1.2 | 2026-07-14 | Doc cascade: §9 Sprint 5 progress (`.prompty` + Glass-Box done; cloud/Azure open) |
| 1.1 | 2026-07-14 | Post–red-team: fixtures, ADR deep links, TP/FN, accuracy trap fix; full doc cascade |
| 1.0 | 2026-07-14 | Milestone 4 handover — content frozen to Sprint 2 v2 + Sprint 3 close-out |
