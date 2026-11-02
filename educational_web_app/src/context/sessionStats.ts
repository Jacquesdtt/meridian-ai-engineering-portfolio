/**
 * Honest stats for the current sitting: how many questions were met, how many
 * were right cold, and how long the learner has been at it.
 *
 * Deliberately NOT persisted and deliberately not a streak or an XP score. A
 * number that survives the tab would have to be defended (which day? which
 * timezone? what counts as a day missed?), and an invented currency would
 * undercut the honesty the rest of the app is built on — see ADR-EDU-002 on the
 * mastery quiz being an honour-system self-check. This resets when the tab does,
 * which is exactly what "this session" means.
 */
import { useSyncExternalStore } from 'react';

export interface SessionStats {
  /** Questions answered in this sitting, counting retries. */
  answered: number;
  /** Answered correctly on the first attempt of a fresh presentation. */
  firstTry: number;
  /** Written explanations submitted for marking in this sitting. */
  explained: number;
  startedAt: number;
}

let stats: SessionStats = { answered: 0, firstTry: 0, explained: 0, startedAt: Date.now() };
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function recordSessionAnswer(correct: boolean, firstAttempt: boolean) {
  stats = {
    ...stats,
    answered: stats.answered + 1,
    firstTry: stats.firstTry + (correct && firstAttempt ? 1 : 0),
  };
  emit();
}

export function recordSessionExplanation() {
  stats = { ...stats, explained: stats.explained + 1 };
  emit();
}

/** Test seam: start a fresh sitting. */
export function resetSessionStats() {
  stats = { answered: 0, firstTry: 0, explained: 0, startedAt: Date.now() };
  emit();
}

export function useSessionStats(): SessionStats {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    () => stats,
    () => stats,
  );
}

/** "14 min" / "just started" — whole minutes only, no false precision. */
export function sessionMinutes(from: number, now = Date.now()): number {
  return Math.max(0, Math.round((now - from) / 60000));
}
