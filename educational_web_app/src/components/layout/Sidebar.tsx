import { CheckCircle2, X } from 'lucide-react';
import { MODULES, PRACTICE } from '../../content/modules';
import { REVIEW_POOL, moduleCheckPassed } from '../../content/questions';
import { useAppProgress } from '../../context/AppProgress';
import { moduleComplete } from '../../context/progressSelectors';

export function Sidebar() {
  const { activeModule, setActiveModule, interactions, cards, predictions, mobileMenuOpen, toggleMobileMenu } = useAppProgress();
  const now = Date.now();
  const dueCount = REVIEW_POOL.filter((q) => cards[q.id] && cards[q.id].due <= now).length;
  const PracticeIcon = PRACTICE.icon;
  const go = (id: typeof activeModule) => {
    setActiveModule(id);
    if (mobileMenuOpen) toggleMobileMenu();
  };

  const nav = (
    <nav className="flex flex-col gap-0.5 p-2 sm:p-2.5 overflow-y-auto h-full">
      <button
        type="button"
        onClick={() => go('practice')}
        className={`flex items-center gap-2.5 px-2.5 py-1.5 sm:py-2 mb-2 rounded-xl text-left border transition-colors ${
          activeModule === 'practice' ? 'bg-amber-500/15 border-amber-500/30 text-amber-100' : 'border-slate-800 text-slate-300 hover:bg-slate-800/60'
        }`}
      >
        <PracticeIcon className="w-4 h-4 shrink-0 text-amber-400" />
        <span className="flex-1 text-xs sm:text-sm font-semibold">Practice</span>
        <span className={`text-[10px] sm:text-[11px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full ${dueCount ? 'bg-amber-500/25 text-amber-200' : 'bg-slate-800 text-slate-500'}`}>
          {dueCount} due
        </span>
      </button>
      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2.5 mb-1.5">Learning path</div>
      {MODULES.map((m) => {
        const Icon = m.icon;
        // A lesson is complete when you predicted, did the demo gate, and passed the module check.
        const done = moduleComplete(m.id, { interactions, predictions, cards });
        const active = activeModule === m.id;
        return (
          <button
            key={m.id}
            onClick={() => go(m.id)}
            className={`flex items-start gap-2.5 px-2.5 py-1.5 rounded-lg text-left transition-colors ${
              active ? 'bg-blue-500/15 text-blue-200 border border-blue-500/30' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 mt-0.5 shrink-0 ${active ? 'text-blue-400' : 'text-slate-500'}`} />
            <span className="flex-1 min-w-0">
              <span className="block text-xs sm:text-sm font-semibold truncate">{m.shortLabel}</span>
              <span className="block text-[10px] sm:text-[11px] text-slate-500 leading-snug line-clamp-1">{m.blurb}</span>
            </span>
            {done && <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0 mt-0.5" />}
          </button>
        );
      })}
    </nav>
  );

  return (
    <>
      <aside className="hidden md:flex w-56 lg:w-60 xl:w-64 shrink-0 border-r border-slate-800 bg-slate-950/50 flex-col">{nav}</aside>

      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/60" onClick={toggleMobileMenu} />
          <div className="relative w-80 max-w-[85vw] h-full bg-slate-950 border-r border-slate-800 flex flex-col">
            <div className="flex items-center justify-between px-4 h-14 border-b border-slate-800">
              <span className="text-sm font-semibold text-slate-200">Modules</span>
              <button onClick={toggleMobileMenu} className="p-2 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            {nav}
          </div>
        </div>
      )}
    </>
  );
}
