# Engineering Standards & Practices

## 1. Development Workflow
This project utilizes a split human/agentic workflow designed to bypass strict corporate Windows execution policies.

### Local Execution (AppLocker Bypass)
Developers **MUST NOT** use local virtual environments (`.venv`). 
*   **Install Dependencies:** `py -3.13 -m pip install --user -r requirements.txt`
*   **Run Scripts:** Use the `-m` flag (e.g., `py -m pytest`, `py -m jupyter notebook`).

## 2. Agentic Alignment (Cursor & Antigravity)
This repository is managed by an autonomous AI agent (Antigravity) and a coding copilot (Cursor). 
To prevent hallucination loops, the single source of truth for both systems is the `.agents/AGENTS.md` file.

*   **Rule Changes:** Any architectural change or workflow rule must be written to `.agents/AGENTS.md`. 
*   **Syncing:** The system will automatically compile `AGENTS.md` down into `.cursorrules` to ensure Cursor shares the exact same contextual awareness.
*   **Docs-Before-Code:** For bug fixes or blockers that require major dependency or backend changes, the AI must propose a markdown plan and receive human approval *before* writing code.
*   **Human-in-the-Loop Diff Reviews:** The human orchestrator MUST review all Git diffs before committing AI-generated code to catch silent architectural shifts (e.g., swapping a directory path for a SQLite URI) that the AI failed to document.

## 3. Documentation Requirements
This project enforces Staff-Level documentation rigor:
*   **No Speculation:** Documentation must reflect the *actual* state of the codebase. Do not write API docs for unbuilt APIs.
*   **Sprint Plans, Debriefs & Retrospectives:** Every sprint folder must contain:
    *   `sprint_plan.md` (generated at start)
    *   `sprint_debrief.md` (delivery record at end — what / how / why / results)
    *   `sprint_retrospective.md` (process record at end — keep / stop / start + skillify; **not** a duplicate of the debrief)
*   **Sprint Learnings:** Every sprint folder must contain an `ai_engineering_learnings.md` and an `ai_bp_learnings.md` to capture specific technical and business lessons.
*   **Walkthroughs:** A full end-to-end `walkthrough.md` must be generated in the sprint folder upon sprint completion to serve as an immutable execution log.
## 4. Coding Standards
*   **Type Hinting:** Mandatory across all Python functions.
*   **Validation:** `Pydantic` v2 is mandatory for all environment variable loading and API request/response models. Raw dictionaries are prohibited for I/O bounds.
*   **Docstrings:** All classes and major functions must contain concise Google-style docstrings.
