/**
 * The rung between the demo and cold recall: the sentence does most of the
 * reasoning and the learner supplies the load-bearing term. Deliberately not
 * scored and not fed into spaced review — it is a scaffold, and a scaffold you
 * are graded on stops being a scaffold.
 */
import { useState } from 'react';
import { PenLine } from 'lucide-react';
import type { Cloze } from '../../content/lessons';

export function ClozeCard({ cloze }: { cloze: Cloze }) {
  const [picked, setPicked] = useState<number | null>(null);
  const correct = picked !== null && picked === cloze.correctIndex;
  const [before, after] = splitOnBlank(cloze.sentence);

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
      <h3 className="font-bold text-slate-200 flex items-center gap-2">
        <PenLine className="w-4 h-4 text-blue-400" /> Warm-up · finish the reasoning
      </h3>
      {cloze.intro && <p className="text-sm text-slate-400">{cloze.intro}</p>}

      <p className="text-sm text-slate-200 leading-relaxed">
        {before}
        <span
          className={`inline-block align-baseline min-w-[8ch] text-center mx-1 px-2 py-0.5 rounded-md border font-semibold ${
            picked === null
              ? 'border-dashed border-slate-600 text-slate-600'
              : correct
                ? 'border-emerald-500/60 bg-emerald-950/40 text-emerald-200'
                : 'border-red-500/50 bg-red-950/30 text-red-200'
          }`}
        >
          {picked === null ? ' ' : cloze.choices[picked]}
        </span>
        {after}
      </p>

      <div className="flex flex-wrap gap-2">
        {cloze.choices.map((c, i) => (
          <button
            key={c}
            type="button"
            onClick={() => setPicked(i)}
            aria-pressed={picked === i}
            className={`text-xs sm:text-sm px-3 py-1.5 rounded-xl border ${
              picked === i
                ? correct
                  ? 'border-emerald-500/60 bg-emerald-950/30 text-emerald-100'
                  : 'border-red-500/50 bg-red-950/20 text-red-100'
                : 'border-slate-700 text-slate-300 hover:border-slate-500'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {picked !== null && (
        <p className={`text-sm ${correct ? 'text-emerald-200' : 'text-amber-200'}`}>
          {correct ? cloze.explain : 'Try another one — the sentence only works with one of these.'}
        </p>
      )}
      <p className="text-[11px] text-slate-600">
        Not scored, and it does not clear anything. It is here so the check below is the first time you answer
        without help.
      </p>
    </section>
  );
}

/** "features stop at ___ and the label is t+1" → ["features stop at ", " and the label is t+1"] */
function splitOnBlank(sentence: string): [string, string] {
  const i = sentence.indexOf('___');
  if (i === -1) return [sentence, ''];
  return [sentence.slice(0, i), sentence.slice(i + 3)];
}
