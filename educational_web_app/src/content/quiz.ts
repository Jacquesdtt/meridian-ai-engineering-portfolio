import { DEPLOY, MODEL, formatOpsThreshold } from './facts';

export interface QuizQuestion {
  id: string;
  prompt: string;
  choices: string[];
  correctIndex: number;
  explain: string;
}

export const QUIZ: QuizQuestion[] = [
  {
    id: 'q1',
    prompt: 'What is the locked historical AUM-at-risk baseline for Meridian?',
    choices: ['$84.0M', '~$7.3M / $7.27M', '$4.2M preserved annually', '$500k pilot budget'],
    correctIndex: 1,
    explain: 'Sprint 1 / PRD locked ≈ $7.27M (~$7.3M). Invented $84M funnels are wrong.',
  },
  {
    id: 'q2',
    prompt: 'Jamie (Arvind) primarily owns which concern?',
    choices: [
      'Ops budget and top-5% queue capacity',
      'Risk, HITL, ZDR, and Glass-Box audit',
      'Writing XGBoost hyperparameters',
      'Deploying to multi-replica ACA',
    ],
    correctIndex: 1,
    explain: 'Jamie ↔ Arvind = Risk & Compliance. Morgan ↔ Andy = Product/ops budget.',
  },
  {
    id: 'q3',
    prompt: `Why use ${formatOpsThreshold()} instead of max-F1 t=${MODEL.maxF1Threshold}?`,
    choices: [
      'It maximizes accuracy on the test set',
      'It matches a calibrated 70% probability',
      'Top-~5% capacity cut; far fewer false positives than max-F1',
      'Azure OpenAI requires scores above 0.7',
    ],
    correctIndex: 2,
    explain: 'Ops cut ≈ validation top-5% quantile. Max-F1 floods agents with ~12× more FPs.',
  },
  {
    id: 'q4',
    prompt: 'What does Approve mean in Friction-Gate?',
    choices: [
      'Email is automatically sent to the customer',
      'Draft is ready for human outbound outside the system (Approve ≠ Sent)',
      'Compliance has permanently locked the model',
      'The /send API endpoint queued the message',
    ],
    correctIndex: 1,
    explain: 'ADR 003: no /send. Approved ≠ Sent.',
  },
  {
    id: 'q5',
    prompt: 'Why was ChromaDB rejected for the Methodology RAG bot?',
    choices: [
      'Cosine similarity is illegal in banking',
      'AppLocker / corporate constraints — use Azure embed + pure-Python rank',
      'Chroma cannot store markdown',
      'Jamie forbade all embeddings',
    ],
    correctIndex: 1,
    explain: 'ADR 010: AppLocker-safe in-memory RAG; no native vector DB binaries.',
  },
  {
    id: 'q6',
    prompt: 'Split-Executor vs split-brain — which is correct?',
    choices: [
      'They are the same: two Streamlit replicas',
      'Split-Executor = agent workflow; split-brain = multi-replica SQLite divergence',
      'Split-brain is the SHAP waterfall layout',
      'Split-Executor means dual Azure keys',
    ],
    correctIndex: 1,
    explain: 'Do not conflate the agent Split-Executor pattern with ADR 008 split-brain topology.',
  },
  {
    id: 'q7',
    prompt: 'What success metric did Meridian optimize for vs the heuristic?',
    choices: [
      'Accuracy > 90%',
      'PR-AUC and ROC-AUC beating gone_this_month',
      'Brier score after Platt scaling',
      'Equalized Odds = 0',
    ],
    correctIndex: 1,
    explain: `DoD: beat heuristic on PR-AUC (${MODEL.prAuc.model} vs ${MODEL.prAuc.heuristic}) and ROC-AUC (${MODEL.rocAuc.model} vs ${MODEL.rocAuc.heuristic}). Accuracy is an anti-pattern.`,
  },
  {
    id: 'q8',
    prompt: 'Is Azure Container Apps production hosting live in this project?',
    choices: [
      'Yes — multi-replica HA at a public URL',
      DEPLOY.status,
      'Only GitHub Pages hosts the model',
      'Deployed exclusively to Azure App Service Web Apps',
    ],
    correctIndex: 1,
    explain: 'ACA was deployed and verified on 2026-09-24, then torn down. There is no standing URL; the later API-key gate still needs live verification. ADR 008 limits SQLite to one replica.',
  },
  {
    id: 'q9',
    prompt: 'Which model is shipped in production serving for Meridian?',
    choices: [
      'LightGBM (faster trees, so we switched)',
      'XGBoost binary:logistic (LightGBM was never trained)',
      'A TabFM / foundation model fine-tune',
      'Always-predict-negative heuristic only',
    ],
    correctIndex: 1,
    explain: 'FACT_SHEET anti-claim #1: do not teach LightGBM as the shipped model. Core = XGBoost.',
  },
  {
    id: 'q10',
    prompt: 'A high-balance account with zero transactions this month — is that churn?',
    choices: [
      'Yes — dormancy always means churn',
      'No — high-balance dormancy is NOT churn while AUM is still held',
      'Yes if age_years > 65',
      'Only if state is California',
    ],
    correctIndex: 1,
    explain: 'ADR 004 / FACT_SHEET: churn needs next-month zero balance AND inactive. Dormancy ≠ churn.',
  },
  {
    id: 'q11',
    prompt: `Should the grading submission CSV apply the ops threshold (≈${MODEL.opsThreshold}) as hard labels?`,
    choices: [
      `Yes — convert every score ≥ ${MODEL.opsThreshold} to 1`,
      'No — submission carries continuous probabilities only (ADR 014)',
      'Yes if LightGBM is used',
      'Only for the heuristic baseline rows',
    ],
    correctIndex: 1,
    explain: 'Anti-claim #13 / ADR 014: do not apply the ops cut to the submission CSV.',
  },
  {
    id: 'q12',
    prompt: 'Where are Friction-Gate drafts currently stored?',
    choices: [
      'PostgreSQL on Azure',
      'SQLite WAL draft/audit DB (not PostgreSQL)',
      'Chroma collections',
      'Only in browser localStorage',
    ],
    correctIndex: 1,
    explain: 'Anti-claim #15: SQLite is the current store (ADR 006). PostgreSQL is not shipped.',
  },
];
