import { useMemo, useState } from 'react';
import confetti from 'canvas-confetti';
import { CheckCircle2, GraduationCap, MessagesSquare, Trophy } from 'lucide-react';
import { QUIZ } from '../content/quiz';
import { moduleCheckPassed } from '../content/questions';
import { VIVA, VIVA_PASS_RATIO, VIVA_REQUIRED, vivaCleared } from '../content/viva';
import { MODULES, type InteractionKey, type ModuleId } from '../content/modules';
import { useAppProgress, interactionLabel } from '../context/AppProgress';
import { progressSummary } from '../context/progressSelectors';
import { Callout, ModuleHeader } from '../components/shared/ui';

export function MasteryModule() {
  const { interactions, setInteraction, setActiveModule, cards, recordAnswer, viva, openPractice } = useAppProgress();
  const [answers, setAnswers] = useState<Record<string, number | null>>(
    () => Object.fromEntries(QUIZ.map((q) => [q.id, null])),
  );
  const [submitted, setSubmitted] = useState(false);

  const gates = MODULES.filter((m) => m.interaction && m.id !== 'mastery') as {
    id: ModuleId;
    label: string;
    interaction: InteractionKey;
  }[];

  const progress = progressSummary({ interactions, cards, viva, predictions: {} });
  const gatesDone = progress.exposure === progress.total;
  const checksDone = progress.checks === progress.total;
  // Recognition is not explanation: the gate also needs answers you wrote yourself.
  const vivaClearedList = VIVA.filter((v) => vivaCleared(v, viva[v.id]));
  const vivaDone = progress.viva >= VIVA_REQUIRED;
  const allDone = gatesDone && checksDone && vivaDone;
  const score = useMemo(() => {
    if (!submitted) return 0;
    return QUIZ.filter((q) => answers[q.id] === q.correctIndex).length;
  }, [submitted, answers]);

  const submitQuiz = () => {
    setSubmitted(true);
    const s = QUIZ.filter((q) => answers[q.id] === q.correctIndex).length;
    // Final-quiz answers feed spaced review too, so misses come back in Practice.
    QUIZ.forEach((q) => recordAnswer(q.id, answers[q.id] === q.correctIndex, true));
    if (s === QUIZ.length && allDone) {
      setInteraction('passedQuiz');
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.7 } });
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-12">
      <ModuleHeader
        title="Mastery Assessment"
        subtitle="Demo gates + module checks + final quiz. Self-study, not a proctored exam — the answer key ships in the client bundle."
      />

      <Callout tone="warn" title="Rigor disclosure">
        Demo gates are <strong>exposure checks</strong>; module checks and this quiz test recall, but answers ship in the
        Vite bundle and DevTools can read them. Explain-it is marked by the Meridian API rather than by you
        (ADR-EDU-003), which removes the self-grading soft spot — it does not make any of this proctored. It is a
        study tool: do not call it a certification in a viva.
      </Callout>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
        <h3 className="font-bold text-slate-200 flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-slate-500" /> Per module: demo gate · module check
        </h3>
        {gates.map((g) => {
          const gate = interactions[g.interaction];
          const check = moduleCheckPassed(g.id, cards);
          const done = gate && check;
          return (
            <button
              key={g.interaction}
              type="button"
              onClick={() => setActiveModule(g.id)}
              className="w-full flex items-center gap-3 text-left py-2 border-b border-slate-800/80 last:border-0"
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                  done ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-600'
                }`}
              >
                {done ? <CheckCircle2 className="w-4 h-4" /> : <div className="w-2 h-2 rounded-full bg-slate-600" />}
              </div>
              <span className={`flex-1 text-sm ${done ? 'text-slate-300' : 'text-slate-500'}`}>
                {interactionLabel(g.interaction)}
              </span>
              <span className={`text-[11px] ${gate ? 'text-emerald-400' : 'text-slate-600'}`}>demo {gate ? '✓' : '·'}</span>
              <span className={`text-[11px] ${check ? 'text-emerald-400' : 'text-slate-600'}`}>check {check ? '✓' : '·'}</span>
            </button>
          );
        })}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
        <h3 className="font-bold text-slate-200 flex items-center gap-2">
          <MessagesSquare className="w-5 h-5 text-slate-500" /> Explain it in your own words
        </h3>
        <p className="text-xs text-slate-500">
          Multiple choice tests whether you recognise the right answer. This tests whether you can produce one.
          Clear <strong>{VIVA_REQUIRED} of {VIVA.length}</strong> prompts: write the answer, submit it, and the
          Meridian API marks it against the rubric — at least {Math.round(VIVA_PASS_RATIO * 100)}% of the points
          have to be genuinely made. You do not grade yourself, and a self-check does not count. Each prompt also
          carries the follow-up an assessor actually asks next.
        </p>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-full ${vivaDone ? 'bg-emerald-500' : 'bg-blue-500'}`}
              style={{ width: `${Math.min(100, (vivaClearedList.length / VIVA_REQUIRED) * 100)}%` }}
            />
          </div>
          <span className={`text-xs font-bold ${vivaDone ? 'text-emerald-400' : 'text-slate-400'}`}>
            {vivaClearedList.length}/{VIVA_REQUIRED}
          </span>
        </div>
        <button
          type="button"
          onClick={() => openPractice({ tab: 'explain' })}
          className="text-xs font-bold text-blue-300 underline underline-offset-2"
        >
          Open Explain-it practice →
        </button>
      </div>

      <div className="space-y-4">
        <h3 className="font-bold text-slate-200">Quiz</h3>
        {QUIZ.map((q, qi) => (
          <div key={q.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <p className="text-sm font-bold text-slate-200">
              {qi + 1}. {q.prompt}
            </p>
            <div className="space-y-2">
              {q.choices.map((c, ci) => {
                const selected = answers[q.id] === ci;
                let tone = 'border-slate-800 hover:border-slate-600';
                if (submitted) {
                  if (ci === q.correctIndex) tone = 'border-emerald-500/50 bg-emerald-950/30';
                  else if (selected) tone = 'border-red-500/50 bg-red-950/20';
                } else if (selected) tone = 'border-blue-500/40 bg-blue-950/20';
                return (
                  <button
                    key={ci}
                    type="button"
                    disabled={submitted}
                    onClick={() => setAnswers((a) => ({ ...a, [q.id]: ci }))}
                    className={`w-full text-left text-sm text-slate-300 px-3 py-2 rounded-xl border ${tone}`}
                  >
                    {String.fromCharCode(65 + ci)}. {c}
                  </button>
                );
              })}
            </div>
            {submitted && (
              <p className="text-xs text-slate-500">{q.explain}</p>
            )}
          </div>
        ))}

        {!submitted ? (
          <button
            type="button"
            onClick={submitQuiz}
            disabled={Object.values(answers).some((a) => a === null)}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold px-5 py-3 rounded-xl"
          >
            Submit quiz
          </button>
        ) : (
          <Callout tone={score === QUIZ.length && allDone ? 'tip' : 'warn'} title={`Score ${score}/${QUIZ.length}`}>
            {score === QUIZ.length && allDone ? (
              <span className="inline-flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" /> Exposure checklist + quiz cleared — still not a
                certification.
              </span>
            ) : (
              <span>
                {!gatesDone && 'Finish all demo gates first. '}
                {!checksDone && 'Pass every module check cleanly (Check tab — retries after a reveal do not count). '}
                {!vivaDone && `Get ${VIVA_REQUIRED} Explain-it prompts marked as cleared (${vivaClearedList.length} so far). `}
                {score < QUIZ.length && 'Review explanations and Reset progress if you want a clean retry.'}
              </span>
            )}
          </Callout>
        )}
      </div>
    </div>
  );
}
