# Submission Inference — Red-Team Attack Note

**Date:** 2026-07-17  
**Artifact:** `Code/Sprint3/create_submission.py` → intended `submission_df14.csv`  
**Guides / locks:** `StartingFiles/submission-guide.md`, `Docs/Sprint1/ML_Anti_Patterns.md`, ADR 004, ADR 005, `Models/ops/serving_meta.json`  
**Process:** `/docs-before-code` Phase 1 (critique only — no code edits)  
**Probe evidence:** `.agents/scratch/probe_submission_inference.py`, `.agents/scratch/sniff_booster.py`

## What was attacked

A user-written pure-Python inference path that claims to:

1. Re-run Sprint-1-style temporal FE targeting **2020-05**
2. Score with frozen `Models/ops/` (booster + preprocessor)
3. Emit `submission_df14.csv` matching `submission_sample.csv` schema

**Observed state at attack time:** `submission_df14.csv` **does not exist** in the repo root (script not yet proven end-to-end in this environment). `StartingFiles/validate_submission.py` is **also missing** despite the guide advertising it.

---

## Findings

### SUB-01 — `fillna(0.0)` invents “safe” scores for missing May rows — **HIGH**

**Claim in script:** customers without a May-2020 monthly rollup get `pred_churn = 0.0`.

**Evidence:**
- Left-merge onto `submission_sample` then `fillna(0.0)` (lines 141–144).
- Probe: *today* every sample `customer_id` has ≥1 May-2020 transaction and vice versa (`sample custs WITHOUT May tx = 0`). So the fill is currently a no-op on this extract.
- Directionally wrong if coverage ever breaks: missing history → model says “definitely stay” (0.0), which is the opposite of a conservative missing-data policy and would silently poison grading rows.

**Falsify:** After a successful run, assert `submission['pred_churn'].isna().sum() == 0` *before* fill, and `len(may_2020) == len(sample)` (or fail with a clear error listing missing IDs).

**Anti-pattern link:** Survivorship / silent cohort mismatch — not classic label leakage, but grading integrity risk.

---

### SUB-02 — No schema / probability gate; advertised validator absent — **HIGH**

**Evidence:**
- Guide requires columns `customer_id, account_id, date, pred_churn` in order; `date == 2020-05-31`; `pred_churn ∈ [0,1]`; row count must match sample.
- Script writes CSV with no asserts and no call to a validator.
- `StartingFiles/validate_submission.py` **does not exist** (guide is stale / incomplete for this repo).

**Falsify:** A local validator (repo-owned) rejects wrong columns/order/bounds/rowcount; green on a fresh export.

---

### SUB-03 — Hardcoded `FEATURE_COLS` can drift from ADR 005 ops contract — **MEDIUM**

**Evidence:**
- Script embeds a 24-col `FEATURE_COLS` list.
- Probe: list **exactly equals** `Models/ops/serving_meta.json` → `raw_feature_cols` (order + membership).
- Serving path (`src/serving/model.py`) already reads `raw_feature_cols` from meta — submission path does not.

**Falsify:** Load columns from `serving_meta.json` (or shared helper); unit test asserts equality with meta.

**Label-unlock:** None — this reinforces ADR 005, does not change the frozen booster.

---

### SUB-04 — Identity merge is `customer_id`-only — **MEDIUM** (latent; inert on this sample)

**Evidence:**
- `merge(..., on='customer_id')` relies on sample for `account_id` / `date`.
- Probe: `dup customer_id = 0`, `customers with >1 account = 0` in `submission_sample.csv` → no fan-out today.
- If a future sample had multi-account customers, pandas would duplicate or mis-align preds.

**Falsify:** Assert sample `customer_id` uniqueness before merge; preserve sample row order / `account_id` byte-for-byte vs sample.

---

### SUB-05 — Junior-engineer documentation & reproducibility gaps — **MEDIUM**

**Evidence:**
- No module docstring, no `if __name__ == "__main__"`, no CLI args, no pointer to ADR 004/005 or anti-patterns.
- AppLocker-safe invocation is undocumented in-file (`py -3.13 Code\Sprint3\create_submission.py`).
- FE is a large inline copy of notebook logic with no “why May / why not April / why probabilities” narrative.

**Falsify:** Module docstring + run command + comments on window / fill policy / ops artifacts satisfy `.cursorrules` §5.

---

### SUB-06 — Temporal window / `gone_this_month` — **OK (not a finding)** with caveats

**Probe against ADR 004 + `ML_Anti_Patterns.md`:**

| Question | Verdict |
|----------|---------|
| Score month = May 2020 features for `date=2020-05-31`? | **Correct** observation month `t=2020-05`; label would be June (held by trainer). |
| Features use only data ≤ end of May? | **Yes** — filter `Month == 2020-05` after lags built from prior months only (`shift(1)` / `prior_roll_mean`). |
| `gone_this_month` = label leakage? | **No** — notebook/ADR: left-looking state of month `t`; label is `t+1`. Same feature is in `raw_feature_cols`. |
| Training panel densified calendar months but inference not? | **Parity OK** — Sprint 1 FE notebook has no `reindex`/`asfreq` densify; both paths are transaction-month panels. |
| May in `training_data.csv`? | **No** — max month `2020-04`; May is correctly unseen for training labels. |

**Falsify leakage claim:** Would need May features built using June cash-flows or `Is_Churned` / `shift(-1)` label columns in the model matrix — not present.

---

### SUB-07 — Active-as-of-2020-05-31 filter — **OK (sample is SoT)** with residual risk

**Evidence:**
- Guide: active accounts only as of 2020-05-31; sample defines the graded cohort.
- Probe: May-tx customer set **==** sample customer set (17,599).
- Script correctly left-joins onto sample (preserves cohort) rather than emitting only May rollup rows.

Residual risk is SUB-01 (fillna) if that equality ever breaks — not a separate active-filter bug on current data.

---

### SUB-08 — Ops threshold vs submission probabilities — **OK**

**Evidence:**
- Script uses `booster.predict` with **no** compare to `t≈0.701`.
- Booster config: `"objective":"binary:logistic"` → `predict` returns probabilities in \([0,1]\).
- Serving applies threshold only for `flagged`; submission must stay probabilistic (guide).

---

### SUB-09 — Feature list vs preprocessor — **OK**

**Evidence:** `FEATURE_COLS == serving_meta.raw_feature_cols` (probe).  
Still harden via SUB-03 so this cannot silently regress.

---

## Severity summary

| ID | Severity | Topic |
|----|----------|--------|
| SUB-01 | **HIGH** | `fillna(0.0)` silent zero-risk |
| SUB-02 | **HIGH** | Missing validator / no schema asserts; CSV not yet produced |
| SUB-03 | MEDIUM | Hardcoded feature list vs ADR 005 meta |
| SUB-04 | MEDIUM | `customer_id`-only merge (latent) |
| SUB-05 | MEDIUM | Junior docs / reproducibility |
| SUB-06 | OK | Temporal window / `gone_this_month` |
| SUB-07 | OK | Active cohort via sample |
| SUB-08 | OK | Probabilities, not hard labels |
| SUB-09 | OK | Feature parity today |

## Explicit non-goals (do not unlock)

- Do **not** retune ops threshold `t≈0.701` / run `3f575754…`
- Do **not** overwrite `Docs/Sprint2/reports/sprint2_run_summary.json`
- Do **not** change ADR 004 label definition or regenerate `training_data.csv` contract
- Jamie follow-up / JR-OPEN — cancelled by user (2026-07-17)

## Next

Phase 2 revision checklist: `Docs/Sprint5/submission_inference_revision_plan.md` → user sign-off → implement.
