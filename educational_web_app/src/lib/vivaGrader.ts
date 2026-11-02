/**
 * Client for the Explain-it marker (ADR-EDU-003).
 *
 * The SPA holds no Azure key and never calls Azure. It posts the answer to the
 * Meridian FastAPI service, which marks it — the same "FastAPI is the single
 * enforcement point for every Azure-touching action" rule as ADR 015.
 *
 * Every failure path here resolves rather than throws: the caller needs to fall
 * back to self-grading with a banner, and an unreachable marker is not a failed
 * answer.
 */
import type { GradeResult, VivaPrompt } from '../content/viva';

export type { GradeResult, RubricVerdict } from '../content/viva';

/** Where the marker lives. Override with VITE_GRADER_API_URL in .env.local. */
export const GRADER_API_URL: string =
  (import.meta.env.VITE_GRADER_API_URL as string | undefined)?.replace(/\/$/, '') ??
  'http://127.0.0.1:8000';

/**
 * Demo role sent as X-Demo-Role. All three roles hold `use_viva_grader`, so this
 * is only here because the API refuses a missing header rather than defaulting.
 */
const DEMO_ROLE = 'data_scientist';

const GRADE_TIMEOUT_MS = 60_000;
const PROBE_TIMEOUT_MS = 2_000;

function unavailable(promptId: string, reason: string, reachable = true): GradeResult {
  return {
    promptId,
    reachable,
    available: false,
    cleared: false,
    coveredCount: 0,
    totalPoints: 0,
    points: [],
    feedback: '',
    reason,
    gradedAt: Date.now(),
  };
}

async function postJson(path: string, body: unknown, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(`${GRADER_API_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Demo-Role': DEMO_ROLE },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Is the marker reachable? Used to show the offline banner before the learner
 * writes an answer, so nobody types 200 words into a dead endpoint.
 */
export type GraderStatus = 'unreachable' | 'unconfigured' | 'configured' | 'unknown';

export async function probeGrader(): Promise<GraderStatus> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    const res = await fetch(`${GRADER_API_URL}/health`, { signal: controller.signal });
    if (!res.ok) return 'unreachable';
    let health: unknown;
    try { health = await res.json(); } catch { return 'unknown'; }
    if (!health || typeof health !== 'object' || !('azure_configured' in health) || typeof health.azure_configured !== 'boolean') return 'unknown';
    return health.azure_configured === true ? 'configured' : 'unconfigured';
  } catch {
    return 'unreachable';
  } finally {
    clearTimeout(timer);
  }
}

/** Submit one answer for marking. Never throws — check `available`. */
export async function gradeAnswer(prompt: VivaPrompt, answer: string): Promise<GradeResult> {
  let res: Response;
  try {
    res = await postJson(
      '/viva/grade',
      {
        prompt_id: prompt.id,
        prompt: prompt.prompt,
        rubric: prompt.rubric,
        answer,
      },
      GRADE_TIMEOUT_MS,
    );
  } catch {
    return unavailable(
      prompt.id,
      `Could not reach the marker at ${GRADER_API_URL}.`,
      false,
    );
  }

  if (!res.ok) {
    // 400/403 mean the API is up but refused us; 5xx means it broke. Either way
    // the learner needs the reason, not a stack trace.
    const detail = await res.text().catch(() => '');
    return unavailable(prompt.id, `Marker refused the request (HTTP ${res.status}). ${detail.slice(0, 200)}`);
  }

  try {
    const data = await res.json();
    return {
      promptId: String(data.prompt_id ?? prompt.id),
      reachable: true,
      available: Boolean(data.available),
      cleared: Boolean(data.cleared),
      coveredCount: Number(data.covered_count ?? 0),
      totalPoints: Number(data.total_points ?? 0),
      points: Array.isArray(data.points)
        ? data.points.map((p: Record<string, unknown>) => ({
            index: Number(p.index ?? 0),
            point: String(p.point ?? ''),
            covered: Boolean(p.covered),
            evidence: String(p.evidence ?? ''),
            comment: String(p.comment ?? ''),
          }))
        : [],
      feedback: String(data.feedback ?? ''),
      reason: String(data.reason ?? ''),
      gradedAt: Date.now(),
    };
  } catch {
    return unavailable(prompt.id, 'The marker returned something this app could not read.');
  }
}
