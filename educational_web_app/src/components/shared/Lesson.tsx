import { useEffect, useState } from 'react';
import {
  BookOpen,
  Check,
  CheckCircle2,
  ChevronLeft,
  Copy,
  FileCode2,
  HelpCircle,
  MessageSquareText,
  Mic,
  Target,
} from 'lucide-react';
import { moduleCheckPassed, questionsFor } from '../../content/questions';
import { vivaFor } from '../../content/viva';
import { QuestionCard } from './QuestionCard';
import { ClozeCard } from './ClozeCard';
import { SessionStrip } from './SessionStrip';
import type { Lesson, Primer, PrimerCheck } from '../../content/lessons';
import { useAppProgress } from '../../context/AppProgress';
import { Callout } from './ui';

/**
 * Learn tab: one idea per card. Objectives, then a card per concept primer —
 * most of which end in a micro-check that has to be attempted before the next
 * card — then the predict-then-reveal question that gates the demo.
 *
 * The stepper is the default because a wall of prose gets read rather than
 * thought about. The one-page toggle is there for the learner revising
 * something they have already worked through, who should not have to click
 * through it again.
 */
export function LessonLearn({ lesson, onExplore }: { lesson: Lesson; onExplore: () => void }) {
  const { predictions, setPrediction } = useAppProgress();
  const chosen = predictions[lesson.moduleId];
  const [pending, setPending] = useState<number | null>(null);
  const [step, setStep] = useState(0);
  const [onePage, setOnePage] = useState(false);
  const [attempted, setAttempted] = useState<Record<number, boolean>>({});
  const p = lesson.predict;

  // A new module is a new lesson: never open it half-way through the last one.
  useEffect(() => {
    setStep(0);
    setPending(null);
    setAttempted({});
  }, [lesson.moduleId]);

  const cards = [
    { kind: 'objectives' as const },
    ...lesson.primers.map((primer) => ({ kind: 'primer' as const, primer })),
    { kind: 'predict' as const },
  ];
  const total = cards.length;
  const step_ = Math.min(step, total - 1);
  const current = cards[step_];
  const blocked = current.kind === 'primer' && Boolean(current.primer.check) && !attempted[step_];

  const predictCard = (
    <section className="bg-slate-900 border border-blue-900/50 rounded-2xl p-5 space-y-3">
      <h3 className="font-bold text-slate-200 flex items-center gap-2">
        <HelpCircle className="w-4 h-4 text-amber-400" /> Predict before you explore
      </h3>
      <p className="text-sm text-slate-300">{p.prompt}</p>
      <div className="space-y-2">
        {p.choices.map((c, i) => {
          const revealed = chosen !== undefined;
          let tone = 'border-slate-700 hover:border-slate-500';
          if (revealed && i === p.correctIndex) tone = 'border-emerald-500/60 bg-emerald-950/30';
          else if (revealed && i === chosen) tone = 'border-red-500/50 bg-red-950/20';
          else if (!revealed && pending === i) tone = 'border-blue-500/50 bg-blue-950/20';
          return (
            <button
              key={c}
              type="button"
              disabled={revealed}
              onClick={() => setPending(i)}
              className={`w-full text-left text-sm text-slate-300 px-3 py-2 rounded-xl border ${tone}`}
            >
              {String.fromCharCode(65 + i)}. {c}
            </button>
          );
        })}
      </div>
      {chosen === undefined ? (
        <button
          type="button"
          disabled={pending === null}
          onClick={() => pending !== null && setPrediction(lesson.moduleId, pending)}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-bold px-4 py-2 rounded-xl"
        >
          Lock in my prediction
        </button>
      ) : (
        <>
          <Callout tone={chosen === p.correctIndex ? 'tip' : 'warn'} title={chosen === p.correctIndex ? 'You predicted right' : 'Not quite'}>
            {p.reveal}
          </Callout>
          <button type="button" onClick={onExplore} className="self-start bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold px-4 py-2 rounded-xl">
            Now explore the demo →
          </button>
        </>
      )}
    </section>
  );

  const objectivesCard = (
    <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <h3 className="font-bold text-slate-200 flex items-center gap-2 mb-3">
        <Target className="w-4 h-4 text-blue-400" /> By the end you should be able to…
      </h3>
      <ul className="list-disc pl-5 space-y-1 text-sm text-slate-300">
        {lesson.objectives.map((o) => (
          <li key={o}>{o}</li>
        ))}
      </ul>
    </section>
  );

  if (onePage) {
    return (
      <div className="flex flex-col gap-6 max-w-4xl pb-12">
        <div className="flex justify-end">
          <OnePageToggle onePage onToggle={() => setOnePage(false)} />
        </div>
        {objectivesCard}
        {lesson.primers.map((primer) => (
          <div key={primer.title}><PrimerCard primer={primer} showCheck={false} onAttempt={() => {}} /></div>
        ))}
        {predictCard}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 max-w-4xl pb-12">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
            Card {step_ + 1} of {total}
          </span>
          <span className="flex gap-1" aria-hidden="true">
            {cards.map((_, i) => (
              <span
                key={i}
                className={`w-5 h-1 rounded-full ${i < step_ ? 'bg-blue-500/70' : i === step_ ? 'bg-blue-400' : 'bg-slate-800'}`}
              />
            ))}
          </span>
        </div>
        <OnePageToggle onePage={false} onToggle={() => setOnePage(true)} />
      </div>

      {current.kind === 'objectives' && objectivesCard}
      {current.kind === 'primer' && (
        <div key={`${lesson.moduleId}-${step_}`}>
          <PrimerCard
            primer={current.primer}
            showCheck
            onAttempt={() => setAttempted((a) => ({ ...a, [step_]: true }))}
          />
        </div>
      )}
      {current.kind === 'predict' && predictCard}

      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step_ === 0}
          className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 disabled:opacity-30 px-2 py-2"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        {step_ < total - 1 && (
          <button
            type="button"
            onClick={() => setStep((s) => Math.min(total - 1, s + 1))}
            disabled={blocked}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-bold px-4 py-2 rounded-xl"
          >
            Continue →
          </button>
        )}
        {blocked && (
          <span className="text-xs text-slate-500">Have a go at the question first — a wrong answer still moves you on.</span>
        )}
      </div>
    </div>
  );
}

function OnePageToggle({ onePage, onToggle }: { onePage: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} className="text-[11px] text-slate-500 hover:text-slate-300 underline underline-offset-2">
      {onePage ? 'Back to one card at a time' : 'Read it all on one page'}
    </button>
  );
}

function PrimerCard({ primer, showCheck, onAttempt }: { primer: Primer; showCheck: boolean; onAttempt: () => void }) {
  return (
    <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
      <h3 className="font-bold text-slate-200 flex items-center gap-2">
        <BookOpen className="w-4 h-4 text-emerald-400" /> {primer.title}
      </h3>
      {primer.body.map((b) => (
        <p key={b} className="text-sm text-slate-300 leading-relaxed">
          {b}
        </p>
      ))}
      {primer.example && (
        <p className="text-xs font-mono text-emerald-200/90 bg-slate-950 border border-slate-800 rounded-lg p-3">{primer.example}</p>
      )}
      {showCheck && primer.check && <MicroCheck check={primer.check} onAttempt={onAttempt} />}
    </section>
  );
}

/** One question about the card you just read. Not scored, not spaced-reviewed. */
function MicroCheck({ check, onAttempt }: { check: PrimerCheck; onAttempt: () => void }) {
  const [picked, setPicked] = useState<number | null>(null);
  const right = picked === check.correctIndex;

  return (
    <div className="border-t border-slate-800 pt-3 mt-3 space-y-2">
      <p className="text-sm font-semibold text-slate-200">{check.prompt}</p>
      <div className="flex flex-col gap-1.5">
        {check.choices.map((c, i) => {
          let tone = 'border-slate-700 hover:border-slate-500 text-slate-300';
          if (picked !== null && i === check.correctIndex) tone = 'border-emerald-500/60 bg-emerald-950/30 text-emerald-100';
          else if (picked === i) tone = 'border-red-500/50 bg-red-950/20 text-red-100';
          return (
            <button
              key={c}
              type="button"
              disabled={picked !== null}
              onClick={() => {
                setPicked(i);
                onAttempt();
              }}
              className={`text-left text-sm px-3 py-1.5 rounded-lg border ${tone}`}
            >
              {c}
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <p className={`text-xs ${right ? 'text-emerald-200' : 'text-amber-200'}`}>
          {right ? '' : 'Read the card again with this in mind. '}
          {check.explain}
        </p>
      )}
    </div>
  );
}

/** Check tab: warm-up cloze, cold module check, takeaways, the spoken answer, code references and explain-it prompts. */
export function LessonCheck({ lesson, onLearn, onExplore }: { lesson: Lesson; onLearn: () => void; onExplore: () => void }) {
  const { cards, viva, openPractice } = useAppProgress();
  const questions = questionsFor(lesson.moduleId);
  const passed = moduleCheckPassed(lesson.moduleId, cards);
  const prompts = vivaFor(lesson.moduleId);

  return (
    <div className="flex flex-col gap-6 max-w-4xl pb-12">
      <SessionStrip />

      {lesson.cloze && <ClozeCard cloze={lesson.cloze} />}
      {lesson.extraCloze?.map((c) => (
        <div key={c.sentence}>
          <ClozeCard cloze={c} />
        </div>
      ))}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-bold text-slate-200">Module check · {questions.length} questions</h3>
          <span
            className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
              passed ? 'border-emerald-600/50 text-emerald-300 bg-emerald-950/30' : 'border-slate-700 text-slate-500'
            }`}
          >
            {passed ? 'Passed' : 'Answer every question correctly, first try, to pass'}
          </span>
        </div>
        <p className="text-xs text-slate-500">
          Answer from memory first. A retry after the answer has been shown still feeds spaced review, but it does not
          clear the check — meet the question cold again here or in Practice. Wrong answers come back in Practice →
          Review straight away; right ones return after 1, 3, 7 and 14 days.
        </p>
        {questions.map((q, i) => (
          <div key={q.id}>
            <QuestionCard question={q} index={i} />
          </div>
        ))}
      </section>

      <section className="border border-blue-900/40 bg-blue-950/20 rounded-xl p-4 space-y-2">
        <h3 className="font-semibold text-blue-100">Next step</h3>
        <p className="text-sm text-slate-300">{passed ? 'You passed this recall check. Finish the demo if you have not explored it yet, then continue through the learning path.' : 'Revisit the lesson, then try missed questions cold in Practice → Review.'}</p>
        <button type="button" onClick={passed ? onExplore : onLearn} className="text-sm text-blue-300 underline">
          {passed ? 'Review the demo →' : 'Revisit the explanation →'}
        </button>
        {!passed && <button type="button" onClick={() => openPractice({ tab: 'review' })} className="ml-4 text-sm text-blue-300 underline">Review due questions →</button>}
      </section>

      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h3 className="font-bold text-slate-200 flex items-center gap-2 mb-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Key takeaways
        </h3>
        <ul className="list-disc pl-5 space-y-1 text-sm text-slate-300">
          {lesson.takeaways.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </section>

      {lesson.elevator && <ElevatorCard text={lesson.elevator} />}

      {prompts.length > 0 && (
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <h3 className="font-bold text-slate-200 flex items-center gap-2">
            <MessageSquareText className="w-4 h-4 text-amber-400" /> Explain it in your own words
          </h3>
          {prompts.map((v) => {
            const st = viva[v.id];
            const score = st?.scoredAt ? `${st.checked.length}/${v.rubric.length} key points` : null;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => openPractice({ tab: 'explain', vivaId: v.id })}
                className="w-full text-left flex items-start justify-between gap-3 bg-slate-950 border border-slate-800 hover:border-slate-600 rounded-xl p-3"
              >
                <span className="text-sm text-slate-300">{v.prompt}</span>
                <span className="text-xs text-slate-500 shrink-0">{score ?? 'Practise →'}</span>
              </button>
            );
          })}
        </section>
      )}

      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <h3 className="font-bold text-slate-200 flex items-center gap-2 mb-3">
          <FileCode2 className="w-4 h-4 text-purple-400" /> Where this lives in the code
        </h3>
        <ul className="space-y-2 text-sm">
          {lesson.codeRefs.map((r) => (
            <li key={r.path} className="flex flex-col sm:flex-row sm:gap-3">
              <code className="font-mono text-blue-300 break-all">{r.path}</code>
              <span className="text-slate-500">{r.why}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/**
 * What the learner keeps from the module: the answer they would give out loud
 * if someone asked about this part of the system. Copyable, because the useful
 * thing to do with it is paste it somewhere and rehearse it.
 */
function ElevatorCard({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="bg-slate-900 border border-amber-900/40 rounded-2xl p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-bold text-slate-200 flex items-center gap-2">
          <Mic className="w-4 h-4 text-amber-400" /> Your 30-second answer
        </h3>
        <button
          type="button"
          onClick={copy}
          className="shrink-0 flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-500 px-2.5 py-1.5 rounded-lg"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <p className="text-sm text-slate-200 leading-relaxed">{text}</p>
      <p className="text-[11px] text-slate-500">
        Say it out loud once before you move on. If it does not sound like something you would actually say, rewrite it
        in your own words in Practice → Explain it.
      </p>
    </section>
  );
}
