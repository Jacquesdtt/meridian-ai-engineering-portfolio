# Red Team Critique: Sprint 2 Modeling Plan

**Date:** 2026-07-13
**Reviewer:** Antigravity (Gemini 3.1 Pro / High)
**Target:** Initial `implementation_plan.md` for Sprint 2 generated under Flash 3.5.

## Findings & Vulnerabilities

### 1. [Critical] Threshold Leakage in Fairness Assessment
*   **Vulnerability:** The plan states we will evaluate fairness metrics (Disparate Impact, Equal Opportunity) "at the target threshold" on the Test set. If the threshold is determined by looking at the Test set distribution to find the "top 10%", this is methodological leakage.
*   **Mitigation:** The prediction threshold (or decile cutoff score) **MUST** be calibrated entirely on the **Validation Set**. That fixed score threshold is then applied blindly to the Test set to compute fairness metrics.

### 2. [High] Uncalibrated Probabilities via `scale_pos_weight`
*   **Vulnerability:** The plan correctly suggests using `scale_pos_weight` to combat the ~11.8% class imbalance. However, using this parameter skews the raw output probabilities (they will shift heavily towards 1.0). If downstream systems or the model card expect true probabilities (e.g., 12% baseline), the outputs will look broken.
*   **Mitigation:** We must explicitly document this in the Model Card, rely on rank-ordering (deciles/PR-AUC) rather than raw probability values, or omit `scale_pos_weight` and instead tune the base margin / threshold directly. For tree models evaluated on PR-AUC, rank-ordering is what matters, so we will keep `scale_pos_weight` (set to `count(negative) / count(positive)`) but explicitly use rank-based thresholds.

### 3. [Medium] Memory & Execution Environment (AppLocker)
*   **Vulnerability:** A 2.2M row × 27 column DataFrame + XGBoost internal DMatrix can spike memory to 3-5 GB. Furthermore, the plan doesn't specify tree methods, which might default to slow exact greedy splits. Finally, the plan says "Execute the new notebook end-to-end", which risks timing out or hitting AppLocker issues if the AI tries to run it directly.
*   **Mitigation:** 
    *   Explicitly configure XGBoost with `tree_method="hist"` for rapid, memory-efficient histogram-based training.
    *   Re-assert the AGENTS rule: The AI writes the code, but the **human must execute it** in the IDE (Run All) to respect AppLocker and timeout boundaries.

### 4. [Medium] Baseline Metric Definition
*   **Vulnerability:** A "Naive Baseline: Predict all-negative" yields a PR-AUC of exactly the positive prevalence rate (~0.1176). ROC-AUC will be 0.5. If we don't state this explicitly, stakeholders might misinterpret the baseline performance.
*   **Mitigation:** Hardcode the expected baseline PR-AUC (~0.1176) into the evaluation cell as a print statement so it's impossible to miss the true floor of the model.

## Action Plan (docs-before-code cascade)
1.  **Revise `implementation_plan.md`** to integrate these 4 mitigations.
2.  Update the **User Review Required** section to highlight the human-execution constraint and the threshold calibration rule.
