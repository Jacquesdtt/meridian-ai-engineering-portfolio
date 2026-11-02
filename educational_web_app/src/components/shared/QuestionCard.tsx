import { useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { isCorrect, type Question } from '../../content/questions';
import { useAppProgress } from '../../context/AppProgress';
import { recordSessionAnswer } from '../../context/sessionStats';

const KIND_LABEL: Record<Question['kind'], string> = {
  mcq: 'Multiple choice',
  'false-claim': 'Spot the false claim',
  justify: 'Defend the decision',
  numeric: 'Recall the number',
};

/**
 * One question with immediate feedback. Every submission is recorded in the
 * spaced-review scheduler (wrong → due again now; right → next Leitner box).
 *
 * Only the first attempt on a fresh mount can clear a module check: the failed
 * attempt already showed the correct option, so a retry proves recognition of
 * something still on screen, not recall.
 */
export function QuestionCard({
  question,
  index,
  onAnswered,
}: {
  question: Question;
  index?: number;
  onAnswered?: (correct: boolean) => void;
}) {
  const { recordAnswer } = useAppProgress();
  const [choice, setChoice] = useState<number | null>(null);
  const [text, setText] = useState('');
  const [result, setResult] = useState<null | boolean>(null);
  const [attempt, setAttempt] = useState(0);

  const answer = question.kind === 'numeric' ? (text.trim() === '' ? null : Number(text.replace(/[,$%\s]/g, ''))) : choice;
  // Feedback aimed at the option the learner actually picked, not at the question in general.
  const targeted =
    result === false && question.kind !== 'numeric' && choice !== null
      ? question.whyWrong?.[choice]?.trim() || null
      : null;

  const submit = () => {
    const ok = isCorrect(question, answer);
    setResult(ok);
    recordAnswer(question.id, ok, attempt === 0);
    recordSessionAnswer(ok, attempt === 0);
    onAnswered?.(ok);
  };

  const retry = () => {
    setChoice(null);
    setText('');
    setResult(null);
    setAttempt((a) => a + 1);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{KIND_LABEL[question.kind]}</div>
      <p className="text-sm font-bold text-slate-200">
        {index !== undefined && `${index + 1}. `}
        {question.prompt}
      </p>

      {question.kind === 'numeric' ? (
        <div className="flex items-center gap-2">
          <input
            inputMode="decimal"
            value={text}
            disabled={result !== null}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && answer !== null && result === null && submit()}
            className="w-40 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 font-mono"
            aria-label="Your answer"
          />
          {question.unit && <span className="text-sm text-slate-500">{question.unit}</span>}
        </div>
      ) : (
        <div className="space-y-2">
          {question.choices.map((c, ci) => {
            let tone = 'border-slate-800 hover:border-slate-600';
            if (result !== null) {
              if (ci === question.correctIndex) tone = 'border-emerald-500/50 bg-emerald-950/30';
              else if (ci === choice) tone = 'border-red-500/50 bg-red-950/20';
            } else if (ci === choice) tone = 'border-blue-500/40 bg-blue-950/20';
            return (
              <button
                key={c}
                type="button"
                disabled={result !== null}
                onClick={() => setChoice(ci)}
                className={`w-full text-left text-sm text-slate-300 px-3 py-2 rounded-xl border ${tone}`}
              >
                {String.fromCharCode(65 + ci)}. {c}
              </button>
            );
          })}
        </div>
      )}

      {result === null ? (
        <button
          type="button"
          onClick={submit}
          disabled={answer === null || Number.isNaN(answer)}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-bold px-4 py-2 rounded-xl"
        >
          Check answer
        </button>
      ) : (
        <div
          className={`flex gap-2 items-start text-sm p-3 rounded-xl border ${
            result ? 'border-emerald-800/50 bg-emerald-950/20 text-emerald-100' : 'border-red-800/50 bg-red-950/20 text-red-100'
          }`}
        >
          {result ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <XCircle className="w-4 h-4 mt-0.5 shrink-0" />}
          <div className="space-y-2">
            {targeted && (
              <p>
                <span className="font-bold">
                  You picked {String.fromCharCode(65 + (choice as number))}.
                </span>{' '}
                {targeted}
              </p>
            )}
            <p className={targeted ? 'text-red-100/80' : undefined}>
              {targeted ? '' : result ? 'Correct. ' : 'Not quite. '}
              {question.kind === 'numeric' && !result && `Answer: ${question.answer}${question.unit ? ` ${question.unit}` : ''}. `}
              {question.explain}
            </p>
            {!result && (
              <div className="space-y-1">
                <button type="button" onClick={retry} className="text-xs font-bold underline underline-offset-2">
                  Try again
                </button>
                <p className="text-[11px] text-red-200/70">
                  A retry counts as practice, not as a pass — the answer is on screen now. To clear this module
                  check, meet the question cold again (leave and come back, or answer it in Practice).
                </p>
              </div>
            )}
            {result && attempt > 0 && (
              <p className="text-[11px] text-emerald-200/70">
                Right, but on a retry — this one still counts as unclear for the module check. It will come back
                in Practice.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
