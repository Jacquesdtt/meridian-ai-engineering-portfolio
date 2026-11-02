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

### One case: from score to recorded decision

This example uses [flagged_demo.json](../Sprint4/fixtures/flagged_demo.json),
an illustrative feature record. It has no observed next-month outcome and is
not an accuracy test. In the evaluation, one record means one customer in one
observation month; the same customer can occur in several months. See
[what one prediction means](CASE_STUDY.md#what-one-prediction-means).

Use the local setup above with Azure settings absent and space in the pending
queue. Select the **Retention agent** role. The role picker demonstrates
permissions; it does not authenticate identity.

| Step | Action | Expected result |
|---|---|---|
| 1. Score | Open **Score / create draft**, select **Flagged (create draft)** and press **Score**. | About 0.750928 (displayed as 0.7509), above the 0.700548 cut. This is a ranking score, not a 75.1% probability. |
| 2. Draft | Press **Create draft if flagged**. | The API scores it again before admitting it. A pending draft appears with source `stub`: local template text, not a live LLM response. The rate is at most 3.5%. |
| 3. Review | Open **Review queue**, read the draft and save any edits. Select the review acknowledgement and approve. | Status becomes `approved`. Without acknowledgement, approval is refused. Approved drafts cannot be edited or decided again. |
| 4. Inspect | Open **Audit trail** and find the draft's creation and approval entries. | The stored history records the decision. No email is sent. Contact remains outside the application; no customer response or retention gain is demonstrated. |

These are expected results from the committed implementation and the dated
[fixture workflow check](EVIDENCE.md#initial-validation-2-november-2026).
They are separate from the historical monthly model evaluation. With Azure
configured, inspect the source field: Azure output and a fallback are different
from the offline path above.

### Check the rejection path

In the Retention agent view, select **Below threshold (capacity gate)**. The
illustrative case scores about 0.207 and is not flagged. The API refuses a draft
request for this case.

### Inspect other views

The Compliance viewer can inspect the audit history but cannot change it.

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
