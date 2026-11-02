/**
 * What this sitting has actually been worth. Counts, not points: the numbers
 * are things the learner could verify themselves.
 */
import { Timer } from 'lucide-react';
import { sessionMinutes, useSessionStats } from '../../context/sessionStats';

export function SessionStrip({ className }: { className?: string }) {
  const stats = useSessionStats();
  if (stats.answered === 0 && stats.explained === 0) return null;
  const mins = sessionMinutes(stats.startedAt);

  return (
    <div
      className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 border border-slate-800 bg-slate-900/50 rounded-xl px-3 py-2 ${className ?? ''}`}
    >
      <span className="flex items-center gap-1.5 font-bold uppercase tracking-widest text-slate-600">
        <Timer className="w-3.5 h-3.5" /> This session
      </span>
      <span>
        <span className="text-slate-300 font-semibold">{stats.firstTry}</span> right cold
        <span className="text-slate-600"> / {stats.answered} answered</span>
      </span>
      {stats.explained > 0 && (
        <span>
          <span className="text-slate-300 font-semibold">{stats.explained}</span> explanation
          {stats.explained === 1 ? '' : 's'} submitted
        </span>
      )}
      <span>{mins < 1 ? 'just started' : `${mins} min`}</span>
      <span className="text-slate-600">Resets with the tab — nothing here is scored or saved.</span>
    </div>
  );
}
