# Sprint 0: Setup and Tooling (The Architecture Phase)

This document serves as the historical ledger for the architectural decisions, environment configurations, and custom AI engineering paradigms established before writing the core Machine Learning pipelines. 

By front-loading this structural rigor, we ensure the project remains compliant, resilient, and enterprise-ready.

## 1. Environment & Security Mitigation (AppLocker)
**The Problem:** Corporate Windows environments use strict AppLocker or EDR policies that block the execution of any `.exe` file residing in a user-writable directory. This makes traditional Python virtual environments (`.venv\Scripts\python.exe`) completely unusable, returning an `Access is denied (os error 5)` error.
**The Solution:** Instead of requesting security exceptions, we adapted to the environment by explicitly abandoning local virtual environments. We utilize the whitelisted global system Python launcher (`C:\Windows\py.exe`). All dependency installations are piped to the global user scope using `py -3.13 -m pip install --user <package>`, and scripts are executed via module execution (`py -m <script>`).

## 2. Text Rules vs. Executable Infrastructure (`/learn` vs `/skillify`)
A core lesson in advanced AI Engineering is the difference between passive instructions and active infrastructure.
*   **The Passive Approach (`/learn`):** Appending text rules to a global `AGENTS.md` file (e.g., *"Always remember to use the AppLocker bypass"*). It relies on the LLM's context window to remember the rule, which is prone to error and "amnesia" as context grows.
*   **The Active Approach (`/skillify`):** Upgrading a passive rule into a deterministic, executable script (a "Skill"). Instead of hoping the agent remembers complex `py -m` syntax, we codified this logic into a custom `/applocker-safe-install` agentic skill. We permanently hardcoded both our AppLocker bypass and log-compression tactics into the environment.

## 3. Token Economy & "Diet Mode"
**The Problem:** Large terminal outputs (like `pip install` traces or dumping raw dataframes) rapidly consume LLM context windows, causing "amnesia" and hallucination in long-running projects.
**The Solution:** We implemented `/diet-mode`. The system enforces strict "pointer-based memory" where massive tracebacks are routed to local text archives (e.g., `install.log`), and only a tiny JSON summary or file pointer is retained in the active LLM context. This preserves our token budget and keeps the agent focused.

## 4. Pydantic Core Scaffolding
**The Problem:** Generative AI is inherently probabilistic, which introduces severe compliance risks in banking workflows (e.g., hallucinated keys, brittle Regex parsing).
**The Solution:** Before writing GenAI code, we scaffolded a strict deterministic schema layer using `pydantic-settings` (`src/core/config.py`). `pydantic` serves as the mandatory validation layer:
*   **GenAI Structured Outputs:** We define explicit `pydantic.BaseModel` schemas passed to Azure OpenAI via `response_format`. This forces perfectly typed JSON strings.
*   **FastAPI MLOps Validation:** FastAPI strictly validates all incoming web requests using Pydantic, trapping malformed inputs (like `"age": "twenty"`) with a clean HTTP 422 before they reach the XGBoost inference engine.

## 5. The Agentic Harness (Cross-Platform Context)
**The Problem:** Maintaining context across different AI tools (Cursor and Antigravity) leads to contradictory behavior and wasted prompt engineering.
**The Solution:** We established `AGENTS.md` as the single source of truth (SSOT). Using unidirectional synchronization (`/cursor-context-sync`), the system compiles the master rules down into `.cursorrules`, guaranteeing that Cursor's Composer operates under the exact same constraints and environmental logic as the primary autonomous agent.
