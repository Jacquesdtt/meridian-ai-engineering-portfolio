# Sprint 2: Retrospective (Process)

**Sprint goal:** Leakage-safe XGBoost + MLflow + SHAP/fairness/drift evidence for Sam/Jamie/Morgan.  
**Delivery record:** [sprint_debrief.md](sprint_debrief.md) (not interchangeable with this file).

## What went well
- Temporal split + heuristic bar kept the team honest (accuracy alone would have “won” with always-negative).
- Hardening Yellowbrick/SHAP/Fairlearn mid-run stopped a cascade of notebook failures.
- SQLite MLflow migration unblocked tracking quickly once the file-store error appeared.
- Human Run All + agent-authored cells matched AppLocker reality.

## What went wrong
- Max-F1 threshold selection produced an ops-unusable cut (~21% precision) — ranking success masked decision-policy risk until confusion matrix review.
- Yellowbrick + custom booster wrapper cost several iteration cycles (`isclassifier`, `target_type_`, full-test runtime).
- Kernel/file reload confusion after mid-run patches (`booster` NameError) burned time.
- State-level Equalized Odds looked catastrophic until interpreted as a sparse-slice artifact.

## Keep / Stop / Start
| | Action |
|---|--------|
| **Keep** | Val-only threshold calibration; PR-AUC as primary; fail-soft optional viz (dtreeviz). |
| **Stop** | Treating F1-max threshold as the production operating point without a capacity/precision check. |
| **Start** | Premeditated “next fault” pass on notebook cells before human Run All; sample heavy viz by default. |

## Skillification decisions
| Candidate | Decision |
|-----------|----------|
| MLflow SQLite default on modern MLflow | Document in learnings; optional future skill if we repeat across projects |
| Yellowbrick + non-sklearn estimators | Keep as project note in walkthrough/learnings — too niche to skillify yet |
| `/docs-before-code` | Already a skill — reuse when threshold policy changes after red-team |

## Cross-link
Debrief metrics and artifact paths: [sprint_debrief.md](sprint_debrief.md) §6.
