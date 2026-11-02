/**
 * The shape of one lesson: which step comes first, and what the single next
 * action is at any moment. Kept out of the components so the tab strip, the
 * footer and the progress drawer cannot disagree about where the learner is.
 */
import { MODULES } from '../../content/modules';
import type { ModuleId } from '../../content/modules';
import { moduleCheckPassed } from '../../content/questions';
import { LESSON_MODULES, moduleComplete, progressSummary } from '../../context/progressSelectors';
import type { Card, Interactions, Predictions } from '../../context/AppProgress';
import type { VivaState } from '../../context/AppProgress';

export type LessonTab = 'learn' | 'explore' | 'check';

/**
 * Modules whose demo teaches better than their prose does: you should drag the
 * threshold and watch the false positives explode before anyone explains
 * precision to you. For these the Explore step comes first and the prediction
 * lands afterwards, when you have something to predict about.
 */
export const EXPLORE_FIRST: ModuleId[] = ['ml', 'friction', 'rag'];

export const isExploreFirst = (id: ModuleId) => EXPLORE_FIRST.includes(id);

/** Step order for this module, first step first. */
export function tabOrder(id: ModuleId): LessonTab[] {
  return isExploreFirst(id) ? ['explore', 'learn', 'check'] : ['learn', 'explore', 'check'];
}

export function tabLabel(tab: LessonTab): string {
  return tab === 'learn' ? 'Learn & predict' : tab === 'explore' ? 'Explore' : 'Check';
}

/** Where to open a module the learner has not pinned to a step yet. */
export function defaultTab(id: ModuleId, predictions: Predictions): LessonTab {
  const order = tabOrder(id);
  if (isExploreFirst(id)) return order[0];
  return predictions[id] === undefined ? 'learn' : 'explore';
}

export interface FlowState {
  activeModule: ModuleId;
  interactions: Interactions;
  predictions: Predictions;
  cards: Record<string, Card>;
  viva: Record<string, VivaState>;
}

export interface NextAction {
  label: string;
  /** Why this is the next thing, in one short clause. */
  detail: string;
  moduleId: ModuleId;
  tab?: LessonTab;
  /** Which Practice view to open, when the next move is Practice. */
  practiceTab?: 'review' | 'explain';
}

const shortLabel = (id: ModuleId) => MODULES.find((m) => m.id === id)?.shortLabel ?? id;

/** The one thing to do next. Never returns null: there is always a next move. */
export function nextAction(state: FlowState): NextAction {
  const { activeModule, interactions, predictions, cards } = state;
  const summary = progressSummary(state);
  const lesson = LESSON_MODULES.find((m) => m.id === activeModule);

  if (lesson) {
    const explored = Boolean(lesson.interaction && interactions[lesson.interaction]);
    const predicted = predictions[activeModule] !== undefined;
    const checked = moduleCheckPassed(activeModule, cards);
    const exploreFirst = isExploreFirst(activeModule);

    if (exploreFirst && !explored) {
      return { label: 'Try the demo first', detail: 'this one is easier to feel than to read', moduleId: activeModule, tab: 'explore' };
    }
    if (!predicted) {
      return { label: 'Make your prediction', detail: 'commit to an answer before the explanation', moduleId: activeModule, tab: 'learn' };
    }
    if (!explored) {
      return { label: 'Explore the demo', detail: 'the prediction is only worth something once you test it', moduleId: activeModule, tab: 'explore' };
    }
    if (!checked) {
      return { label: 'Take the module check', detail: 'answer cold to clear this module', moduleId: activeModule, tab: 'check' };
    }
  }

  const nextIncomplete = LESSON_MODULES.find((m) => m.id !== activeModule && !moduleComplete(m.id, state))
    ?? LESSON_MODULES.find((m) => !moduleComplete(m.id, state));

  if (nextIncomplete) {
    return {
      label: `Next: ${shortLabel(nextIncomplete.id)}`,
      detail: lesson ? 'this module is done' : 'back to the learning path',
      moduleId: nextIncomplete.id,
    };
  }

  if (summary.viva < summary.vivaRequired) {
    return {
      label: 'Practise a written explanation',
      detail: `${summary.viva} of ${summary.vivaRequired} marked so far`,
      moduleId: 'practice',
      practiceTab: 'explain',
    };
  }

  if (activeModule !== 'mastery' && !interactions.passedQuiz) {
    return { label: 'Take the final quiz', detail: 'every module and explanation is cleared', moduleId: 'mastery' };
  }

  return { label: 'Review what is due', detail: 'spaced review keeps this from fading', moduleId: 'practice', practiceTab: 'review' };
}
