/** Learner-owned progress summary, backup, restore, and guarded reset. */
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { LESSON_MODULES, moduleComplete, progressSummary } from '../../context/progressSelectors';
import { useAppProgress } from '../../context/AppProgress';
import { useDialogFocus } from './useDialogFocus';

function download(name: string, contents: string) {
  const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ProgressDrawer({ onClose }: { onClose: () => void }) {
  const p = useAppProgress();
  const [error, setError] = useState('');
  const summary = progressSummary(p);
  const dialogRef = useDialogFocus(onClose);

  const restore = async (file?: File) => {
    if (!file) return;
    try {
      const raw = await file.text();
      if (!window.confirm('Replace progress on this device with this export? Export your current work first if you want a backup.')) return;
      p.importProgressFile(raw);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not read this file.');
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <aside ref={dialogRef} role="dialog" aria-modal="true" aria-label="Learning progress" className="relative w-full max-w-lg h-full bg-slate-950 border-l border-slate-800 flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-slate-800">
          <h2 className="font-semibold text-slate-100">Learning progress</h2>
          <button autoFocus type="button" onClick={onClose} aria-label="Close progress" className="px-3 py-1 text-slate-300">Close</button>
        </div>
        <div className="overflow-y-auto p-5 space-y-5 text-sm">
          {p.storageWarning && <p role="alert" className="border border-amber-700 rounded-lg p-3 text-amber-200">{p.storageWarning}</p>}
          <p className="text-slate-400">Exploration, recall and written explanations are separate steps. The final quiz opens after all requirements are met.</p>
          <dl className="grid grid-cols-2 gap-3">
            <div><dt className="text-slate-500">Exploration</dt><dd className="font-semibold">{summary.exposure}/{summary.total}</dd></div>
            <div><dt className="text-slate-500">Predictions</dt><dd className="font-semibold">{summary.predictions}/{summary.total}</dd></div>
            <div><dt className="text-slate-500">Recall checks</dt><dd className="font-semibold">{summary.checks}/{summary.total}</dd></div>
            <div><dt className="text-slate-500">Marked explanations</dt><dd className="font-semibold">{summary.viva}/{summary.vivaRequired} needed</dd></div>
          </dl>
          <div className="space-y-2">
            <h3 className="font-semibold text-slate-200">Next lesson steps</h3>
            <button type="button" className="block text-blue-300 underline" onClick={onClose}>Continue where I left off</button>
            <button type="button" className="block text-blue-300 underline" onClick={() => { p.openPractice({ tab: 'review' }); onClose(); }}>Review due questions</button>
            {LESSON_MODULES.filter((m) => !moduleComplete(m.id, p)).slice(0, 6).map((m) => (
              <button key={m.id} type="button" className="block text-blue-300 underline text-left" onClick={() => { p.setActiveModule(m.id); onClose(); }}>
                {m.shortLabel}: {!p.predictions[m.id] && p.predictions[m.id] !== 0 ? 'make a prediction' : m.interaction && !p.interactions[m.interaction] ? 'explore the demo' : 'pass the recall check'}
              </button>
            ))}
            {summary.viva < summary.vivaRequired && <button type="button" className="block text-blue-300 underline" onClick={() => { p.openPractice({ tab: 'explain' }); onClose(); }}>Practise a written explanation</button>}
            {summary.readyForQuiz && <button type="button" className="block text-blue-300 underline" onClick={() => { p.setActiveModule('mastery'); onClose(); }}>Take the final quiz</button>}
          </div>
          <div className="border-t border-slate-800 pt-4 space-y-3">
            <h3 className="font-semibold text-slate-200">Keep a copy</h3>
            <button type="button" className="block text-blue-300 underline" onClick={() => download('meridian-progress.json', p.exportProgress())}>Export progress</button>
            {p.recoveryRaw && <button type="button" className="block text-amber-300 underline" onClick={() => download('meridian-original-progress.json', p.recoveryRaw!)}>Export original saved data</button>}
            <label className="block text-blue-300 underline cursor-pointer">Import a progress export
              <input type="file" accept="application/json,.json" className="sr-only" onChange={(e) => { void restore(e.target.files?.[0]); e.target.value = ''; }} />
            </label>
            {error && <p role="alert" className="text-red-300">{error}</p>}
          </div>
          <div className="border-t border-slate-800 pt-4">
            <button type="button" className="text-red-300 underline" onClick={() => {
              if (window.confirm('Reset progress on this device? This removes answers, review cards and completion marks. Export a copy first if you want to keep them.')) { p.resetSandbox(); onClose(); }
            }}>Reset progress…</button>
          </div>
        </div>
      </aside>
    </div>, document.body,
  );
}
