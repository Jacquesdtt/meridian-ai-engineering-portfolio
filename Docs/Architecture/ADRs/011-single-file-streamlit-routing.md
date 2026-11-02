# ADR 011: Single-File Streamlit Programmatic Routing

**Date:** 2026-07-17  
**Status:** Accepted  
**Context:** Sprint 5 Streamlit Multi-Page Refactor

## Context
In Sprint 5, we are refactoring the Streamlit Friction-Gate application to support multiple distinct views: Morgan's Business Dashboard, Sam's ML View, and the existing Friction-Gate Review Queue.

The standard Streamlit approach for multi-page applications is to create a `pages/` directory containing individual Python scripts for each view. However, clicking between these pages causes Streamlit to fork and spawn secondary Python subprocesses. Under our strict enterprise Windows AppLocker policy, launching secondary Python scripts from within a running process frequently triggers OS-level execution blocks, causing the application to crash or freeze.

## Decision
We will **not** use Streamlit's `pages/` directory. Instead, we will implement programmatic, single-file routing.
The application will be contained within the existing `friction_gate_app.py` script. We will utilize the sidebar demo role selector (implemented in ADR 007) and standard Python `if/elif` statements to call discrete view functions based on the selected user persona.

## Consequences
*   **Positive:** Completely avoids secondary script execution, guaranteeing compliance with AppLocker constraints.
*   **Positive:** State management remains within a single overarching session, simplifying data passing (though requiring disciplined key spacing).
*   **Negative:** The `friction_gate_app.py` script will grow larger and requires strict function encapsulation to prevent code bloat.
*   **Justification for Stakeholders:** "To ensure our multi-persona dashboard remains deployable and resilient in heavily restricted environments, we are utilizing programmatic page routing rather than native file-based pages. This architectural choice prevents security software from inadvertently blocking our UI interactions while still delivering a seamless navigation experience for end users."
