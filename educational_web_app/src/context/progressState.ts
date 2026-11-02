/** Validated local progress and answer-version checks for the self-study app. */
import { VIVA, VIVA_REQUIRED, vivaCleared } from '../content/viva';
import type { GradeResult } from '../content/viva';
import type { InteractionKey, ModuleId } from '../content/modules';
import { MODULES } from '../content/modules';

export interface SavedViva {
  draft: string;
  checked: number[];
  challengeDraft?: string;
  scoredAt?: number;
  grade?: GradeResult;
  revision?: number;
  gradedRevision?: number;
  rubricSignature?: string;
}

export interface SavedCard {
  box: number;
  due: number;
  seen: number;
  correct: number;
  lastCorrect: boolean;
  cleanPass: boolean;
}

export interface SavedProgress {
  v: 5;
  activeModule: ModuleId;
  lastTabs: Partial<Record<ModuleId, 'learn' | 'explore' | 'check'>>;
  interactions: Record<InteractionKey, boolean>;
  predictions: Partial<Record<ModuleId, number>>;
  cards: Record<string, SavedCard>;
  viva: Record<string, SavedViva>;
}

const KEYS: InteractionKey[] = [
  'viewedPersonas', 'exploredTree', 'completedWorkflow', 'simulatedLeakage',
  'adjustedThreshold', 'understoodServing', 'rbacFrictionApproved',
  'validatedDraftWithScrub', 'completedRagPath', 'viewedFairness',
  'honestDeploy', 'passedQuiz',
];

const object = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

export function emptyProgress(): SavedProgress {
  return {
    v: 5,
    activeModule: 'problem',
    lastTabs: {},
    interactions: Object.fromEntries(KEYS.map((k) => [k, false])) as Record<InteractionKey, boolean>,
    predictions: {}, cards: {}, viva: {},
  };
}

/** A changed draft has a new revision; no old grade can certify it. */
export function changeDraft(state: SavedViva, draft: string): SavedViva {
  if (draft === state.draft) return state;
  return { ...state, draft, revision: (state.revision ?? 0) + 1, grade: undefined, gradedRevision: undefined, rubricSignature: undefined };
}

/** Ignore an answer returned after the learner changed the submitted draft. */
export function acceptGrade(state: SavedViva, draft: string, revision: number, rubricSignature: string, grade: GradeResult, promptId?: string): SavedViva {
  if (state.draft !== draft || (state.revision ?? 0) !== revision || (promptId && grade.promptId !== promptId)) return state;
  return { ...state, grade, scoredAt: Date.now(), gradedRevision: revision, rubricSignature };
}

/** Recover only well-shaped fields. Older scores are not valid under v5. */
export function decodeProgress(raw: string | null): { state: SavedProgress; warning?: string; recoveryRaw?: string } {
  const state = emptyProgress();
  if (!raw) return { state };
  let source: unknown;
  try { source = JSON.parse(raw); } catch { return { state, warning: 'Saved progress could not be read. Export the original data before resetting.', recoveryRaw: raw }; }
  if (!object(source)) return { state, warning: 'Saved progress has an invalid format.', recoveryRaw: raw };
  const current = source.v === 5;
  const old = source.v === 4;
  if (!current && !old) return { state, warning: 'An older progress format was found. Recoverable writing is shown below; export the original before resetting.', recoveryRaw: raw, ...recoverDrafts(state, source) };
  if (!object(source.viva) || !object(source.cards) || !object(source.interactions) || !object(source.predictions)) {
    return { state, warning: 'Saved progress has an invalid format. Export the original before resetting.', recoveryRaw: raw };
  }
  state.activeModule = MODULES.some((m) => m.id === source.activeModule) || source.activeModule === 'practice'
    ? source.activeModule as ModuleId : 'problem';
  for (const key of KEYS) state.interactions[key] = key !== 'passedQuiz' || current ? source.interactions[key] === true : false;
  for (const [id, value] of Object.entries(source.predictions)) {
    if (MODULES.some((m) => m.id === id) && Number.isInteger(value) && (value as number) >= 0) state.predictions[id as ModuleId] = value as number;
  }
  for (const [id, value] of Object.entries(source.cards)) {
    if (object(value) && Number.isInteger(value.box) && typeof value.due === 'number' && typeof value.cleanPass === 'boolean') {
      state.cards[id] = value as unknown as SavedCard;
    }
  }
  recoverDrafts(state, source);
  if (state.interactions.passedQuiz && VIVA.filter((prompt) => vivaCleared(prompt, state.viva[prompt.id])).length < VIVA_REQUIRED) {
    state.interactions.passedQuiz = false;
  }
  if (current && object(source.lastTabs)) {
    for (const [id, tab] of Object.entries(source.lastTabs)) {
      if (MODULES.some((m) => m.id === id) && (tab === 'learn' || tab === 'explore' || tab === 'check')) state.lastTabs[id as ModuleId] = tab;
    }
  }
  return { state, ...(old ? { warning: 'Older progress was recovered. Explain-it grades and final mastery need to be earned again.', recoveryRaw: raw } : {}) };
}

function recoverDrafts(state: SavedProgress, source: Record<string, unknown>) {
  if (!object(source.viva)) return { state };
  for (const [id, value] of Object.entries(source.viva)) {
    if (!object(value) || typeof value.draft !== 'string') continue;
    const entry: SavedViva = {
      draft: value.draft,
      checked: Array.isArray(value.checked) ? value.checked.filter((n): n is number => Number.isInteger(n)) : [],
      revision: currentRevision(value),
      ...(typeof value.challengeDraft === 'string' ? { challengeDraft: value.challengeDraft } : {}),
    };
    if (source.v === 5 && object(value.grade) && value.grade.promptId === id && typeof value.grade.available === 'boolean' &&
      value.gradedRevision === entry.revision && typeof value.rubricSignature === 'string') {
      entry.grade = value.grade as unknown as GradeResult;
      entry.gradedRevision = entry.revision;
      entry.rubricSignature = value.rubricSignature;
      if (typeof value.scoredAt === 'number') entry.scoredAt = value.scoredAt;
    }
    state.viva[id] = entry;
  }
  return { state };
}

function currentRevision(value: Record<string, unknown>): number {
  return Number.isInteger(value.revision) && (value.revision as number) >= 0 ? value.revision as number : 0;
}

export function encodeProgress(state: SavedProgress): string { return JSON.stringify(state, null, 2); }

export function importProgress(raw: string): SavedProgress {
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new Error('The file is not valid JSON.'); }
  if (!object(parsed) || parsed.v !== 5 || !object(parsed.viva) || !object(parsed.cards) || !object(parsed.interactions) || !object(parsed.predictions)) {
    throw new Error('This is not a supported Meridian progress export.');
  }
  return decodeProgress(raw).state;
}
