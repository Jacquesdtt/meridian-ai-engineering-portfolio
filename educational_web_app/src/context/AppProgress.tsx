import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import type { GradeResult } from '../content/viva';
import type { InteractionKey, ModuleId } from '../content/modules';
import { MODULES } from '../content/modules';
import { acceptGrade, changeDraft, decodeProgress, emptyProgress, encodeProgress, importProgress } from './progressState';
import type { SavedProgress } from './progressState';

export type Interactions = Record<InteractionKey, boolean>;
/** Predict-then-reveal answers (chosen index) per module. */
export type Predictions = Partial<Record<ModuleId, number>>;

/** Leitner card for one question: box 0 = due now … box 4 = well known. */
export interface Card {
  box: number;
  due: number;
  seen: number;
  correct: number;
  lastCorrect: boolean;
  /**
   * True only when the most recent answer was correct on the FIRST attempt of a
   * fresh presentation. Retrying after the answer was revealed still advances the
   * Leitner box, but it does not clear a module check — see moduleCheckPassed.
   */
  cleanPass: boolean;
}

/** Explain-it practice state for one prompt. */
export interface VivaState {
  draft: string;
  /**
   * Self-ticked rubric points. Kept as the offline fallback only — these no
   * longer clear a prompt (ADR-EDU-003); `grade` does.
   */
  checked: number[];
  scoredAt?: number;
  /** Answer to the adversarial follow-up. */
  challengeDraft?: string;
  /** Last verdict from the marker. `available: false` means not marked, not failed. */
  grade?: GradeResult;
  revision?: number;
  gradedRevision?: number;
  rubricSignature?: string;
}

/** Where the Practice view should open (not persisted). */
export interface PracticeTarget {
  tab: 'review' | 'explain';
  vivaId?: string;
}

const DAY = 24 * 60 * 60 * 1000;
/** Days until a card is due again after a correct answer, by the box it moves into. */
export const BOX_INTERVAL_DAYS = [0, 1, 3, 7, 14];

const DEFAULT_INTERACTIONS: Interactions = {
  viewedPersonas: false,
  exploredTree: false,
  completedWorkflow: false,
  simulatedLeakage: false,
  adjustedThreshold: false,
  understoodServing: false,
  rbacFrictionApproved: false,
  validatedDraftWithScrub: false,
  completedRagPath: false,
  viewedFairness: false,
  honestDeploy: false,
  passedQuiz: false,
};

const STORAGE_KEY = 'meridian-edu-progress';
const BACKUP_KEY = 'meridian-edu-progress-backup';
function load() {
  try {
    const decoded = decodeProgress(localStorage.getItem(STORAGE_KEY));
    if (decoded.recoveryRaw) {
      try { localStorage.setItem(BACKUP_KEY, decoded.recoveryRaw); }
      catch { return { ...decoded, warning: `${decoded.warning} Browser storage could not keep an original backup; export it now.` }; }
    }
    return { ...decoded, recoveryRaw: decoded.recoveryRaw ?? localStorage.getItem(BACKUP_KEY) ?? undefined };
  }
  catch { return { state: emptyProgress(), warning: 'Browser storage is unavailable. Export your work before closing this tab.' }; }
}

interface AppProgressContextValue {
  activeModule: ModuleId;
  setActiveModule: (id: ModuleId) => void;
  interactions: Interactions;
  setInteraction: (key: InteractionKey, value?: boolean) => void;
  predictions: Predictions;
  setPrediction: (id: ModuleId, choice: number) => void;
  cards: Record<string, Card>;
  recordAnswer: (questionId: string, correct: boolean, firstAttempt?: boolean) => void;
  viva: Record<string, VivaState>;
  saveViva: (id: string, patch: Partial<VivaState>) => void;
  saveMarkedViva: (id: string, draft: string, revision: number, rubricSignature: string, result: GradeResult) => void;
  lastTabs: SavedProgress['lastTabs'];
  setLastTab: (id: ModuleId, tab: 'learn' | 'explore' | 'check') => void;
  storageWarning: string | null;
  recoveryRaw?: string;
  exportProgress: () => string;
  importProgressFile: (raw: string) => void;
  practiceTarget: PracticeTarget;
  openPractice: (target: PracticeTarget) => void;
  resetSandbox: () => void;
  mobileMenuOpen: boolean;
  toggleMobileMenu: () => void;
  completedCount: number;
  totalInteractions: number;
}

const AppProgressContext = createContext<AppProgressContextValue | null>(null);

export function AppProgressProvider({ children }: { children: React.ReactNode }) {
  const [initial] = useState(load);
  const [state, setState] = useState<SavedProgress>(initial.state);
  const [storageWarning, setStorageWarning] = useState<string | null>(initial.warning ?? null);
  const [recoveryRaw] = useState(initial.recoveryRaw);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [practiceTarget, setPracticeTarget] = useState<PracticeTarget>({ tab: 'review' });

  const openPractice = useCallback((target: PracticeTarget) => {
    setPracticeTarget(target);
    setState((s) => ({ ...s, activeModule: 'practice' }));
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      setStorageWarning('Browser storage is unavailable. Export your work before closing this tab.');
    }
  }, [state]);

  const setActiveModule = useCallback((id: ModuleId) => {
    setState((s) => ({ ...s, activeModule: id }));
  }, []);

  const setPrediction = useCallback((id: ModuleId, choice: number) => {
    setState((s) => ({ ...s, predictions: { ...s.predictions, [id]: choice } }));
  }, []);

  const setInteraction = useCallback((key: InteractionKey, value = true) => {
    setState((s) => ({ ...s, interactions: { ...s.interactions, [key]: value } }));
  }, []);

  const recordAnswer = useCallback((questionId: string, correct: boolean, firstAttempt = true) => {
    setState((s) => {
      const prev = s.cards[questionId] ?? { box: 0, due: 0, seen: 0, correct: 0, lastCorrect: false, cleanPass: false };
      const box = correct ? Math.min(prev.box + 1, BOX_INTERVAL_DAYS.length - 1) : 0;
      const card: Card = {
        box,
        due: Date.now() + BOX_INTERVAL_DAYS[box] * DAY,
        seen: prev.seen + 1,
        correct: prev.correct + (correct ? 1 : 0),
        lastCorrect: correct,
        // Seeing the answer and then retrying is useful practice but it is not a pass:
        // the question has to be met cold again (here or in Practice) to clear the check.
        cleanPass: correct && firstAttempt,
      };
      return { ...s, cards: { ...s.cards, [questionId]: card } };
    });
  }, []);

  const saveViva = useCallback((id: string, patch: Partial<VivaState>) => {
    setState((s) => {
      const prev = s.viva[id] ?? { draft: '', checked: [] };
      const next = typeof patch.draft === 'string' ? changeDraft(prev, patch.draft) : prev;
      const edited = typeof patch.draft === 'string' && patch.draft !== prev.draft;
      return { ...s, interactions: edited ? { ...s.interactions, passedQuiz: false } : s.interactions,
        viva: { ...s.viva, [id]: { ...next, ...patch, ...(edited ? { grade: undefined, gradedRevision: undefined, rubricSignature: undefined } : {}) } } };
    });
  }, []);

  const saveMarkedViva = useCallback((id: string, draft: string, revision: number, rubricSignature: string, result: GradeResult) => {
    setState((s) => {
      const prev = s.viva[id];
      if (!prev) return s;
      const next = acceptGrade(prev, draft, revision, rubricSignature, result, id);
      return next === prev ? s : { ...s, interactions: result.cleared ? s.interactions : { ...s.interactions, passedQuiz: false }, viva: { ...s.viva, [id]: next } };
    });
  }, []);

  const setLastTab = useCallback((id: ModuleId, tab: 'learn' | 'explore' | 'check') => {
    setState((s) => ({ ...s, lastTabs: { ...s.lastTabs, [id]: tab } }));
  }, []);

  const exportProgress = useCallback(() => encodeProgress(state), [state]);
  const importProgressFile = useCallback((raw: string) => {
    const imported = importProgress(raw);
    setState(imported);
    setStorageWarning(null);
  }, []);

  const resetSandbox = useCallback(() => {
    setState(emptyProgress());
  }, []);

  const toggleMobileMenu = useCallback(() => {
    setMobileMenuOpen((v) => !v);
  }, []);

  const totalInteractions = Object.keys(DEFAULT_INTERACTIONS).length;
  const completedCount = Object.values(state.interactions).filter(Boolean).length;

  const value = useMemo(
    () => ({
      activeModule: state.activeModule,
      setActiveModule,
      interactions: state.interactions,
      setInteraction,
      predictions: state.predictions,
      setPrediction,
      cards: state.cards,
      recordAnswer,
      viva: state.viva,
      saveViva,
      saveMarkedViva,
      lastTabs: state.lastTabs,
      setLastTab,
      storageWarning,
      recoveryRaw,
      exportProgress,
      importProgressFile,
      practiceTarget,
      openPractice,
      resetSandbox,
      mobileMenuOpen,
      toggleMobileMenu,
      completedCount,
      totalInteractions,
    }),
    [
      state,
      setActiveModule,
      setInteraction,
      setPrediction,
      recordAnswer,
      saveViva,
      saveMarkedViva,
      setLastTab,
      storageWarning,
      recoveryRaw,
      exportProgress,
      importProgressFile,
      practiceTarget,
      openPractice,
      resetSandbox,
      mobileMenuOpen,
      toggleMobileMenu,
      completedCount,
      totalInteractions,
    ],
  );

  return <AppProgressContext.Provider value={value}>{children}</AppProgressContext.Provider>;
}

export function useAppProgress() {
  const ctx = useContext(AppProgressContext);
  if (!ctx) throw new Error('useAppProgress must be used within AppProgressProvider');
  return ctx;
}

export function interactionLabel(key: InteractionKey): string {
  const mod = MODULES.find((m) => m.interaction === key);
  return mod ? mod.label : key;
}
