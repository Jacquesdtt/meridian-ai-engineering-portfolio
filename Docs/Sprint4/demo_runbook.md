# Sprint 4 — Application smoke checks

**Purpose:** Check model scoring, draft review, and access controls.
**Ops lock:** run `3f575754ae9a42c5a21ea5e476c0af37` · `t≈0.70055` · `fallback_quantile_top5pct`  
**Fixtures:** [fixtures/below_threshold_demo.json](fixtures/below_threshold_demo.json) · [fixtures/flagged_demo.json](fixtures/flagged_demo.json)

---

## 0. Preconditions

From **repo root** in **cmd.exe** (folder that contains `README.md` and `Code\`):

```cmd
cd /d <path-to>\InnovatorProjectDF14
set PYTHONPATH=%CD%
py -3.13 -m pytest tests\serving -q
```

Expect: **36 passed** across `tests\serving` + `tests\genai` (HITL, rate cap, ZDR scrub, required `X-Demo-Role`, terminal immutability, attention_ack).

Optional: confirm portable artifacts exist — `Models\ops\booster.json`, `preprocessor.joblib`, `serving_meta.json`.

Optional: re-score fixtures against current `Models/ops/`:

```cmd
set PYTHONPATH=%CD%
py -3.13 -c "import json; from pathlib import Path; from src.serving.model import get_ops_model, score_raw_features; m=get_ops_model(); [print(p.name, score_raw_features(m, json.loads(p.read_text())['features'])) for p in Path('Docs/Sprint4/fixtures').glob('*_demo.json')]"
```

Expect: `below_threshold_demo.json` → flagged **False**; `flagged_demo.json` → flagged **True**.

---

## 1. Start FastAPI

```cmd
set PYTHONPATH=%CD%
py -3.13 -m uvicorn src.serving.app:app
```

Open `http://127.0.0.1:8000/health` (or `/docs`).

**Expected health response:**
* `status=ok`, `model_loaded=true`
* `run_id` starts with `3f575754…`
* threshold ≈ **0.701**, rule `fallback_quantile_top5pct`
* `azure_configured=false` is **expected** in the demo env (stub drafts still work)

Landing `GET /` returns JSON pointers to `/docs` and `/health` (not a blank 404).

---

## 2. Prove the capacity gate (below threshold)

**Streamlit (preferred for stakeholders):**

```cmd
set PYTHONPATH=%CD%
py -3.13 -m streamlit run Code\Sprint3\friction_gate_app.py
```

On **Score / create draft**, leave preset **Below threshold (capacity gate)** (loads `fixtures/below_threshold_demo.json`).

| Expect | Why |
|--------|-----|
| Score ≈ **0.21** | Below ops cut |
| **Not flagged** | Capacity dial working |
| **Create draft** → error / no draft | Gate refused GenAI side effect |


---

## 3. Flagged path (draft → human decision)

Switch preset to **Flagged (create draft)** (`fixtures/flagged_demo.json`).

| Expect | Why |
|--------|-----|
| Score ≈ **0.75** | Above `t≈0.701` |
| **flagged = True** | Enters contact policy |
| **Create draft if flagged** | Stub (or Azure) draft → `pending_review` |

Then:

1. Open **Review queue** → expand the new draft.
2. **Edit** (optional) — offered interest rate cannot exceed **3.5%** (Pydantic).
3. Tick **attention acknowledgement**, then **Approve** or **Reject** (Approve stays disabled until the checkbox is ticked — JR-REQ-19 anti rubber-stamp).

Approval records a decision. It does not send an email; there is no `/send` API.

### 3b. Glass-Box RBAC (Sprint 5)

Sidebar **Active role (demo RBAC)** — pedagogical, not SSO (ADR 007):

1. Stay as **Retention agent** for Approve/Edit (above).
2. Switch to **Compliance viewer** → Review queue is read-only; open **Audit trail** + **Glass-box** (ops `t≈0.701`, frozen SHAP). Approve buttons disabled.
3. Optional API proof: `PATCH /drafts/{id}` with header `X-Demo-Role: compliance_viewer` → **403**; `GET /audit/events` with same header → 200. Missing header on `/score` or `/drafts` → **400** (no silent agent elevation).


---

## 4. Compliance checks

| Check | Evidence |
|-------|----------|
| Drafts only | UI + API create draft objects, not mail |
| No `/send` | Absent from OpenAPI `/docs` |
| ZDR | Scrubber strips PII before LLM; stub path never needs Azure |
| Rate ≤ 3.5% | Create/PATCH validation |
| Re-score | Draft create goes through server score path |
| Demo RBAC | Required `X-Demo-Role`; compliance cannot Approve (403 + denied audit) |
| Draft reads / score gated | `GET /drafts*` + `POST /score` on same matrix |
| Decide once | Approved/rejected immutable |
| Audit | Atomic `audit_events` / **Audit trail** / `GET /audit/events` |

---

## 5. Tear-down

Stop uvicorn / Streamlit with Ctrl+C.  
Draft DB path (local): `Data/processed/draft_queue.db` — safe to delete between demos if you want a clean queue.

---

## 6. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `Access is denied` on python | AppLocker / `.venv` | Use `py -3.13 -m …` only |
| Import errors in Streamlit | `PYTHONPATH` | `set PYTHONPATH=%CD%` from repo root |
| Model not loaded | Missing `Models/ops/` | Re-export or restore committed artifacts |
| “Model broken” at p≈0.21 | Threshold misunderstood | Compare the score with the threshold in §2 |
| Flagged preset not flagged | Ops bundle drifted | Re-run fixture verify (§0); restore `Models/ops/` |
| Fixture file missing | Wrong cwd / incomplete clone | Confirm `Docs\Sprint4\fixtures\` exists |
| Azure errors | No `.env` | Expected — stub / stub_fallback |

---

## 7. Commands cheat sheet

```cmd
set PYTHONPATH=%CD%
py -3.13 -m pytest tests\serving -q
py -3.13 -m uvicorn src.serving.app:app
py -3.13 -m streamlit run Code\Sprint3\friction_gate_app.py
py -3.13 Code\Sprint3\export_ops_model.py
```
