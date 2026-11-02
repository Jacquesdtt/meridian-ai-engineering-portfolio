import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import type { WorkflowDiagram } from '../../content/workflow';

type Props = {
  diagram: WorkflowDiagram;
  visitedIds: Set<string>;
  onVisit: (hotspotId: string) => void;
  onAllVisited?: () => void;
};

function hotspotClasses(
  hotspot: WorkflowDiagram['hotspots'][number],
  active: boolean,
  visited: boolean,
): string {
  const ring = active
    ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-slate-950'
    : visited
      ? 'ring-1 ring-emerald-500/60'
      : 'ring-1 ring-white/20 hover:ring-blue-400/70';

  const fill = hotspot.keyStep
    ? active
      ? 'bg-purple-500/35 border-purple-400/80'
      : visited
        ? 'bg-purple-500/20 border-purple-500/50'
        : 'bg-purple-500/10 border-purple-400/40 hover:bg-purple-500/25'
    : active
      ? 'bg-blue-500/30 border-blue-400/70'
      : visited
        ? 'bg-emerald-500/15 border-emerald-500/40'
        : 'bg-white/5 border-white/25 hover:bg-blue-500/20';

  return `absolute rounded-lg border transition-all ${ring} ${fill}`;
}

export function FlowchartExplorer({ diagram, visitedIds, onVisit, onAllVisited }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const hotspots = diagram.hotspots;

  useEffect(() => {
    setActiveIndex(0);
  }, [diagram.id]);

  const active = hotspots[activeIndex] ?? hotspots[0];

  const visitedCount = useMemo(
    () => hotspots.filter((h) => visitedIds.has(h.id)).length,
    [hotspots, visitedIds],
  );

  const selectIndex = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(hotspots.length - 1, index));
      setActiveIndex(clamped);
      onVisit(hotspots[clamped].id);
    },
    [hotspots, onVisit],
  );

  useEffect(() => {
    if (visitedCount === hotspots.length) onAllVisited?.();
  }, [visitedCount, hotspots.length, onAllVisited]);

  const goPrev = () => selectIndex(activeIndex - 1);
  const goNext = () => selectIndex(activeIndex + 1);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold text-slate-100">{diagram.title}</h3>
          <p className="text-sm text-slate-400 max-w-3xl">{diagram.subtitle}</p>
        </div>
        <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
          {visitedCount}/{hotspots.length} explored
        </span>
      </div>

      <div
        className={`relative w-full bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden ${
          diagram.layout === 'wide' ? 'aspect-[16/7]' : 'aspect-[3/4] max-h-[520px] mx-auto max-w-lg'
        }`}
      >
        <img
          src={diagram.imageSrc}
          alt={diagram.imageAlt}
          className="absolute inset-0 w-full h-full object-contain p-2 md:p-3 pointer-events-none select-none"
          draggable={false}
        />
        {hotspots.map((h, i) => {
          const isActive = i === activeIndex;
          const isVisited = visitedIds.has(h.id);
          return (
            <button
              key={h.id}
              type="button"
              aria-label={h.label}
              aria-pressed={isActive}
              title={h.label}
              onClick={() => selectIndex(i)}
              className={hotspotClasses(h, isActive, isVisited)}
              style={{
                top: `${h.top}%`,
                left: `${h.left}%`,
                width: `${h.width}%`,
                height: `${h.height}%`,
              }}
            />
          );
        })}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div
            className={`p-2 rounded-lg shrink-0 ${
              active.keyStep ? 'bg-purple-500/15 text-purple-300' : 'bg-blue-500/15 text-blue-300'
            }`}
          >
            <MapPin className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-lg font-bold text-slate-100">{active.label}</h4>
              {active.keyStep && (
                <span className="text-[10px] uppercase tracking-widest text-purple-400 font-bold">
                  AppLocker / Split-Executor
                </span>
              )}
            </div>
            <p className="text-sm text-slate-300 leading-relaxed mt-1">{active.caption}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={goPrev}
            disabled={activeIndex === 0}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-bold border border-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={activeIndex >= hotspots.length - 1}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-bold border border-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800"
          >
            Next hotspot <ChevronRight className="w-4 h-4" />
          </button>
          <div className="flex flex-wrap gap-1.5 ml-auto">
            {hotspots.map((h, i) => (
              <button
                key={h.id}
                type="button"
                onClick={() => selectIndex(i)}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  i === activeIndex
                    ? 'bg-blue-400'
                    : visitedIds.has(h.id)
                      ? 'bg-emerald-500'
                      : 'bg-slate-700 hover:bg-slate-500'
                }`}
                aria-label={`Jump to ${h.label}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
