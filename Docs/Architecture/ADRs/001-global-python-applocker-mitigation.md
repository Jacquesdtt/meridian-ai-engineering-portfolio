# ADR 001: Global Python Execution & AppLocker Mitigation

## Status
Accepted

## Context
Corporate Windows environments employ strict security policies (AppLocker / Endpoint Detection and Response). These policies explicitly block the execution of any `.exe` binary located within a user-writable directory. Consequently, standard Python virtual environment commands (`python -m venv .venv` or `uv venv`) fail when attempting to execute the localized `.venv\Scripts\python.exe`, throwing an `Access is denied (os error 5)` exception.

## Decision
We will **not** use local virtual environments for this project. Instead, we will rely exclusively on the globally installed, security-whitelisted Windows Python launcher (`C:\Windows\py.exe`). 

All dependencies will be installed to the user's global `AppData` scope via:
`py -3.13 -m pip install --user -r requirements.txt`

All scripts will be executed via module syntax to bypass direct executable calls:
`py -m pytest` or `py -m streamlit run app.py`

## Alternatives Considered
1.  **Requesting a Security Exception:** Rejected. Process is too slow and does not scale to other developers.
2.  **Using Docker Containers for Local Dev:** Rejected for Sprint 0/1. Docker Desktop itself often requires admin rights to install, creating another blocker.

## Consequences
*   **Pros:** Immediate unblocking of development. Scales to any machine governed by the same AppLocker policy.
*   **Cons:** Loss of project-level dependency isolation. Requires careful management of the global user environment to prevent package conflicts.

## Trade-offs
We are trading pristine dependency isolation for actual execution capability. This is an acceptable trade-off until the system is containerized in Sprint 5.
