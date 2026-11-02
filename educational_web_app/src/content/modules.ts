import type { LucideIcon } from 'lucide-react';
import {
  Briefcase,
  Network,
  GitMerge,
  Database,
  BrainCircuit,
  Server,
  Lock,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  Box,
  GraduationCap,
  Compass,
  Repeat,
} from 'lucide-react';
import { formatOpsThreshold } from './facts';

export type ModuleId =
  | 'problem'
  | 'architecture'
  | 'workflows'
  | 'data'
  | 'ml'
  | 'serving'
  | 'friction'
  | 'genai'
  | 'rag'
  | 'ethics'
  | 'deploy'
  | 'mastery'
  | 'nextsteps'
  | 'practice';

export type InteractionKey =
  | 'viewedPersonas'
  | 'exploredTree'
  | 'completedWorkflow'
  | 'simulatedLeakage'
  | 'adjustedThreshold'
  | 'understoodServing'
  | 'rbacFrictionApproved'
  | 'validatedDraftWithScrub'
  | 'completedRagPath'
  | 'viewedFairness'
  | 'honestDeploy'
  | 'passedQuiz';

export interface ModuleConfig {
  id: ModuleId;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  interaction?: InteractionKey;
  blurb: string;
}

export const MODULES: ModuleConfig[] = [
  {
    id: 'problem',
    label: 'Problem & Stakeholders',
    shortLabel: '01 Problem',
    icon: Briefcase,
    interaction: 'viewedPersonas',
    blurb: 'Silent churn, ~$7.3M AUM at risk, Jamie / Morgan / Sam.',
  },
  {
    id: 'architecture',
    label: 'Repo & ADR Spine',
    shortLabel: '02 Repo',
    icon: Network,
    interaction: 'exploredTree',
    blurb: 'Real folder layout and why each ADR exists.',
  },
  {
    id: 'workflows',
    label: 'Ways of Working',
    shortLabel: '03 Working',
    icon: GitMerge,
    interaction: 'completedWorkflow',
    blurb: 'Split-Executor vs split-brain; AppLocker py -m pattern.',
  },
  {
    id: 'data',
    label: 'Label & Temporal FE',
    shortLabel: '04 Data',
    icon: Database,
    interaction: 'simulatedLeakage',
    blurb: 'ADR 004 churn definition; observation vs prediction.',
  },
  {
    id: 'ml',
    label: 'XGBoost & Ops Cut',
    shortLabel: '05 Model',
    icon: BrainCircuit,
    interaction: 'adjustedThreshold',
    blurb: `Beat the heuristic; ${formatOpsThreshold()} vs max-F1 0.475.`,
  },
  {
    id: 'serving',
    label: 'Serving Topology',
    shortLabel: '06 Serving',
    icon: Server,
    interaction: 'understoodServing',
    blurb: 'Streamlit → FastAPI (single enforcement point) → SQLite WAL.',
  },
  {
    id: 'friction',
    label: 'Friction-Gate & RBAC',
    shortLabel: '07 Friction',
    icon: Lock,
    interaction: 'rbacFrictionApproved',
    blurb: 'Roles, attention ack, Approve ≠ Sent.',
  },
  {
    id: 'genai',
    label: 'Prompty, Pydantic & ZDR',
    shortLabel: '08 GenAI',
    icon: Sparkles,
    interaction: 'validatedDraftWithScrub',
    blurb: 'Rate ≤3.5%, PII scrub required, Azure-prefer drafter.',
  },
  {
    id: 'rag',
    label: 'RAG under AppLocker',
    shortLabel: '09 RAG',
    icon: ShieldAlert,
    interaction: 'completedRagPath',
    blurb: 'See Chroma block, then packed pure-Python retrieve.',
  },
  {
    id: 'ethics',
    label: 'Fairness & Glass-Box',
    shortLabel: '10 Ethics',
    icon: ShieldCheck,
    interaction: 'viewedFairness',
    blurb: 'Measure + disclose; SHAP behavior-led.',
  },
  {
    id: 'deploy',
    label: 'Packaging (Honest)',
    shortLabel: '11 Deploy',
    icon: Box,
    interaction: 'honestDeploy',
    blurb: 'Docker smoke; ACA verified then torn down; maxReplicas: 1.',
  },
  {
    id: 'mastery',
    label: 'Mastery Assessment',
    shortLabel: '12 Mastery',
    icon: GraduationCap,
    interaction: 'passedQuiz',
    blurb: 'Gates + module checks + final quiz across 01–11.',
  },
  {
    id: 'nextsteps',
    label: 'Next Steps (not built)',
    shortLabel: '13 Next Steps',
    icon: Compass,
    blurb: 'Future work: registry, calibration, fairness gate, CI, cloud key check.',
  },
];

/** Daily practice view (spaced review + explain-it). Pinned above the learning path. */
export const PRACTICE: ModuleConfig = {
  id: 'practice',
  label: 'Practice',
  shortLabel: 'Practice',
  icon: Repeat,
  blurb: 'Spaced review of questions + explain-it answers.',
};
