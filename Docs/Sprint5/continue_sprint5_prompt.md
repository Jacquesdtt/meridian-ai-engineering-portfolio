# Handoff prompt — paste into next chat

> **Superseded 2026-09-24:** Sprint 5 is closed. See [sprint_debrief.md](sprint_debrief.md) and `.agents/MEMORY.md` for the current state and carry-overs. The prompt below is kept as a historical record; its Azure resource and model details are out of date.

```text
You are continuing Meridian Savings churn (InnovatorProjectDF14), Sprint 5 (started 2026-07-14).

## Orient first (mandatory)
1. Read `.agents/MEMORY.md` (source of truth for current state).
2. Read `.cursorrules` / `.agents/AGENTS.md` for AppLocker (`py -3.13`), no `/send`, ZDR, docs-before-code.
3. Skim `Docs/Sprint5/progress.md`, `Docs/Sprint5/sprint_plan.md`, and `task.md`.
4. Jamie SoT: `Docs/Sprint5/jamie_requirements_register.md`
5. Stakeholder hub: `Docs/StakeholderManagement/README.md`
6. Defendable ADRs (if touching cloud/GenAI/SQLite): 008, 010, 013 (+ 003 HITL)
7. For submission scoring: `StartingFiles/submission-guide.md`, `StartingFiles/submission_sample.csv`, `Docs/Sprint1/ML_Anti_Patterns.md`, ADR 004 / ADR 005

## Persona map (roleplay)
- Arvind = Jamie (Risk & Compliance)
- Andy = Morgan (Product / ops budget)
- Docs keep persona names (Jamie / Morgan / Sam)

## Just finished (2026-07-17) — do NOT redo
### Workstream B: Azure RAG + red-team hardening (RAG-01…05) — DONE
- Azure OpenAI live in `.env`: `jacqueslouisdutoit7-2493-resourc` · `gpt-4o-mini` + `text-embedding-3-large`
- Checklist: `Docs/Sprint5/sprint5_azure_rag_revision_plan.md` (all `[x]`)
- Code: `src/genai/rag_engine.py`, `drafter.py` (Tenacity), `draft_store.py` (WAL)
- Streamlit Methodology Q&A wired; ADRs 008/010/013 defendable; tests **47 passed**

### RAG chunking fix (2026-07-17) — DONE (docs cascaded)
- Symptom: expander looked like whole-report grounding (H1/H2-only chunks)
- Attack/plan: `Docs/Sprint5/rag_chunking_red_team.md` · `rag_chunking_revision_plan.md`
- Fix: ATX `#`–`######` + ≤1200-char pack; cache `schema_version=3`; ADR 010 amended
- **Restart Streamlit** after pull so `@st.cache_resource` re-embeds

### Also already shipped (Sprint 5 earlier)
- WS-1 `.prompty`, WS-4 Glass-Box RBAC, JR-REQ-19 attention_ack, Morgan/Sam Streamlit views, Dockerfile/compose local fallback

## NEW artifact to red-team (user-written — 2026-07-17)
### `Code/Sprint3/create_submission.py` → `submission_df14.csv`
**Why (user intent):** `StartingFiles/submission-guide.md` requires `submission_<team>.csv`. Training/serving used data through April 2020 ops freeze; grading needs scores on **unseen active accounts as of May 2020**.

**What the script claims to do:**
- Bypass notebooks; pure Python inference script
- Re-run temporal FE (3-month rolling balances, inactivity streaks) targeting **2020-05**
- Load frozen `Models/ops/booster.json` + `preprocessor.joblib` (ADR 005)
- Score every active customer for May 2020
- Match `StartingFiles/submission_sample.csv` schema: `customer_id`, `account_id`, `date`, `pred_churn` → write `submission_df14.csv`
- Fills missing preds with `0.0` after left-merge onto sample

**G. HIGH PRIORITY — Red-team then revise (docs-before-code)**
Use `/docs-before-code` + `/red-team` (or corp-red-team) on this artifact **before** trusting the CSV for grade submission:

1. **Attack note** (severity + evidence), e.g. `Docs/Sprint5/submission_inference_red_team.md`
   Probe at least:
   - **Temporal leakage / window mismatch:** May-2020 rows must use only features available at score time; compare FE logic to Sprint 1 notebook / `training_data.csv` contract and `ML_Anti_Patterns.md` (Observation vs Prediction windows, no shuffle, month-only).
   - **Active-accounts filter:** Guide says *active accounts only as of 2020-05-31*. Does filtering via `Month == 2020-05` monthly rollup + merge onto `submission_sample` equal “active as of 2020-05-31”? Survivorship / dormant fill-`0.0` risk?
   - **Schema / identity:** column order, `date` always `2020-05-31`, `pred_churn` in `[0,1]`, `account_id` preserved from sample (merge is on `customer_id` only — multi-account customers?).
   - **Feature parity with ops model:** `FEATURE_COLS` vs `Models/ops/serving_meta.json` / preprocessor expected columns; dtype/state encoding; `gone_this_month` at inference time (label leakage risk?).
   - **Ops vs max-F1:** submission should export **probabilities** (not hard labels at t≈0.701); confirm `booster.predict` is probability; do not threshold for the CSV.
   - **Reproducibility:** AppLocker (`py -3.13`), CSV schema skill if touching StartingFiles columns, junior-doc quality on the script.
   - Run `StartingFiles/validate_submission.py` if present; else write a minimal schema check.

2. **Revision plan** with signed checklist (implement / investigate / defer) — e.g. `Docs/Sprint5/submission_inference_revision_plan.md`
3. Get user sign-off (or treat “execute the plan” as sign-off), then fix code + re-export CSV
4. Cascade: `MEMORY.md`, progress/walkthrough if material; ask if a small ADR/note is warranted (portable inference path vs notebook FE)

Do **not** overwrite frozen Sprint 2 summaries or re-tune ops threshold while fixing submission.

## Frozen — do not touch unless Sam/Jamie change policy
- Ops threshold `t≈0.701` / run `3f575754…` (serving/contact policy — submission CSV is still probabilities)
- Do not overwrite `Docs/Sprint2/reports/sprint2_run_summary.json` (v1 freeze)
- ADR 004 churn label / `Data/processed/training_data.csv`
- No `/send`; Approve ≠ Sent; terminal drafts immutable; Approve needs `attention_ack`

## Outstanding work (pick based on user intent — priority order)
G. **Red-team `create_submission.py` / `submission_df14.csv`** ← recommended if grading soon
A. Dry-run dashboard demo (Methodology Q&A + Friction-Gate path)
B. Jamie follow-up / JR-OPEN-01…05 (`08_jamie_followup_message.md`)
C. WS-2 Container Apps — only after hosting confirm; `maxReplicas: 1`
D. WS-3 Foundry / `azd` — best-effort
E. Optional: below_threshold fixture consistency; `/review-presentation`
F. Sprint 5 dual close-out only when feature-complete

## Process rules
- Critique → revise: `/docs-before-code`. Prefer `cmd.exe`; `py -3.13 -m …` (never `.venv\Scripts\python.exe`).
- TDD: `/tdd-strict` — tests before logic/fixes.
- Before FE / score-time logic changes: verify against `Docs/Sprint1/ML_Anti_Patterns.md`.
- After structural/DB/dependency changes: ask whether a new ADR is warranted; keep ADRs defendable.
- Anti-speculation: no cloud ops runbooks until something is actually running.
- Update `.agents/MEMORY.md` before ending the session.

## Run commands
set PYTHONPATH=%CD%
py -3.13 -m pytest tests\serving tests\genai -q
py -3.13 .agents\scratch\verify_s4_fixtures.py
py -3.13 Code\Sprint3\create_submission.py
py -3.13 -m streamlit run Code\Sprint3\friction_gate_app.py

Start by confirming orientation from MEMORY, then ask whether to start with **G (submission red-team)** or another letter A–F.
```

---

## Short context (for humans)

| Item | Pointer |
|------|---------|
| Memory | `.agents/MEMORY.md` |
| Tasks | `task.md` |
| Progress | `Docs/Sprint5/progress.md` |
| Submission guide | `StartingFiles/submission-guide.md` |
| Inference script | `Code/Sprint3/create_submission.py` |
| Output CSV | `submission_df14.csv` (repo root) |
| Jamie SoT | `Docs/Sprint5/jamie_requirements_register.md` |
| Follow-up to send | `Docs/StakeholderManagement/Meetings/08_jamie_followup_message.md` |
| Demo cheat sheet | `Docs/StakeholderManagement/Meetings/04_jamie_demo_cheat_sheet.md` |
| RAG revision (done) | `Docs/Sprint5/sprint5_azure_rag_revision_plan.md` |
| RAG chunking fix (done) | `Docs/Sprint5/rag_chunking_revision_plan.md` |
| ADRs to cite | 003 · 004 · 005 · 008 · 010 · 013 |
