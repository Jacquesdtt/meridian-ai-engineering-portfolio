# Sprint 1: EDA & Feature Engineering - Plan & Goals

## 1. Sprint Objective
The primary objective of Sprint 1 is to validate our assumptions about the raw `transactions` and `customers` datasets, mathematically define our proxy variable for "Churn," and engineer the training dataset required for the XGBoost classifier in Sprint 2.

## 2. Key Deliverables
*   **EDA Execution:** Run `01_data_integrity_and_eda.ipynb` to analyze the 350MB+ transaction logs and identify distribution skews.
*   **Churn Definition (ADR 004):** Perform EDA on low balances and inactivity to mathematically define the target variable `Is_Churned`. Establish a strict 1-month forward-looking predictive window and enforce Observation vs. Prediction splits to prevent target leakage.
*   **Feature Engineering Pipeline:** Write the Python script/notebook to aggregate raw daily transactions into a monthly grain, calculate running balances, and join with customer demographics.
*   **Cleaned Dataset:** Export the final, joined `training_data.csv` ready for MLflow tracking.

## 3. Risks & Constraints
*   **Data Size:** The 350MB transaction file may cause memory bloat. We must rely on pointer-based memory and avoid dumping raw Pandas dataframes into the LLM context window.
*   **Temporal Leakage:** We must ensure we do not use future data (e.g., June data) to predict June churn. All aggregations must hard-stop at May 31st, 2020.
*   **Execution Environment:** All heavy Python code must be executed natively by the Human Orchestrator (using the global `py` launcher) to bypass corporate AppLocker constraints.

## 4. Definition of Done
- [x] EDA notebook rebuilt with activity / threshold / grace / next-month analysis (`01_data_integrity_and_eda.ipynb`).
- [x] Churn definition locked and documented ([ADR 004](../Architecture/ADRs/004-churn-target-and-predictive-window.md), [churn_definition.md](churn_definition.md)).
- [x] Post-Sam notebook red-team + revision (P-01…P-12) closed; PRD AUM ≈ $7.27M.
- [x] Feature engineering notebook created (`02_feature_engineering.ipynb`) — month-`t` features + export path.
- [x] Feature engineering notebook executed end-to-end; `Data/processed/training_data.csv` generated and spot-checked (2,263,608 × 27; pos rate 11.7601%; anti-leakage sanity passed).
- [x] EDA notebook executed in IDE and distributions reviewed end-to-end (incl. §9).
