# Meridian Educational Web App

Interactive, **offline-first** teaching site for the Meridian Savings Churn project. Explains the business problem, temporal ML pipeline, Friction-Gate HITL architecture, AppLocker-safe RAG, and key ADRs.

Everything runs offline except one feature: **Explain-it answers are marked by Meridian's own FastAPI service** rather than by you ([ADR-EDU-003](docs/ADR-EDU-003-llm-marked-viva.md)). The SPA holds no API key and never calls a cloud LLM directly. With the API down the app still works — you get a self-check list that is clearly labelled as not counting toward the Mastery gate.

The build also reads architecture records from the parent `Docs/` directory; keep the repository layout intact. Educational ADRs and the fact sheet live under [`docs/`](docs/).

## Prerequisites

- Node.js 24

## Run locally

```bash
cd educational_web_app
npm ci
npm run dev
```

Open the URL Vite prints (default `http://localhost:3000`). Start at **Problem** and use **Next up** to move through each module. The **Explore** panels let you change a decision before reading the lesson; **Practice** checks recall and written explanation. Your progress stays in this browser, and **Progress** can export a backup.

For one PowerShell command that starts the teaching site, API, and Streamlit, run `./launch_all.ps1` from the repo root after `npm ci` and the Python setup in [CLONE_GUIDE.md](../CLONE_GUIDE.md). That launcher uses port 3005 for the teaching site. The standalone command above uses Vite's default port 3000.

### Marking for Explain-it (optional)

To have viva answers marked instead of self-checked, run the Meridian API from the repo root:

```bash
uv run python -m uvicorn src.serving.app:app
```

The SPA expects it at `http://127.0.0.1:8000`; override with `VITE_GRADER_API_URL` in `.env.local`. Marking
needs Azure OpenAI configured in the main repo's `.env` — without it the API answers honestly that it cannot
mark, and the SPA falls back to the self-check list. The API can also run in Docker (`docker compose up -d --build`
from the repo root); it listens on the same port.

The marker was checked against a small labelled set on 2026-09-24: 87.5% of 48 rubric-point labels matched
(80% required) with `gpt-5-mini`. Re-run it with `npm run viva:benchmark` when Azure is configured.

> **Do not run `npm` from the Meridian repo root.** The teaching SPA lives only in this folder. An abandoned Google AI Studio scaffold at the repo root was deleted (red-team RT-01); re-dropping root `package.json` / `src/App.tsx` would pollute the Python `src/` tree and teach wrong AUM / Approve→Send stories.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server on port 3000 |
| `npm run dev:portal` | Dev server on port 3005 for the portal and launcher |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build |
| `npm run lint` | Typecheck (`tsc --noEmit`) |
| `npm test` | Frontend regression tests (Vitest) |
| `npm run facts:check` | Re-export model facts from `Models/ops/` and fail if the SPA copy drifted |
| `npm run viva:benchmark` | Mark the labelled viva benchmark with the live Azure marker (`src/genai/viva_grader.py`, no API needed; skips without Azure) |

CI: `.github/workflows/educational-web-app.yml` runs lint, tests and build on pushes that touch this folder.

`public/guides/` holds generated copies of the Official report (with its images under `Sprint2/` and `Presentations/`) and the two AI-901 interview guides. Edit the sources in `Docs/`, then refresh the copies from the repo root:

```bash
uv run --with markdown --with beautifulsoup4 --with markdownify python scripts/export_document_pack.py --skip-export
```

Learning progress is saved in this browser. Open **Exploration · details** (or **Progress** on mobile) to see the separate exploration, prediction, recall, and marked explanation counts. The panel can export or import progress, preserve recoverable writing from older saves, and reset progress after confirmation. Editing an Explain-it answer requires a new API mark before it can count toward Mastery.

The [improvement plan](docs/improvement_plan_2026-09-23.md) tracks completed changes. [Technical validation (2026-10-20)](docs/validation_2026-10-20.md) records browser checks and local performance measurements. The [learner trial](docs/usability_trial_guide.md) remains open because participants are unavailable. Live viva revalidation currently fails with Azure HTTP 401; restore valid endpoint/key configuration before relying on live marking. The 87.5% result above is historical.

## What this is / is not

- **Is:** a static React SPA with client-side simulations grounded in [`docs/FACT_SHEET.md`](docs/FACT_SHEET.md)
- **Is not:** a replacement for Streamlit Friction-Gate or FastAPI scoring
- **Does not:** call Gemini, Azure OpenAI, or any remote LLM *directly*, and holds no API key (see [ADR-EDU-001](docs/ADR-EDU-001-static-teaching-spa.md) and [ADR-EDU-003](docs/ADR-EDU-003-llm-marked-viva.md))

## Try the real stack (main repo)

```bash
uv run python -m uvicorn src.serving.app:app
uv run python -m streamlit run Code/Sprint3/friction_gate_app.py
```
