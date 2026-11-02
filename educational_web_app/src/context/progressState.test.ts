import { describe, expect, it } from 'vitest';
import { acceptGrade, changeDraft, decodeProgress, emptyProgress, encodeProgress, importProgress } from './progressState';

const pass = { promptId: 'v-problem', available: true, cleared: true, reachable: true, coveredCount: 4, totalPoints: 4, points: [], feedback: '', reason: '', gradedAt: 1 };

describe('saved learning and marking', () => {
  it('invalidates a pass when the answer changes', () => {
    const written = changeDraft({ draft: '', checked: [] }, 'first answer');
    const marked = acceptGrade(written, 'first answer', written.revision, 'rubric-v1', pass);
    expect(marked.grade?.cleared).toBe(true);
    expect(changeDraft(marked, 'different answer').grade).toBeUndefined();
  });

  it('rejects a late grade after editing, including edit then revert', () => {
    const original = changeDraft({ draft: '', checked: [] }, 'first answer');
    const changed = changeDraft(original, 'other answer');
    const reverted = changeDraft(changed, 'first answer');
    expect(acceptGrade(reverted, original.draft, original.revision, 'rubric-v1', pass).grade).toBeUndefined();
  });

  it('rejects a grade returned for a different prompt', () => {
    const written = changeDraft({ draft: '', checked: [] }, 'my answer');
    expect(acceptGrade(written, written.draft, written.revision ?? 0, 'rubric-v1', { ...pass, promptId: 'wrong' }, 'v-problem').grade).toBeUndefined();
  });

  it('recovers a v4 draft without carrying forward its old mastery credit', () => {
    const old = { ...emptyProgress(), v: 4, interactions: { passedQuiz: true }, viva: { 'v-problem': { draft: 'my work', checked: [], grade: pass } } };
    const decoded = decodeProgress(JSON.stringify(old));
    expect(decoded.state.viva['v-problem'].draft).toBe('my work');
    expect(decoded.state.viva['v-problem'].grade).toBeUndefined();
    expect(decoded.state.interactions.passedQuiz).toBe(false);
    expect(decoded.warning).toBeTruthy();
  });

  it('round trips validated progress and rejects malformed imports', () => {
    const original = emptyProgress();
    original.viva['v-problem'] = changeDraft({ draft: '', checked: [] }, 'kept');
    expect(importProgress(encodeProgress(original)).viva['v-problem'].draft).toBe('kept');
    expect(() => importProgress('{broken')).toThrow();
    expect(() => importProgress(JSON.stringify({ v: 5, viva: [] }))).toThrow();
  });
});
