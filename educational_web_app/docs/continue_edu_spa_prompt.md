# Handoff prompt — paste into next chat

> **Path:** `educational_web_app/docs/continue_edu_spa_prompt.md`  
> **Updated:** 2026-07-20  
> **Scope:** Sprint 5 continuation — educational SPA polish + WS-2 Docker/ACA

```text
You are continuing Meridian Savings churn (InnovatorProjectDF14), Sprint 5 (started 2026-07-14).

## Orient first (mandatory)
1. Read `.agents/MEMORY.md` (source of truth for current state).
2. Read `.cursorrules` / `.agents/AGENTS.md` for AppLocker (`py -3.13 -m …`), no `/send`, ZDR, docs-before-code.
3. Edu SPA: `educational_web_app/docs/WALKTHROUGH.md`, `revision_checklist.md`, `improvement_plan_from_screenshots.md`.
4. Sprint 5: `Docs/Sprint5/progress.md`, `Docs/Sprint5/sprint_plan.md`, `task.md`.
5. Jamie SoT: `Docs/Sprint5/jamie_requirements_register.md`
6. Stakeholder hub: `Docs/StakeholderManagement/README.md`
7. Defendable ADRs (if touching cloud/GenAI/SQLite): 008, 010, 013 (+ 003 HITL); submission: ADR 014

## Persona map (roleplay)
- Arvind = Jamie (Risk & Compliance)
- Andy = Morgan (Product / ops budget)
- Docs keep persona names (Jamie / Morgan / Sam)

## Git state (2026-07-20) — read before editing
- **Committed (`342d840`):** Edu SPA Waves A–C red-team revisions + assessor PDF (`churn_report_df14.pdf`) from `Docs/Final_Report_Official.md`.
- **Uncommitted polish since `342d840`** — do not assume a clean tree:
  - **Modified (M):** `.agents/MEMORY.md`; `educational_web_app/docs/WALKTHROUGH.md`, `revision_checklist.md`; `src/App.tsx`, `components/shared/ui.tsx`, `content/facts.ts`, `content/tree.ts`; modules `ArchitectureModule`, `DataModule`, `DeployModule`, `FrictionModule`, `RagModule`, `WorkflowsModule`; `vite.config.ts`.
  - **Untracked (??):** `docs/improvement_plan_from_screenshots.md`; `public/` (flowchart PNGs); `src/components/shared/FlowchartExplorer.tsx`, `MarkdownBody.tsx`; `src/content/adrs.ts`, `workflow.ts`; `src/vite-env.d.ts`.
  - **Do not auto-commit** — wait for explicit user ask. Exclude `node_modules/` / `dist/` (should stay gitignored).

## Just finished (2026-07-20) — do NOT redo
### Edu SPA Waves A–C (committed `342d840`)
- Wave A: Deleted root AI Studio scaffold; run only from `educational_web_app/`.
- Wave B: Feature recount 57 state OHE + 23 other = 80 → FACT_SHEET + `facts.ts`; Model Card EOD 0.156/0.318 pinned.
- Wave C: Mastery rigor disclosed; Friction + RAG hardened (wrong→right path); GenAI scrub+rate gate; quiz +4 anti-claim items; Deploy dropped frozen “60”; SHAP rank not %; real StartingFiles CSV names.
- RT-19 done: clickable ADR chips + tree ADR files render full bundled markdown from main ADRs.
- Checklist: `educational_web_app/docs/revision_checklist.md` (RT-01…RT-16, RT-19 `[x]`; RT-17–RT-18 `[D]`).

### Session polish after `342d840` (uncommitted)
| Module | Fix |
|--------|-----|
| 02 Repo | Clickable ADR chips + accurate `TREE_DATA` (all 14 ADRs, real paths) via `content/adrs.ts`, `MarkdownBody.tsx` |
| 03 Working | Interactive presentation flowcharts (`system_flow.png`, `split_executor.png`) — `FlowchartExplorer`, `content/workflow.ts` |
| 04 Data | `ResizableBottomPanel` shared component (drag-to-resize teaching notes) |
| 07 Friction | Scroll fix for cropped Approve/Reject draft card |
| 09 RAG | “With vs without Chroma” side-by-side sub-tab; Exposure-check gate unchanged (RT-06) |
| 11 Deploy | Stuck-nav fix — Back button, clickable step pills, prominent bypass CTA; Next gates on `ignoreData`/`testOk` |

### Also already shipped (Sprint 5 — do NOT redo)
- Submission inference DONE — `submission_df14.csv` (17,599 rows), ADR 014, tests pass.
- Azure RAG RAG-01…05; chunking fix (`schema_version=3`); dual key fallback in `azure_client.py`.
- Assessor PDF rendered: `churn_report_df14.pdf` (~1.7 MiB) via `.agents/scratch/render_official_report_pdf.py` (since 2026-09-24: `scripts/export_document_pack.py`, which also refreshes `public/guides/`).
- Presentation dual PPTX (36 slides); junior-engineer code docs pass on production modules.

## Frozen — do not touch unless user/Sam/Jamie change policy
- Ops threshold `t≈0.701` / run `3f575754…` (submission CSV stays probabilities)
- Do not overwrite `Docs/Sprint2/reports/sprint2_run_summary.json` (v1 freeze)
- ADR 004 churn label / `Data/processed/training_data.csv`
- No `/send`; Approve ≠ Sent; terminal drafts immutable; Approve needs `attention_ack`
- **No edits to** `.cursor/plans/educational_app_rewrite_1bfbb583.plan.md`
- **No cascade into** `Docs/Architecture/ADRs/*` unless user explicitly asks
- **RT-17** (Data cell-order redesign) and **RT-18** (code-split/bundle rename) stay **deferred** unless improvement plan explicitly re-opens them
- **No live LLM** in teaching SPA (ADR-EDU-001); no `facts.ts` / FACT_SHEET number changes without G-FACT approval

## Do next (priority order — pick based on user intent)
1. **Manual WALKTHROUGH quick-path click-through** — Problem → Repo → Working → Model → Friction → RAG → Deploy → Mastery; confirm 12 gates still fire (screenshots 07/11 may predate fixes).
2. **Commit uncommitted edu polish when user asks** — stage `educational_web_app/` changes + `.gitignore` if needed; exclude `node_modules/` / `dist/`.
3. **Improvement plan Wave 1 (P0 layout polish)** — from `improvement_plan_from_screenshots.md`:
   - **IP-01:** 02 Repo tree double-scroll (`max-h-[520px]` truncation)
   - **IP-02:** 04 Data `ResizableBottomPanel` default height ~180–200px
   - **IP-03:** 11 Deploy step-1 duplicate bypass CTAs → single primary action
   - Follow `/docs-before-code` if touching gated-module JSX beyond pure CSS (IP-03 touches Deploy gate copy).
4. **Improvement plan Wave 2 (P1 discoverability)** — IP-04 mastery popover, IP-05 resize hint, IP-06 RAG mini-stepper (no gate logic changes).
5. ~~**WS-2 Docker smoke**~~ — **Done 2026-09-24:** every step passed; see `Docs/Sprint5/docker_smoke_checklist.md` §4.
6. **WS-2 ACA** — only after hosting confirm (`maxReplicas: 1`); anti-speculation until deployed.
7. **Spot-check `churn_report_df14.pdf`** — TOC/tables/page breaks; re-run `scripts/export_document_pack.py` if Official report markdown edits land.

## Out of scope (unless user explicitly asks)
- PresenterView / dashboard demo dry-run
- Jamie follow-up / JR-OPEN items
- Sprint 5 dual close-out (debrief + retrospective) until feature-complete
- Re-red-teaming submission inference or RAG chunking
- Wave 3–4 improvement items (IP-07…IP-11) without explicit approval
- Editing main-repo ADRs or the rewrite plan file

## Process rules
- Critique → revise: `/docs-before-code`. Prefer `cmd.exe`; `py -3.13 -m …` (never `.venv\Scripts\python.exe`).
- Before FE / score-time logic changes: verify against `Docs/Sprint1/ML_Anti_Patterns.md`.
- After structural/DB/dependency changes: ask whether a new ADR is warranted.
- Anti-speculation: no cloud ops runbooks until something is actually running.
- Update `.agents/MEMORY.md` before ending the session.
- **Ask before git commit** — never auto-commit.

## Run commands
REM Python (AppLocker-safe)
set PYTHONPATH=%CD%
py -3.13 -m pytest tests\submission tests\serving tests\genai -q
py -3.13 -m streamlit run Code\Sprint3\friction_gate_app.py

REM Edu SPA
cd educational_web_app
npm run dev
npm run lint
npm run build

Start by confirming orientation from MEMORY + this file's git-state section, then ask whether to:
(A) commit uncommitted edu polish,
(B) execute improvement-plan Wave 1 (IP-01…IP-03),
(C) run WALKTHROUGH gate verification,
(D) retry Docker smoke when Rancher is up,
or another priority the user names.
```

---

## Short context (for humans)

| Item | Pointer |
|------|---------|
| Memory | `.agents/MEMORY.md` |
| This handoff | `educational_web_app/docs/continue_edu_spa_prompt.md` |
| Improvement plan | `educational_web_app/docs/improvement_plan_from_screenshots.md` |
| Revision checklist | `educational_web_app/docs/revision_checklist.md` |
| Walkthrough | `educational_web_app/docs/WALKTHROUGH.md` |
| Last edu commit | `342d840` (Waves A–C + PDF) |
| Docker checklist | `Docs/Sprint5/docker_smoke_checklist.md` |
| Sprint 5 (legacy handoff) | `Docs/Sprint5/continue_sprint5_prompt.md` (submission/RAG era — superseded for edu work) |
