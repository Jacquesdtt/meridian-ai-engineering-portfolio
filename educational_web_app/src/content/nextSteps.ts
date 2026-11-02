/**
 * Future work only — nothing here is built. Sourced from
 * Docs/Engineering/Corrections_and_Future_Work.md (Part B11, Part C).
 */
export interface NextStep {
  id: string;
  ref: string;
  area: 'MLOps' | 'Model' | 'Responsible AI' | 'Platform' | 'GenAI';
  title: string;
  what: string;
  why: string;
  blocker: string;
  doc: string;
}

export const NEXT_STEPS: NextStep[] = [
  {
    id: 'f1',
    ref: 'F1 / B1',
    area: 'MLOps',
    title: 'Constrained model selection + Model Registry',
    what: 'Compare several candidate models in nested MLflow runs, apply agreed gates, keep the Pareto frontier, test the winner once, register it as “challenger”, promote to “champion” after human review.',
    why: 'Today there is one recipe and nothing registered. The brief’s [MLOps] module asks for a versioned registry entry with a promotion stage.',
    blocker: 'mlflow.db and mlartifacts/ are not on this machine (restore or re-run the notebooks first); needs F2, F3, F5, F6 for the gates.',
    doc: 'Docs/Architecture/MLflow_Model_Selection_Roadmap.md',
  },
  {
    id: 'f2',
    ref: 'F2',
    area: 'Model',
    title: 'Probability calibration',
    what: 'Fit isotonic (or Platt) calibration on an early validation window so 0.7 means ~70%.',
    why: 'Enables Morgan’s High / Medium / Low buckets and expected-value maths. Isotonic is monotonic, so the top-5% queue and PR-AUC do not change.',
    blocker: 'Needs the training data and a re-run.',
    doc: 'Docs/Engineering/Corrections_and_Future_Work.md',
  },
  {
    id: 'f3',
    ref: 'F3',
    area: 'Responsible AI',
    title: 'Fairness limits as a release gate',
    what: 'Agree numeric EOD limits with Jamie, amend ADR 012 Decision 1, and block releases that exceed them. First investigate why 65+ is flagged ~14.6% vs ~4.6–4.9%.',
    why: 'Age EOD 0.156 already exceeds the notebook’s own 0.10 flag.',
    blocker: 'Needs Risk sign-off on limits.',
    doc: 'Docs/Architecture/ADRs/012-fairness-and-compliance-guardrails.md',
  },
  {
    id: 'f4',
    ref: 'F4 / B3',
    area: 'MLOps',
    title: 'Log the full serving pipeline to MLflow',
    what: 'Wrap preprocessor + booster (+ calibrator) as one mlflow.pyfunc model with an input signature.',
    why: 'Only the booster is logged; export_ops_model.py re-fits the encoder, so an MLflow run alone cannot rebuild what /score serves.',
    blocker: 'Next training run.',
    doc: 'Docs/Engineering/Technical_Debt_and_Limitations.md',
  },
  {
    id: 'f5',
    ref: 'F5',
    area: 'Model',
    title: 'Business-value metric',
    what: 'Get save rate and cost per contact from Morgan, log them as params, compute expected AUM saved per threshold with a sensitivity analysis.',
    why: 'Business value currently enters only as a capacity cap (top 5%).',
    blocker: 'Needs Morgan’s assumptions.',
    doc: 'Docs/Engineering/Corrections_and_Future_Work.md',
  },
  {
    id: 'f6',
    ref: 'F6',
    area: 'Platform',
    title: 'Operational metrics',
    what: 'Measure /score and /drafts p50/p95 latency and turn token telemetry into cost per approved draft.',
    why: 'Latency and cost are selection objectives in the roadmap; none are measured today.',
    blocker: 'Needs a running API with Azure live.',
    doc: 'Docs/Engineering/Corrections_and_Future_Work.md',
  },
  {
    id: 'f8',
    ref: 'F8 / ADR 008',
    area: 'Platform',
    title: 'API-only database credentials + Postgres',
    what: 'Only the API service holds write credentials; move drafts to Postgres so more than one replica is safe.',
    why: 'The UI already goes through FastAPI, but the SQLite file is shared on one host, so the guarantee is in code, not the network.',
    blocker: 'Needs Postgres and a separate service identity.',
    doc: 'Docs/Architecture/ADRs/008-split-brain-state.md',
  },
  {
    id: 'f7-entra',
    ref: 'F7',
    area: 'Platform',
    title: 'Entra ID / SSO instead of demo roles',
    what: 'Replace the X-Demo-Role header with real identity tokens; add immutable staff IDs and prompt/payload hashing to the audit log.',
    why: 'Today anyone can send any role header.',
    blocker: 'Corporate identity setup.',
    doc: 'Docs/Architecture/ADRs/007-demo-glass-box-rbac.md',
  },
  {
    id: 'ci',
    ref: '—',
    area: 'Platform',
    title: 'CI for the model and API',
    what: 'Extend CI beyond the teaching app: run python -m pytest tests -q and npm run facts:check on every push, and build the Docker image so a packaging break fails the push.',
    why: 'Only the teaching app has a workflow (.github/workflows/educational-web-app.yml). The Python tests (127 on 2026-09-24) are run by hand, and the first Docker smoke run found three high-severity bugs that nothing automated would have caught. Not yet listed in the Corrections register.',
    blocker: 'None known — needs a second workflow, plus a check of which tests need files that are not committed.',
    doc: '.github/workflows/educational-web-app.yml',
  },
  {
    id: 'ws2',
    ref: 'B11 · WS-2',
    area: 'Platform',
    title: 'Azure Container Apps deployment',
    what: 'Keep a standing deploy: azd up (azure.yaml + infra/main.bicep, local build, one replica, IP allow-list + X-API-Key).',
    why: 'Deployed and verified live on 2026-09-24 (Azure drafts, hybrid RAG, RBAC), then torn down to stop charges. The API-key gate was added afterwards and has not run on Azure yet.',
    blocker: 'Cost: an always-on replica, a registry and Log Analytics are billable while up.',
    doc: 'infra/main.bicep',
  },
  {
    id: 'rag6',
    ref: 'F7 · Phase 6',
    area: 'GenAI',
    title: 'Production RAG',
    what: 'A purpose-built cross-encoder reranker, query rewriting, a labelled retrieval set with groundedness scoring, and more than one source document.',
    why: 'Hybrid BM25 + embeddings with RRF and an LLM rerank shipped in ADR 015, but the rerank is not benchmarked and retrieval quality is not measured.',
    blocker: 'Scope, not tooling.',
    doc: 'Docs/Architecture/Phase6_Production_RAG_Roadmap.md',
  },
  {
    id: 'prompty-params',
    ref: '—',
    area: 'GenAI',
    title: 'Make the .prompty settings the ones actually sent',
    what: 'Read token limits and sampling settings from the .prompty file per model, or remove the ones the code never sends.',
    why: 'The template declares temperature 0.2 and max_tokens 800, but the drafter never sends the temperature, and gpt-5-mini gets max_completion_tokens 3000 from chat_limit_params() instead.',
    blocker: 'None technical.',
    doc: 'src/genai/prompts/retention_draft.prompty',
  },
  {
    id: 'drift',
    ref: 'F7',
    area: 'MLOps',
    title: 'Scheduled drift monitoring',
    what: 'Run the Evidently train-vs-live comparison on a schedule and alert on drift.',
    why: 'A one-off train-vs-test report exists; nothing monitors live data.',
    blocker: 'Needs live scoring data.',
    doc: 'Docs/Sprint2/reports/evidently_train_test_drift.html',
  },
];
