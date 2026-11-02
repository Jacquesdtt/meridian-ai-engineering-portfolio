/**
 * One next action, always visible, never a menu. The commonest way to lose a
 * self-study learner is to finish a screen and leave them staring at a nav list
 * deciding what counts as progress.
 */
import { ArrowRight } from 'lucide-react';
import { useAppProgress } from '../../context/AppProgress';
import { nextAction } from './lessonFlow';
import type { LessonTab } from './lessonFlow';

export function NextUp({ onSelectTab }: { onSelectTab: (id: string, tab: LessonTab) => void }) {
  const p = useAppProgress();
  const action = nextAction(p);

  const go = () => {
    if (action.moduleId === 'practice') {
      p.openPractice({ tab: action.practiceTab ?? 'review' });
      return;
    }
    if (action.tab) onSelectTab(action.moduleId, action.tab);
    else p.setActiveModule(action.moduleId);
  };

  return (
    <div className="shrink-0 flex items-center justify-between gap-3 border-t border-slate-800 bg-slate-950/95 px-1 pt-2.5">
      <p className="text-[11px] text-slate-500 min-w-0">
        <span className="uppercase tracking-widest font-bold text-slate-600">Next</span>{' '}
        <span className="text-slate-400">{action.detail}</span>
      </p>
      <button
        type="button"
        onClick={go}
        className="shrink-0 flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold px-4 py-2 rounded-xl"
      >
        {action.label}
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
