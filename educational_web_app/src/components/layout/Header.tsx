import { useState } from 'react';
import { Activity, BookA, ExternalLink, Menu } from 'lucide-react';
import { GlossaryDrawer } from './GlossaryDrawer';
import { ProgressDrawer } from './ProgressDrawer';
import { useAppProgress } from '../../context/AppProgress';
import { progressSummary } from '../../context/progressSelectors';

export function Header() {
  const progress = useAppProgress();
  const { toggleMobileMenu } = progress;
  const summary = progressSummary(progress);
  const pct = Math.round((summary.exposure / summary.total) * 100);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);

  return (
    <header className="h-16 w-full min-w-0 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md flex items-center px-3 sm:px-4 md:px-6 justify-between shrink-0 sticky top-0 z-50">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <button onClick={toggleMobileMenu} className="md:hidden p-2 text-slate-400 hover:text-slate-200" aria-label="Open menu">
          <Menu className="w-5 h-5" />
        </button>
        <div className="bg-blue-500/20 p-2 rounded-lg hidden md:block">
          <Activity className="w-5 h-5 text-blue-400" />
        </div>
        <div className="min-w-0">
          <h1 className="font-semibold text-slate-100 tracking-tight text-base md:text-lg truncate">Meridian Savings Churn</h1>
          <p className="text-[11px] text-slate-500 hidden sm:block">Lessons work offline · AI marking needs a connection</p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        <button type="button" onClick={() => setProgressOpen(true)} className="hidden sm:flex flex-col items-end gap-1 min-w-[140px]" aria-label={`Open learning progress: ${summary.exposure} of ${summary.total} explorations, ${summary.checks} recall checks`}>
          <div className="flex justify-between w-full text-[10px] uppercase tracking-widest text-slate-500 font-bold">
            <span>Exploration · details</span>
            <span>
              {summary.exposure}/{summary.total}
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        </button>
        <button type="button" onClick={() => setProgressOpen(true)} className="sm:hidden text-xs text-blue-300" aria-label="Open learning progress">Progress</button>
        <button
          type="button"
          onClick={() => setGlossaryOpen(true)}
          className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-500 px-3 py-2 rounded-lg transition-colors"
          title="Glossary"
        >
          <BookA className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Glossary</span>
        </button>
        <a
          href="/guides/Final_Report_Official_print.html"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 border border-blue-500/30 hover:border-blue-400/60 bg-blue-500/10 px-3 py-2 rounded-lg transition-colors"
          title="Open project report in new tab"
          aria-label="Open project report in new tab"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span className="hidden md:inline font-medium">Project report</span>
        </a>
      </div>
      {glossaryOpen && <GlossaryDrawer onClose={() => setGlossaryOpen(false)} />}
      {progressOpen && <ProgressDrawer onClose={() => setProgressOpen(false)} />}
    </header>
  );
}
