# Sprint 0: AI Engineering Learnings

- **AppLocker & Enterprise Environments:** Learned how to bypass standard `.venv` execution blocks in a corporate Windows environment by using the global Python launcher (`py -m pip install --user`).
- **Context Window Management:** Engineered a pointer-based memory system (`/diet-mode`) to intercept massive standard output logs (e.g., `pip install` traces) and archive them locally, preventing LLM amnesia.
- **Agentic Architectures:** Synchronized Antigravity and Cursor Composer by establishing `AGENTS.md` as the single source of truth, effectively eliminating hallucination loops across multiple AI tools.
- **Pydantic Scaffolding:** Front-loaded Pydantic settings management to enforce rigorous typing before the ML and GenAI layers are built, laying the groundwork for deterministic LLM outputs.
- **Docs before code (seeded here, skillified in Sprint 1):** Sprint 0 already required plan-first and anti-speculation (no docs for unbuilt systems). Sprint 1 turned the critique→revise loop into `/docs-before-code` — see [Docs/Sprint1/ai_engineering_learnings.md](../Sprint1/ai_engineering_learnings.md) and `.agents/skills/docs-before-code/SKILL.md` (private development note; omitted from this public snapshot).
