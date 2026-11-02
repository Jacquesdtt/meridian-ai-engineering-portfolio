# Machine Learning Learnings Log

This document serves as a centralized knowledge base for positive Machine Learning insights, technical breakthroughs, and algorithmic strategies discovered during the DF-14 AI Engineering cohort.

*(Note: Defensive ML strategies and pitfalls to avoid are tracked separately in `ML_Anti_Patterns.md`)*

---

## Sprint 1: EDA & Baseline Conceptions
* **The Importance of the Baseline:** Before deploying complex Gradient Boosting algorithms (like XGBoost or LightGBM), it is critical to establish a naive baseline. For churn, this means predicting the majority class or using a simple heuristic (e.g., "if balance drops by 50% in one month, they churn"). Any ML model we build MUST beat this heuristic to justify its complexity and maintenance overhead.
* **Handling Temporal Data in pandas:** The `dt.to_period('M')` function in pandas is incredibly effective for bucketing granular daily transaction data into monthly operational windows, which aligns perfectly with how the business evaluates monthly recurring revenue (MRR) and $AUM targets.
* **Temporal Splits (Observability vs. Predictive Windows):** To avoid Target Leakage, it is essential to establish a strict temporal boundary (Anchor Date).
  * *Observability Window:* The historical period (e.g., 6 months prior to Anchor Date) where we calculate behavioral features. The model can never see the target label here.
  * *Predictive Window:* The future period (e.g., 30 days post-Anchor Date) where we observe if the event (churn) occurred to create the `Is_Churned` label. The model can never use behavioral data from this window as features.
* **Observe/Predict Windows vs. Train/Test Splits:** It is vital not to conflate temporal windowing with evaluation splitting:
  * *Observe/Predict Windowing* determines **how a single row (datapoint) is constructed** across time (calculating features vs. finding the target label).
  * *Train/Test Splitting* determines **how we divide those completed rows** (e.g., 80% train, 20% test) to train and evaluate the machine learning model.
* **Operational Buffer:** When defining predictive windows, you cannot blindly attach the prediction window to the end of the observation window. You must insert an Operational Buffer (Lead Time) to account for business friction (e.g., human review times in a Friction-Gate UI). Without this, a model might predict churn accurately, but leave operations with 0 days to actually intervene.
* **Data Integrity (Running Balances):** Raw transaction logs only show deltas (deposits and withdrawals). We must reconstruct the true state of the account at any given time by calculating a "Running Balance" using cumulative sums (`cumsum()`) ordered chronologically. This derived feature is far more predictive of abandonment than individual transaction amounts.
* **Data-Driven Target Definition (EDA vs. Guesswork):** The definition of the Target Variable (e.g., `Is_Churned`) should not be an arbitrary business guess. We use EDA (Exploratory Data Analysis) to plot distributions of low balances and inactivity periods. This reveals the *natural mathematical threshold* of abandonment (e.g., discovering customers leave an average of $2.50 to avoid overdraft fees, rather than exactly $0.00), resulting in a more robust and defensible churn label.

---

## Sprint 1 Red Team → Revision Outcomes (post-Sam notebook)

Attack surface: [02_eda_notebook_red_team.md](../StakeholderManagement/Meetings/02_eda_notebook_red_team.md)  
Checklist: [eda_revision_plan.md](eda_revision_plan.md) (P-01…P-12 **all closed**)  
Evidence: `Code/Sprint1/01_data_integrity_and_eda.ipynb` §2.1, §4.1, §8.1, §9

### Critical

* **RT-01 / P-01 — Missing calendar months:** `groupby` panels can drop silent months and break `shift(-1)`.
  * *Outcome:* Gap rate **0%**; `shift(-1)` aligns with next calendar month **100%**. `$0` placeholders already close the panel — **no reindex**. Label lock unchanged.
  * *Learning:* Always *measure* gap rate before reindexing; placeholders can make a continuous panel without an explicit reindex.

* **RT-02 / P-02 — AUM at exit:** Summing last-month `start_balance` (~$2.21M) is a fake AUM number.
  * *Outcome:* Prior-month `Running_Balance` at first left-looking exit ≈ **$34** (median $0) — accounts are already drained. **Prior-3-month max** sum ≈ **$7.27M** (P90 $135). Locked in [PRD §2](../Product/Product_Requirements_Document.md) (replaces $4.2M placeholder).
  * *Learning:* For left-looking churn, AUM-at-risk is **not** the month before the inactive+rounded-$0 state. Use a short lookback max (here: 3 months) and document the method next to the dollar figure.

* **RT-03 / P-03 — Ops 14-day buffer vs month grain:** Exit months are inactive **by definition**, so timing on the exit month always returns n=0.
  * *Outcome:* Time drains in the **prior** month. 100% coverage; **34%** of rounded-$0 crosses occur on day ≤14. Score/queue early in the prediction month so Friction-Gate still has ~14 days.
  * *Learning:* Align timing EDA with the month where cash actually moves; keep the 14-day buffer *inside* month `t+1` in docs ([ML_Anti_Patterns.md](ML_Anti_Patterns.md)).

### High — interpretability of ~11.8%

* **RT-04 / P-04 — Prevalence vs incidence:** 11.76% is customer-month prevalence, not unique-customer churn.
  * *Outcome:* First-exit row rate **3.92%**; **64%** of eligible customers ever positive; **~206k** reactivation events.
* **RT-05 / P-05 — Impending vs already-gone:** Already-empty rows inflate easy accuracy.
  * *Outcome:* Impending (`gone_this_month==0`) positive rate **10.38%** vs already-gone **22.18%**. Naive all-negative baseline on impending ≈ **89.6%**.
* **RT-06 / P-06 — Anti-patterns doc mismatch:** Old 15-then-30-day sketch disagreed with ADR 004.
  * *Outcome:* `ML_Anti_Patterns.md` rewritten to month `t` → `t+1` with in-month ops buffer.

### Medium / edge

* **RT-07 / P-07 — Negatives:** 301,556 months (11.23%) have `Running_Balance < 0`; almost all already `rounded == 0`. **Keep** locked rule; no ADR change.
* **RT-08 / P-08 — DQ:** Integrity checklist in §2.1 (dupes, DOB, state, amount identity, etc.) — triage only; label unchanged.
* **RT-09 / P-09 — Fairness slices:** Age bands ~**11.0–11.9%**; large-state spread TX **13.43%** vs CA **10.36%**.
* **RT-10 / P-10 — Multi-account:** **100%** 1:1 `account_id`:`customer_id`.
* **RT-11 / P-11 — Censoring:** Late panel ~12–14% positive; **2020-05** correctly excluded (`Is_Churned` NaN).
* **RT-12 / P-12 — Currency narrative:** Board language uses **`$`** + “round to nearest $1 (Sam sense-check).”

### Locked churn label — plain-language glossary (post-Sam EDA)

* **“Left-looking” (behavioural proxy for gone):** Balance rounded to nearest $1 **and** no real transactions that month. Proxy for “gone,” not a closure event.
* **Most exits are 1-month streaks:** Quiet-at-zero usually lasts one month — why we did **not** require 2-month confirmation for training.
* **Active txns:** Ignore `$0` placeholders (~8.15% of rows). `Monthly_Active_Txn_Count == 0` = no real money movement.
* **≈11.8% next-month positives:** Share of **eligible customer-months** where next month is left-looking — not “11.8% of customers churn forever.”

**One-liner:** 1-month streaks = short exits; active txns = real money moves; 11.8% = next-month gone rate on eligible rows; AUM-at-risk ≈ **$7.3M** via prior-3-month max.

---

## Sprint 1 Feature Engineering Export (2026-07-10)

Evidence: `Code/Sprint1/02_feature_engineering.ipynb` → `Data/processed/training_data.csv`

* **Independent rebuild of the label:** FE does not pickle EDA state. It reloads raw CSVs, rebuilds the monthly panel, and re-applies ADR 004. Matching **11.7601%** positive rate is a cross-notebook consistency check, not a copy-paste of EDA outputs.
* **Month-`t` only features:** Lags/rolls are `shift(1)` then rolling — never peek into `t+1`. Sanity: `gone_this_month == Is_Churned` only **81.75%** proves the label is the next-month shift, not current-month “gone.”
* **Grace kills Lag1 nulls:** With `Months_Since_Creation ≥ 2`, `Active_Txn_Lag1` is complete; `Lag3` still has one early-tenure NaN per customer (~138k) — leave for the model/imputer.
* **Do not shuffle:** Temporal split on `Month` is mandatory; random row splits leak future months into train.
* **Empirical target-leakage screen (Gini):** Column-name asserts (`t+1`, `future`) are cosmetic. Train a fast Random Forest on a sample; if any feature’s Gini **> ~0.50**, treat as a likely mathematical leak. Sprint 1 FE run (50k rows, `n_estimators=50`, `max_depth=5`, `gone_this_month` excluded from `X`):

  | Feature | Gini |
  |---------|-------|
  | `Running_Balance_Rounded` | 0.273 |
  | `Running_Balance` | 0.265 |
  | `Balance_Roll3_Mean` | 0.164 |
  | `Monthly_Amount_Sum` | 0.076 |
  | `Balance_MoM_Change` | 0.048 |
  | `Deposit_Share_Of_Flow` | 0.041 |
  | `Amount_Roll3_Mean` | 0.037 |
  | `Months_Since_Creation` | 0.032 |
  | `Amount_Lag1` | 0.024 |
  | `Monthly_Withdrawal_Sum` | 0.011 |

  **Pass:** no feature >50%. Balance features leading is expected (ADR 004 label is next-month rounded-$0 + inactive) — a screen for *perfect* proxies, not a claim that balance is unimportant. Not a 100% guarantee of no leakage; still required before Sprint 2 modeling.
