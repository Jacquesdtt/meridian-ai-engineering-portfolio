/** One definition of progress for header, navigation, and final assessment. */
import { MODULES } from '../content/modules';
import { moduleCheckPassed } from '../content/questions';
import { VIVA, VIVA_REQUIRED, vivaCleared } from '../content/viva';
import type { SavedProgress } from './progressState';

export const LESSON_MODULES = MODULES.filter((m) => m.interaction && m.id !== 'mastery');

export function progressSummary(state: Pick<SavedProgress, 'interactions' | 'cards' | 'viva' | 'predictions'>) {
  const exposure = LESSON_MODULES.filter((m) => m.interaction && state.interactions[m.interaction]).length;
  const checks = LESSON_MODULES.filter((m) => moduleCheckPassed(m.id, state.cards)).length;
  const predictions = LESSON_MODULES.filter((m) => state.predictions[m.id] !== undefined).length;
  const viva = VIVA.filter((v) => vivaCleared(v, state.viva[v.id])).length;
  return { exposure, checks, predictions, viva, vivaRequired: VIVA_REQUIRED, total: LESSON_MODULES.length,
    readyForQuiz: exposure === LESSON_MODULES.length && checks === LESSON_MODULES.length && viva >= VIVA_REQUIRED,
  };
}

export function moduleComplete(id: typeof MODULES[number]['id'], state: Pick<SavedProgress, 'interactions' | 'cards' | 'predictions'>) {
  const mod = MODULES.find((m) => m.id === id);
  return id === 'mastery' ? state.interactions.passedQuiz : Boolean(mod?.interaction && state.interactions[mod.interaction] && state.predictions[id] !== undefined && moduleCheckPassed(id, state.cards));
}
