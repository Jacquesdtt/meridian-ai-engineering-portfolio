# How to Clone and Setup Meridian Savings Churn Project on Another Machine

This guide provides step-by-step instructions for cloning and setting up this repository on another machine (Windows, macOS, or Linux).

## Local demo: minimum Python setup

For the project tour, use Node.js 24 and the [README](README.md). Python is
required only for model scoring, retention review, and backend tests.

For those paths on an unrestricted machine, use the pinned serving dependencies
instead of installing the full notebook stack. From the repository root:

```bash
uv venv --python 3.13 .venv
uv pip install -r requirements.serving.txt streamlit pytest
```

Activate the environment with `.venv/Scripts/Activate.ps1` in PowerShell or
`source .venv/bin/activate` in Bash. Then run `python -m pytest tests -q` and
follow the [application guide](Docs/Portfolio/DEMO_GUIDE.md). The pinned
scikit-learn version matches the saved preprocessor. Full notebook reproduction
needs the broader dependencies and original course data described below.

Leave Azure variables absent for the local stub path. An `.env` file is optional
for native Python, and required by Compose. For a fresh Compose demo, create an
empty `.env`; do not overwrite an existing file. Copy `.env.example` only when
configuring a real Azure resource, and replace its placeholder endpoint.

On restricted Windows machines, follow the AppLocker section below. If
`py -3.13` cannot locate an installed uv-managed interpreter, run
`uv python find 3.13` and use the returned interpreter path with `-m`.
Do not use Python 3.14 for this project.

---

## 1. Prerequisites

- **Git** installed on your system ([git-scm.com](https://git-scm.com/)).
- **Python 3.13** (required by `pyproject.toml`).
- **Node.js 24** if you want the interactive teaching app.
- Public GitHub repository: [`https://github.com/Jacquesdtt/meridian-ai-engineering-portfolio.git`](https://github.com/Jacquesdtt/meridian-ai-engineering-portfolio.git).

---

## 2. Clone the public portfolio

No GitHub account or access token is required for HTTPS cloning:

```bash
git clone https://github.com/Jacquesdtt/meridian-ai-engineering-portfolio.git
cd meridian-ai-engineering-portfolio
```

## 3. What is *not* in git

A clone contains the code, docs and the portable serving model (`Models/ops/`), so tests, FastAPI and Streamlit work immediately. These files are gitignored and must be obtained separately if you need them:

| Missing item | Needed for | How to get it |
|---|---|---|
| `StartingFiles/*.csv` (raw customers / transactions) | Re-running the Sprint 1–2 notebooks, `create_submission.py` | Obtain from the course materials; never commit |
| `Data/processed/training_data.csv` | Sprint 2 notebook, MLflow re-training | Run `Code/Sprint1/02_feature_engineering.ipynb` |
| `Data/processed/prediction_cohort.csv` | Real customers in the Streamlit Prediction browser (it lists the two demo fixtures without it) | `uv run python Code/Sprint5/build_prediction_cohort.py` (needs `training_data.csv`; default = latest month) |
| `mlflow.db` + `mlartifacts/` (MLflow store, run `3f575754…`) | `Code/Sprint3/export_ops_model.py` (exits without it) | Back up from the original machine, or rebuild: `02_feature_engineering` → `Code/Sprint2/01_modeling_and_rai.ipynb` → `export_ops_model.py` |
| `submission_df14.csv` | Course submission (attach separately — `*.csv` is gitignored) | Run `Code/Sprint3/create_submission.py` (needs the raw CSVs); check with `StartingFiles/validate_submission.py` |
| `.env` | Live Azure OpenAI drafts / embeddings | Copy `.env.example` (see §5). Without it the stub drafter and BM25 retrieval are used |

---

## 4. Environment & Dependency Setup

> **Which requirements file?** `requirements.txt` is mostly unpinned but works on every OS (it pins `prompty<2`: `prompty` 2.x cannot render `retention_draft.prompty`, so the drafter would silently fall back to its embedded prompt). `requirements.lock` holds the exact tested versions but was compiled on Windows (it includes `pywin32` / `pywinpty`), so use it only on Windows.

### Standard Environment (macOS / Linux / Standard Windows)

This path uses `python`, not the `py` launcher — machines without AppLocker (e.g. a uv-managed Python) often have no `py` launcher at all.

1. **Create & activate virtual environment:**
   * **Windows (PowerShell):**
     ```powershell
     python -m venv .venv
     .\.venv\Scripts\Activate.ps1
     ```
   * **macOS / Linux (Bash):**
     ```bash
     python3 -m venv .venv
     source .venv/bin/activate
     ```

2. **Install dependencies (plus pytest, which is not in the lockfile):**
   ```bash
   pip install -r requirements.txt pytest
   ```

### Standard Environment with uv (recommended when `uv` is installed)

`requirements.lock` was compiled with uv. A uv-managed Python also rejects `pip install --user` (PEP 668, "externally managed"), so use a uv virtual environment instead:

```bash
uv venv --python 3.13 .venv
uv pip install -r requirements.txt pytest
```

On Windows you can install the exact tested versions instead: `uv pip sync requirements.lock`, then `uv pip install pytest` (`sync` removes anything not in the lock). Activate `.venv` as above and run the tests with `python -m pytest tests -q`.

> uv does **not** help on an AppLocker machine: `uv venv` hits the same blocked `.venv\Scripts\python.exe` (ADR 001), and `uv.exe` itself usually sits in a user-writable folder. Use the `py -3.13 -m pip install --user` path below there.

### Corporate Windows Environment (AppLocker Mitigation)

If the machine enforces Windows Defender / AppLocker policies that block executing binaries from `.venv\Scripts\python.exe`:

1. **Install dependencies in user profile scope using Python launcher:**
   ```cmd
   py -3.13 -m pip install --user -r requirements.txt pytest
   ```

2. **Run tools via Python module syntax:**
   ```cmd
   py -3.13 -m pytest tests -q
   py -3.13 -m uvicorn src.serving.app:app
   py -3.13 -m streamlit run Code/Sprint3/friction_gate_app.py
   ```
   The UI needs the API running. If localhost is blocked, set `FRICTION_GATE_MODE=inprocess` (no `uvicorn` needed; same API code path, ADR 006 follow-on).

---

## 5. Environment Variables Setup (`.env`)

For live Azure features, copy the example configuration to `.env`, then replace
the endpoint and supply valid deployment settings. Skip this step for the native
local stub demo. A placeholder endpoint still makes `azure_configured` true;
that health field does not prove a successful Azure request.

* **Windows Command Prompt:**
  ```cmd
  copy .env.example .env
  ```
* **PowerShell / Bash:**
  ```bash
  cp .env.example .env
  ```

Optionally populate `.env` with your Azure OpenAI credentials if using GenAI/RAG components:
```env
AZURE_OPENAI_ENDPOINT=https://your-resource.services.ai.azure.com/
AZURE_OPENAI_API_KEY=your_api_key_here
```

---

## 6. Verification & Tests

To verify that the setup is complete, run the Python suite (127 tests passed locally on 2026-09-24):

```bash
# Standard Python
python -m pytest tests -q

# Windows Launcher / AppLocker
py -3.13 -m pytest tests -q
```

### Optional: run the API in Docker

Needs Docker Desktop or Rancher Desktop, and a `.env` file (section 5). The image installs only `requirements.serving.txt`, which is pinned to the versions that exported `Models/ops/`.

```bash
docker compose up -d --build
curl http://127.0.0.1:8000/health
```

If an API is already running on the host at port 8000, set `API_PORT=8001` before `docker compose up` and use port 8001. The full smoke test is in [Docs/Sprint5/docker_smoke_checklist.md](Docs/Sprint5/docker_smoke_checklist.md).

### Optional: deploy the API to Azure Container Apps (`azd`)

Deployed and verified on 2026-09-24, then torn down ([ADR 016](Docs/Architecture/ADRs/016-azure-container-apps-via-azd.md)). You need `azd`, an Azure CLI login (`azd config set auth.useAzCliAuth true`) and Docker running. The image is built locally, because this subscription refuses ACR remote builds. The resources are billable while they exist.

```powershell
azd env new meridian-dev --location swedencentral
azd env set ALLOWED_IP_RANGE "<your-public-ip>/32"
azd env set API_ACCESS_KEY "<random string, 32+ characters>"
azd up
```

Every request to the cloud API needs the header `X-API-Key: <that key>`, including `/health`. To drive it from the local Streamlit UI, add these two lines to `.env` and restart Streamlit:

```
FRICTION_GATE_API_URL=<the Endpoint azd printed>
FRICTION_GATE_API_KEY=<the key>
```

Read the key back with `azd env get-value API_ACCESS_KEY`. Remove everything with `azd down --purge`.

---

## 7. Syncing & Pushing Future Changes

To pull updates or push new work:

```bash
# Pull latest changes
git pull origin main

# Stage and commit new changes
git add .
git commit -m "your concise commit description"

# Push to your own remote repository
git push origin main
```
