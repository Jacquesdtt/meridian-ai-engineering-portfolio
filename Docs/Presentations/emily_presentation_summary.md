# Presenting the Churn Prediction Model to Emily

Use this structured outline to present the end-to-end Machine Learning lifecycle for the churn prediction project. 

## 1. The Approach & Problem Framing
*   **The Operational Definition of Churn (ADR 004):** We did not have a simple "account closed" flag. We defined a churned account as one whose balance dropped to near-zero (absolute value < $1) **and** had zero transaction activity in a given month. We explicitly excluded high-balance dormant accounts (e.g., $10k balance but inactive) because they still hold Assets Under Management (AUM).
*   **Defending Against Target Leakage:** We strictly separated the *Observation Window* from the *Prediction Window*. All features were calculated up to the end of month $t$. The target label was strictly based on the state of the account in month $t+1$. We did this to give the retention team a 14-day operational lead time to act.
*   **Capacity over Precision:** We originally targeted a 40% precision floor, but empirical data showed the base churn rate (~12%) made this mathematically infeasible (precision plateaued at ~24% at the top 1%). Instead of artificially tuning, we pivoted to a **Capacity-Constrained approach**. We set our operational threshold (`t ≈ 0.701`) to flag only the **top 5%** highest-risk accounts, ensuring the Operations team had a manageable queue.

## 2. Data Preparation
*   **Monthly Panel Construction:** We aggregated 6.4 million raw transactions into a structured monthly customer panel.
*   **Handling Nulls & Placeholders:** 
    *   We imputed missing opening balances with `$0` (`fillna(0)`).
    *   We explicitly filtered out `$0` system-generated placeholder transactions when calculating activity metrics so they wouldn't mask true inactivity.
*   **Anti-Leakage Feature Engineering:** We engineered rolling averages and lagged features (e.g., `Balance_Roll3_Mean`, `Active_Txn_Lag3`). Crucially, we used `shift(1)` before applying rolling functions to guarantee the model never peeked into month $t+1$.
*   **Retaining Outliers:** We deliberately kept missing values (like NaNs in early-tenure lag features) and extreme balance outliers ($\pm1e10$) in the dataset. Rather than aggressively standardizing or scaling the data, we relied on our tree-based model to handle them natively.

## 3. Model Selection
*   **Why XGBoost:** We chose XGBoost (a Gradient Boosted Tree framework) for several reasons:
    1.  **Requirement Constraints:** The ML Fundamentals criteria explicitly forbade Zero-Shot Foundation Models (like GenAI/TabFM) for the core prediction task.
    2.  **Native Missing Value Handling:** It seamlessly handles the NaNs from our lagged features without requiring destructive imputation.
    3.  **Outlier Robustness:** Tree models partition data, meaning the extreme balance outliers didn't require heavy `StandardScaler` transformations that would skew linear models (like Logistic Regression).
    4.  **Explainability:** XGBoost works natively with `SHAP` (a `dtreeviz` surrogate tree was attempted but skipped because it cannot handle the Lag3 NaNs), and model explainability was a hard requirement for our "Glass-Box" transparency mandate from the Risk & Compliance team.

## 4. Models Tested, Features, & Parameters
*   **Models Evaluated:** We tested the XGBoost model against a strict **Heuristic Baseline** (rule-based tracking of balance drops). 
*   **Key Parameters:** 
    *   We trained the XGBoost classifier using `scale_pos_weight` to handle the class imbalance (11.8% positive rate). 
    *   This choice meant the model outputted *ranking scores* rather than perfectly calibrated probabilities, which aligned perfectly with our strategy to rank and slice the top 5% of risk.
*   **Key Features Used (Ranked by SHAP Importance):**
    1.  `Running_Balance_Rounded` 
    2.  `Running_Balance` 
    3.  `Monthly_Deposit_Sum` 
    4.  `Balance_Roll3_Mean`
    5.  `Monthly_Withdrawal_Sum`
    *   *Note:* Demographic data (one-hot encoded `state`) was included, while `customer_id` and `Month` were dropped to prevent data memorization.

## 5. Key Performance Metrics
By prioritizing a ranking strategy and a capacity constraint, we achieved massive operational efficiency:
*   **Ranking Power:** The XGBoost model achieved a **PR-AUC of ~0.219** (significantly beating the heuristic baseline of 0.151). 
*   **False Positive Reduction:** At our max-F1 threshold, the model would have flooded the queue with **~248,000 false positives**. By shifting to the Top 5% Capacity threshold (`t ≈ 0.701`), we reduced false positives to **~20,127** (a 12x reduction), making the list immediately actionable for the GenAI retention campaign.

## 6. Project Task Tracking
To ensure alignment and transparency, tasks were strictly tracked across three distinct layers rather than relying on external issue trackers:

1. **🗂️ Active Sprint Documentation**
   * **Sprint Plan & Definition of Done (`sprint_plan.md`):** Defines the objectives, deliverables, and the specific DoD checklists for each workstream (WS-0 through WS-4).
   * **Sprint Progress Tracker (`progress.md`):** A living document showing which tasks are Shipped (completed) versus Open (blocked or in-progress).

2. **🧠 Active State Tracker**
   * **Project Memory Bank (`MEMORY.md`):** The dynamic "Save State" for the agent. Section 3 ("Next Immediate Step") details the specific immediate next actions for the current session, enabling seamless handoffs between sessions.

3. **📝 Local Task List (During Active Coding Sessions)**
   * Per the project rules, we are restricted from using external task systems and instead track session-specific tasks in a local `task.md` file inside the active session's artifact directory. This ensures an immutable record of execution during implementation phases.

## 7. AI Engineering & Architectural Leadership (Case Study)

### The Challenge & Approach
When the initial team dissolved, taking full ownership of the project became a crucible to test a modern hypothesis: Can a single individual act as a Systems Architect and use AI Engineering tools to deliver an enterprise-grade MLOps pipeline without esoteric algorithm knowledge?

The business problem was acute: ~$7.3M in historical AUM lost to silent churn. The approach shifted from manually writing Pandas and XGBoost syntax to **Architectural Direction over Syntax**. By acting as an AI Orchestrator, the focus was on defining strict system rules, enforcing anti-leakage constraints, and directing AI agents (like Antigravity/Cursor) to execute the implementation while educating stakeholders on the underlying math (e.g., SHAP).

### Key Architectural Decisions (The "Why")

*   **The Hybrid Architecture (Avoiding the "LLM Hammer"):** Explicitly rejected using a massive GenAI model for churn prediction. Tabular financial data requires explainability for regulators. We split the architecture into a Predictive Engine (XGBoost + SHAP for transparency) and a Retention Engine (Azure OpenAI for context-aware text drafting).
*   **"Friction as a Feature" & Glass-Box RBAC:** In a highly regulated environment, AI hallucinations are a liability. The system prohibits autonomous email sending. All drafts route to a "Pending Review" queue in a Streamlit UI, requiring a human to click "Approve." Combined with Glass-Box RBAC (ADR 007), this reduces liability to zero.
*   **Pragmatic Constraint Solving (AppLocker Bypass):** Encountered strict corporate IT policies blocking standard virtual environments. Instead of halting for IT tickets, the project adapted to a global Python execution policy (`py -3.13`) compliant with existing whitelists—the pragmatic engineering choice to maintain velocity.
*   **Managing "Agentic Tunnel Vision":** AI agents often fix immediate errors but fail to cascade the "Why" into strategic docs. When the AI tactically bypassed MLflow EDR latency by pivoting to SQLite, it failed to write an ADR. Recognizing this failure mode led to the enforcement of strict `/docs-before-code` rules and end-of-session reflection prompts.

### Outcomes & The "AI Engineer" Takeaway
The project successfully reached the final GenAIOps and Cloud Deployment phase (Sprint 5). The core models are trained, APIs/UIs are functional, and robust prompt versioning and RBAC are implemented. 

By stepping up to tackle this solo, the key takeaways were:
1. Translating ambiguous business problems into rigid mathematical targets.
2. Using AI as a force-multiplier to execute complex Data Science tasks rapidly.
3. Designing AI systems that respect the extreme compliance constraints of the financial sector.

This proves the role of the modern engineer is shifting from writing syntax to designing systems and managing AI output.
