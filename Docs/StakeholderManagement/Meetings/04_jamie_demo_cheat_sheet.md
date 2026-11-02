# Jamie (Arvind) — Live Demo Cheat Sheet

**Use this file during the call / rehearsal.**  
**Post-meeting status:** Jamie met 2026-07-16 — requirements in register; outstanding questions → [08_jamie_followup_message.md](08_jamie_followup_message.md)  
**Jamie requirements (SoT):** [jamie_requirements_register.md](../../Sprint5/jamie_requirements_register.md)  
**Stakeholder hub:** [../README.md](../README.md)  
**Deeper prep:** [04_jamie_sprint5_risk_prep.md](04_jamie_sprint5_risk_prep.md) · Runbook: [demo_runbook.md](../../Sprint4/demo_runbook.md) §§2–4  
**Feature / build tour:** [04_jamie_dashboard_feature_tour.md](04_jamie_dashboard_feature_tour.md) (also in UI → **Glass-box** expander)  
**Roleplay:** Arvind ↔ Jamie (Risk & Compliance)

---

## 0. Before you join (2 terminals, cmd)

```cmd
cd /d C:\Users\JacquesduToit\InnovatorProjectDF14
set PYTHONPATH=%CD%
py -3.13 -m uvicorn src.serving.app:app
```

```cmd
cd /d C:\Users\JacquesduToit\InnovatorProjectDF14
set PYTHONPATH=%CD%
py -3.13 -m streamlit run Code\Sprint3\friction_gate_app.py
```

- **Screenshare:** Streamlit (usually http://localhost:8501)
- Optional: http://127.0.0.1:8000/health — `azure_configured=false` is **expected**
- Evidence pack (if asked): `py -3.13 -m pytest tests\serving tests\genai -q` → **36 passed**

---

## 1. Open (15 sec — while on Review queue)

> “This is Meridian Friction-Gate — the human review surface. **Approve means ready for a person to send outside this app — Meridian AI never sends email.** Sidebar roles are demo Glass-Box RBAC, not SSO.”

Point at green sidebar box:

> “Pinned ops model — run `3f575754…`, threshold about **0.70**, top‑5% capacity cut. Same freeze we used for fairness.”

---

## 2. Demo script (~5–7 min)

| # | Click | Say |
|---|--------|-----|
| 1 | Stay on **Review queue** (empty OK) | “Queue filtered to `pending_review`. Role = Retention agent — I can Approve/Edit/Reject. Compliance cannot.” |
| 2 | Tab **Score / create draft** → preset **Below threshold** → Score | “Score ~**0.21** — below cut. **Not flagged. No draft.** Capacity discipline, not a broken model.” |
| 3 | Preset **Flagged** → Score → **Create draft if flagged** | “Above ~**0.70** → draft enters **pending_review**. Stub source is fine — same gates without live Azure.” |
| 4 | **Review queue** → expand → optional Edit rate >3.5% | “Hard fail — Pydantic rate cap at **3.5%**.” |
| 5 | Tick **attention check** → **Approve** | “HITL isn’t a rubber stamp — must affirm review. **Approve ≠ Sent.** No `/send`.” |
| 6 | Sidebar → **Compliance viewer** | “Approve/Edit disabled. Risk can inspect without mutating.” |
| 7 | Tab **Audit trail** | “Create, edit, approve, reject, and **denied** attempts are logged.” |
| 8 | Tab **Glass-box** (+ expander *How this dashboard was built*) | “Why the contact is queued — ops threshold + frozen SHAP. Open the expander if he wants build steps / Risk considerations.” |

**Mandatory line (step 5):** *Approved = ready for a human to send outside this system — Approved is not Sent.*

---

## 3. Fairness one-liner (ops cut only) — Jamie’s core ask

**Must say in final deck/report:** how we **prevent discrimination** (not only HITL). Full crib: [Docs/Sprint5/fairness_anti_discrimination_narrative.md](../../Sprint5/fairness_anti_discrimination_narrative.md).

> “We measure Equalized Odds at the **same ops cut we serve**, filter groups under **n=500** so we don’t invent geographic bias, limit contact to the top **5%**, keep humans in the loop (AI never sends), and **disclose** residual gaps — age ~**0.16**, state ~**0.32**.”

| Slice | Equalized Odds | Source |
|-------|----------------|--------|
| Age (6 bands) | **≈0.16** (0.156) | `Docs/Sprint2/reports/fairlearn_equalized_odds.json` |
| State | **≈0.32** (0.318) | Same; small‑n states filtered (`n≥500`) |

Threshold: **≈0.701** (`fallback_quantile_top5pct`). Do **not** quote age ≈0.05 or state EOD ≈1.0.

> Follow-up: “Do you want a hard **release gate** on max EOD, or periodic review only?”

---

## 4. If he challenges you

| Challenge | Answer |
|-----------|--------|
| Where’s Azure / Foundry? | “`azure_configured=false` expected. Stub proves the control plane; live LLM is credential‑gated, not a missing Risk control.” |
| Can Compliance Approve? | “No — demo RBAC blocks it; API returns 403 + **denied** audit. Not Entra yet (ADR 007).” |
| Does Approve send email? | “No. No `/send`. Approve ≠ Sent (ADR 003).” |
| Is ZDR perfect NER? | “Pattern scrub + blocked keys + SHAP names only — we do **not** claim perfect name detection.” |
| Production ready? | “Prototype: SQLite local, pedagogical RBAC. Asking you what audit fields / IdP timeline you need next.” |
| Why empty queue at start? | “Fresh session — we’ll create a draft live so you see pending → decide‑once.” |

---

## 5. Ask Jamie (capture answers)

1. Is **Approve ≠ Sent / no `/send`** enough HITL, or do you need a second outbound‑mailer approval?
2. Comfortable with scrubber limits (no perfect NER claim)?
3. Confirm **3.5%** still the bank‑approved ceiling?
4. Pedagogical `X-Demo-Role` OK for demos, **Entra deferred**?
5. Extra **audit fields** for prod (immutable actor id, prompt hash, retention period)?
6. Fairness: **release gate** (max EOD) or **periodic review** only?

---

## 6. Numbers crib (do not freestyle)

- Ops threshold **≈0.701** · run **`3f575754…`**
- Below demo score **≈0.21** · Flagged demo **≈0.75**
- Rate cap **≤ 3.5%**
- Historical AUM at risk context **≈$7.3M** (PRD) — serving does not invent new AUM
- Tests: **47 passed** (`tests/serving` + `tests/genai`)

---

## 7. After the call

Fill decisions in [04_jamie_sprint5_risk_prep.md](04_jamie_sprint5_risk_prep.md) §§6–8 (notes / decisions / actions).

**Frozen — do not promise changes without policy:** ops `t≈0.701`, no `/send`, Approve ≠ Sent, ADR 004 churn label.

---

## 8. Doc pointers (only if he wants depth)

| Topic | Doc |
|-------|-----|
| HITL / no send | ADR 003 |
| Pydantic I/O / rate | ADR 002 |
| Demo RBAC | ADR 007 |
| SQLite / no split-brain / `maxReplicas: 1` | ADR 008 |
| Methodology RAG (no Chroma; grounded answers) | ADR 010 |
| Azure 429 retries + token logs | ADR 013 |
| Full prep + agenda | This folder → `04_jamie_sprint5_risk_prep.md` |
| Phrase sheet | `Docs/Sprint3/ai_bp_learnings.md` §2 |

### Architecture one-liners (if challenged)
*   **“Why not Chroma?”** — AppLocker blocks native vector DBs. Azure embeds; we rank in pure Python; answers grounded in `Final_Report_Official.md` (ADR 010).
*   **“Is the bot stuffing the whole report into the prompt?”** — No. Chunks split on every markdown header then capped ≤1200 chars; UI shows `top_k=3` retrieved pieces. Cosine rank only — cross-encoder rerank is Phase 6.
*   **“What if Azure rate-limits?”** — Tenacity backoff on draft + RAG; drafts still stub-fallback; never auto-send (ADR 013 + 003).
*   **“Will two containers diverge?”** — One SQLite volume, **`maxReplicas: 1`**, WAL + busy timeout. We refuse to pretend file-SQLite is multi-node HA (ADR 008).
