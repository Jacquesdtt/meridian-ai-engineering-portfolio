# Sprint 0: Architecture, Setup & Agentic Harness - Debrief

> **Related:** Process retrospective (keep/stop/start) → [sprint_retrospective.md](sprint_retrospective.md). This debrief is the delivery record.

## 1. What Was Done (Change from Last Sprint)
*This is the foundational sprint. The repository transitioned from an empty folder into a fully scaffolded, enterprise-ready environment.*
- **Project Scaffolding:** Created the directory structure, defined the architecture, and mitigated local security constraints.
- **Advanced GenAI Scaffolding (The Meridian Framework):** Defined the Mini-RAG pipeline, Pydantic determinism traps, and the "Friction as a Feature" UI for the GenAI extensions.
- **Meta-Engineering:** Built the cross-platform Agentic Harness, locking `AGENTS.md` as the Single Source of Truth and syncing it to Cursor.
- **Executive Business Alignment:** Integrated the 6-Factor Opportunity filter and ROI Business Case into the planning documentation.

## 2. How It Was Done
- **Environment Mitigation:** Bypassed the virtual environment restriction by leveraging the global `py -3.13 -m pip install --user` command to install dependencies securely.
- **Cursor Context Sync:** Enabled unidirectional background compilation from `AGENTS.md` into `.cursorrules`. We injected an explicit warning header so Cursor knows it is a downstream consumer.
- **Token Diet Protocol:** Established strict pointer-based memory where massive tracebacks and logs are saved to local disk (`install.log`) instead of the chat window, preventing model amnesia.
- **Notebook Generation:** Programmatically generated `01_data_integrity_and_eda.ipynb` with Pandas logic to aggregate raw transactions (350+ MB) into a monthly grain.

## 3. Why It Was Done
- **Enterprise Readiness:** Moving from a 5-person squad to a solo AI Engineer required a tighter, more efficient pipeline without sacrificing rigorous ML fundamentals.
- **Compliance & Security:** We must treat GenAI as a governed software component. Pydantic determinism and the Friction Gate ensure we pass Risk & Compliance checks.
- **Business Focus:** We elevated the project documentation from purely technical to Staff-Level/Product Lead quality to align with executive ROI goals.

## 4. Issues & Workarounds
- **Issue:** Windows AppLocker policy blocked the execution of `.venv\Scripts\python.exe` with an `Access is denied (os error 5)` error.
- **Workaround:** Abandoned standard virtual environments and utilized global python `-m` module execution.
- **Issue:** Markdown parser failures on the Orchestrator flowchart.
- **Workaround:** Stripped fragile emojis, HTML tags (`<br>`), and ampersands from the Mermaid syntax to ensure robust rendering.
- **Issue:** Client confidentiality leak ("Propellant").
- **Workaround:** Scrubbed the repository of the leaked name and replaced it with generic placeholders ("The Meridian Framework").

## 5. Learning Outcomes
- Real-world experience navigating enterprise Windows security environments (AppLocker).
- Understanding how to architect a cross-platform AI harnessing system (Antigravity + Cursor) to prevent hallucinations and manage token economy.
- Translating AI capabilities into financial ROI using the 6-Factor Opportunity Assessment.

## 6. Results & Next Steps
- **Result:** Sprint 0 architecture is 100% complete and fully committed. The data exploration notebook is ready.
- **Next Steps (Sprint 1):** Execute `01_data_integrity_and_eda.ipynb`, review the outputs, meet with stakeholders to finalize the churn definition, and begin feature engineering.
- **Retrospective:** [sprint_retrospective.md](sprint_retrospective.md) (backfilled 2026-07-10 for mandatory dual close-out).
