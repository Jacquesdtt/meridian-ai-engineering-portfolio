# Employer demo guide

Use the committed illustrative fixtures. They are not an evaluation set.
No training data or Azure account is required for the local path.

## Setup

**Project tour:** requires Node.js 24 and npm. From the repository root:

```bash
cd educational_web_app
npm ci
npm run dev
```

Open the printed URL, normally `http://localhost:3000`. Review Architecture,
ML, Friction, and RAG. Simulations illustrate behavior; they are not new model
results. Marked Explain-it answers need the API and valid Azure configuration.
Offline self-check does not grant marked mastery.

**Scoring and review:** follow [CLONE_GUIDE.md](../../CLONE_GUIDE.md) for Python
3.13 setup. For a fresh local-only demo, leave Azure settings absent. Do not
copy the placeholder endpoint from `.env.example`: an endpoint value makes the
application treat Azure as configured. Do not overwrite an existing `.env`.

Use the configured Python in separate terminals at the repository root:

```bash
python -m uvicorn src.serving.app:app --host 127.0.0.1 --port 8000
```

```bash
python -m streamlit run Code/Sprint3/friction_gate_app.py --server.address 127.0.0.1
```

Open `http://127.0.0.1:8501`. Check `http://127.0.0.1:8000/health` first:
`model_loaded` should be true and the threshold about 0.70055. The run ID starts
with `3f575754`. With Azure unset, drafts use the stub.

On restricted Windows machines, use the interpreter route in the setup guide.
The API and UI need the same Python environment. The existing
`FRICTION_GATE_MODE=inprocess` option drives the same API from Streamlit if
local sockets are blocked; a separate API server is then unnecessary.

**Optional API container:** Compose requires an `.env` file. For a fresh local
demo, create an empty file named `.env` at the repository root. Leave any
existing configuration intact. Run `docker compose up -d --build` and open
`http://127.0.0.1:8000/docs`. Docker starts only the API. Streamlit and the tour
are separate. This pass does not claim a fresh Docker or Azure deployment check.

## Five-minute walkthrough

| Time | Action | Expected result and explanation |
|---|---|---|
| 0:00–0:45 | Explain the problem and open API health | Rank next-month churn for a team with limited review capacity. Show model and threshold provenance. |
| 0:45–1:30 | As Retention agent, score **Below threshold (capacity gate)** | Score about 0.207; not flagged. A draft request is refused by the API. |
| 1:30–2:30 | Select **Flagged (create draft)** and create a draft | Score about 0.751; flagged. Draft enters `pending_review`. Identify its source: stub, Azure, or fallback. |
| 2:30–3:30 | Open Review queue; inspect/edit, acknowledge review, and approve | Rate is bounded at 3.5%. Approval requires acknowledgement and records a decision. It does not send email. |
| 3:30–4:15 | Open Audit trail; switch to Compliance viewer | Decision history is visible. Compliance cannot change a decision. Roles demonstrate permissions, not identity. |
| 4:15–5:00 | As Data scientist, inspect Prediction browser and an explanation | Two fixtures appear without a cohort file. TreeSHAP explains the served model in log-odds. State the precision/recall limits. |

Create a new draft for each decision demonstration. Approved and rejected drafts
are immutable. Do not delete the queue to reset a demo.

Optional Q&A: ask which threshold policy was used. Offline mode retrieves report
excerpts using BM25. Azure can add dense retrieval, reranking, and answer
generation. Report Q&A is separate from draft generation.

## Direct API example

With the API running, use PowerShell from the repository root:

```powershell
$fixture = Get-Content Docs/Sprint4/fixtures/flagged_demo.json -Raw | ConvertFrom-Json
$body = @{ features = $fixture.features } | ConvertTo-Json -Depth 10
Invoke-RestMethod -Uri http://127.0.0.1:8000/score -Method Post -ContentType 'application/json' -Headers @{ 'X-Demo-Role' = 'retention_agent' } -Body $body
```

If `API_ACCESS_KEY` is configured, add the matching `X-API-Key` header. Keep real
keys out of recordings and portfolio files.

## Explain the limits

- The model improves ranking over a heuristic; retained customers and revenue
  gains have not been measured.
- The fixed threshold does not guarantee future queue size. Recall is low at
  the chosen operating point.
- The stub demonstrates the workflow. It is not a live LLM result.
- Production identity, security review, monitoring, and fairness mitigation
  remain open. Cloud evidence is historical; there is no standing demo URL.

See [EVIDENCE.md](EVIDENCE.md) for dated checks and sources.
