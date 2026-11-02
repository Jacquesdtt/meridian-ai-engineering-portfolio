import { afterEach, describe, expect, it, vi } from 'vitest';
import { gradeAnswer, probeGrader } from './vivaGrader';
import { VIVA } from '../content/viva';

afterEach(() => vi.unstubAllGlobals());

describe('marker status probe', () => {
  it('distinguishes configured from reachable but unconfigured', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ azure_configured: true }) }).mockResolvedValueOnce({ ok: true, json: async () => ({ azure_configured: false }) }));
    expect(await probeGrader()).toBe('configured');
    expect(await probeGrader()).toBe('unconfigured');
  });
  it('does not call a malformed health response ready', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 'ok' }) }));
    expect(await probeGrader()).toBe('unknown');
  });
  it('reports an unreachable API', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    expect(await probeGrader()).toBe('unreachable');
  });
});
describe('marking an answer', () => {
  const prompt = VIVA[0];

  it('parses a successful grade response and rubric verdicts', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        prompt_id: prompt.id,
        available: true,
        cleared: true,
        covered_count: 4,
        total_points: 4,
        points: [
          { index: 0, point: 'Point 1', covered: true, evidence: 'quoted sentence', comment: '' },
        ],
        feedback: 'Well articulated.',
      }),
    }));

    const result = await gradeAnswer(prompt, 'My extensive written response explaining the silent churn mechanism in detail.');
    expect(result.reachable).toBe(true);
    expect(result.available).toBe(true);
    expect(result.cleared).toBe(true);
    expect(result.coveredCount).toBe(4);
    expect(result.points[0].evidence).toBe('quoted sentence');
  });

  it('handles HTTP refusal cleanly without throwing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      text: async () => 'Permission denied: demo role missing capability',
    }));

    const result = await gradeAnswer(prompt, 'My draft.');
    expect(result.reachable).toBe(true);
    expect(result.available).toBe(false);
    expect(result.cleared).toBe(false);
    expect(result.reason).toContain('HTTP 403');
  });

  it('handles unreachable network errors without throwing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    const result = await gradeAnswer(prompt, 'My draft.');
    expect(result.reachable).toBe(false);
    expect(result.available).toBe(false);
    expect(result.cleared).toBe(false);
    expect(result.reason).toContain('Could not reach the marker');
  });
});
