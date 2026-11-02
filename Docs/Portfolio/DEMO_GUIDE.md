# Application guide

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
are separate. Docker and Azure deployment checks are historical; see the evidence record.

## Explore the review workflow

### Score a customer

In the Retention agent view, select **Below threshold (capacity gate)**. The
illustrative case scores about 0.207 and is not flagged. The API refuses a draft
request for this case.

Select **Flagged (create draft)** for the second case. It scores about 0.751 and
qualifies for a draft. These two cases illustrate application behavior; they do
not measure model accuracy.

### Review a draft

Create a draft for the flagged case, then open the Review queue. Its source
indicates whether it came from Azure, the local stub, or a fallback. The offered
rate is bounded at 3.5%.

A reviewer can inspect and edit a pending draft. Approval requires review
acknowledgement and records a decision. It does not send an email. Approved and
rejected drafts cannot be changed; use a new draft to try another decision.

### Inspect the decision record

The Audit trail records the decision. The Compliance viewer can inspect the
history but cannot change it. The role picker demonstrates permissions; it does
not authenticate a user's identity.

The Data scientist view provides the Prediction browser and per-customer
explanations. Without a cohort file, it contains the two illustrative fixtures.
TreeSHAP explains the model's score in log-odds rather than probability changes.

### Ask about the methodology

The report assistant can retrieve evidence about the threshold policy and other
project methods. Local mode returns report excerpts using BM25 search. Azure can
add dense retrieval, reranking, and answer generation. This question-answering
path is separate from draft generation.

## Direct API example

With the API running, use PowerShell from the repository root:

```powershell
$fixture = Get-Content Docs/Sprint4/fixtures/flagged_demo.json -Raw | ConvertFrom-Json
$body = @{ features = $fixture.features } | ConvertTo-Json -Depth 10
Invoke-RestMethod -Uri http://127.0.0.1:8000/score -Method Post -ContentType 'application/json' -Headers @{ 'X-Demo-Role' = 'retention_agent' } -Body $body
```

If `API_ACCESS_KEY` is configured, add the matching `X-API-Key` header. Keep API
keys out of source files and shared output.

## Limitations

- The model improves ranking over a heuristic; retained customers and revenue
  gains have not been measured.
- The fixed threshold does not guarantee future queue size. Recall is low at
  the chosen operating point.
- The stub demonstrates the workflow. It is not a live LLM result.
- Production identity, security review, monitoring, and fairness mitigation
  remain open. Cloud evidence is historical; there is no standing demo URL.

See [EVIDENCE.md](EVIDENCE.md) for dated checks and sources.
