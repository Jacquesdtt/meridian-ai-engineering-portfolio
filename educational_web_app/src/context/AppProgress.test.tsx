// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AppProgressProvider, useAppProgress } from './AppProgress';
import { VIVA, vivaCleared, vivaSignature } from '../content/viva';
import { ProgressDrawer } from '../components/layout/ProgressDrawer';

const prompt = VIVA[0];
const pass = { promptId: prompt.id, available: true, cleared: true, reachable: true, coveredCount: 4, totalPoints: 4, points: [], feedback: '', reason: '', gradedAt: 1 };

function Probe() {
  const p = useAppProgress();
  const state = p.viva[prompt.id];
  return <>
    <output data-testid="draft">{state?.draft ?? ''}</output>
    <output data-testid="pass">{vivaCleared(prompt, state) ? 'passed' : 'pending'}</output>
    <button onClick={() => p.saveViva(prompt.id, { draft: 'first answer' })}>Write</button>
    <button onClick={() => p.saveViva(prompt.id, { draft: 'second answer' })}>Edit</button>
    <button onClick={() => p.saveMarkedViva(prompt.id, 'first answer', 1, vivaSignature(prompt), pass)}>Late mark</button>
    <button onClick={() => p.saveMarkedViva(prompt.id, state?.draft ?? '', state?.revision ?? 0, vivaSignature(prompt), pass)}>Current mark</button>
  </>;
}

beforeEach(() => localStorage.clear());
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('actual provider behavior', () => {
  it('credits only the current marked answer', () => {
    render(<AppProgressProvider><Probe /></AppProgressProvider>);
    fireEvent.click(screen.getByText('Write'));
    fireEvent.click(screen.getByText('Current mark'));
    expect(screen.getByTestId('pass').textContent).toBe('passed');
    fireEvent.click(screen.getByText('Edit'));
    expect(screen.getByTestId('pass').textContent).toBe('pending');
    fireEvent.click(screen.getByText('Late mark'));
    expect(screen.getByTestId('pass').textContent).toBe('pending');
    expect(screen.getByTestId('draft').textContent).toBe('second answer');
  });

  it('recovers written work from v4 without a stale pass', () => {
    localStorage.setItem('meridian-edu-progress', JSON.stringify({ v: 4, activeModule: 'practice', interactions: { passedQuiz: true }, predictions: {}, cards: {}, viva: { [prompt.id]: { draft: 'my earlier work', checked: [], grade: pass } } }));
    render(<AppProgressProvider><Probe /></AppProgressProvider>);
    expect(screen.getByTestId('draft').textContent).toBe('my earlier work');
    expect(screen.getByTestId('pass').textContent).toBe('pending');
    expect(localStorage.getItem('meridian-edu-progress-backup')).toContain('my earlier work');
  });

  it('keeps work when reset is cancelled and removes it only after confirmation', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(<AppProgressProvider><Probe /><ProgressDrawer onClose={() => {}} /></AppProgressProvider>);
    fireEvent.click(screen.getByText('Write'));
    fireEvent.click(screen.getByText('Reset progress…'));
    expect(screen.getByTestId('draft').textContent).toBe('first answer');
    fireEvent.click(screen.getByText('Reset progress…'));
    expect(screen.getByTestId('draft').textContent).toBe('');
    expect(confirm).toHaveBeenCalledTimes(2);
  });

  it('keeps a written answer after reload', () => {
    const view = render(<AppProgressProvider><Probe /></AppProgressProvider>);
    fireEvent.click(screen.getByText('Write'));
    view.unmount();
    render(<AppProgressProvider><Probe /></AppProgressProvider>);
    expect(screen.getByTestId('draft').textContent).toBe('first answer');
  });

  it('warns when browser storage refuses a save', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    render(<AppProgressProvider><Probe /><ProgressDrawer onClose={() => {}} /></AppProgressProvider>);
    expect(screen.getByRole('alert').textContent).toMatch(/Export your work/);
  });
});
