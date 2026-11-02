# ADR 009: SQLite as MLflow Tracking Backend

**Date:** 2026-07-15
**Status:** Accepted
**Related:** [MLflow model selection & registry roadmap](../MLflow_Model_Selection_Roadmap.md) (future work: nested selection runs, gates, Model Registry)

## Context
During Sprint 2 (Predictive Modeling), we integrated MLflow for experiment tracking. However, two significant technical hurdles emerged when using MLflow's default local file-store (`./mlruns`):
1. **Modern MLflow Deprecations:** Current versions of MLflow place the local flat-file storage backend into maintenance mode. Out-of-the-box usage raises exceptions unless explicitly overridden with the `MLFLOW_ALLOW_FILE_STORE=true` environment variable.
2. **AppLocker & EDR Interception:** As established in our global project constraints, the corporate Windows environment employs strict real-time Antivirus (EDR) scanning. The default MLflow file-store creates thousands of tiny nested directories and text files for every parameter, metric, and artifact. This high volume of small file I/O operations triggered severe latency and file-locking issues from the EDR scanner, halting model training loops.

## Decision
We will bypass the default `./mlruns` flat-file store and instead use **SQLite** as the local MLflow tracking backend. 
All MLflow tracking will point to a single local database file (e.g., `sqlite:///mlflow.db`).

## Alternatives Considered
1. **Setting `MLFLOW_ALLOW_FILE_STORE=true`:** Rejected. While it bypasses the MLflow deprecation error, it does not solve the root cause of the EDR/Antivirus file I/O interception.
2. **Provisioning a Remote MLflow Server:** Rejected for the prototyping phase. Setting up a remote tracking server adds unnecessary infrastructure overhead during rapid local iteration, though this will be the eventual target for production (Sprint 5/6).

## Consequences
*   **Pros:** 
    *   Completely eliminates the "thousands of small files" I/O bottleneck, bypassing EDR/Antivirus latency.
    *   Uses a modern, supported MLflow tracking backend.
    *   The `mlflow.db` file is highly portable and easily excluded from source control via `.gitignore`.
*   **Cons:** 
    *   Artifacts (like saved models or JSON files) still require a local directory (usually `./mlartifacts`) alongside the SQLite DB, but the volume of file I/O is exponentially lower since metrics and parameters are stored in the DB.
