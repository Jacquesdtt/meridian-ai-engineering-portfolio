import { useEffect, useMemo, useState } from 'react';
import { VIVA_BENCHMARK } from '../content/facts';
import { MODULES } from '../content/modules';
import { REVIEW_POOL } from '../content/questions';
import { VIVA, VIVA_MIN_WORDS, VIVA_REQUIRED, vivaCleared, vivaGradeCurrent, vivaSignature, wordCount } from '../content/viva';
import { GRADER_API_URL, gradeAnswer, probeGrader } from '../lib/vivaGrader';
import type { GraderStatus } from '../lib/vivaGrader';
import { BOX_INTERVAL_DAYS, useAppProgress } from '../context/AppProgress';
import { QuestionCard } from '../components/shared/QuestionCard';
import { SessionStrip } from '../components/shared/SessionStrip';
import { recordSessionExplanation } from '../context/sessionStats';
import { Callout, MetricCard, ModuleHeader } from '../components/shared/ui';
import { MemoryChains } from '../components/shared/MemoryChains';

const moduleLabel = (id: string) => MODULES.find((m) => m.id === id)?.shortLabel ?? id;

/** Spaced review: wrong answers come back now; right ones move up a Leitner box. */
function Review() {
  const { cards } = useAppProgress();
  const [queue, setQueue] = useState<'due' | 'new'>('due');
  const [cursor, setCursor] = useState(0);
  const [answered, setAnswered] = useState(false);
  // Freeze the session list when it starts so answering does not reshuffle it mid-way.
  const [sessionKey, setSessionKey] = useState(0);

  const now = Date.now();
  const due = useMemo(
    () => REVIEW_POOL.filter((q) => cards[q.id] && cards[q.id].due <= now),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sessionKey, queue],
  );
  const fresh = useMemo(
    () => REVIEW_POOL.filter((q) => !cards[q.id]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sessionKey, queue],
  );
  const list = queue === 'due' ? due : fresh;
  const current = list[cursor];

  const cardList = Object.values(cards) as { box: number }[];
  const boxes = BOX_INTERVAL_DAYS.map((_, b) => cardList.filter((c) => c.box === b).length);
  const liveDue = REVIEW_POOL.filter((q) => cards[q.id] && cards[q.id].due <= now).length;
  const liveNew = REVIEW_POOL.filter((q) => !cards[q.id]).length;

  const restart = (q: 'due' | 'new') => {
    setQueue(q);
    setCursor(0);
    setAnswered(false);
    setSessionKey((k) => k + 1);
  };

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard label="Due now" value={String(liveDue)} accent={liveDue ? 'amber' : 'emerald'} />
        <MetricCard label="Not seen yet" value={String(liveNew)} />
        <MetricCard label="Learning (box 0–1)" value={String(boxes[0] + boxes[1])} />
        <MetricCard label="Solid (box 3–4)" value={String(boxes[3] + boxes[4])} accent="emerald" />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => restart('due')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${queue === 'due' ? 'bg-blue-500/20 border-blue-500/40 text-blue-200' : 'border-slate-700 text-slate-500'}`}
        >
          Review due ({liveDue})
        </button>
        <button
          type="button"
          onClick={() => restart('new')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${queue === 'new' ? 'bg-blue-500/20 border-blue-500/40 text-blue-200' : 'border-slate-700 text-slate-500'}`}
        >
          New questions ({liveNew})
        </button>
      </div>

      {current ? (
        <>
          <p className="text-xs text-slate-500">
            {cursor + 1} of {list.length} · from {moduleLabel(current.moduleId)}
            {cards[current.id] && ` · box ${cards[current.id].box}, seen ${cards[current.id].seen}×`}
          </p>
          <div key={`${sessionKey}-${current.id}`}>
            <QuestionCard question={current} onAnswered={() => setAnswered(true)} />
          </div>
          <button
            type="button"
            disabled={!answered}
            onClick={() => {
              setCursor((c) => c + 1);
              setAnswered(false);
            }}
            className="self-start bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-sm font-bold px-4 py-2 rounded-xl border border-slate-700"
          >
            Next question →
          </button>
        </>
      ) : (
        <>
        <SessionStrip className="mb-3" />
        <Callout tone="tip" title={list.length ? 'Session done' : queue === 'due' ? 'Nothing due' : 'No new questions'}>
          {queue === 'due'
            ? liveDue
              ? `${liveDue} question(s) are due now — start a new review session.`
              : 'Nothing is due. Come back tomorrow, or try new questions. Answers you get right come back after 1, 3, 7 and 14 days.'
            : 'You have seen every question at least once. Review keeps the ones you missed coming back.'}
          {list.length > 0 && (
            <button type="button" onClick={() => restart(queue)} className="block mt-2 text-xs font-bold underline underline-offset-2">
              Start another session
            </button>
          )}
        </Callout>
        </>
      )}
    </div>
  );
}

/** Explain-it practice: write your answer, submit it for marking, then compare. */
function Explain() {
  const { viva, saveViva, saveMarkedViva, practiceTarget } = useAppProgress();
  const [selected, setSelected] = useState(practiceTarget.vivaId ?? VIVA[0].id);
  const [revealed, setRevealed] = useState(false);
  const [challengeRevealed, setChallengeRevealed] = useState(false);
  const [marking, setMarking] = useState(false);
  // null = not probed yet, so the banner does not flash "offline" on first paint.
  const [graderStatus, setGraderStatus] = useState<GraderStatus | 'checking'>('checking');

  useEffect(() => {
    let live = true;
    probeGrader().then((status) => live && setGraderStatus(status));
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (practiceTarget.vivaId) setSelected(practiceTarget.vivaId);
  }, [practiceTarget]);
  useEffect(() => {
    setRevealed(Boolean(viva[selected]?.grade ?? viva[selected]?.scoredAt));
    setChallengeRevealed(false);
  }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps

  const prompt = VIVA.find((v) => v.id === selected) ?? VIVA[0];
  const st = viva[prompt.id] ?? { draft: '', checked: [] };
  const words = wordCount(st.draft);
  const grade = vivaGradeCurrent(prompt, st) ? st.grade : undefined;
  const cleared = vivaCleared(prompt, st);
  const clearedTotal = VIVA.filter((v) => vivaCleared(v, viva[v.id])).length;

  const toggle = (i: number) => {
    const checked = st.checked.includes(i) ? st.checked.filter((x) => x !== i) : [...st.checked, i];
    saveViva(prompt.id, { checked, scoredAt: Date.now() });
  };

  const submitForMarking = async () => {
    const submittedDraft = st.draft;
    const submittedRevision = st.revision ?? 0;
    const signature = vivaSignature(prompt);
    setMarking(true);
    try {
      const result = await gradeAnswer(prompt, submittedDraft);
      saveMarkedViva(prompt.id, submittedDraft, submittedRevision, signature, result);
      recordSessionExplanation();
      if (!result.reachable) setGraderStatus('unreachable');
      setRevealed(true);
    } finally {
      setMarking(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-[18rem_1fr] gap-6">
      <nav className="flex flex-col gap-1" aria-label="Explain-it prompts">
        <p className="px-3 pb-2 text-[11px] text-slate-500">
          <span className={clearedTotal >= VIVA_REQUIRED ? 'text-emerald-400 font-bold' : 'text-slate-300 font-bold'}>
            {clearedTotal}/{VIVA_REQUIRED}
          </span>{' '}
          cleared for the Mastery gate
        </p>
        {VIVA.map((v) => {
          const s = viva[v.id];
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => setSelected(v.id)}
              className={`text-left px-3 py-2 rounded-xl border text-sm ${
                v.id === prompt.id ? 'bg-blue-500/15 border-blue-500/30 text-blue-100' : 'border-transparent text-slate-400 hover:bg-slate-800/60'
              }`}
            >
              <span className="block text-[10px] uppercase tracking-widest text-slate-500">{moduleLabel(v.moduleId)}</span>
              <span className="line-clamp-2">{v.prompt}</span>
              {s?.grade?.available && vivaGradeCurrent(v, s) && (
                <span
                  className={`block text-[11px] mt-0.5 ${vivaCleared(v, s) ? 'text-emerald-400' : 'text-amber-400'}`}
                >
                  {vivaCleared(v, s) ? '✓ ' : ''}
                  marked {s.grade.coveredCount}/{s.grade.totalPoints}
                </span>
              )}
              {s?.grade && vivaGradeCurrent(v, s) && !s.grade.available && (
                <span className="block text-[11px] mt-0.5 text-slate-500">not marked</span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="flex flex-col gap-4 min-w-0">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <h3 className="font-bold text-slate-100">{prompt.prompt}</h3>
          <textarea
            value={st.draft}
            onChange={(e) => saveViva(prompt.id, { draft: e.target.value })}
            placeholder="Answer as if an assessor just asked you. Write it before looking at the model answer."
            className="w-full h-44 bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-slate-200"
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={words < VIVA_MIN_WORDS || marking}
              onClick={submitForMarking}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-bold px-4 py-2 rounded-xl"
            >
              {marking ? 'Marking…' : grade ? 'Re-submit for marking' : 'Submit for marking'}
            </button>
            {(graderStatus !== 'configured' || (grade && !grade.available)) && !marking && (
              <button
                type="button"
                onClick={() => setRevealed(true)}
                className="text-xs font-bold text-slate-400 underline underline-offset-2"
              >
                Show the answer without marking
              </button>
            )}
            <span className="text-xs text-slate-500">
              {words} words
              {words < VIVA_MIN_WORDS ? ` · write at least ${VIVA_MIN_WORDS} before marking` : ''} · saved on this
              device
            </span>
          </div>
          {graderStatus === 'checking' ? (
            <p className="text-xs text-slate-400 border-t border-slate-800 pt-3">Checking whether marking is available…</p>
          ) : graderStatus === 'unreachable' ? (
            <p className="text-xs text-amber-300/80 border-t border-slate-800 pt-3">
              <strong>Marker unreachable.</strong> Your answer stays on this device. Start the Meridian API to have answers marked:{' '}
              <code className="text-amber-200">py -3.13 -m uvicorn src.serving.app:app</code> (expected at{' '}
              {GRADER_API_URL}). Until then you can self-check against the rubric, but self-checks do not count
              toward the Mastery gate.
            </p>
          ) : graderStatus === 'unknown' ? (
            <p className="text-xs text-amber-300/80 border-t border-slate-800 pt-3">The API responded, but this app could not confirm marking status. You can retry marking without losing your draft.</p>
          ) : graderStatus === 'unconfigured' ? (
            <p className="text-xs text-amber-300/80 border-t border-slate-800 pt-3">The API is reachable, but Azure OpenAI marking is not configured. You can study and self-check now; only an API mark counts toward Mastery.</p>
          ) : (
            grade &&
            !grade.available && (
              <p className="text-xs text-amber-300/80 border-t border-slate-800 pt-3">
                <strong>The API could not mark this answer.</strong> {grade.reason} Your draft is saved on this device.
                Self-checks below do not count toward the Mastery gate.
              </p>
            )
          )}
          {graderStatus !== 'checking' && <button type="button" className="text-xs text-blue-300 underline" onClick={() => { setGraderStatus('checking'); void probeGrader().then(setGraderStatus); }}>Check marking again</button>}
        </div>

        {revealed && (
          <>
            {grade?.available ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h4 className="font-bold text-slate-200 text-sm">Marked against the rubric</h4>
                  <span className={`text-xs font-bold ${cleared ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {grade.coveredCount}/{grade.totalPoints} covered{cleared ? ' · cleared' : ' · not cleared'}
                  </span>
                </div>
                {grade.points.map((p) => (
                  <div key={p.index} className="flex items-start gap-3 text-sm">
                    <span className={`mt-0.5 shrink-0 ${p.covered ? 'text-emerald-400' : 'text-slate-600'}`}>
                      {p.covered ? '✓' : '✗'}
                    </span>
                    <div className="min-w-0">
                      <p className={p.covered ? 'text-slate-300' : 'text-slate-400'}>{p.point}</p>
                      {p.covered && p.evidence && (
                        <p className="text-[11px] text-emerald-300/70 italic mt-0.5">“{p.evidence}”</p>
                      )}
                      {!p.covered && p.comment && (
                        <p className="text-[11px] text-amber-300/70 mt-0.5">{p.comment}</p>
                      )}
                    </div>
                  </div>
                ))}
                {grade.feedback && (
                  <p className="text-xs text-slate-400 border-t border-slate-800 pt-3">{grade.feedback}</p>
                )}
                <p className="text-[11px] text-slate-600">
                  Marked by the Meridian API, not by you. Each ✓ quotes the sentence it was awarded for, so a mark you
                  disagree with is visible — rewrite and re-submit if it got one wrong.
                </p>
                <p className="text-[11px] text-slate-600">
                  How far to trust it: on {VIVA_BENCHMARK.answers} hand-labelled answers ({VIVA_BENCHMARK.labels} rubric
                  points) for four prompts, the {VIVA_BENCHMARK.model} marker agreed with the labels{' '}
                  {Math.round(VIVA_BENCHMARK.labelAccuracy * 1000) / 10}% of the time ({VIVA_BENCHMARK.required * 100}%
                  required). A small sample, and the other prompts are not measured.
                </p>
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                <h4 className="font-bold text-slate-200 text-sm">Self-check (does not count)</h4>
                {grade?.reason && <p className="text-xs text-amber-300/80">{grade.reason}</p>}
                {prompt.rubric.map((r, i) => (
                  <label key={r} className="flex items-start gap-3 text-sm text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={st.checked.includes(i)}
                      onChange={() => toggle(i)}
                      className="mt-1 accent-slate-500"
                    />
                    <span>{r}</span>
                  </label>
                ))}
                <p className="text-xs text-slate-500">
                  {st.checked.length}/{prompt.rubric.length} ticked. This is the offline fallback — the rubric is on
                  screen while you tick it, so it cannot clear a prompt. Submit for marking when the API is up.
                </p>
              </div>
            )}
            <Callout tone="info" title="Model answer">
              {prompt.modelAnswer}
            </Callout>

            <div className="bg-slate-900 border border-amber-800/40 rounded-2xl p-5 space-y-3">
              <h4 className="font-bold text-amber-200 text-sm">Now the assessor pushes back</h4>
              <p className="text-sm text-slate-200 italic">{prompt.challenge.prompt}</p>
              <textarea
                value={st.challengeDraft ?? ''}
                onChange={(e) => saveViva(prompt.id, { challengeDraft: e.target.value })}
                placeholder="The first answer is the easy one. Write the second."
                className="w-full h-32 bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-slate-200"
              />
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={challengeRevealed || wordCount(st.challengeDraft ?? '') < 15}
                  onClick={() => setChallengeRevealed(true)}
                  className="bg-amber-600/80 hover:bg-amber-500 disabled:opacity-40 text-white text-sm font-bold px-4 py-2 rounded-xl"
                >
                  Reveal the response
                </button>
                <span className="text-xs text-slate-500">
                  {wordCount(st.challengeDraft ?? '')} words
                  {wordCount(st.challengeDraft ?? '') < 15 && !challengeRevealed ? ' · write at least 15 first' : ''}
                </span>
              </div>
              {challengeRevealed && (
                <p className="text-sm text-slate-300 border-t border-slate-800 pt-3">{prompt.challenge.answer}</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function PracticeModule() {
  const { practiceTarget } = useAppProgress();
  const [tab, setTab] = useState<'review' | 'explain'>(practiceTarget.tab);
  useEffect(() => setTab(practiceTarget.tab), [practiceTarget]);

  return (
    <div className="flex flex-col gap-6 pb-12">
      <ModuleHeader
        title="Practice"
        subtitle="Retrieval beats re-reading. Review resurfaces the questions you missed; Explain-it makes you say the answer before you see it."
      />
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Practice mode">
        {(
          [
            ['review', 'Spaced review'],
            ['explain', 'Explain it (viva practice)'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${tab === id ? 'bg-blue-500/20 border-blue-500/40 text-blue-200' : 'border-slate-700 text-slate-500'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'review' ? <Review /> : <Explain />}

      <MemoryChains
        title="All five memory chains"
        subtitle="Warm-up before a viva: open one, read it, close it, and say it out loud. If a link does not pull the next one, that is the link to revise."
      />
    </div>
  );
}
