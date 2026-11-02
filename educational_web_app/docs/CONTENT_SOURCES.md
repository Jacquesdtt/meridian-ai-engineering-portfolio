# Content Sources Map

Each teaching module maps to main-repo sources. Prefer citing these when updating copy.

| Module | Primary sources |
|--------|-----------------|
| 01 Problem & stakeholders | `Docs/Final_Report_Official.md` §3; `Docs/StakeholderManagement/README.md`; PRD / Sprint1 debrief (~$7.3M) |
| 02 Repo & ADR spine | Repo tree; `Docs/Architecture/ADRs/*` (001–014) |
| 03 Ways of working | Presentation Part 2 (Split-Executor); ADR 001; `.cursorrules`; docs-before-code skill |
| 04 Label & temporal FE | ADR 004; `Docs/Sprint1/ML_Anti_Patterns.md`; Data Dictionary |
| 05 Model & ops threshold | `Docs/Model_Card.md`; Final Report §5; `Models/ops/serving_meta.json` |
| 06 Serving topology | ADR 006, 008; `src/serving/app.py`; `Code/Sprint3/friction_gate_app.py` |
| 07 Friction-Gate & RBAC | ADR 003, 007; Jamie requirements register |
| 08 GenAI controls | ADR 002; `src/genai/drafter.py`; `retention_draft.prompty`; `pii_scrubber.py` |
| 09 RAG under AppLocker | ADR 010, 013; `src/genai/rag_engine.py`; Sprint5 RAG chunking docs |
| 10 Fairness & glass-box | ADR 012; Model Card fairness; Final Report Responsible AI |
| 11 Packaging (honest) | ADR 008; `Docs/Sprint5/docker_smoke_checklist.md`; Phase6 roadmap (pending ACA) |
| 12 Mastery | This fact sheet + quiz grounded in modules 01–11 |

## Lag policy

The main repo is authoritative. If metrics or ADRs change, update `FACT_SHEET.md` and `src/content/facts.ts` in the same change as the UI copy.
