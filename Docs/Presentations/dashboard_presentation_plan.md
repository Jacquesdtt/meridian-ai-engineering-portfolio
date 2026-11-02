# Friction-Gate UI: Live Demo Presentation Plan

**Purpose:** Step-by-step script for the live Streamlit / FastAPI Friction-Gate demo that accompanies the Meridian handover deck.  
**Deck SoT:** [`presentation.md`](presentation.md) outline + Kubrick pipeline [`generate_presentation.py`](generate_presentation.py) → `Meridian_Presentation_PresenterView.pptx` / `Meridian_Presentation_Standalone.pptx`.  
**Related (do not treat as primary dashboard plan):** Jamie call crib [`../StakeholderManagement/Meetings/04_jamie_demo_cheat_sheet.md`](../StakeholderManagement/Meetings/04_jamie_demo_cheat_sheet.md) · feature tour [`../StakeholderManagement/Meetings/04_jamie_dashboard_feature_tour.md`](../StakeholderManagement/Meetings/04_jamie_dashboard_feature_tour.md) · Sprint 4 commands [`../Sprint4/demo_runbook.md`](../Sprint4/demo_runbook.md).

---

## 0. Pre-Presentation Setup

Open two command prompts in the repo root (`InnovatorProjectDF14`) so you are not waiting on cold starts:

**Terminal 1 (Backend):**
```cmd
set PYTHONPATH=%CD%
py -3.13 -m uvicorn src.serving.app:app
```

**Terminal 2 (Frontend):**
```cmd
set PYTHONPATH=%CD%
py -3.13 -m streamlit run Code\Sprint3\friction_gate_app.py
```

- Streamlit: usually `http://localhost:8501`
- Optional health: `http://127.0.0.1:8000/health`
- Demo presets use **Sprint 4 fixture JSON** (synthetic customers) — no live PII
- Drafts may run in **stub** mode when Azure is not configured (`azure_configured=false` is expected)

---

## Guardrail crib (say once early, reinforce in Acts 3–5)

| Guardrail | One-liner |
|-----------|-----------|
| **ZDR** | No raw PII to LLMs — scrub before Azure |
| **Pydantic ≤ 3.5%** | Offered rate hard-fails above 3.5% |
| **Pending Review** | Drafts never auto-dispatch |
| **Approve ≠ Sent / no `/send`** | Approve = ready for a human outside this app |
| **`attention_ack`** | Checkbox required before Approve unlocks |
| **`seconds_open` ~8s** | Soft-warn + audit if decision is too fast (no hard block) |
| **Glass-Box RBAC** | Demo roles: DS / Compliance can inspect, cannot Approve |
| **SHAP / Fairlearn** | Behaviour-led drivers; EOD at ops cut `t≈0.701` |
| **Top-5% `t≈0.701`** | Capacity dial — **raised** from max-F1 `0.475` to cut FPs (~12×), not lowered to flood the queue |

**Prompt / demo hygiene:** Versioned `.prompty` assets (e.g. `retention_draft.prompty`) + fixture presets — replayable demos without real customers.

**RAG (Methodology Q&A):** We did **not** ship ChromaDB / a local vector DB. Retrieval is **in-memory pure-Python** (keyword / TF-IDF offline; Azure embeddings + cosine when live) for **portability and zero native vector-DB footprint**. Production roadmap → **Azure AI Search hybrid** (keyword + vector) + rerank — Phase 6, not inventing infra we have not deployed.

---

## Act 1: Health Check

**Goal:** Prove the serve path is up and the ops cut is frozen.

1. Open `http://127.0.0.1:8000/health`.
2. Point at JSON: model loaded, ops threshold **`≈0.701`**, run id, `azure_configured`.
3. **Talk track:**
   > “Before the UI — FastAPI is serving the pinned ops artifact. Threshold is locked at about **0.701** (top ~5% capacity cut). We **raised** that cut from max-F1 **0.475** so Morgan’s queue shrinks false positives — we did **not** lower it to chase more flags. Stub / no Azure is fine for the control-plane demo.”

---

## Act 2: Capacity Gate (Below Threshold)

**Goal:** Morgan — the model will not flood Ops with below-cut scores.

1. Streamlit → **Score / create draft**.
2. Preset **Below threshold (capacity gate)** → **Score**.
3. Result: score **~0.21**, **not flagged**; Create Draft refuses / no draft path.
4. **Talk track:**
   > “Score about 0.21 — below the top-5% dial. No draft. Capacity discipline, not a broken model.”

---

## Act 3: Friction-Gate Workflow (Flagged → Review)

**Goal:** Jamie / Morgan — HITL, bounded GenAI, Approve is not send.

1. Preset **Flagged (create draft)** → **Score** (~**0.75**, Flagged).
2. **Create draft** → open **Review queue**.
3. Show **Approve** disabled until **Attention Acknowledgement** (`attention_ack`).
4. Optional: **Edit** → try rate **> 3.5%** → Pydantic hard-fail.
5. Optional: note **`seconds_open`** soft-warn if you Approve too fast (~8s).
6. **Approve** (or show Edit / Reject).
7. **Mandatory line:**
   > “**Approved is not sent.** There is no `/send` route. Approve means ready for a human to send outside this system.”

**Talk track (friction):**
> “Pending Review locks the draft. Attention ack stops rubber-stamping. Pydantic caps the offer at 3.5%. Prompts are versioned `.prompty` files; this walkthrough uses dummy fixture customers.”

---

## Act 4: Role Flips (Glass-Box RBAC)

**Goal:** Sam + Jamie — pedagogical RBAC is enforced, not decorative.

1. Sidebar → **Data scientist** (or equivalent DS role): Review queue visible; **Save / Approve / Reject disabled** (read-only banner).
2. Sidebar → **Compliance viewer**: oversight on Business / queue; **still cannot Approve**.
3. **Talk track:**
   > “Glass-Box demo RBAC — Compliance and DS can inspect the $7.3M-risk surface and audit evidence; only Retention agents get the live Approve path. Not production SSO yet.”

---

## Act 5: Glass-Box / Audit (as relevant)

**Goal:** Jamie — evidence that decisions are explainable and logged.

1. Tab **Glass-box** — ops cutoff pinned, frozen SHAP drivers, Approve ≠ Sent callout.
2. Tab **Audit trail** — create / edit / approve / reject / **denied** attempts; Approves can show `attention_ack`, high-stakes, `seconds_open`.
3. **Talk track:**
   > “Every decision is auditable. Fairlearn Equalized Odds was measured at the **same** ops cut we serve — not a vanity threshold.”

---

## Act 6: Methodology RAG Chatbot (DEMO Q)

**Goal:** Grounded Q&A on `Final_Report_Official.md` — not free LLM recall.

1. Open the **Methodology / RAG Q&A** surface in Streamlit.
2. Ask the DEMO Q below; show retrieved chunks when the UI exposes them.
3. If challenged on stack: “No ChromaDB — portable in-memory pure-Python retrieval; production path is Azure AI Search hybrid.”

### DEMO Q (use this)

> **“Why is the ops contact threshold about 0.701 instead of the max-F1 cut at 0.475 — and did we lower the threshold to catch more false positives?”**

**Expected answer direction (bot or you):** Ops cut was **raised** to top ~5% (`t≈0.701`) to **cut false positives** (~12× vs max-F1), not lowered to flood the queue. Ranking metrics stay the same; the decision policy changed.

**Alternate DEMO Q (HITL):** “Does clicking Approve send the retention email?” → **No** — Approve ≠ Sent; no `/send`.

---

## End-to-end click path (one glance)

1. `GET /health` → run id + **`t≈0.701`** + `azure_configured`
2. Below-threshold (~0.21) → **no draft**
3. Flagged (~0.75) → create draft → Approve / Edit / Reject
4. Say: **“Approved is not sent.”**
5. Role flips: **DS readonly** → **Compliance view**
6. Glass-box / audit as needed
7. RAG chatbot → **DEMO Q** above

---

## Numbers not to freestyle

| Item | Value |
|------|--------|
| Ops threshold | **≈0.701** (raised from max-F1 **0.475**) |
| Below-threshold demo score | ≈0.21 |
| Flagged demo score | ≈0.75 |
| Rate cap | ≤ **3.5%** |
| AUM context | ~**$7.3M** historical at risk (PRD) |
| Soft-warn | `seconds_open` ~**8s** |
