# Submission Inference — Revision Plan

**Date:** 2026-07-17  
**Attack note:** [submission_inference_red_team.md](submission_inference_red_team.md)  
**Artifact:** `Code/Sprint3/create_submission.py` → `submission_df14.csv`  
**Process:** `/docs-before-code` — Phase 4 **complete** (sign-off: “execute the plan”)

## Locked decisions (do not unlock)

| Lock | Rule |
|------|------|
| Ops threshold | Serving/contact still `t≈0.701`; submission CSV stays **probabilities** |
| Sprint 2 freeze | Do not overwrite `sprint2_run_summary.json` |
| ADR 004 | Churn label / windows unchanged |
| ADR 005 | Score with frozen `Models/ops/` only — do not re-fit |
| Jamie follow-up | Cancelled (user 2026-07-17) — out of scope |

## Checklist

| ID | Action | Finding | Success criteria | Status |
|----|--------|---------|------------------|--------|
| SUB-FIX-01 | **Implement** | SUB-01 | Fail loudly if sample missing May scores; no default `fillna(0.0)` (`--allow-zero-fill` opt-in). | `[x]` |
| SUB-FIX-02 | **Implement** | SUB-02 | `StartingFiles/validate_submission.py` + pre-write validate in export. | `[x]` |
| SUB-FIX-03 | **Implement** | SUB-03 | Load `raw_feature_cols` from `serving_meta.json` + legacy assert. | `[x]` |
| SUB-FIX-04 | **Implement** | SUB-04 | Unique `customer_id`; preserve sample identity/order. | `[x]` |
| SUB-FIX-05 | **Implement** | SUB-05 | Module docstring + junior FE comments + AppLocker run command. | `[x]` |
| SUB-FIX-06 | **Implement** | TDD | `tests/submission/test_validate_submission.py` (13 tests). | `[x]` |
| SUB-FIX-07 | **Implement** | SUB-08 | Print pred stats + ops-flagged count; CSV stays probabilities. | `[x]` |
| SUB-INV-01 | **Investigate** | SUB-06/09 | April FE vs `training_data.csv` max abs ≈ **3.3e-6** — PASS. | `[x]` [spotcheck](submission_fe_parity_spotcheck.md) |
| SUB-DEF-01 | **Defer→Done** | ADR ask | Portable inference path documented as **ADR 014**. | `[x]` [ADR 014](../Architecture/ADRs/014-portable-submission-inference.md) |

## Implementation evidence (2026-07-17)

- Helpers: `Code/Sprint3/submission_helpers.py`
- Export: `Code/Sprint3/create_submission.py` (DMatrix names from `model_feature_names` — same as serving; not sklearn `cat__`/`num__`)
- Validator: `StartingFiles/validate_submission.py`
- Output: `submission_df14.csv` — **17,599** rows; pred ≈ min **0.000031** / max **0.786** / mean **0.375**; informational ops-flagged **1834**
- Tests: `pytest tests/submission tests/serving tests/genai` → **60 passed**

## Sign-off

| Role | Decision | Date |
|------|----------|------|
| Jacques / user | ☑ Approve as written | 2026-07-17 |

**Notes:** “execute the plan” (2026-07-17).
