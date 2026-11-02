import GEN from './generated/model_facts.json';

/**
 * Locked Meridian teaching facts — keep in sync with docs/FACT_SHEET.md.
 * UI modules must import from here instead of inventing metrics.
 */

export const AUM_AT_RISK = {
  exact: 7_270_000,
  display: '~$7.3M',
  displayExact: '$7.27M',
  note: 'Historical baseline: prior-3-month max Running_Balance at first left-looking exit (Sprint 1 / PRD).',
} as const;

/**
 * Numbers below come from `generated/model_facts.json`, written by
 * `scripts/export_teaching_data.py` from Models/ops/serving_meta.json and
 * Docs/Sprint2/reports/sprint2_run_summary_v2.json. `npm run facts:check` fails on drift.
 */
const T = GEN.test;

export const MODEL = {
  name: 'XGBoost',
  objective: 'binary:logistic',
  version: '1.1.0-sprint3-serving',
  runId: GEN.runId,
  firstRunId: GEN.firstRunId,
  featureCount: GEN.featureCount,
  /** Dirty-string OHE columns prefixed state_ (incl. CALIFORNIA/California, MASS, NY, TX, UNK, -999, …). */
  stateOheCount: GEN.stateOheCount,
  /** Non-state numeric / engineered inputs in the serving contract. */
  numericFeatureCount: GEN.numericFeatureCount,
  baseRate: 0.1176,
  prAuc: { model: T.model.pr_auc, heuristic: T.heuristic.pr_auc },
  rocAuc: { model: T.model.roc_auc, heuristic: T.heuristic.roc_auc },
  opsThreshold: GEN.threshold.ops,
  opsThresholdPrecise: GEN.threshold.opsPrecise,
  thresholdRule: GEN.threshold.rule,
  maxF1Threshold: GEN.threshold.maxF1,
  opsPrecision: T.opsRule.precision,
  opsRecall: T.opsRule.recall,
  opsAccuracy: T.model.accuracy,
  heuristicAccuracy: T.heuristic.accuracy,
  opsFalsePositives: T.opsRule.fp,
  maxF1Precision: T.maxF1Rule.precision,
  maxF1Recall: T.maxF1Rule.recall,
  maxF1FalsePositives: T.maxF1Rule.fp,
  /** ML_Learnings.md §2.4a — even the top 1% of validation scores is only ~24% precise. */
  top1PctPrecision: 0.24,
  /** The validation-only target that turned out to be unreachable. */
  precisionFloorTarget: 0.4,
  scoreMeaning: 'Ranks (scale_pos_weight), not calibrated probabilities',
  /** Global mean |SHAP| frozen into serving_meta.json — what drafts and the glass-box show. */
  topShap: GEN.topShap as Record<string, number>,
  /** Model Card Equalized Odds difference magnitudes (disclose, do not round away). */
  eodAge: GEN.fairness.eodAge,
  eodState: GEN.fairness.eodState,
} as const;

/** Validation precision/recall by contact slice — Docs/Sprint2/ML_Learnings.md §2.4a (never tuned on test). */
export const VAL_SLICES = [
  { slice: 'Top 50%', share: 0.5, precision: 0.21, recall: 0.84 },
  { slice: 'Top 10%', share: 0.1, precision: 0.23, recall: 0.18 },
  { slice: 'Top 5% (shipped)', share: 0.05, precision: 0.23, recall: 0.09 },
  { slice: 'Top 1%', share: 0.01, precision: 0.24, recall: 0.02 },
] as const;

export const FAIRNESS = {
  ...GEN.fairness,
  /** Selection rate at the ops cut by age band — Corrections_and_Future_Work.md F3. */
  ageSelectionRates: [
    { band: '65+', rate: 0.146 },
    { band: '56–65', rate: 0.083 },
    { band: 'Other bands', rate: 0.048, note: '≈4.6–4.9%' },
  ],
  notebookFlag: 0.1,
} as const;

/** Learner-facing ops-cut formatter — modules must not hardcode 0.701 literals. */
export function formatOpsThreshold(style: 'approx' | 'precise' | 'p-gate' = 'approx'): string {
  if (style === 'precise') return `t ≈ ${MODEL.opsThresholdPrecise}`;
  if (style === 'p-gate') return `p ≥ ${MODEL.opsThreshold}`;
  return `t≈${MODEL.opsThreshold}`;
}

export const TEMPORAL_SPLIT = {
  fit: '2007-03 → 2016-08',
  val: '2016-09 → 2017-08',
  test: '2017-09 → 2020-04',
} as const;

export const CHURN_DEFINITION = {
  observationRule: 'Months_Since_Creation ≥ 2 at observation month t',
  label:
    'Is_Churned = 1 iff month t+1 has Running_Balance_Rounded == 0 AND Monthly_Active_Txn_Count == 0',
  notChurn: 'High-balance dormant accounts are NOT churn (AUM still held).',
} as const;

export const PERSONAS = [
  {
    id: 'jamie',
    name: 'Jamie',
    roleplay: 'Arvind',
    role: 'Risk & Compliance',
    alignment: 'HITL controls, ZDR, rate caps, Glass-Box audit, fairness disclosure.',
    concern:
      'Will GenAI ever auto-send? Can compliance view drafts without approving? Are we disclosing residual fairness gaps?',
    color: 'amber',
  },
  {
    id: 'morgan',
    name: 'Morgan',
    roleplay: 'Andy',
    role: 'Product / ops budget',
    alignment: 'ROI, AUM retained, capacity-constrained review queue (top ~5%).',
    concern:
      'Can agents act on a ranked queue without drowning in false positives? Does Approve mean ready-to-contact, not auto-sent?',
    color: 'emerald',
  },
  {
    id: 'sam',
    name: 'Sam',
    roleplay: 'Head of Data Science',
    role: 'Data Science lead',
    alignment: 'Temporal rigor, MLflow provenance, beat the heuristic, SHAP, honest metrics.',
    concern:
      'Did we leak future months? Are we celebrating accuracy when always-negative looks “good”?',
    color: 'blue',
  },
] as const;

export interface CatwoeItem {
  key: 'C' | 'A' | 'T' | 'W' | 'O' | 'E';
  label: string;
  name: string;
  summary: string;
  external?: string[];
  internal?: string[];
  details: string[];
  meridianImpact: string;
}

export const CATWOE: CatwoeItem[] = [
  {
    key: 'C',
    label: 'Customers',
    name: 'Beneficiaries & Victims',
    summary: 'Who benefits from the system or suffers from its shortcomings?',
    external: ['Meridian retail savings account holders at risk of silent drain-out.'],
    internal: ['Customer Retention & Marketing teams acting on ranked queues in Streamlit.'],
    details: [
      'Account holders rarely close accounts; they drain balances to $0. Proactive outreach must be respectful and non-predatory.',
      'Internal users need high-precision queues to prevent operational overwhelm from false positives.',
    ],
    meridianImpact: 'PRD sizes historical baseline at ~$7.3M AUM; outreach is bounded to top ~5% capacity.',
  },
  {
    key: 'A',
    label: 'Actors',
    name: 'Implementers & Operators',
    summary: 'Who carries out the transformation and operational processes?',
    details: [
      'Solo AI Engineer: Builds temporal ML pipeline, FastAPI serving, and GenAI guardrails.',
      'Sam (Head of DS): Reviews MLflow lineage, time-based splits, and PR-AUC.',
      'Morgan (Product): Validates queue size, retention ROI, and operational workflow.',
      'Jamie (Risk/Compliance): Audits HITL friction gates, ZDR scrubbing, and fairness.',
      'Relationship Managers: Review drafted emails and conduct human outreach.',
    ],
    meridianImpact: 'The system has human operators at every stage; AI acts as an exoskeleton, never an autonomous agent.',
  },
  {
    key: 'T',
    label: 'Transformation',
    name: 'Core System Function',
    summary: 'What input is converted into what output by the system?',
    details: [
      'Input: Massive raw, multi-year transaction logs, running balance series, and demographic profiles.',
      'Output: Ranked churn probabilities (XGBoost) + Top ~5% operational cut + Context-rich, PII-scrubbed, rate-capped GenAI draft emails for human approval.',
    ],
    meridianImpact: 'Replaces reactive post-closure triage with proactive behavioral risk ranking and supervised GenAI drafts.',
  },
  {
    key: 'W',
    label: 'Worldview',
    name: 'Weltanschauung',
    summary: 'What overarching belief makes this transformation meaningful?',
    details: [
      'Retaining existing depositors before their balance reaches zero preserves high-margin banking liquidity much cheaper than acquiring new customers.',
      'AI must empower human relationship managers rather than bypass them. Trust requires strict explainability (SHAP) and safety rails.',
    ],
    meridianImpact: 'Drives "Friction as a Feature" — autonomous sending is treated as an architectural defect, not a goal.',
  },
  {
    key: 'O',
    label: 'Owners',
    name: 'Decision Authorities',
    summary: 'Who owns the system components and has authority to modify or halt them?',
    details: [
      'Sam (Technical Owner): Holds ultimate veto on model risk, data leakage, and serving contracts.',
      'Morgan (Business Owner): Owns retention KPIs, operational capacity, and product budget.',
      'Jamie (Governance Owner): Owns regulatory compliance, customer protection, and fairness disclosures.',
    ],
    meridianImpact: 'Tripartite governance ensures balanced checks and balances without unilateral technical or commercial override.',
  },
  {
    key: 'E',
    label: 'Environment',
    name: 'External Constraints',
    summary: 'What real-world limitations and policy constraints must be respected?',
    details: [
      'AppLocker enterprise policy: Blocks local .venv wrappers and native C++ vector DBs like Chroma.',
      'Zero Data Retention (ZDR) & financial privacy: No customer PII sent to external LLMs.',
      'Responsible AI & Banking guardrails: Offered interest rate hard-capped at ≤3.5%; fairness EOD disclosed.',
      'Timeline: Compressed 10-day sprint cycle requiring pragmatic, committed model artifacts.',
    ],
    meridianImpact: 'Forced global py -3.13 -m launcher, SQLite WAL, pure-Python RAG, and Pydantic rate clamping.',
  },
];

export interface PopitDimension {
  id: 'people' | 'organisation' | 'process' | 'information' | 'technology';
  letter: string;
  name: string;
  summary: string;
  points: string[];
  meridianImpact: string;
}

export const POPIT: PopitDimension[] = [
  {
    id: 'people',
    letter: 'P',
    name: 'People',
    summary: 'Skills, roles, culture, and cognitive behaviors across stakeholders.',
    points: [
      'Shift retention agents from batch-and-blast spam to consultative, personalized outreach.',
      'Counter automation bias (review fatigue): Enforce attention acknowledgments and soft warnings for fast decisions (<8s, JR-REQ-19).',
      'Foster stakeholder confidence: Provide Glass-Box explainability via top SHAP behavioral impact drivers.',
    ],
    meridianImpact: 'Human-in-the-loop UX is intentionally friction-full to ensure deliberate human decision-making.',
  },
  {
    id: 'organisation',
    letter: 'O',
    name: 'Organisation',
    summary: 'Organizational structure, governance, culture, and separation of duties.',
    points: [
      'Cross-functional synergy between Data Science (Sam), Risk/Compliance (Jamie), and Product (Morgan).',
      'Clear separation of duties via Role-Based Access Control (RBAC): Compliance can audit but cannot Approve; Retention agents can review but cannot modify model pipelines.',
      'Explicit alignment of engineering sprints to bank risk registers and PRD business requirements.',
    ],
    meridianImpact: 'Demo Glass-Box RBAC (ADR 007) and formal Jamie requirements register (Sprint 5) institutionalize cross-department accountability.',
  },
  {
    id: 'process',
    letter: 'P',
    name: 'Process',
    summary: 'Business workflows, MLOps lifecycles, and operational procedures.',
    points: [
      'Monthly batch ETL and temporal inference pipeline honoring strict observation vs prediction windows.',
      'Friction-Gate workflow: "Approve ≠ Sent" — system moves customer to approved queue for external outreach; no auto-mailer exists.',
      'MLOps governance: Experiment tracking on MLflow with committed portable models (ADR 005) for predictable releases.',
    ],
    meridianImpact: 'Operational cut selects top ~5% of ranked customers (~20k false positives vs ~249k under max-F1), matching staff capacity.',
  },
  {
    id: 'information',
    letter: 'I',
    name: 'Information',
    summary: 'Data assets, security, knowledge representation, and audit trails.',
    points: [
      'Zero Data Retention (ZDR): Sensitive account numbers, balances, and PII are scrubbed prior to any LLM prompt evaluation.',
      'Structured intelligence: Deriving calibrated churn risk scores, global SHAP drivers, and guardrailed draft copy.',
      'Immutable audit logging: SQLite WAL database records every review action, role header, timestamp, and attention checkbox state.',
    ],
    meridianImpact: 'Strict Pydantic schemas (ADR 002) with extra="forbid" guarantee predictable, typed data interchange between serving and frontend.',
  },
  {
    id: 'technology',
    letter: 'T',
    name: 'Technology',
    summary: 'Hardware, runtime software, machine learning libraries, and serving infrastructure.',
    points: [
      'Core ML: Python 3.13 global user scope runtime, XGBoost binary:logistic, Scikit-Learn pipelines.',
      'Serving topology: Streamlit interactive frontend, FastAPI single enforcement point, SQLite WAL state store.',
      'GenAI stack: Azure OpenAI gpt-5-mini (replaced gpt-4o-mini in September 2026) + text-embedding-3-large, .prompty template engine (pinned prompty<2), tenacity exponential retry backoff.',
      'AppLocker resilience: Pure-Python hybrid retrieval (BM25 + embeddings, RRF, LLM rerank) replacing blocked native vector stores; BM25 alone offline.',
    ],
    meridianImpact: 'Architecture avoids complex multi-container dependencies, ensuring resilient single-replica execution under strict OS policies.',
  },
];

export interface RasciRole {
  role: 'R' | 'A' | 'S' | 'C' | 'I';
  party: string;
  title: string;
  why: string;
}

export interface RasciStream {
  id: string;
  title: string;
  deliverable: string;
  accountable: string;
  assignments: RasciRole[];
  notes: string;
}

export const RASCI_MATRIX: RasciStream[] = [
  {
    id: 'ml_pipeline',
    title: 'ML Pipeline & Temporal Rigor',
    deliverable: 'Left-looking churn label (ADR 004), chronological split, XGBoost booster, committed Models/ops/',
    accountable: 'Sam (Head of Data Science)',
    assignments: [
      { role: 'R', party: 'AI Engineer', title: 'Solo AI Engineer', why: 'Builds feature transformations, temporal splits, and XGBoost training pipeline.' },
      { role: 'A', party: 'Sam', title: 'Head of Data Science', why: 'Sole veto authority on temporal leakage, metric validity (PR-AUC vs heuristic), and MLflow lineage.' },
      { role: 'S', party: 'MLflow / SQLite', title: 'Tooling & Backend', why: 'Provides local experiment tracking store and portable model packaging.' },
      { role: 'C', party: 'Jamie', title: 'Risk & Compliance', why: 'Consulted on protected demographic attributes, proxy features, and Fairlearn slicing.' },
      { role: 'I', party: 'Morgan', title: 'Product Manager', why: 'Informed on model ranking capability and validation precision constraints.' },
    ],
    notes: 'Single accountability prevents model leakage or heuristic shortcuts from reaching production.',
  },
  {
    id: 'product_capacity',
    title: 'Product Strategy & Operational Capacity',
    deliverable: 'PRD business case, historical ~$7.3M AUM sizing, top ~5% ops threshold (t ≈ 0.701), review queue sizing',
    accountable: 'Morgan (Product Manager / Andy)',
    assignments: [
      { role: 'R', party: 'AI Engineer & Morgan', title: 'AI Engineer & Product Lead', why: 'Modeler translates validation curves into capacity thresholds; PM sizes retention team capacity.' },
      { role: 'A', party: 'Morgan', title: 'Product Manager', why: 'Owns retention ROI, operational budget, and queue capacity trade-offs.' },
      { role: 'S', party: 'Analytics / Ops', title: 'Ops Support', why: 'Provides historical outreach conversion and retention capacity benchmarks.' },
      { role: 'C', party: 'Sam', title: 'Head of Data Science', why: 'Consulted on precision ceiling (~24% top 1%) and infeasibility of arbitrary 40% precision floors.' },
      { role: 'I', party: 'Bank Executives', title: 'Vincent / Branch Leads', why: 'Informed on projected AUM exposure and customer prioritization volumes.' },
    ],
    notes: 'Morgan rejects max-F1 threshold (t=0.475) due to 249k false positives; accepts top-5% capacity rule.',
  },
  {
    id: 'governance_guardrails',
    title: 'Governance, HITL & GenAI Guardrails',
    deliverable: 'Zero Data Retention scrubbing, rate cap (≤3.5%), Friction-Gate HITL, Glass-Box RBAC, Model Card disclosure',
    accountable: 'Jamie (Risk & Compliance / Arvind)',
    assignments: [
      { role: 'R', party: 'AI Engineer', title: 'Solo AI Engineer', why: 'Implements PII scrubbing, Pydantic clamping, audit logging, and RBAC middleware.' },
      { role: 'A', party: 'Jamie', title: 'Risk & Compliance', why: 'Sole sign-off on anti-predatory rate compliance, HITL enforcement, and fairness disclosures.' },
      { role: 'S', party: 'Automated Pytest Suite', title: 'pytest suite & SQLite WAL', why: 'Hand-run regression suite (no CI for pytest yet) and tamper-evident review audit trails.' },
      { role: 'C', party: 'Sam', title: 'Head of Data Science', why: 'Consulted on Equalized Odds difference calculations and SHAP glass-box integration.' },
      { role: 'I', party: 'External Regulators', title: 'Audit Assessors', why: 'Informed via formal Model Cards and Sprint 5 compliance registers.' },
    ],
    notes: 'Jamie enforces "Approve ≠ Sent" and requires anti-rubber-stamp attention checks (JR-REQ-19).',
  },
  {
    id: 'retention_outreach',
    title: 'Retention Review & Customer Outreach',
    deliverable: 'Reviewing flagged customers in Streamlit, editing draft copy, attention acknowledgment, external outbound outreach',
    accountable: 'Morgan (Product / Retention Lead)',
    assignments: [
      { role: 'R', party: 'Retention Agents', title: 'Relationship Managers', why: 'Conduct human review of flagged accounts, evaluate contextual drafts, and perform telephone/email outreach.' },
      { role: 'A', party: 'Morgan', title: 'Product / Retention Lead', why: 'Accountable for team operational SLA, customer contact quality, and saved account outcomes.' },
      { role: 'S', party: 'Streamlit Exoskeleton', title: 'Meridian Serving App', why: 'Provides pre-drafted contextual emails, SHAP drivers, and one-click approval logging.' },
      { role: 'C', party: 'Jamie', title: 'Risk & Compliance', why: 'Consulted on messaging compliance rules and maximum interest rate promises.' },
      { role: 'I', party: 'Account Holders', title: 'Bank Customers', why: 'Informed/engaged via personalized human retention outreach.' },
    ],
    notes: 'The machine never emails the customer directly; retention agents execute all outbound communications.',
  },
];

export const ADRS = [
  { id: '001', filename: '001-global-python-applocker-mitigation.md', title: 'AppLocker-safe Python', oneLiner: 'Use global py -3.13 -m …; avoid .venv script wrappers.' },
  { id: '002', filename: '002-pydantic-strict-io.md', title: 'Pydantic GenAI I/O', oneLiner: 'Hard-validate drafts; offered_interest_rate ≤ 3.5%.' },
  { id: '003', filename: '003-friction-as-a-feature-genai-gating.md', title: 'Friction as a Feature', oneLiner: 'No /send; Approve ≠ Sent; HITL anti rubber-stamp.' },
  { id: '004', filename: '004-churn-target-and-predictive-window.md', title: 'Churn label lock', oneLiner: 'Left-looking next-month churn; observation vs prediction windows.' },
  { id: '005', filename: '005-portable-model-export-for-serving.md', title: 'Committed Models/ops', oneLiner: 'Portable booster + OHE + serving_meta without MLflow DB.' },
  { id: '006', filename: '006-sqlite-and-in-process-ui-for-friction-gate.md', title: 'SQLite + in-process UI', oneLiner: 'Follow-on 2026-09-18: UI calls FastAPI (http default); inprocess = same API via ASGI, AppLocker fallback.' },
  { id: '007', filename: '007-demo-glass-box-rbac.md', title: 'Demo Glass-Box RBAC', oneLiner: 'X-Demo-Role; compliance cannot Approve.' },
  { id: '008', filename: '008-split-brain-state.md', title: 'Anti split-brain', oneLiner: 'Shared SQLite WAL; maxReplicas: 1.' },
  { id: '009', filename: '009-sqlite-mlflow-tracking-backend.md', title: 'MLflow on SQLite', oneLiner: 'Local tracking provenance.' },
  { id: '010', filename: '010-applocker-safe-in-memory-rag.md', title: 'AppLocker-safe RAG', oneLiner: 'No Chroma; Azure embed + pure-Python rank.' },
  { id: '011', filename: '011-single-file-streamlit-routing.md', title: 'Streamlit routing', oneLiner: 'Single-file programmatic page routing.' },
  { id: '012', filename: '012-fairness-and-compliance-guardrails.md', title: 'Fairness disclose', oneLiner: 'Measure + disclose EOD; no remediator shipped.' },
  { id: '013', filename: '013-azure-openai-resilience-tenacity-telemetry.md', title: 'Azure resilience', oneLiner: 'Tenacity retries + token telemetry; dual-key fallback.' },
  { id: '014', filename: '014-portable-submission-inference.md', title: 'Portable submission', oneLiner: 'May-2020 FE+score script; continuous probs only.' },
  { id: '015', filename: '015-hybrid-rag-rerank-fairness-consolidation.md', title: 'Hybrid RAG + rerank', oneLiner: 'BM25 + dense fused with RRF, LLM rerank; POST /rag/ask; one fairness accessor.' },
] as const;

/** Derived so module checks cannot drift from the ADR list. */
export const ADR_COUNT = ADRS.length;

export const GENAI = {
  /** AZURE_OPENAI_DEPLOYMENT in the live .env; drafts, RAG answers, rerank and viva marking all use it. */
  chatModel: 'gpt-5-mini',
  chatModelBefore: 'gpt-4o-mini (previous deployment; replaced in September 2026)',
  embeddingModel: 'text-embedding-3-large',
  rateCap: 0.035,
  rateCapDisplay: '3.5%',
  promptyPath: 'src/genai/prompts/retention_draft.prompty',
  ragTopK: 3,
  ragChunkMaxChars: 1200,
  ragNote: 'No Chroma/FAISS — BM25 + Azure dense embeddings fused with RRF, then LLM rerank; all pure-Python, in-memory (ADR 010 + ADR 015).',
  /** rag_engine.py corpus: the Official report only (Methodology Q&A tab). Drafter uses no RAG. */
  ragCorpus: 'Docs/Final_Report_Official.md',
  /** sanitize_llm_draft clamps min(rate, 0.035); Pydantic rejects only unclamped values. */
  rateCapBehaviour: 'Clamped to 3.5% by sanitize_llm_draft; Pydantic is the backstop that rejects anything unclamped.',
  /** Tenacity retries transient Azure errors, then the stub drafts instead. No redraft loop. */
  retryAttempts: 5,
  fastDecideSeconds: 8,
  /** Prefer Azure when configured; stub is offline/demo; stub_fallback after Azure failure (ADR 013). */
  pathNote: 'Prefer Azure when configured; stub offline/demo; stub_fallback after Azure failure (ADR 013).',
  /** ADR 010 — honest with-Chroma vs shipped path copy for edu SPA side-by-side panel. */
  ragChromaWouldBe: {
    title: 'With Chroma (would-be — not shipped)',
    stack: 'chromadb.Client(persist_directory=…) → collection.add(embeddings) → collection.query',
    block: 'AppLocker: unapproved native binary (ChromaDB / hnswlib) halted in user-writable workspace.',
    outcome: 'Meridian does NOT run Chroma in production. This path is blocked before any retrieve succeeds.',
  },
  ragShipped: {
    title: 'Without Chroma (shipped — ADR 010)',
    stack: 'rag_engine.py: Okapi BM25 + Azure text-embedding-3-large, fused with Reciprocal Rank Fusion, then LLM rerank',
    chunking: 'ATX headers (#–######) + paragraph pack ≤1200 chars; cache schema_version=4',
    outcome: 'top_k=3 small chunks — grounded answer, not a whole chapter paste.',
  },
} as const;

/** ADR 015 (2026-09-22) — hybrid retrieval, LLM rerank, RAG behind FastAPI, one fairness accessor. */
export const RAG_015 = {
  sparse: 'Okapi BM25 (_bm25_score: raw term counts + doc_len) — replaced the earlier ungrounded tf·idf sum',
  dense: 'Azure text-embedding-3-large, when Azure is configured',
  fusion: 'Reciprocal Rank Fusion over the two independent rankings (_reciprocal_rank_fusion)',
  rerank: 'LLM rerank (_rerank_with_llm) on the same Azure chat deployment — no Cohere / BGE / sentence-transformers',
  degrade: 'One signal only (offline, or a failed query embed) → that ranking is used directly; a bad rerank falls back to the fused order. Never a hard fail.',
  cacheSchemaVersion: 4,
  cacheBumpReason: 'DocumentChunk.tf changed meaning (raw counts, not normalized frequency), so old caches are invalidated rather than silently misread',
  endpoint: 'POST /rag/ask (permission use_rag_assistant, granted to all three demo roles — read-only methodology Q&A)',
  fairnessAccessor: 'src/serving/fairness.py is the only reader of fairlearn_equalized_odds.json; exposed as GET /model/fairness behind the view_glass_box gate',
  fairnessWhy: 'Hand-copied numbers had already drifted once (red-team RT-J-04)',
  uiChange: 'friction_gate_app.py no longer imports rag_engine — FastAPI is now the single enforcement point for every model- and Azure-touching action',
  stillOpen: 'Per-query LLM rerank is best-effort, not a benchmarked cross-encoder; single-document corpus; no RAGAS-style measurement yet',
} as const;

/** ADR 013 — client resilience for the one shared Azure resource. */
export const AZURE_RESILIENCE = {
  library: 'tenacity (pure Python — AppLocker-safe)',
  maxAttempts: 5,
  backoff: 'exponential',
  retryOn: ['RateLimitError', 'APIConnectionError', 'APITimeoutError', 'InternalServerError'],
  telemetry: 'prompt_tokens / completion_tokens / total_tokens via stdlib logging — not an APM stack',
  draftOutcome: 'Drafter still stub-falls-back (drafter_source = stub_fallback); RAG returns a safe error string; still no /send',
  tradeoff: 'Extra latency under sustained 429s, bought for demo survivability and one explainable policy across both call sites',
} as const;

/**
 * 2026-09-24 (DK-09) — the chat deployment moved to gpt-5-mini, a reasoning model.
 * src/genai/azure_client.py chat_limit_params() picks the parameters per model.
 */
export const REASONING_PARAMS = {
  helper: 'chat_limit_params() in src/genai/azure_client.py',
  rule: 'Reasoning models (gpt-5*, o1/o3/o4) get max_completion_tokens and no temperature; older chat models get max_tokens (+ temperature where set).',
  why: 'gpt-5-mini returns HTTP 400 on max_tokens, and its hidden reasoning tokens count inside max_completion_tokens, so it needs a larger budget.',
  budgets: [
    { call: 'Retention draft', classic: 800, reasoning: 3000 },
    { call: 'RAG answer', classic: 500, reasoning: 2500 },
    { call: 'RAG rerank', classic: 400, reasoning: 2000 },
    { call: 'Viva marking', classic: 900, reasoning: 2000 },
  ],
  /** The .prompty declares temperature 0.2, but the drafter has never sent it; gpt-5-mini would reject it anyway. */
  temperatureNote: 'The .prompty file declares temperature 0.2, but the drafter never sends it. gpt-5-mini only accepts the default temperature, so the declared value is documentation, not a live setting.',
} as const;

/**
 * Two 2026-09-24 findings with the same shape: a live Azure call failed, the
 * designed fallback caught it, and nothing looked broken. Source:
 * Docs/Sprint5/docker_smoke_checklist.md DK-09 and DK-13.
 */
export const SILENT_FALLBACKS = [
  {
    id: 'DK-09',
    symptom: 'Every draft came back as drafter_source = stub_fallback',
    cause: 'The deployment was switched to gpt-5-mini, which rejects max_tokens with HTTP 400',
    fix: 'chat_limit_params() sends max_completion_tokens to reasoning models',
    signal: 'drafter_source on each draft',
  },
  {
    id: 'DK-13',
    symptom: 'RAG still answered, but every response reported retrieval_mode = tfidf and hybrid = false (keyword ranking only)',
    cause: 'The .env endpoint was a Foundry project URL (…/api/projects/<name>); its /openai/v1 route serves chat but returns 404 for embeddings',
    fix: 'normalize_openai_base_url() strips the project path back to the resource root',
    signal: 'retrieval_mode / hybrid / reranked on each RAG answer',
  },
] as const;

/**
 * Explain-it marker benchmark (TODO_LEARNING_ML_THROUGH_MERIDIAN.md, 2026-09-24).
 * Labelled corpus: tests/genai/viva_benchmark.json; live runner: scripts/evaluate_viva_benchmark.py.
 */
export const VIVA_BENCHMARK = {
  prompts: ['v-calibration', 'v-learning-rate', 'v-test-discipline', 'v-rag-chunking'],
  answersPerPrompt: 'one strong (positive) and one weak (negative) answer, each labelled per rubric point',
  answers: 8,
  labels: 48,
  labelAccuracy: 0.875,
  required: 0.8,
  model: 'gpt-5-mini',
  date: '2026-09-24',
  command: 'npm run viva:benchmark',
  corpus: 'tests/genai/viva_benchmark.json',
  runner: 'scripts/evaluate_viva_benchmark.py',
  caveat: 'Eight labelled answers (48 rubric-point labels) is a small sample, run against grade_answer directly rather than through the API. It shows the marker agrees with the human labels on these four prompts; it does not measure the other prompts.',
} as const;

/** What the Streamlit dashboard shows after the 2026-09-24 verification pass. */
export const DASHBOARD = {
  verified: 'Streamlit AppTest rendered all 19 role × page combinations against the containerised API with no errors (2026-09-24)',
  crashFixed: 'Permission.use_viva_grader had no sidebar label, so the app raised KeyError on load for every role. Labels now live beside the enum (PERMISSION_LABELS in src/serving/rbac.py) with a test that every permission has one.',
  morgan: 'Business View reads Data/processed/business_metrics.json (written by Code/Sprint5/generate_business_metrics.py) and labels the fallback numbers as illustrative when that file is missing.',
  sam: 'ML View What-If: the balance slider drives Running_Balance, the top SHAP driver (it used to move start_balance, which is not a model driver); precision-recall curve shown beside ROC.',
  predictionBrowser: 'Added after close (2026-09-24): Prediction browser page (GET /predictions) ranks a scored cohort and shows per-customer SHAP for the selected row (exact TreeSHAP from the served booster, log-odds, summing to the score). Without Data/processed/prediction_cohort.csv it lists only the two demo fixtures. AppTest: 21 role × page combinations render.',
} as const;

/** ADR 011 — why the Streamlit app is one file. */
export const STREAMLIT_ROUTING = {
  rejected: "Streamlit's pages/ directory",
  why: 'Clicking a page forks a secondary Python subprocess, which AppLocker blocks — the UI crashes or freezes',
  shipped: 'Single-file programmatic routing in friction_gate_app.py: sidebar demo-role selector + if/elif dispatch to view functions',
  cost: 'The file grows; needs strict function encapsulation and disciplined session-state key spacing',
} as const;

/** Queue arithmetic Morgan asks about — all derived from the test-window numbers above. */
export const OPS_MATH = {
  fpReductionFactor: Math.round((MODEL.maxF1FalsePositives / MODEL.opsFalsePositives) * 10) / 10,
  contactedPrecisionPct: Math.round(MODEL.opsPrecision * 100),
  contactedRecallPct: Math.round(MODEL.opsRecall * 100),
  note: 'The top-5% cut buys a reviewable queue and costs recall: it catches under a tenth of next-month churners. That trade is the decision, not a side effect.',
} as const;

export const DEPLOY = {
  status: 'FastAPI image built and smoke-tested locally (2026-09-24); deployed to ACA with azd and verified live the same day, then torn down (no standing URL; ADR 016)',
  imageScope: 'Dockerfile / compose run the FastAPI service only (Streamlit is not in the image).',
  azureOpenAiLive: '2026-07-17',
  ci: 'Partial: GitHub Actions (.github/workflows/educational-web-app.yml) runs the teaching app’s lint, tests and build on pushes that touch educational_web_app/ (green on 2026-09-23). The Python suite and the Docker image have no CI and are run by hand.',  maxReplicas: 1,
  honestEnding: 'Local container smoke-tested — not a live multi-replica production URL.',
  smokeDate: '2026-09-24',
  smokeEvidence: 'Docs/Sprint5/docker_smoke_checklist.md §4',
  imageSize: '723 MB',
  serviceDeps: 'requirements.serving.txt — serving-only packages pinned from requirements.lock and compiled for Linux',
  healthcheck: 'Dockerfile HEALTHCHECK polls the public /health route (stdlib only)',
  portOverride: 'API_PORT=8001 runs the container beside a host API already on port 8000',
  /** Found by running the checklist, not by reading the files. */
  smokeFindings: [
    { id: 'DK-07', what: 'The image installed unpinned requirements.txt, so scikit-learn could drift from the 1.9.0 that pickled Models/ops/preprocessor.joblib', fix: 'Pinned requirements.serving.txt' },
    { id: 'DK-08', what: '.dockerignore dropped all of Docs/, but /model/fairness and /rag/ask read files there, so both failed inside the container', fix: 'Re-included and copied the two runtime files' },
    { id: 'DK-09', what: 'gpt-5-mini rejected max_tokens, so drafts silently became stub_fallback on the host and in the container', fix: 'chat_limit_params() per model' },
  ],
} as const;

/** `py -3.13` on the AppLocker machine; `python` inside a venv / uv elsewhere (CLONE_GUIDE). */
/** Dated evidence, not a promise: re-run the command to check. */
const TESTS_EVIDENCE = '127 passed on 2026-09-24 (full tests/ suite) — re-run to verify';

export const RUN_COMMANDS = {
  api: 'py -3.13 -m uvicorn src.serving.app:app',
  apiDocker: 'docker compose up -d --build',
  ui: 'py -3.13 -m streamlit run Code\\Sprint3\\friction_gate_app.py',
  uiInProcess: 'set FRICTION_GATE_MODE=inprocess  (AppLocker fallback: no localhost socket)',
  tests: 'py -3.13 -m pytest tests -q',
  testsPortable: 'python -m pytest tests -q',
  testsEvidence: TESTS_EVIDENCE,
} as const;

/** Upstream correction register the fact sheet follows. */
export const CORRECTIONS_REGISTER = 'Docs/Engineering/Corrections_and_Future_Work.md';

/** Full FACT_SHEET anti-claim list — render in Ethics / Mastery; never teach these. */
export const ANTI_CLAIMS = [
  'LightGBM as the shipped model (it was never trained)',
  'ROC-AUC > 0.85 achieved',
  '40% precision / calibrated probabilities',
  'Accuracy as success metric',
  'Autonomous email / /send / Approve = Sent',
  'Chroma / FAISS as production RAG',
  'Entra/SSO production RBAC (demo X-Demo-Role only)',
  'Live multi-replica HA Azure hosting',
  'Automated fairness remediator',
  'High-balance dormancy = churn',
  'Random shuffle train/test or threshold tuned on test',
  'Split-Executor (agent workflow) = split-brain (DB topology)',
  'Ops threshold applied to grading submission CSV',
  'Foundation / TabFM for core prediction',
  'PostgreSQL as current draft store',
  'Invented AUM other than ~$7.3M',
  'Temporal cross-validation folds (it is one fit / val / test split)',
  'Model registered in the MLflow Model Registry',
  'dtreeviz diagrams produced (attempted, skipped: Lag3 NaNs)',
  'Drafter grounded by RAG over past retention emails',
  'Per-customer SHAP in drafts (they carry frozen global drivers)',
  'Rate above 3.5% “rejected” (it is clamped)',
  'Fast approval is blocked (it is a logged soft warning)',
  'Fairness is a release gate (measured + disclosed only)',
  'CI gating the model / API tests (only the teaching app has a workflow; pytest is run by hand)',
  'Streamlit writes drafts directly to SQLite (UI goes through FastAPI)',
] as const;

export const TEACHING_SPINE = `Meridian ranks next-month silent churn with leakage-safe ${MODEL.name}, contacts only the top ~5% (${formatOpsThreshold()}), and uses Azure GenAI only to draft retention emails behind Friction-Gate controls that Risk can audit — designed to run under corporate AppLocker constraints.`;

/**
 * Sprint 5 chunking bugfix (2026-07-17) — Docs/Sprint5/rag_chunking_revision_plan.md
 * and Docs/Sprint5/walkthrough.md §3d. The demo expander looked like the whole
 * report because chunking was too coarse, not because retrieval maths was wrong.
 */
export const RAG_CHUNKING = {
  beforeSplitOn: '# and ## only',
  beforeChunks: 10,
  beforeMaxChars: 6000,
  /** top_k=3 over 10 chapter-sized chunks handed the LLM roughly this share of the report. */
  beforeCoverage: 0.38,
  afterSplitOn: '# through ###### (H1–H6) + paragraph pack',
  afterChunks: 44,
  afterMaxChars: GENAI.ragChunkMaxChars,
  /** Measured on the ops-threshold probe query after the fix. */
  afterCoverage: 0.036,
  topK: GENAI.ragTopK,
  lesson: 'Chunk semantics decide retrieval precision. The embedding model never changed.',
  evidence: 'Docs/Sprint5/rag_chunking_revision_plan.md (RAG-CHUNK-01/02/03)',
} as const;

/**
 * Test-window confusion counts, derived from the locked test metrics rather than
 * re-counted: precision and recall at the ops cut pin TP, and the ops accuracy
 * pins the negative count. Used by the Causal Lab so the dial cannot drift from
 * the reported numbers. Rounded — treat as ~, not as an exact row count.
 */
function deriveTestCounts() {
  const tp = (MODEL.opsPrecision * MODEL.opsFalsePositives) / (1 - MODEL.opsPrecision);
  const positives = tp / MODEL.opsRecall;
  const negatives = (MODEL.opsAccuracy * positives - tp + MODEL.opsFalsePositives) / (1 - MODEL.opsAccuracy);
  return {
    positives: Math.round(positives),
    negatives: Math.round(negatives),
    rows: Math.round(positives + negatives),
    opsTruePositives: Math.round(tp),
  };
}

export const TEST_COUNTS = {
  ...deriveTestCounts(),
  note: 'Derived from the locked ops precision / recall / accuracy and false-positive count — not an independent row count.',
} as const;
