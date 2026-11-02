# Meridian Educational Fact Sheet

> Locked numbers and claims for the teaching SPA. Prefer this file (and `src/content/facts.ts`) over inventing metrics.
> Source of truth for the *project* remains the main repo docs; if they diverge, update this sheet.
> Upstream correction register: `Docs/Engineering/Corrections_and_Future_Work.md` (passes 2026-09-15 → 09-18). RAG implementation checked against ADR 015 on **2026-09-23**. Model, Docker, dashboard, CI, test and viva-benchmark rows refreshed **2026-09-24**.
> Model numbers are generated: `scripts/export_teaching_data.py` → `src/content/generated/model_facts.json`. `npm run facts:check` fails if they drift from `Models/ops/`.

## Business

| Fact | Value |
|------|-------|
| Problem | Silent retail savings churn (balance → $0 + inactive; no clean close flag) |
| AUM at risk (historical baseline) | **≈ $7.27M / ~$7.3M** |
| Churn label (ADR 004) | At month *t* (`Months_Since_Creation ≥ 2`): `Is_Churned=1` iff *t+1* has `Running_Balance_Rounded==0` **AND** `Monthly_Active_Txn_Count==0` |
| High-balance dormancy | **Not** churn (AUM still held) |
| Base rate (positives) | ~**11.76%** |

## Personas

| Docs persona | Roleplay | Concern |
|--------------|----------|---------|
| **Jamie** | **Arvind** (Risk & Compliance) | HITL, no auto-send, ZDR, rate caps, Glass-Box, fairness disclosure |
| **Morgan** | **Andy** (Product / ops budget) | ROI, AUM retained, reviewable queue (top-5% capacity) |
| **Sam** | Head of Data Science | Temporal rigor, MLflow, beat heuristic, SHAP, honest metrics |

## Stakeholder Analysis Frameworks

### CATWOE (Soft Systems Methodology)
- **C (Customers):** Retail savings depositors (external victims of silent drain-out); Retention & Marketing agents (internal queue consumers).
- **A (Actors):** Solo AI Engineer (builder), Sam (DS lead), Morgan (Product), Jamie (Risk/Compliance), Relationship Managers (human contact).
- **T (Transformation):** Raw transaction & balance logs → Behavioral churn risk rank + Top ~5% operational cut + Contextual, PII-scrubbed GenAI draft emails for human approval.
- **W (Worldview):** Preserving existing balances is far cheaper than acquiring new deposits; AI must augment human relationship managers as an exoskeleton, never email customers autonomously.
- **O (Owners):** Sam (Technical/model risk owner), Morgan (Business/AUM ROI owner), Jamie (Governance/compliance owner).
- **E (Environment):** AppLocker OS restrictions, Zero Data Retention (ZDR), anti-predatory rate caps (≤3.5%), 10-day sprint cycle.

### POPIT (Holistic Business Change)
- **People:** Shifting from batch-and-blast marketing to targeted outreach; mitigating automation bias via attention acks and soft warnings (<8s).
- **Organisation:** Cross-functional governance between DS, Product, and Risk; Glass-Box RBAC (ADR 007) separating audit from approval.
- **Process:** Monthly temporal batch scoring; Friction-Gate (`Approve ≠ Sent`); MLOps tracking via MLflow.
- **Information:** Zero Data Retention (ZDR) PII scrubbing; risk ranking scores (not calibrated probabilities); SQLite WAL audit trails.
- **Technology:** Python 3.13 global user scope runtime (AppLocker-safe); XGBoost; Streamlit; FastAPI; Azure OpenAI (`.prompty`).

### RASCI (Single Accountability Governance)
- **ML Pipeline & Rigor:** R: AI Engineer | **A: Sam** | S: MLflow/SQLite | C: Jamie | I: Morgan
- **Product & Capacity:** R: AI Engineer & Morgan | **A: Morgan** | S: Analytics/Ops | C: Sam | I: Bank Execs
- **Governance & HITL:** R: AI Engineer | **A: Jamie** | S: Pytest/Audit | C: Sam, Morgan | I: Regulators
- **Retention Outreach:** R: Retention Agents | **A: Morgan** | S: Streamlit | C: Jamie | I: Account Holders


## ML

| Fact | Value |
|------|-------|
| Core model | **XGBoost** `binary:logistic` (LightGBM was never trained) |
| Version | `1.1.0-sprint3-serving` |
| DoD | Beat `gone_this_month` heuristic on PR-AUC & ROC-AUC |
| Test PR-AUC | **0.219** vs heuristic **0.151** |
| Test ROC-AUC | **0.723** vs heuristic **0.551** |
| Ops threshold | **t ≈ 0.70055 / ~0.701** (validation top-5% quantile) |
| Max-F1 (rejected for ops) | t = **0.475** → FP ~**248,778** |
| Ops test cut | Precision ~**0.229**, FP ~**20,127** (~12× fewer than max-F1) |
| Features | **80** inputs (**57** `state_*` OHE + **23** numeric/engineered; from `Models/ops/serving_meta.json`) |
| Score meaning | **Ranks**, not calibrated probabilities (`scale_pos_weight`) |
| Temporal split | Fit 2007-03→2016-08; Val 2016-09→2017-08; Test 2017-09→2020-04 — **one** split, no CV folds |
| Model selection | One XGBoost recipe; two MLflow runs (`7134cee0` max-F1, `3f575754` capacity) with identical PR/ROC-AUC. Nothing in the Model Registry |
| 40% precision floor | **Infeasible** on validation (top 1% ≈ 0.24) → fallback `fallback_quantile_top5pct` |
| Max-F1 test recall | ≈ **1.0** (flags almost everyone), precision 0.211 |
| Global SHAP (serving_meta `top_shap`) | `Running_Balance_Rounded` ≈ 3.00 ≫ `Running_Balance` 0.64 > deposit/withdrawal/roll features. Frozen, not per-customer |
| Explainers | SHAP only; dtreeviz attempted and skipped (Lag3 NaNs) |
| Fairness | EOD age **0.156**, state **0.318** (38 of 55 state groups, n ≥ 500); age selection-rate gap 0.099; 65+ flagged ~14.6% vs ~4.6–4.9% most bands. Disclosed, not gated (ADR 012) |

## Architecture / GenAI

| Fact | Value |
|------|-------|
| UI | Streamlit Friction-Gate (`Code/Sprint3/friction_gate_app.py`) — calls FastAPI via `src/serving/client.py` (ADR 006 follow-on 2026-09-18). `FRICTION_GATE_MODE=http` default; `inprocess` = same API through an ASGI client (AppLocker fallback) |
| API | FastAPI (`src/serving/app.py`) — single enforcement point; **no `/send`**; `POST /drafts` re-scores raw features (`extra="forbid"`), 422 below threshold; roles via demo `X-Demo-Role` (403 + audit on deny) |
| Store | SQLite WAL draft/audit DB — only the API writes |
| Approve | Ready for human outbound **outside** system — **Approve ≠ Sent** |
| Ops drafts | Drafts only on request and only if `p ≥ ~0.701`; nothing auto-drafts |
| Friction | `attention_ack` required on Approve; approvals < 8 s logged as `fast_decide_warn` (soft warning, not a block) |
| Rate cap | `offered_interest_rate` must be at most 0.035; numeric percentage claims in subject/body cannot exceed that offer; invalid Azure output uses the safe stub; no redraft loop |
| Drafter | Azure (`.prompty`, `prompty<2` pinned) → tenacity retries (5) → `stub_fallback`; `stub` when Azure unconfigured. Inputs: score, scrubbed context, frozen global SHAP names. **No RAG** |
| PII scrub | Blocked keys + regex (email, phone, SSN, ISO date, 8+ digits), in and out. No free-text name detection |
| RAG | Methodology Q&A only, via FastAPI `POST /rag/ask`; corpus `Docs/Final_Report_Official.md`; no Chroma/FAISS. In-memory BM25 and Azure dense ranking fuse with RRF when Azure is configured; offline uses BM25 alone. Best-effort Azure LLM reranking falls back to the fused order if it fails. ATX `#`–`######` chunks ≤1200 chars; `top_k=3` (ADR 015). |
| Chat model | Current configured deployment: `gpt-5-mini` for drafts, RAG answers, rerank and viva marking; it replaced `gpt-4o-mini` in September 2026. `text-embedding-3-large` is used for RAG. `chat_limit_params()` sends `max_completion_tokens` (no temperature) to reasoning models, which reject `max_tokens` (DK-09). The source-code fallback is used only when no deployment is configured. |
| Deploy | Docker/compose (FastAPI only) **built and smoke-tested locally 2026-09-24** (`Docs/Sprint5/docker_smoke_checklist.md` §4; pinned `requirements.serving.txt`, 723 MB, `HEALTHCHECK`); ACA **deployed with `azd` and verified live 2026-09-24, then torn down** (no standing URL; IP allow-list + `X-API-Key`, ADR 016); `maxReplicas: 1`; Azure OpenAI path live since 2026-07-17 |
| Dashboard | Streamlit `AppTest`: all 19 role × page combinations render against the container (2026-09-24). Morgan view reads `business_metrics.json` when generated; Sam's What-If slider drives `Running_Balance`; PR curve shown beside ROC. Added after close: Prediction browser + per-customer SHAP (`GET /predictions`, `/explain`; fixtures only unless `prediction_cohort.csv` is built); `AppTest` 21 role × page combos |
| CI | GitHub Actions workflow `.github/workflows/educational-web-app.yml` runs the SPA lint, tests and build on matching pushes/PRs (green run 2026-09-23). **No CI for the Python suite or the Docker image** |
| Tests | `pytest tests -q` → **127 passed** on 2026-09-24 (full suite). `py -3.13 -m` on the AppLocker machine, `python -m` elsewhere |
| Viva marker | Labelled benchmark for 4 prompts (8 answers, 48 rubric labels): **87.5%** label accuracy with `gpt-5-mini`, 80% required (2026-09-24). `npm run viva:benchmark` |

## Anti-claims (never teach these)

1. LightGBM as the shipped model (it was never trained)
2. ROC-AUC > 0.85 achieved  
3. 40% precision / calibrated probabilities  
4. Accuracy as success metric  
5. Autonomous email / `/send` / Approve = Sent  
6. Chroma / FAISS as shipped RAG; or describing the current retrieval as TF-IDF-only without BM25, RRF and optional LLM reranking
7. Entra/SSO production RBAC (demo `X-Demo-Role` only)  
8. Live multi-replica HA Azure hosting  
9. Automated fairness remediator  
10. High-balance dormancy = churn  
11. Random shuffle train/test or threshold tuned on test  
12. Split-Executor (agent workflow) = split-brain (DB topology)  
13. Ops threshold applied to grading submission CSV  
14. Foundation / TabFM for core prediction  
15. PostgreSQL as current draft store  
16. Invented AUM other than ~$7.3M
17. Temporal cross-validation folds
18. Model registered in the MLflow Model Registry
19. dtreeviz diagrams produced
20. Drafter grounded by RAG over past retention emails
21. Per-customer SHAP in drafts
22. Clamping the numeric rate makes every promise in the email safe
23. Fast approval is blocked (soft warning)
24. Fairness is a release gate
25. CI gating the model / API tests (only the teaching app has a workflow)
26. Streamlit writes drafts directly to SQLite

## Teaching spine (one sentence)

Meridian ranks next-month silent churn with leakage-safe **XGBoost**, contacts only the **top ~5% (`t≈0.701` / ops quantile)**, and uses Azure GenAI only to **draft** retention emails behind **Friction-Gate** controls that Risk can audit — designed to run under corporate **AppLocker** constraints.

## Feature recount note (RT-03)

`serving_meta.json` `model_feature_names` length **80**: **57** columns start with `state_` (dirty strings incl. `CALIFORNIA`/`California`, `MASS`, `NY`, `TX`, `Australia`, `-999`, `UNK`, …) and **23** non-state inputs. Do not teach “55 + 24.”
