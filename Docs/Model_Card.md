# Model Card: Meridian Savings Churn Prediction

## Model Details
*   **Developer(s):** Jacques du Toit (Innovator Project DF-14)
*   **Model Date:** July 2026
*   **Model Version:** 1.1.0-sprint3-serving
*   **Model Type:** XGBoost Classifier (Tree-based ensemble, `binary:logistic`)
*   **Training Framework:** `xgboost` + `mlflow` (SQLite store `mlflow.db`)
*   **Serving artifacts:** `Models/ops/` (booster + preprocessor + `serving_meta.json`)
*   **MLflow experiment / runs:** `meridian_churn_sprint2` —
    *   Ranking / first cut: `7134cee0766646498e002e5326e3c200` (max-F1 `t=0.475`)
    *   Ops cut (notebook Run All): `3f575754ae9a42c5a21ea5e476c0af37` (val top-5% `t≈0.701`)
*   **Serving Architecture:** FastAPI REST (`src/serving/app.py`) + portable `Models/ops/` (ops threshold `t≈0.701`)
*   **Friction-Gate UI:** Streamlit `Code/Sprint3/friction_gate_app.py` (Approve/Edit/Reject; no autonomous send)
*   **Demo Glass-Box RBAC (Sprint 5):** ADR 007 — role picker + FastAPI `X-Demo-Role` + audit trail (pedagogical; not Entra ID)
*   **Prompt-as-code (Sprint 5):** `src/genai/prompts/retention_draft.prompty` (Azure path; stub offline-safe)
*   **Notebook:** `Code/Sprint2/01_modeling_and_rai.ipynb`
*   **Run summaries:** `Docs/Sprint2/reports/sprint2_run_summary.json` (v1) · `sprint2_run_summary_v2.json` (ops)
*   **Presentation narrative:** [Sprint2/ML_Learnings.md](Sprint2/ML_Learnings.md) · live deck [Presentations/generate_presentation.py](Presentations/generate_presentation.py) (dual PPTX) · legacy Marp [Sprint4/presentation.md](Sprint4/presentation.md) · [Sprint4/final_report.md](Sprint4/final_report.md) · demo [Sprint4/demo_runbook.md](Sprint4/demo_runbook.md) · fixtures [Sprint4/fixtures/](Sprint4/fixtures/)

## Intended Use
*   **Primary Use Case:** Rank Meridian Savings retail customers by probability that the *next* calendar month is left-looking churn (rounded balance `$0` **and** no active transactions) — ADR 004.
*   **Downstream Integration:** High-risk scores will feed GenAI retention drafts for human Friction-Gate review (ADR 003). Do **not** auto-send.
*   **Out-of-Scope:** Corporate accounts, mortgages, or treating raw model scores as well-calibrated probabilities without further calibration.

## Factors & Metrics

### Evaluation protocol
*   **Split:** Chronological on `Month` only (no row shuffle). Fit ≤ 2016-08; val 2016-09→2017-08; test **2017-09→2020-04**.
*   **Primary metric:** PR-AUC (imbalance-aware). Secondary: ROC-AUC.
*   **Decision threshold (ops):** Validation-only policy — try precision ≥ 0.40 ∩ selection ≤ 5% (max recall). **Infeasible** on these scores (val prec tops ~0.24); shipped **fallback** `t* = quantile(val_prob, 0.95)` ≈ **0.701**. Never tune on test. Narrative: [ML_Learnings.md §2](Sprint2/ML_Learnings.md).

### Test metrics — ranking (unchanged across cuts)

| Model | Accuracy | Precision | Recall | F1 | ROC-AUC | PR-AUC |
|-------|----------|-----------|--------|----|---------|--------|
| Always-negative | 0.869 | 0.000 | 0.000 | 0.000 | n/a | 0.132 |
| `gone_this_month` heuristic | 0.795 | 0.220 | 0.220 | 0.220 | 0.551 | 0.151 |
| **XGBoost (scores)** | — | — | — | — | **0.723** | **0.219** |

*   **DoD:** XGBoost **beats** heuristic on PR-AUC and ROC-AUC (ranking). Same scores under both thresholds.

### Operating point — before / after

| | First run `7134cee0` (max F1) | Ops run `3f575754` (top 5%) |
|--|------------------------------|-----------------------------|
| `t` | 0.475 | ≈ 0.701 |
| Precision | 0.211 | 0.229 |
| Recall | 0.9997 | 0.090 |
| FP | 248,778 | **20,127** |
| Confusion | TN 190,583 · FP 248,778 · FN 17 · TP 66,485 | TN 419,234 · FP 20,127 · FN 60,538 · TP 5,964 |

*   **Ops takeaway:** Capacity cut makes the queue reviewable (~12× fewer FPs). Precision ≥ 40% needs calibration / model work — not claimed here. Accuracy alone remains misleading (always-negative ≈ 87%).

### Key features (SHAP mean \|value\|, test sample)
1. `Running_Balance_Rounded` (3.004)
2. `Running_Balance` (0.640)
3. `Monthly_Deposit_Sum` (0.022)
4. `Balance_Roll3_Mean` (0.022)
5. `Monthly_Withdrawal_Sum` (0.015)

Balance dominance is **expected** under ADR 004 (next-month rounded-$0 + inactive), consistent with the Sprint 1 Gini leak screen (top feature ≪ 0.50).

Artifacts: `Docs/Sprint2/reports/shap_summary.png`, `shap_waterfall_*.png`, Yellowbrick PNGs under `Docs/Sprint2/reports/`.

## Training Data
*   **Source:** `StartingFiles/customers_tm1_e.csv`, `transactions_tm1_e.csv` → Sprint 1 export `Data/processed/training_data.csv` (2,263,608 × 27; pos rate 11.7601%).
*   **Grain:** Customer × month; features through observation month `t` only; label = month `t+1` left-looking state.
*   **Known quirks handled by trees:** `Active_Txn_Lag3` NaNs (~138k early tenure); extreme balances (±1e10) — no StandardScaler.
*   **Encoding:** `state` one-hot fit on train only; `customer_id` / `Month` held out of `X`.

## Ethical & Fairness Considerations
*   **Assessor requirement (Jamie, 2026-07-16):** Final presentation/report must show how fairness was ensured and discrimination constrained — see [Sprint5/fairness_anti_discrimination_narrative.md](Sprint5/fairness_anti_discrimination_narrative.md).
*   **Protocol:** 100k test sample at ops threshold; Equalized Odds only for groups with **n ≥ 500**.
*   **Age:** EOD ≈ 0.156; selection-rate gap ≈ 0.099 — wider than the first-run near-universal-recall cut; review before age-targeted volume.
*   **State:** EOD ≈ 0.318 (38/55 groups kept; 3,548 sparse rows excluded) — **not** the first-run artifact of 1.0. CSV: `Docs/Sprint2/reports/fairlearn_age_state_slices.csv`.
*   **Prevention layers:** measure at serving cut → min-n filter → top-5% capacity → SHAP behaviour-led drivers → Friction-Gate HITL (no autonomous send) → disclose residual gaps.
*   **Drift:** Evidently train-vs-test report at [`Docs/Sprint2/data_drift_report.html`](Sprint2/data_drift_report.html) (Morgan).
*   **Friction & Governance:** Model output must not autonomously email customers; Relationship Manager approval required (ADR 003). Approves require an **attention acknowledgement** so HITL is not a rubber stamp (JR-REQ-19).

## Limitations & Next Steps
*   Scores with `scale_pos_weight` are **ranking scores**; raw precision plateaus ~0.24 even in the top percentile — calibrate or change the model before promising 40% precision.
*   Ops cut trades recall for queue size; Sam must accept missing many churners outside the top 5%.
*   `dtreeviz` skipped (NaNs in Lag3); optional impute for stakeholder tree diagrams only.
*   Sprint 3: FastAPI + GenAI drafts behind Friction-Gate (ops threshold only) — **implemented** (`Models/ops/`, `src/serving/`, Streamlit review UI).
*   Sprint 5 (closed 2026-09-24): `.prompty`, demo Glass-Box RBAC, live Azure endpoint (2026-07-17), RAG Methodology Q&A and API Docker Compose **shipped**. Added after close: per-customer SHAP on request (exact TreeSHAP from the served booster, log-odds) and a prediction browser for Sam. The API was deployed to Azure Container Apps with `azd`, verified live, then torn down (ADR 016); no standing URL. See [Sprint5/sprint_debrief.md](Sprint5/sprint_debrief.md) §7.
*   MLflow: runs are tracked but **not registered** in the Model Registry, and only the booster (not the preprocessor) is logged — see [Engineering/Technical_Debt_and_Limitations.md](Engineering/Technical_Debt_and_Limitations.md).
