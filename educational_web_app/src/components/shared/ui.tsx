import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Info, AlertTriangle, Lightbulb, GripHorizontal } from 'lucide-react';

type Tone = 'info' | 'warn' | 'tip';

const STYLES: Record<Tone, { wrap: string; icon: React.ReactNode; label: string }> = {
  info: {
    wrap: 'bg-blue-950/30 border-blue-900/40 text-blue-100/90',
    icon: <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />,
    label: 'Context',
  },
  warn: {
    wrap: 'bg-amber-950/30 border-amber-900/40 text-amber-100/90',
    icon: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />,
    label: 'Watch out',
  },
  tip: {
    wrap: 'bg-emerald-950/30 border-emerald-900/40 text-emerald-100/90',
    icon: <Lightbulb className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />,
    label: 'Try in the real repo',
  },
};

export function Callout({
  tone = 'info',
  title,
  children,
}: {
  tone?: Tone;
  title?: string;
  children: React.ReactNode;
}) {
  const s = STYLES[tone];
  return (
    <div className={`border rounded-xl p-3 sm:p-4 flex gap-3 ${s.wrap}`}>
      {s.icon}
      <div className="flex flex-col gap-0.5 sm:gap-1 text-xs sm:text-sm leading-relaxed">
        <span className="text-[11px] sm:text-xs font-bold uppercase tracking-widest opacity-80">{title ?? s.label}</span>
        <div>{children}</div>
      </div>
    </div>
  );
}

export function MetricCard({
  label,
  value,
  sub,
  accent = 'slate',
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: 'slate' | 'blue' | 'emerald' | 'amber' | 'red';
}) {
  const valueColor =
    accent === 'blue'
      ? 'text-blue-300'
      : accent === 'emerald'
        ? 'text-emerald-300'
        : accent === 'amber'
          ? 'text-amber-300'
          : accent === 'red'
            ? 'text-red-300'
            : 'text-slate-100';
  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 sm:p-4 flex flex-col gap-1">
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</span>
      <span className={`text-xl sm:text-2xl font-bold ${valueColor}`}>{value}</span>
      {sub && <span className="text-xs text-slate-500">{sub}</span>}
    </div>
  );
}

export function CodeBlock({ children, className }: { children: string; className?: string }) {
  return (
    <pre
      className={`bg-slate-950 border border-slate-800 rounded-xl p-3 sm:p-4 overflow-x-auto text-xs md:text-sm font-mono text-slate-300 leading-relaxed ${className ?? ''}`}
    >
      <code>{children}</code>
    </pre>
  );
}

/** Compact state cue for two-stage simulations; it never changes gate rules. */
export function GatePath({ steps }: { steps: { label: string; done: boolean }[] }) {
  return <ol aria-label="Simulation steps" className="flex flex-wrap gap-2 text-xs">
    {steps.map((step, index) => <li key={step.label} className={`rounded-lg border px-2.5 py-1.5 sm:px-3 sm:py-2 ${step.done ? 'border-emerald-700 text-emerald-300 bg-emerald-950/20' : 'border-slate-700 text-slate-400'}`}>
      {index + 1}. {step.label} {step.done ? '✓' : ''}
    </li>)}
  </ol>;
}

/** Bottom-docked panel with a drag handle to resize height upward. */
export function ResizableBottomPanel({
  children,
  defaultHeight = 140,
  minHeight = 88,
  maxHeight = 480,
  label = 'Drag to resize',
}: {
  children: React.ReactNode;
  defaultHeight?: number;
  minHeight?: number;
  maxHeight?: number;
  label?: string;
}) {
  const [height, setHeight] = useState(defaultHeight);
  const dragRef = useRef<{ startY: number; startHeight: number } | null>(null);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      dragRef.current = { startY: e.clientY, startHeight: height };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [height],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragRef.current) return;
      const delta = dragRef.current.startY - e.clientY;
      const next = Math.min(maxHeight, Math.max(minHeight, dragRef.current.startHeight + delta));
      setHeight(next);
    },
    [minHeight, maxHeight],
  );

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  }, []);

  const onResizeKey = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 40 : 10;
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      setHeight((value) => Math.min(maxHeight, Math.max(minHeight, value + (e.key === 'ArrowUp' ? step : -step))));
    }
    if (e.key === 'Home') { e.preventDefault(); setHeight(minHeight); }
    if (e.key === 'End') { e.preventDefault(); setHeight(maxHeight); }
  }, [minHeight, maxHeight]);

  useEffect(() => {
    const clamped = Math.min(maxHeight, Math.max(minHeight, height));
    if (clamped !== height) setHeight(clamped);
  }, [height, minHeight, maxHeight]);

  return (
    <div className="shrink-0 flex flex-col min-h-0 border-t border-slate-800 bg-slate-950/80" style={{ height }}>
      <div
        role="separator"
        tabIndex={0}
        aria-orientation="horizontal"
        aria-label={label}
        aria-valuenow={height}
        aria-valuemin={minHeight}
        aria-valuemax={maxHeight}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onResizeKey}
        className="group flex h-6 shrink-0 cursor-ns-resize touch-none items-center justify-center gap-2 border-b border-slate-800/80 bg-slate-900/60 hover:bg-slate-800/70 active:bg-slate-700/70 focus-visible:outline focus-visible:outline-blue-400"
      >
        <GripHorizontal className="h-3.5 w-3.5 text-slate-600 group-hover:text-slate-400 group-active:text-slate-300" aria-hidden />
        <span className="text-[10px] text-slate-500">Drag or use ↑↓ to resize</span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-3">{children}</div>
    </div>
  );
}

export function AdrChip({ id, title, active }: { id: string; title: string; active?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] font-mono px-2 py-1 rounded-md border transition-colors ${
        active
          ? 'bg-blue-500/20 border-blue-500/50 text-blue-200 ring-2 ring-blue-500/30'
          : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600 hover:bg-slate-700/80'
      }`}
    >
      <span className="text-blue-400">ADR {id}</span>
      <span className="text-slate-500">·</span>
      {title}
    </span>
  );
}

export function ModuleHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-col gap-1 shrink-0">
      <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-100 tracking-tight">{title}</h2>
      <p className="text-slate-400 text-xs sm:text-sm md:text-base leading-relaxed">{subtitle}</p>
    </div>
  );
}
