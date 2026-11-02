# ADR 016: Azure Container Apps Hosting via `azd`, with IP Allow-List + API Key

**Date:** 2026-09-24
**Status:** Accepted
**Related:** [ADR 006](006-sqlite-and-in-process-ui-for-friction-gate.md) (UI → API split) · [ADR 007](007-demo-glass-box-rbac.md) (demo roles) · [ADR 008](008-split-brain-state.md) (single SQLite writer) · [ADR 013](013-azure-openai-resilience-tenacity-telemetry.md) · `azure.yaml`, `infra/main.bicep`, `infra/resources.bicep`

## Context
The brief asks for the containerised API to run on Azure (Container Apps or an Azure ML endpoint). Before this ADR the only cloud artifact was a hand-written manifest, `infra/azure-container-app.yaml`. It had a placeholder image (`REPLACE_WITH_ACR_IMAGE`), no registry and no way to get the Azure OpenAI key into the app without pasting it somewhere.

Constraints:
- **ADR 008.** The draft queue and audit trail are SQLite files, so there must be exactly one writer.
- **No secrets in the repo** (ZDR / `.env` rule).
- **The demo roles (`X-Demo-Role`) are labels, not identity (ADR 007).** A public URL would let anyone approve drafts and spend Azure OpenAI quota.
- **Remote builds are refused.** This subscription rejects ACR Tasks: `TasksOperationsNotAllowed` on the first `azd up`, 2026-09-24.

## Decision
1. **Use Azure Developer CLI + Bicep** (`azure.yaml`, `infra/*.bicep`) rather than the hand-written manifest. One command (`azd up`) creates the following, and `azd down` removes them all:
   - resource group;
   - Log Analytics;
   - Azure Container Registry (Basic, admin user off);
   - user-assigned identity with AcrPull;
   - Container Apps environment;
   - the app.
2. **Build locally, push to ACR** (`remoteBuild: false`), because ACR Tasks are blocked on this subscription.
3. **Single replica:** `minReplicas = maxReplicas = 1` (ADR 008). Drafts live on the container's disk and are lost on a new revision. This is acceptable for a demo; durable storage means Postgres, not an SMB share (SQLite WAL is unsafe on SMB).
4. **Secrets:**
   - The Azure OpenAI key is read at deploy time with `listKeys()` from the existing AI Services resource and stored as a Container Apps secret. It never passes through the repo, `.env` or the agent.
   - The image is pulled with the managed identity, so there is no registry password.
5. **Access control, two layers:**
   - **Network:** ingress `ipSecurityRestrictions` allows one CIDR (`ALLOWED_IP_RANGE`, the owner's public IP). This narrows who can connect.
   - **Application:** when `API_ACCESS_KEY` is set, a FastAPI middleware requires `X-API-Key` on every request, including `/health` and `/docs`. The comparison is constant-time; CORS preflights are exempt.
     - In Bicep the key is a required `@secure()` parameter of at least 32 characters, so the cloud app cannot deploy open.
     - The key is generated into the gitignored azd environment (`azd env set API_ACCESS_KEY …`).
     - The Streamlit client sends it from `FRICTION_GATE_API_KEY`.
     - Locally no key is set, so tests, `launch_all.ps1` and the teaching app are unchanged.
6. **Only the API is hosted; Streamlit stays on the host** and points `FRICTION_GATE_API_URL` at the app (ADR 006 / F8).

## Alternatives considered
1. **Keep the hand-written manifest + `az containerapp` commands.** Rejected: manual registry, image and secret steps, and nothing to tear down cleanly.
2. **Azure ML managed online endpoint.** Rejected: it serves `/score` well but not the draft queue, audit trail, RAG or RBAC routes that make up the product (F8: FastAPI is the single enforcement point).
3. **Entra ID authentication (Container Apps built-in auth).** This is the production answer, because it gives real identity and could replace the demo roles. It was deferred because it needs an app registration and token acquisition in the Streamlit client, which is out of scope for a torn-down demo deploy. The API key is a shared secret, not identity; rotate it with `azd env set API_ACCESS_KEY <new>` then `azd provision`.
4. **Internal-only ingress + VNet.** Rejected: the owner could not reach it without a VPN.
5. **IP allow-list alone.** Rejected after review: anyone sharing the owner's public IP (household, carrier NAT) could call every route.

## Consequences
- **Pros:** reproducible create/teardown; no secrets in git; one writer enforced by the platform; two independent gates before any route runs.
- **Cons:**
  - The API key is a bearer secret: anyone who holds it and shares the IP is "the owner".
  - The IP changes when the ISP changes it (`azd env set ALLOWED_IP_RANGE …`, then `azd provision`).
  - Local build means Docker must be running for `azd deploy`.
  - Always-on replica, ACR Basic and Log Analytics are billable while up, so tear down with `azd down --purge`.

## Evidence (2026-09-24)
- **Deployed and verified live** (API image as of commit `32f1e65`, before the key gate):
  - `/health`: model loaded, run `3f575754…`, t = 0.700548, `azure_configured=true`;
  - flagged fixture scores 0.7509;
  - draft `drafter_source=azure`;
  - RAG `retrieval_mode=embedding, hybrid=true, reranked=true`;
  - `/predictions` and `/explain` work;
  - no role → 400; agent on `/predictions` → 403;
  - live config: `ipSecurityRestrictions=[<operator-ip>/32]`, min = max = 1.
- **Torn down by the owner** with `azd down` the same day.
- **Key gate:** added after that deploy. It is covered by `tests/serving/test_api_key.py` but has **not yet run on Azure**.
