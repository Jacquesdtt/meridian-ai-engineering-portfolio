# SUB-INV-01 — April FE parity spot-check

**Date:** 2026-07-17
**Script FE:** `Code/Sprint3/create_submission.py` → `build_monthly_features`
**Baseline:** `Data/processed/training_data.csv` month `2020-04`
**Sample size:** 50 customers (seed=42)

- State mismatches: **0**
- Max abs numeric diff (any feature): **3.31299e-06**

| Feature | max abs diff |
|---------|--------------|
| `age_years` | 3.31299e-06 |
| `Balance_Roll3_Mean` | 4.54747e-13 |
| `Running_Balance` | 5.68434e-14 |
| `Amount_Lag1` | 5.68434e-14 |
| `Monthly_Amount_Sum` | 2.84217e-14 |
| `Monthly_Withdrawal_Sum` | 2.84217e-14 |
| `Balance_MoM_Change` | 2.84217e-14 |
| `Amount_Roll3_Mean` | 2.84217e-14 |
| `Active_Txn_Roll3_Mean` | 4.44089e-16 |
| `Deposit_Share_Of_Flow` | 5.55112e-17 |

## Verdict
**PASS** — April feature vectors match training export within float noise; May-2020 submission scores can trust this FE path.
