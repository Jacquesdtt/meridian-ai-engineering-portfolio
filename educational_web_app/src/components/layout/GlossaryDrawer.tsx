import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { GLOSSARY } from '../../content/glossary';
import { MODULES } from '../../content/modules';
import { useAppProgress } from '../../context/AppProgress';
import { useDialogFocus } from './useDialogFocus';

export function GlossaryDrawer({ onClose }: { onClose: () => void }) {
  const { setActiveModule } = useAppProgress();
  const [q, setQ] = useState('');
  const dialogRef = useDialogFocus(onClose, 'input');
  const terms = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return GLOSSARY.filter((t) => !needle || t.term.toLowerCase().includes(needle) || t.def.toLowerCase().includes(needle));
  }, [q]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  // Portal: the sticky header uses backdrop-blur, which would trap position:fixed inside it.
  return createPortal(
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <aside
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Glossary"
        className="relative w-full max-w-md h-full bg-slate-950 border-l border-slate-800 flex flex-col"
      >
        <div className="flex items-center justify-between px-4 h-14 border-b border-slate-800 shrink-0">
          <span className="text-sm font-semibold text-slate-200">Glossary · {GLOSSARY.length} terms</span>
          <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-slate-200" aria-label="Close glossary">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 shrink-0">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search terms…"
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200"
          />
        </div>
        <dl className="flex-1 overflow-y-auto px-4 pb-6 space-y-4">
          {terms.map((t) => {
            const mod = MODULES.find((m) => m.id === t.moduleId);
            return (
              <div key={t.term}>
                <dt className="text-sm font-bold text-slate-100">{t.term}</dt>
                <dd className="text-sm text-slate-400 leading-relaxed">{t.def}</dd>
                {mod && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveModule(t.moduleId);
                      onClose();
                    }}
                    className="text-xs text-blue-400 hover:text-blue-300 mt-1"
                  >
                    Taught in {mod.shortLabel} →
                  </button>
                )}
              </div>
            );
          })}
          {terms.length === 0 && <p className="text-sm text-slate-500">No match.</p>}
        </dl>
      </aside>
    </div>,
    document.body,
  );
}
