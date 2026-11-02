/**
 * Real Meridian repo tree for the architecture explorer.
 * Filenames match the main repo; philosophies explain WHY folders exist.
 */

export interface TreeNode {
  id: string;
  name: string;
  type: 'folder' | 'file';
  icon: 'folder' | 'doc' | 'code' | 'csv' | 'model';
  description?: string;
  philosophy?: string;
  /** Links a tree file node to ADR drawer content (001–014). */
  adrId?: string;
  children?: TreeNode[];
}

const ADR_FILES: TreeNode[] = [
  { id: 'adr-001', name: '001-global-python-applocker-mitigation.md', type: 'file', icon: 'doc', adrId: '001', description: 'ADR 001 — global py -3.13 -m execution.' },
  { id: 'adr-002', name: '002-pydantic-strict-io.md', type: 'file', icon: 'doc', adrId: '002', description: 'ADR 002 — Pydantic-validated GenAI I/O.' },
  { id: 'adr-003', name: '003-friction-as-a-feature-genai-gating.md', type: 'file', icon: 'doc', adrId: '003', description: 'ADR 003 — HITL Friction-Gate; Approve ≠ Sent.' },
  { id: 'adr-004', name: '004-churn-target-and-predictive-window.md', type: 'file', icon: 'doc', adrId: '004', description: 'ADR 004 — churn label and temporal windows.' },
  { id: 'adr-005', name: '005-portable-model-export-for-serving.md', type: 'file', icon: 'doc', adrId: '005', description: 'ADR 005 — committed Models/ops artifacts.' },
  { id: 'adr-006', name: '006-sqlite-and-in-process-ui-for-friction-gate.md', type: 'file', icon: 'doc', adrId: '006', description: 'ADR 006 — SQLite store; 2026-09-18 follow-on: UI calls FastAPI (in-process ASGI fallback).' },
  { id: 'adr-007', name: '007-demo-glass-box-rbac.md', type: 'file', icon: 'doc', adrId: '007', description: 'ADR 007 — demo Glass-Box RBAC roles.' },
  { id: 'adr-008', name: '008-split-brain-state.md', type: 'file', icon: 'doc', adrId: '008', description: 'ADR 008 — shared SQLite WAL; maxReplicas: 1.' },
  { id: 'adr-009', name: '009-sqlite-mlflow-tracking-backend.md', type: 'file', icon: 'doc', adrId: '009', description: 'ADR 009 — MLflow on SQLite for local provenance.' },
  { id: 'adr-010', name: '010-applocker-safe-in-memory-rag.md', type: 'file', icon: 'doc', adrId: '010', description: 'ADR 010 — no Chroma; pure-Python RAG.' },
  { id: 'adr-011', name: '011-single-file-streamlit-routing.md', type: 'file', icon: 'doc', adrId: '011', description: 'ADR 011 — single-file Streamlit page routing.' },
  { id: 'adr-012', name: '012-fairness-and-compliance-guardrails.md', type: 'file', icon: 'doc', adrId: '012', description: 'ADR 012 — fairness measure + disclose.' },
  { id: 'adr-013', name: '013-azure-openai-resilience-tenacity-telemetry.md', type: 'file', icon: 'doc', adrId: '013', description: 'ADR 013 — Azure retries + dual-key fallback.' },
  { id: 'adr-014', name: '014-portable-submission-inference.md', type: 'file', icon: 'doc', adrId: '014', description: 'ADR 014 — portable submission inference script.' },
];

export const TREE_DATA: TreeNode[] = [
  {
    id: 'docs',
    name: 'Docs/',
    type: 'folder',
    icon: 'folder',
    description: 'Sprint plans, ADRs, model card, presentations, stakeholder prep.',
    philosophy:
      'Documentation is a deliverable. ADR folder immortalizes structural decisions; sprint folders hold plans, walkthroughs, debriefs, and retrospectives.',
    children: [
      {
        id: 'docs-adr',
        name: 'Architecture/ADRs/',
        type: 'folder',
        icon: 'folder',
        description: 'ADR 001–014 (AppLocker, Friction, RAG, submission…).',
        philosophy: 'Major infra/data-flow choices get an ADR before they fade into tribal knowledge.',
        children: ADR_FILES,
      },
      { id: 'docs-model-card', name: 'Model_Card.md', type: 'file', icon: 'doc', description: 'Responsible AI metrics, EOD, feature contract.' },
      { id: 'docs-final', name: 'Final_Report_Official.md', type: 'file', icon: 'doc', description: 'Assessor-facing final report (SoT for PDF export).' },
      { id: 'docs-arch-roadmaps', name: 'Architecture/ (roadmaps)', type: 'folder', icon: 'folder', description: 'Future-work designs — not built yet.', children: [
        { id: 'docs-mlflow-roadmap', name: 'MLflow_Model_Selection_Roadmap.md', type: 'file', icon: 'doc', description: 'Constrained model selection + registry promotion design (future).' },
        { id: 'docs-rag-roadmap', name: 'Phase6_Production_RAG_Roadmap.md', type: 'file', icon: 'doc', description: 'Hybrid search, query rewriting, re-ranking (future).' },
      ]},
      { id: 'docs-eng', name: 'Engineering/', type: 'folder', icon: 'folder', description: 'Code walkthrough, standards, tech debt, correction register.', philosophy: 'When docs and code disagree, write it down, fix it, and tick it off with a date.', children: [
        { id: 'docs-corrections', name: 'Corrections_and_Future_Work.md', type: 'file', icon: 'doc', description: 'Register of doc-vs-code mismatches and future work; this app follows it.' },
        { id: 'docs-debt', name: 'Technical_Debt_and_Limitations.md', type: 'file', icon: 'doc' },
        { id: 'docs-walkthrough', name: 'Code_Walkthrough.md', type: 'file', icon: 'doc' },
      ]},
      { id: 'docs-sprint5', name: 'Sprint5/', type: 'folder', icon: 'folder', description: 'Sprint 5 (closed 2026-09-24): Azure RAG, submission, Docker smoke.', children: [
        { id: 'docs-s5-plan', name: 'sprint_plan.md', type: 'file', icon: 'doc' },
        { id: 'docs-s5-jamie', name: 'jamie_requirements_register.md', type: 'file', icon: 'doc' },
        { id: 'docs-s5-docker', name: 'docker_smoke_checklist.md', type: 'file', icon: 'doc' },
      ]},
    ],
  },
  {
    id: 'starting',
    name: 'StartingFiles/',
    type: 'folder',
    icon: 'folder',
    description: 'Source CSVs (gitignored — obtain separately, not in a clone), guides, and submission validators.',
    philosophy:
      'Raw inputs are sacred. Feature engineering writes derived artifacts elsewhere; never edit source CSVs in place.',
    children: [
      { id: 'sf-customers', name: 'customers_tm1_e.csv', type: 'file', icon: 'csv', description: 'Customer demographics + start_balance (schema-validated).' },
      { id: 'sf-tx', name: 'transactions_tm1_e.csv', type: 'file', icon: 'csv', description: 'Monthly transaction history per account.' },
      { id: 'sf-sub', name: 'submission_sample.csv', type: 'file', icon: 'csv', description: 'Grader schema sample — continuous pred_churn only.' },
      { id: 'sf-val', name: 'validate_submission.py', type: 'file', icon: 'code', description: 'Portable submission CSV validator.' },
      { id: 'sf-guide', name: 'submission-guide.md', type: 'file', icon: 'doc', description: 'Bootcamp submission instructions.' },
    ],
  },
  {
    id: 'code',
    name: 'Code/',
    type: 'folder',
    icon: 'folder',
    description: 'Chronological notebooks and the Friction-Gate Streamlit app.',
    philosophy:
      'Notebooks explore; production logic graduates into src/. Sprint3 hosts friction_gate_app.py — the human review UI.',
    children: [
      { id: 'code-s1', name: 'Sprint1/', type: 'folder', icon: 'folder', children: [
        { id: 'code-s1-eda', name: '01_data_integrity_and_eda.ipynb', type: 'file', icon: 'code' },
        { id: 'code-s1-fe', name: '02_feature_engineering.ipynb', type: 'file', icon: 'code' },
      ]},
      { id: 'code-s2', name: 'Sprint2/', type: 'folder', icon: 'folder', children: [
        { id: 'code-s2-train', name: '01_modeling_and_rai.ipynb', type: 'file', icon: 'code' },
      ]},
      { id: 'code-s3', name: 'Sprint3/', type: 'folder', icon: 'folder', children: [
        { id: 'code-fg', name: 'friction_gate_app.py', type: 'file', icon: 'code', description: 'Streamlit Friction-Gate demo UI.' },
        { id: 'code-sub', name: 'create_submission.py', type: 'file', icon: 'code', description: 'Portable May-2020 submission scorer (ADR 014).' },
        { id: 'code-sub-helpers', name: 'submission_helpers.py', type: 'file', icon: 'code', description: 'Feature-engineering parity helpers for the submission scorer.' },
        { id: 'code-export', name: 'export_ops_model.py', type: 'file', icon: 'code', description: 'MLflow run → Models/ops/ (needs the gitignored mlflow.db).' },
      ]},
      { id: 'code-s5', name: 'Sprint5/', type: 'folder', icon: 'folder', children: [
        { id: 'code-s5-biz', name: 'generate_business_metrics.py', type: 'file', icon: 'code' },
      ]},
    ],
  },
  {
    id: 'src',
    name: 'src/',
    type: 'folder',
    icon: 'folder',
    description: 'Production Python packages.',
    philosophy:
      'Modular, tested code. AppLocker forces py -3.13 -m module execution against this tree — not .venv\\Scripts\\*.exe wrappers.',
    children: [
      {
        id: 'src-serving',
        name: 'serving/',
        type: 'folder',
        icon: 'folder',
        description: 'FastAPI score/drafts/audit — no /send endpoint.',
        philosophy: 'The single enforcement point: the Streamlit UI reaches these rules only through client.py → FastAPI (ADR 006 follow-on).',
        children: [
          { id: 'src-app', name: 'app.py', type: 'file', icon: 'code' },
          { id: 'src-model', name: 'model.py', type: 'file', icon: 'code' },
          { id: 'src-rbac', name: 'rbac.py', type: 'file', icon: 'code' },
          { id: 'src-draft', name: 'draft_store.py', type: 'file', icon: 'code', description: 'SQLite WAL drafts + audit; only the API writes.' },
          { id: 'src-client', name: 'client.py', type: 'file', icon: 'code', description: 'FrictionGateClient: HTTP (default) or in-process ASGI.' },
          { id: 'src-attn', name: 'attention_gate.py', type: 'file', icon: 'code', description: 'High-stakes cue + 8 s fast-decide soft warning.' },
          { id: 'src-schemas', name: 'schemas.py', type: 'file', icon: 'code', description: 'Pydantic request models (extra="forbid").' },
        ],
      },
      {
        id: 'src-genai',
        name: 'genai/',
        type: 'folder',
        icon: 'folder',
        description: 'Drafter, RAG, PII scrub, Azure client, .prompty.',
        philosophy: 'GenAI is an extension behind HITL — never an autonomous actor.',
        children: [
          { id: 'src-drafter', name: 'drafter.py', type: 'file', icon: 'code' },
          { id: 'src-rag', name: 'rag_engine.py', type: 'file', icon: 'code' },
          { id: 'src-azure', name: 'azure_client.py', type: 'file', icon: 'code' },
          { id: 'src-pii', name: 'pii_scrubber.py', type: 'file', icon: 'code', description: 'Blocked keys + regex redaction (no free-text name detection).' },
          { id: 'src-prompty', name: 'prompts/retention_draft.prompty', type: 'file', icon: 'doc' },
        ],
      },
      { id: 'src-core', name: 'core/config.py', type: 'file', icon: 'code', description: 'Settings + Azure alias resolution.' },
    ],
  },
  {
    id: 'models',
    name: 'Models/ops/',
    type: 'folder',
    icon: 'folder',
    description: 'Committed ops artifacts: booster, OHE, serving_meta.',
    philosophy:
      'Serving must not depend on a gitignored MLflow DB (ADR 005). Threshold and feature contract travel with the artifacts.',
    children: [
      { id: 'm-booster', name: 'booster.json', type: 'file', icon: 'model' },
      { id: 'm-pre', name: 'preprocessor.joblib', type: 'file', icon: 'model' },
      { id: 'm-meta', name: 'serving_meta.json', type: 'file', icon: 'doc', description: 'Ops threshold + model_feature_names (80 features).' },
      { id: 'm-readme', name: 'README.md', type: 'file', icon: 'doc' },
    ],
  },
  {
    id: 'infra',
    name: 'infra/ + Dockerfile',
    type: 'folder',
    icon: 'folder',
    description: 'Dockerfile / docker-compose.yml (FastAPI only) and an ACA scaffold.',
    philosophy: 'Packaging exists; hosting does not. azure-container-app.yaml still says REPLACE_WITH_ACR_IMAGE.',
    children: [
      { id: 'infra-aca', name: 'infra/azure-container-app.yaml', type: 'file', icon: 'doc', description: 'maxReplicas: 1 (ADR 008). Not deployed.' },
      { id: 'infra-docker', name: 'Dockerfile', type: 'file', icon: 'doc' },
      { id: 'infra-compose', name: 'docker-compose.yml', type: 'file', icon: 'doc' },
    ],
  },
  {
    id: 'tests',
    name: 'tests/',
    type: 'folder',
    icon: 'folder',
    description: 'core, genai, serving, submission — run the whole folder.',
    philosophy: 'Run via py -3.13 -m pytest — AppLocker blocks many script shims.',
    children: [
      { id: 'tests-serving', name: 'serving/', type: 'folder', icon: 'folder', children: [
        { id: 'tests-api', name: 'test_api.py', type: 'file', icon: 'code' },
        { id: 'tests-rbac', name: 'test_rbac.py', type: 'file', icon: 'code' },
        { id: 'tests-client', name: 'test_friction_gate_client.py', type: 'file', icon: 'code', description: 'Fails if the UI imports draft_store / create_draft directly.' },
        { id: 'tests-wal', name: 'test_sqlite_wal.py', type: 'file', icon: 'code' },
      ]},
      { id: 'tests-core', name: 'core/', type: 'folder', icon: 'folder', children: [
        { id: 'tests-cfg', name: 'test_config_azure_aliases.py', type: 'file', icon: 'code' },
      ]},
      { id: 'tests-genai', name: 'genai/', type: 'folder', icon: 'folder', children: [
        { id: 'tests-rag', name: 'test_rag_engine.py', type: 'file', icon: 'code' },
        { id: 'tests-pii', name: 'test_pii_scrubber.py', type: 'file', icon: 'code' },
        { id: 'tests-retry', name: 'test_azure_retries.py', type: 'file', icon: 'code' },
      ]},
      { id: 'tests-sub', name: 'submission/', type: 'folder', icon: 'folder', children: [
        { id: 'tests-val', name: 'test_validate_submission.py', type: 'file', icon: 'code' },
      ]},
    ],
  },
  {
    id: 'edu',
    name: 'educational_web_app/',
    type: 'folder',
    icon: 'folder',
    description: 'This static teaching SPA (separate docs/ADRs).',
    philosophy: 'Keeps assessor/peer onboarding content isolated from production Docs/ cascades.',
    children: [
      { id: 'edu-docs', name: 'docs/FACT_SHEET.md', type: 'file', icon: 'doc' },
      { id: 'edu-export', name: 'scripts/export_teaching_data.py', type: 'file', icon: 'code', description: 'Regenerates model numbers from Models/ops/ (npm run facts:check).' },
      { id: 'edu-src', name: 'src/content/facts.ts', type: 'file', icon: 'code', description: 'Locked teaching metrics (ADR-EDU-002).' },
    ],
  },
];

/** Extract ADR id from a tree node, if present. */
export function adrIdFromNode(node: TreeNode): string | undefined {
  return node.adrId;
}
