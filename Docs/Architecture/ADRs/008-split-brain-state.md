# ADR 008: Friction-Gate State — Shared SQLite, Single Replica

**Date:** 2026-07-14  
**Status:** Accepted (amended 2026-07-17 — WAL + `maxReplicas: 1` shipped)  
**Related:** [ADR 006](006-sqlite-and-in-process-ui-for-friction-gate.md) · [revision plan](../../Sprint5/sprint5_azure_rag_revision_plan.md) (RAG-02, RAG-03, RAG-05)

## Context
ADR 006 chose **SQLite + in-process Streamlit** so the Friction-Gate demo works under AppLocker (no `localhost` HTTP to FastAPI). That is correct for local HITL demos.

Phase 5 cloud packaging creates a new failure mode: if API and UI run as **two containers with two DBs**, approvals and drafts **diverge** (“split-brain”). If we put SQLite on a **shared SMB/Azure Files volume** and then **scale replicas > 1**, SQLite file locking on network filesystems is a known corruption path (`database is locked`).

Jamie cares that the audit trail and Approve state are **one story**. Morgan cares that the demo does not invent a PostgreSQL ops burden before value is proven.

## Decision
While the store remains SQLite:

1. **One physical DB file**, mounted via a **shared named volume** (`docker-compose.yml` → `Data/processed`).
2. **`maxReplicas: 1`** on Azure Container Apps (scaffold: `infra/azure-container-app.yaml`); Compose `deploy.replicas: 1`. Horizontal scale is **forbidden**, not “left for later.”
3. **WAL + busy timeout** in `draft_store._connect`: `PRAGMA journal_mode=WAL`, `timeout=5.0` / `busy_timeout=5000`, and **ERROR logs** on `OperationalError` (do not swallow locks).

Long-term HA (Postgres + HTTP) is explicitly **out of scope** until Sam/Morgan unlock production multi-node hosting.

## Alternatives considered
1. **In-memory dict in FastAPI only** — Rejected earlier (ADR 006). Streamlit cannot see it; state dies on restart.
2. **Two containers, two SQLite files, “sync later”** — Rejected. Guarantees split-brain; Jamie cannot trust audit.
3. **PostgreSQL / Cosmos now** — Deferred. Correct for multi-replica cloud; adds credentials, networking, and runbooks we have not earned yet (anti-speculation). Fails the “prototype must stay portable” bar from ADR 006.
4. **Scale-out with SQLite on Azure Files** — Rejected. Classic corruption pattern; red-team CRITICAL. **`maxReplicas: 1` is the control.**
5. **Single mega-container (API+UI)** — Acceptable fallback, but Compose volume + single replica already solves split-brain without collapsing process boundaries for learning demos.

## Trade-offs
We trade **horizontal scale** and **multi-AZ DB HA** for **one coherent Approve/audit trail** and **zero new managed-database cost** in the prototype. That is intentional: Friction-Gate correctness beats throughput while the product is still a HITL demo.

## What would force a revisit
*   Confirmed multi-replica Container Apps requirement → new ADR: networked DB + API as system of record (Streamlit becomes HTTP client).
*   Sustained lock errors under single replica → investigate volume type / write patterns; still do **not** raise `maxReplicas` on SQLite.
*   Corporate ban on SQLite in any hosted path → migrate store under an explicit unlock.

## Consequences
*   **Pros:** No split-brain in the intended topology; corruption mode called out and blocked by scale lock; WAL reduces reader/writer clash.
*   **Cons:** Cannot autoscale the API horizontally while SQLite remains; shared-volume SQLite is still not enterprise HA.

## Implementation map
| Concern | Path |
|---------|------|
| WAL / timeout / error logs | `src/serving/draft_store.py` |
| Compose volume + replicas | `docker-compose.yml` |
| ACA scale lock (current target) | `infra/resources.bicep`; one replica, ADR 016. Earlier `infra/azure-container-app.yaml` is superseded. |
| Tests | `tests/serving/test_sqlite_wal.py` |

## Follow-on (2026-09-24): UI is already an HTTP client; local container verified
* Since F8 (2026-09-18, see [ADR 006 follow-on](006-sqlite-and-in-process-ui-for-friction-gate.md)) Streamlit no longer opens SQLite. It calls FastAPI through `FrictionGateClient`, so the **API is the only SQLite writer** and the "Streamlit becomes HTTP client" part of the revisit trigger above is already done. The context paragraph's "in-process Streamlit" describes the original ADR 006 choice; `FRICTION_GATE_MODE=inprocess` still exists for AppLocker machines, but it drives the same FastAPI app without a socket rather than writing SQLite itself.
* The single-writer rule still holds: the API itself stays at one replica while the store is SQLite.
* The FastAPI container (compose, `drafts_db_data` volume) was built and smoke-tested locally on 2026-09-24, including drafts surviving a restart — [docker_smoke_checklist.md](../../Sprint5/docker_smoke_checklist.md). The API was also deployed and checked on Azure that day, then removed (ADR 016). Cloud SQLite used ephemeral container disk, unlike the local Compose named volume. The later API-key gate remains unverified on Azure.
