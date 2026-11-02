# Docker packaging sanity + smoke checklist (WS-2)

> **Status clarification, 2 November 2026:** This dated record describes the earlier retrieval implementation. ADR 015 later replaced the sparse path with BM25 and added optional dense fusion and LLM reranking. A dedicated cross-encoder and measured retrieval/answer-quality gates remain open. The API label tfidf is retained for compatibility, not as the algorithm name.


**Date:** 2026-07-17 (static review) · **Live smoke run:** 2026-09-24, **all §3 steps PASS** (see §4)  
**Scope:** Local FastAPI container only (ADR 008 — Streamlit stays on host / same SQLite story).  
**Engine:** Rancher Desktop (moby; Docker server `29.5.3`, client `29.6.2-rd`).

---

## 1. Packaging sanity (static — done without daemon)

| Check | Result | Notes |
|-------|--------|--------|
| `Dockerfile` copies `src/` + `Models/` (+ two runtime `Docs/` files since DK-08) | PASS | No `COPY .` — secrets / notebooks not baked in |
| `.env` excluded | PASS | Listed in `.dockerignore`; compose injects via `env_file` |
| `mlflow.db` / `mlruns/` excluded | PASS | `.dockerignore` |
| Ops artifacts present | PASS | `Models/ops/{booster.json,preprocessor.joblib,serving_meta.json}` |
| Ops threshold pin | PASS | `serving_meta.json` → `threshold≈0.70055`, `run_id=3f575754…` |
| SQLite path ↔ volume | PASS | App uses `Data/processed/draft_queue.db`; compose mounts `drafts_db_data` → `/app/Data/processed` |
| Replica lock | PASS (intent) | Compose `deploy.replicas: 1`; ACA scaffold `maxReplicas: 1` (RAG-03 / ADR 008) |
| Public `/health` | PASS | No `X-Demo-Role` required — good smoke probe |
| Score RBAC | PASS | `POST /score` requires `X-Demo-Role: retention_agent` |
| ACA scaffold is not a deploy | PASS | `REPLACE_WITH_ACR_IMAGE`; anti-speculation comment present |

### Findings (fix / defer)

| ID | Severity | Finding | Action |
|----|----------|---------|--------|
| DK-01 | Low | `.dockerignore` omitted `.git/`, `Data/`, root CSVs — build context bloat only (image content still limited by explicit `COPY`) | Harden `.dockerignore` (same session) |
| DK-02 | Med | Image installs full `requirements.txt` (jupyter, shap, streamlit, mlflow, …) → slow/large builds | **Fixed 2026-09-24:** `requirements.serving.in` → pinned `requirements.serving.txt` (42 packages; image 723 MB) |
| DK-03 | Low | Compose `deploy.replicas` is **Swarm-oriented**; plain `docker compose up` usually ignores it — still documents intent; ACA yaml is the real lock | No code change; checklist asserts single container |
| DK-04 | Low | `env_file: .env` fails if `.env` missing | Create from `.env.example` before compose (secrets stay local) |
| DK-05 | Info | Fixtures live under `Docs/` (dockerignored) — score smoke must POST JSON from the **host** | Curl examples below |
| DK-06 | Info | No `HEALTHCHECK` instruction in Dockerfile | **Fixed 2026-09-24:** stdlib `HEALTHCHECK` on `/health`; `docker compose ps` shows `healthy` |
| DK-07 | **High** | `requirements.txt` is unpinned, so the image would install the *latest* scikit-learn / xgboost rather than the versions that pickled `Models/ops/preprocessor.joblib` (scikit-learn 1.9.0) | **Fixed 2026-09-24:** serving lock compiled with `-c requirements.lock --python-platform linux`; `xgboost-cpu==3.3.0` (same version, skips ~300 MB `nvidia-nccl`) |
| DK-08 | **High** | `.dockerignore` excluded all of `Docs/`, but `GET /model/fairness` reads `Docs/Sprint2/reports/fairlearn_equalized_odds.json` and `POST /rag/ask` reads `Docs/Final_Report_Official.md`, so the Glass-box fairness table and the RAG bot failed in the container | **Fixed 2026-09-24:** both files re-included (`!` rules) and `COPY`'d |
| DK-09 | **High** | The Azure deployment is now `gpt-5-mini`, which rejects `max_tokens` (HTTP 400). Drafter and RAG silently fell back to `stub_fallback` / error text, on the host **and** in the container | **Fixed 2026-09-24:** `chat_limit_params()` in `src/genai/azure_client.py` sends `max_completion_tokens` (and no `temperature`) to reasoning models; drafts now report `drafter_source=azure` |
| DK-10 | Low | Compose hard-coded host port 8000, which `launch_all.ps1`'s host uvicorn already binds on `127.0.0.1` | **Fixed:** `${API_PORT:-8000}:8000`; smoke-test with `API_PORT=8001` beside a host API |
| DK-11 | Low | Build context included `.claude/worktrees/` (a second `.venv`) and `educational_web_app/` | **Fixed:** added to `.dockerignore` |
| DK-12 | Info | First Rancher start: the Windows proxy answered, but every call failed with `timed out dialing Hyper-V socket` while the VM engine was healthy (`rdctl shell -- docker ps` worked) | `rdctl shutdown` + relaunch fixed it. Not a repo issue |
| DK-13 | Med | Embeddings returned 404, so RAG ran on its TF-IDF fallback (`hybrid=false`). The `text-embedding-3-large` deployment exists; the cause was the `.env` endpoint being a Foundry **project** URL (`…/api/projects/<name>`), whose `/openai/v1` route serves chat but not embeddings | **Fixed 2026-09-24:** `normalize_openai_base_url()` strips the project path. Container RAG now reports `retrieval_mode=embedding, hybrid=true, reranked=true` |

**Pre-container app check (host):** `uv run python .agents\scratch\verify_s4_fixtures.py` must print `OK` (flagged + below fixtures match ops model).

---

## 2. Prerequisites (when daemon is up)

1. Start **Rancher Desktop** (or Docker Desktop) and wait until `docker ps` succeeds. A `Server` section in `docker info` is not enough (DK-12).
2. From repo root, ensure `.env` exists (`copy .env.example .env` then fill keys if testing Azure inside the container).
3. Optional host baseline (no Docker):

```bat
set PYTHONPATH=%CD%
uv run python .agents\scratch\verify_s4_fixtures.py
uv run python -m pytest tests -q
```

---

## 3. Smoke run (execute when `docker info` works)

Prefer **Command Prompt** from repo root. If a host API already listens on 8000 (e.g. from `launch_all.ps1`), run `set API_PORT=8001` before `compose up` and use `:8001` in every URL below (DK-10).

### 3.1 Build + up

```bat
docker compose build
docker compose up -d
docker compose ps
```

Expect: one `fastapi` service, port `8000`, state running. (`deploy.replicas` may not appear in `ps` — that is OK locally.)

### 3.2 Health

```bat
curl -s http://127.0.0.1:8000/health
```

Expect JSON roughly:

- `status`: `"ok"`
- `model_loaded`: `true`
- `run_id`: `"3f575754ae9a42c5a21ea5e476c0af37"`
- `threshold`: `≈0.70055`
- `azure_configured`: `true` only if endpoint present in compose env

Fail if `degraded` / `model_loaded: false` → ops artifacts missing from image or bad `PYTHONPATH` (should be `/app` in Dockerfile).

### 3.3 RBAC gate (negative)

```bat
curl -s -o NUL -w "%%{http_code}" -X POST http://127.0.0.1:8000/score -H "Content-Type: application/json" -d "{\"features\":{\"state\":\"Texas\"}}"
```

Expect: **400** (missing `X-Demo-Role`).

### 3.4 Score flagged fixture (from host file)

PowerShell one-liner (host has fixtures; image does not):

```powershell
$f = Get-Content -Raw Docs\Sprint4\fixtures\flagged_demo.json | ConvertFrom-Json
$body = @{ features = $f.features } | ConvertTo-Json -Depth 5
Invoke-RestMethod -Uri http://127.0.0.1:8000/score -Method POST -Headers @{ "X-Demo-Role" = "retention_agent"; "Content-Type" = "application/json" } -Body $body
```

Expect: `flagged: true`, `churn_probability` ≈ **0.75**, `threshold` ≈ **0.701**, same `run_id` as health.

### 3.5 SQLite volume persistence

```bat
curl -s -H "X-Demo-Role: retention_agent" http://127.0.0.1:8000/drafts
docker compose restart fastapi
curl -s -H "X-Demo-Role: retention_agent" http://127.0.0.1:8000/drafts
```

Expect: draft list still reachable after restart (empty list OK if no drafts created; creating one flagged draft then restarting should keep the row). Volume name: `drafts_db_data`.

### 3.6 Tear down

```bat
docker compose down
```

Use `docker compose down -v` only if you intentionally wipe the demo SQLite volume.

---

## 4. Pass / fail log (fill in after daemon is ready)

Run on 2026-09-24 with `API_PORT=8001` (a host API was already on 8000).

| Step | Pass? | Observed |
|------|-------|----------|
| `docker ps` works | ☑ | After one Rancher restart (DK-12) |
| `compose build` | ☑ | Image 723 MB, serving-only deps (DK-02 / DK-07) |
| `compose up` | ☑ | One `fastapi` container; `HEALTHCHECK` reports `healthy` |
| `/health` ops pin | ☑ | `status=ok`, `model_loaded=true`, `run_id=3f575754…`, `threshold=0.700548`, `azure_configured=true` |
| Score without role → 400 | ☑ | 400 |
| Flagged fixture score | ☑ | p=0.7509 flagged; below fixture p=0.2074 not flagged (identical to host) |
| Below-threshold `POST /drafts` → 422 | ☑ | 422 (server-side gate) |
| Compliance Approve → 403 | ☑ | 403 `cannot approve_reject` |
| Draft via Azure | ☑ | `drafter_source=azure`, rate 3.0% (was `stub_fallback` before the DK-09 fix) |
| `/model/fairness` + `/rag/ask` | ☑ | Fairness served from the committed JSON (age EOD 0.156); RAG answered; after the DK-13 fix it runs hybrid (embedding + BM25 + rerank) |
| Volume survives restart | ☑ | 2 drafts before and after `compose restart`, and after container re-create |
| Streamlit → container | ☑ | Streamlit `AppTest` rendered all 19 role × page combinations against `:8001` with no errors |

---

## 5. Out of scope (do not invent)

- Azure Container Apps push / ACR (hosting confirm still open)
- Streamlit-in-container (ADR 006/008 split-brain)
- Speculative Key Vault / MI runbooks
