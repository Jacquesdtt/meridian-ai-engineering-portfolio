/**
 * Causal Lab & Decision Simulator — the "change one thing, watch what changes"
 * surface for Module 05.
 *
 * The teaching claim it exists to make: moving the threshold changes the queue
 * and changes nothing about the model. So every panel here pairs a dial with a
 * locked panel of quantities that do NOT move.
 *
 * Honesty rule: only the two measured cuts (max-F1 and the shipped ops cut) are
 * reported numbers. Other positions are estimated from
 * those two anchors (or an extrapolation outside them) and is labelled "estimated" on screen, never presented as a
 * measurement. Toy illustrations (the boosting stepper, the leakage-trap AUC
 * sequence) say so in their own copy.
 */
import { useMemo, useState, type KeyboardEvent } from 'react';
import {
  FlaskConical,
  Lock,
  TrendingDown,
  GitBranch,
  ShieldAlert,
  Gauge,
  Split,
  CheckCircle2,
  XCircle,
  RotateCcw,
} from 'lucide-react';
import { GENAI, MODEL, TEST_COUNTS, formatOpsThreshold } from '../../content/facts';
import { Callout, MetricCard } from './ui';

type Section = 'dial' | 'boosting' | 'testset' | 'calibration' | 'tracks';

const SECTIONS: { id: Section; label: string; icon: typeof Gauge }[] = [
  { id: 'dial', label: 'Threshold & capacity dial', icon: Gauge },
  { id: 'boosting', label: 'Boosting & learning rate', icon: GitBranch },
  { id: 'testset', label: 'One decision-making exposure', icon: ShieldAlert },
  { id: 'calibration', label: 'Score vs probability', icon: TrendingDown },
  { id: 'tracks', label: 'ML vs AI Engineering', icon: Split },
];

/** Arrow, Home and End keys change the selected tab and move focus together. */
function onTabKey<T extends string>(
  event: KeyboardEvent<HTMLButtonElement>,
  ids: readonly T[],
  active: T,
  select: (id: T) => void,
) {
  const index = ids.indexOf(active);
  const next = event.key === 'ArrowRight' ? (index + 1) % ids.length
    : event.key === 'ArrowLeft' ? (index - 1 + ids.length) % ids.length
      : event.key === 'Home' ? 0
        : event.key === 'End' ? ids.length - 1 : -1;
  if (next < 0) return;
  event.preventDefault();
  select(ids[next]);
  event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
}

/* ------------------------------------------------------------------ */
/* 1.2  Threshold & capacity dial                                      */
/* ------------------------------------------------------------------ */

const T_MIN = 0.1;
const T_MAX = 0.9;
const T_MAXF1 = MODEL.maxF1Threshold;
const T_OPS = MODEL.opsThresholdPrecise;

/** Log-linear fit through the only two cuts we actually measured. */
const K_FP = Math.log(MODEL.opsFalsePositives / MODEL.maxF1FalsePositives) / (T_OPS - T_MAXF1);
const K_RECALL = Math.log(MODEL.opsRecall / MODEL.maxF1Recall) / (T_OPS - T_MAXF1);

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

interface CutPoint {
  falsePositives: number;
  truePositives: number;
  recall: number;
  precision: number;
  flagged: number;
  /** True only at the two cuts that come from the test-run report. */
  measured: boolean;
}

function cutAt(t: number): CutPoint {
  const falsePositives = Math.round(
    clamp(MODEL.opsFalsePositives * Math.exp(K_FP * (t - T_OPS)), 0, TEST_COUNTS.negatives),
  );
  const recall = clamp(MODEL.opsRecall * Math.exp(K_RECALL * (t - T_OPS)), 0, 1);
  const truePositives = Math.round(recall * TEST_COUNTS.positives);
  const flagged = truePositives + falsePositives;
  return {
    falsePositives,
    truePositives,
    recall,
    precision: flagged > 0 ? truePositives / flagged : 0,
    flagged,
    measured: Math.abs(t - T_OPS) < 1e-6 || Math.abs(t - T_MAXF1) < 1e-6,
  };
}

/** The measured cuts, used both as presets and as the exact display values. */
const PRESETS = [
  {
    t: T_MAXF1,
    label: 'Max-F1 trap',
    tone: 'red' as const,
    precision: MODEL.maxF1Precision,
    recall: MODEL.maxF1Recall,
    falsePositives: MODEL.maxF1FalsePositives,
  },
  {
    t: T_OPS,
    label: 'Shipped capacity cut',
    tone: 'emerald' as const,
    precision: MODEL.opsPrecision,
    recall: MODEL.opsRecall,
    falsePositives: MODEL.opsFalsePositives,
  },
];

function ThresholdDial({ onMoved }: { onMoved: () => void }) {
  const [t, setT] = useState(T_OPS);

  const point = useMemo(() => {
    const preset = PRESETS.find((p) => Math.abs(p.t - t) < 1e-6);
    if (preset) {
      const truePositives = Math.round(preset.recall * TEST_COUNTS.positives);
      return {
        falsePositives: preset.falsePositives,
        truePositives,
        recall: preset.recall,
        precision: preset.precision,
        flagged: truePositives + preset.falsePositives,
        measured: true,
      } satisfies CutPoint;
    }
    return cutAt(t);
  }, [t]);

  const move = (next: number) => {
    setT(next);
    onMoved();
  };

  return (
    <div className="space-y-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-100 text-base">Change one thing: the threshold</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Drag the cut. Watch the left column move and the right column refuse to.
            </p>
          </div>
          <span
            className={`self-start text-[11px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md border ${
              point.measured
                ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            {point.measured
              ? 'Measured on test'
              : t < T_MAXF1 || t > T_OPS
                ? 'Estimated (extrapolated)'
                : 'Estimated (interpolated)'}
          </span>
        </div>

        <div className="space-y-2">
          <label htmlFor="causal-threshold" className="flex items-baseline justify-between text-xs text-slate-400">
            <span className="font-bold uppercase tracking-widest text-slate-500">Decision threshold t</span>
            <span className="font-mono text-lg text-blue-300">{t.toFixed(5)}</span>
          </label>
          <input
            id="causal-threshold"
            type="range"
            min={T_MIN}
            max={T_MAX}
            step={0.001}
            value={t}
            onChange={(e) => move(Number(e.target.value))}
            aria-valuetext={`Threshold ${t.toFixed(3)}, recall ${(point.recall * 100).toFixed(1)} percent, ${point.falsePositives.toLocaleString()} false positives`}
            className="w-full accent-blue-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] font-mono text-slate-600">
            <span>{T_MIN.toFixed(2)}</span>
            <span>{T_MAX.toFixed(2)}</span>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => move(p.t)}
                aria-pressed={Math.abs(p.t - t) < 1e-6}
                className={`text-left px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                  Math.abs(p.t - t) < 1e-6
                    ? p.tone === 'red'
                      ? 'bg-red-950/40 border-red-700 text-red-200'
                      : 'bg-emerald-950/40 border-emerald-700 text-emerald-200'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                Snap to {p.label} · <span className="font-mono">t={p.t}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* WHAT CHANGES */}
          <div className="space-y-3 rounded-xl border border-blue-900/40 bg-blue-950/20 p-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-300">
              <FlaskConical className="w-4 h-4" /> What changes
            </div>
            <div className="grid grid-cols-2 gap-3">
              <MetricCard
                label="Customers flagged"
                value={point.flagged.toLocaleString()}
                sub={`of ~${TEST_COUNTS.rows.toLocaleString()} test rows`}
                accent="blue"
              />
              <MetricCard
                label="False positives"
                value={point.falsePositives.toLocaleString()}
                sub="Reviewer queue noise"
                accent={point.falsePositives > 100_000 ? 'red' : point.falsePositives > 40_000 ? 'amber' : 'emerald'}
              />
              <MetricCard
                label="Contacted precision"
                value={`${(point.precision * 100).toFixed(1)}%`}
                sub="Of those flagged, share who churn"
                accent="blue"
              />
              <MetricCard
                label="Recall"
                value={`${(point.recall * 100).toFixed(1)}%`}
                sub="Of churners, share we catch"
                accent="blue"
              />
            </div>
            <p className="text-[11px] leading-relaxed text-blue-200/80">
              Reviewer load: at one draft reviewed per working minute, {point.flagged.toLocaleString()} flags is
              roughly <strong>{Math.round(point.flagged / 60 / 7.5).toLocaleString()} reviewer-days</strong> across the
              whole test window. That is the number Morgan is buying, not the AUC.
            </p>
          </div>

          {/* WHAT DOES NOT CHANGE */}
          <div className="space-y-3 rounded-xl border border-amber-900/40 bg-amber-950/20 p-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-amber-300">
              <Lock className="w-4 h-4" /> What does NOT change
            </div>
            <div className="space-y-2">
              {[
                ['ROC-AUC', String(MODEL.rocAuc.model), 'Ranking separation across every possible cut'],
                ['PR-AUC', String(MODEL.prAuc.model), 'Threshold-free; scores the order, not the line'],
                ['The ranking itself', `${MODEL.featureCount} features`, 'Same booster, same scores, same order'],
                ['The trained model', `run ${MODEL.runId.slice(0, 8)}`, 'Nothing was retrained by moving this dial'],
              ].map(([label, value, why]) => (
                <div
                  key={label}
                  className="flex items-start justify-between gap-3 rounded-lg border border-amber-900/40 bg-slate-950 p-2.5"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                      <Lock className="w-3 h-3 text-amber-400 shrink-0" aria-hidden />
                      {label}
                    </div>
                    <div className="text-[11px] text-slate-500 leading-snug">{why}</div>
                  </div>
                  <span className="font-mono text-sm text-amber-300 shrink-0">{value}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-amber-200/80 leading-relaxed">
              These four are locked for every position of the slider. If a number here ever moved, you changed the
              model — not the policy.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-950 p-4 text-center">
          <p className="text-sm font-bold text-slate-100 tracking-tight">
            Model Quality ≠ Decision Threshold ≠ Operational Policy ≠ Business Capacity.
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Four separate questions, four separate owners. Sam owns the first, the threshold rule is derived on
            validation, the policy is Friction-Gate, and the capacity is Morgan&apos;s budget.
          </p>
        </div>

        <Callout tone="warn" title="What is measured and what is not">
          Only <code className="font-mono">t={T_MAXF1}</code> and <code className="font-mono">{formatOpsThreshold('precise')}</code>{' '}
          are reported test-window results. Other positions are log-linear estimates: interpolated between the
          anchors, extrapolated outside them. They show the shape of the trade, not results you may quote. Row counts are
          derived from the locked precision, recall and accuracy, so they are approximate.
        </Callout>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 1.3  Gradient boosting & learning rate                              */
/* ------------------------------------------------------------------ */

/** A toy residual-fitting sequence. Not Meridian's booster — a mechanism demo. */
const TOY_TARGET = 2.4;
const TOY_BASE = 0.5;
/** Each "tree" fits the residual, but imperfectly: it captures this much of it, plus noise. */
const TOY_TREE_FIT = 0.85;
const TOY_NOISE = [0.32, -0.28, 0.41, -0.19, 0.25, -0.35, 0.18, -0.22, 0.3, -0.26, 0.15, -0.31];

function boostingTrace(eta: number, rounds: number): number[] {
  const trace = [TOY_BASE];
  let pred = TOY_BASE;
  for (let i = 0; i < rounds; i += 1) {
    const residual = TOY_TARGET - pred;
    const leaf = residual * TOY_TREE_FIT + TOY_NOISE[i % TOY_NOISE.length];
    pred += eta * leaf;
    trace.push(pred);
  }
  return trace;
}

function BoostingLab() {
  const [eta, setEta] = useState(0.3);
  const [rounds, setRounds] = useState(6);
  const trace = useMemo(() => boostingTrace(eta, rounds), [eta, rounds]);
  const final = trace[trace.length - 1];
  const gap = Math.abs(TOY_TARGET - final);

  const scale = (v: number) => clamp(((v - 0) / (TOY_TARGET * 1.4)) * 100, 0, 100);

  return (
    <div className="space-y-4">
      <Callout tone="info" title="This one is a toy, on purpose">
        The numbers below are an invented residual-fitting sequence, not Meridian&apos;s booster. It exists to show the
        mechanism — base score, then a shrunken correction per tree — because that mechanism is what an assessor asks
        you to explain.
      </Callout>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h3 className="font-bold text-slate-100 text-base">
          Base prediction + η × Tree₁ + η × Tree₂ + …
        </h3>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label htmlFor="causal-eta" className="flex items-baseline justify-between text-xs text-slate-400">
              <span className="font-bold uppercase tracking-widest text-slate-500">Learning rate η</span>
              <span className="font-mono text-base text-blue-300">{eta.toFixed(2)}</span>
            </label>
            <input
              id="causal-eta"
              type="range"
              min={0.02}
              max={1}
              step={0.01}
              value={eta}
              onChange={(e) => setEta(Number(e.target.value))}
              aria-valuetext={`Learning rate ${eta.toFixed(2)}`}
              className="w-full accent-blue-500 cursor-pointer"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="causal-rounds" className="flex items-baseline justify-between text-xs text-slate-400">
              <span className="font-bold uppercase tracking-widest text-slate-500">Boosting rounds</span>
              <span className="font-mono text-base text-blue-300">{rounds}</span>
            </label>
            <input
              id="causal-rounds"
              type="range"
              min={1}
              max={12}
              step={1}
              value={rounds}
              onChange={(e) => setRounds(Number(e.target.value))}
              aria-valuetext={`${rounds} boosting rounds`}
              className="w-full accent-blue-500 cursor-pointer"
            />
          </div>
        </div>

        <ol className="space-y-1.5" aria-label="Ensemble prediction after each boosting round">
          {trace.map((v, i) => (
            <li key={i} className="grid grid-cols-[6.5rem_1fr_3.5rem] items-center gap-3 text-xs">
              <span className="font-mono text-slate-400">{i === 0 ? 'base' : `+ η×Tree${i}`}</span>
              <div className="h-2.5 rounded bg-slate-800 relative">
                <div className="h-2.5 rounded bg-blue-500/80" style={{ width: `${scale(v)}%` }} />
                <div
                  className="absolute top-[-3px] h-4 w-0.5 bg-emerald-400"
                  style={{ left: `${scale(TOY_TARGET)}%` }}
                  aria-hidden
                />
              </div>
              <span className="font-mono text-slate-300 text-right">{v.toFixed(2)}</span>
            </li>
          ))}
        </ol>
        <p className="text-[11px] text-slate-500">
          Green tick marks the target ({TOY_TARGET.toFixed(1)}). Gap after {rounds} round{rounds === 1 ? '' : 's'}:{' '}
          <span className={`font-mono ${gap < 0.25 ? 'text-emerald-300' : 'text-amber-300'}`}>{gap.toFixed(2)}</span>
        </p>

        <div className="grid sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-blue-900/40 bg-blue-950/20 p-3.5 space-y-1">
            <div className="text-xs font-bold text-blue-300">Small η (e.g. 0.05)</div>
            <p className="text-[11px] text-blue-200/80 leading-relaxed">
              Each tree nudges the ensemble a little, so a single tree fitting noise cannot drag the prediction far.
              You need many more rounds to reach the target — and with the rounds fixed, you simply stop short.
              That is underfitting caused by a hyperparameter, not by a lack of signal.
            </p>
          </div>
          <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-3.5 space-y-1">
            <div className="text-xs font-bold text-amber-300">Large η (e.g. 0.9)</div>
            <p className="text-[11px] text-amber-200/80 leading-relaxed">
              Each tree takes most of the correction in one jump. It reaches the neighbourhood of the target quickly
              and then oscillates around it, because whatever noise a tree fitted gets applied at nearly full weight.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-950 p-4 space-y-2">
          <div className="text-xs font-bold uppercase tracking-widest text-slate-500">The maths, in four steps</div>
          <ol className="text-xs text-slate-400 space-y-1.5 list-decimal pl-4 leading-relaxed">
            <li>
              A <strong className="text-slate-200">loss function</strong> scores how wrong the current ensemble is. For{' '}
              <code className="font-mono">{MODEL.objective}</code> that is log-loss on the churn label.
            </li>
            <li>
              Differentiating the loss at each row gives a <strong className="text-slate-200">gradient</strong> (and a
              second derivative, the hessian): the direction and confidence with which that row wants the prediction to
              move.
            </li>
            <li>
              The next tree is grown to group rows with similar gradients; each{' '}
              <strong className="text-slate-200">leaf weight</strong> is the gradient sum over the leaf divided by the
              negative gradient sum over the hessian sum plus regularisation. That is the correction the tree proposes.
            </li>
            <li>
              The correction is multiplied by <strong className="text-slate-200">η, the shrinkage factor</strong>, before
              being added. η does not change what the tree learned — it decides how much of it you trust.
            </li>
          </ol>
          <p className="text-[11px] text-slate-500">
            No epochs, no minibatches, no backpropagation. Each round adds a whole new tree to a sum; nothing already in
            the ensemble is revised.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 1.4  Test-set discipline sandbox                                    */
/* ------------------------------------------------------------------ */

interface FlowStep {
  label: string;
  detail: string;
  touchesTest: boolean;
}

const SAFE_FLOW: FlowStep[] = [
  { label: 'Tune on validation', detail: 'Hyperparameters and the threshold rule are chosen on the validation window only.', touchesTest: false },
  { label: 'Freeze the champion', detail: 'Booster + fitted preprocessor + feature order + threshold are frozen together. Nothing downstream may edit them.', touchesTest: false },
  { label: 'Evaluate once on test', detail: 'The untouched test window is scored by the frozen pipeline.', touchesTest: true },
  { label: 'Report the multi-metric card', detail: 'Every number on the card comes from that one frozen evaluation; reporting it is not a second evaluation.', touchesTest: false },
  { label: 'STOP', detail: 'No change is made in response to what the card said. If something must change, the honest move is a new holdout.', touchesTest: false },
];

const TRAP_FLOW: FlowStep[] = [
  { label: 'Evaluate on test → AUC 0.79', detail: 'Fine so far. The first look is the one you are allowed.', touchesTest: true },
  { label: 'Change max_depth', detail: 'The change was chosen because the test number was disappointing. The test set just influenced the model.', touchesTest: false },
  { label: 'Evaluate on test → AUC 0.82', detail: 'The improvement is partly real and partly the test set being fitted through you.', touchesTest: true },
  { label: 'Change the threshold', detail: 'Now the decision policy is being tuned on the holdout too.', touchesTest: false },
  { label: 'Evaluate adjusted policy on test again', detail: 'ROC-AUC stays at 0.82 because the scores did not change. Cut-specific precision and recall can move, but choosing a cut from this test feedback contaminates the holdout.', touchesTest: true },
];

const METRIC_CARD = [
  { name: 'ROC-AUC', value: String(MODEL.rocAuc.model), why: 'Ranking separation over all cuts' },
  { name: 'PR-AUC', value: String(MODEL.prAuc.model), why: `The metric that matters at a ${(MODEL.baseRate * 100).toFixed(1)}% base rate` },
  { name: 'Precision at the ops cut', value: `${(MODEL.opsPrecision * 100).toFixed(1)}%`, why: 'What a reviewer actually experiences' },
  { name: 'Recall at the ops cut', value: `${(MODEL.opsRecall * 100).toFixed(1)}%`, why: 'What the capacity cap costs' },
  { name: 'Calibration', value: 'Not calibrated', why: 'Scores are ranks; reported as a known gap, not a number' },
  { name: 'Fairness gap (age EOD)', value: MODEL.eodAge.toFixed(3), why: 'Disclosed for review, not used as a gate' },
  { name: 'Fairness gap (state EOD)', value: MODEL.eodState.toFixed(3), why: 'Same disclosure rule' },
  { name: 'Assets at risk in the queue', value: 'Sizing only', why: 'Historical baseline, never presented as money saved' },
  { name: 'Cost per contact', value: 'One reviewed draft', why: 'The false-positive cost here is a human minute, not a declined customer' },
];

function TestSetLab() {
  const [flow, setFlow] = useState<'safe' | 'trap'>('safe');
  const [step, setStep] = useState(0);
  const steps = flow === 'safe' ? SAFE_FLOW : TRAP_FLOW;
  const exposures = steps.slice(0, step + 1).filter((s) => s.touchesTest).length;
  // The holdout starts influencing selection as soon as the first test-driven change is made.
  const contaminated = flow === 'trap' && step >= 1;

  const switchFlow = (next: 'safe' | 'trap') => {
    setFlow(next);
    setStep(0);
  };

  return (
    <div className="space-y-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div>
          <h3 className="font-bold text-slate-100 text-base">One decision-making exposure</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Step through both workflows. Count the exposures, then ask which one still has an honest estimate at the end.
          </p>
        </div>

        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Test-set workflow">
          {(
            [
              ['safe', 'Safe workflow'],
              ['trap', 'Feedback-leakage trap'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              id={`test-flow-tab-${id}`}
              role="tab"
              aria-selected={flow === id}
              aria-controls="test-flow-panel"
              tabIndex={flow === id ? 0 : -1}
              onClick={() => switchFlow(id)}
              onKeyDown={(e) => onTabKey(e, ['safe', 'trap'] as const, flow, switchFlow)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                flow === id
                  ? id === 'safe'
                    ? 'bg-emerald-950/40 border-emerald-700 text-emerald-200'
                    : 'bg-red-950/40 border-red-700 text-red-200'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <ol className="space-y-2" id="test-flow-panel" role="tabpanel" aria-labelledby={`test-flow-tab-${flow}`}>
          {steps.map((s, i) => {
            const reached = i <= step;
            return (
              <li
                key={s.label}
                className={`rounded-xl border p-3 transition-all ${
                  !reached
                    ? 'border-slate-800 bg-slate-950 opacity-40'
                    : s.touchesTest
                      ? 'border-blue-800/60 bg-blue-950/20'
                      : 'border-slate-700 bg-slate-950'
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                  <span className="font-mono text-slate-500">{i + 1}.</span>
                  {s.label}
                  {s.touchesTest && reached && (
                    <span className="text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-blue-900/50 text-blue-200 border border-blue-800">
                      test touched
                    </span>
                  )}
                </div>
                {reached && <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{s.detail}</p>}
              </li>
            );
          })}
        </ol>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
            disabled={step >= steps.length - 1}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white border border-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next step
          </button>
          <button
            type="button"
            onClick={() => setStep(0)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-700 text-slate-400 hover:border-slate-600"
          >
            <RotateCcw className="w-3 h-3" /> Restart
          </button>
          <span className="text-xs text-slate-400">
            Test evaluations so far: <strong className="font-mono text-slate-200">{exposures}</strong>
          </span>
          {contaminated ? (
            <span className="flex items-center gap-1.5 text-xs font-bold text-red-300">
              <XCircle className="w-3.5 h-3.5" /> Holdout contaminated
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5" /> Holdout still independent
            </span>
          )}
        </div>

        <Callout tone="warn" title="The AUC values in the trap are illustrative">
          0.79 → 0.82 is a made-up model-change sequence showing the shape of the mistake. Moving only the threshold
          cannot change ROC-AUC. Meridian&apos;s actual reported test ROC-AUC is {MODEL.rocAuc.model}, produced by the safe workflow.
        </Callout>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-3">
          <h4 className="font-bold text-slate-100 text-sm">Where the line actually falls</h4>
          <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5" /> Safe: repeated computation
            </div>
            <p className="text-[11px] text-emerald-200/80 leading-relaxed">
              Re-running identical frozen code over the test set — because a job crashed, because you are checking a
              bug, because a reviewer wants to reproduce the card — changes nothing. The same inputs produce the same
              number. Nothing about the pipeline learned anything.
            </p>
          </div>
          <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-red-300">
              <XCircle className="w-3.5 h-3.5" /> Leakage: repeated feedback
            </div>
            <p className="text-[11px] text-red-200/80 leading-relaxed">
              A test result influences a change, and the changed thing is checked against the test set again. Now you
              are the optimiser and the holdout is your training signal. It does not matter whether the change was a
              hyperparameter, a threshold, a feature, or which of two runs you chose to ship.
            </p>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            The rule is not &ldquo;look once&rdquo;. It is <strong className="text-slate-300">one decision-making
            exposure</strong>: the pipeline is frozen before the test set is scored, and no decision flows backwards
            from the result.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-3">
          <h4 className="font-bold text-slate-100 text-sm">The multi-metric card on the frozen champion</h4>
          <p className="text-[11px] text-slate-500">
            One evaluation, many numbers. Reporting a single headline metric is what makes people want a second look.
          </p>
          <div className="space-y-1.5">
            {METRIC_CARD.map((m) => (
              <div
                key={m.name}
                className="flex items-start justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950 p-2.5"
              >
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-200">{m.name}</div>
                  <div className="text-[11px] text-slate-500 leading-snug">{m.why}</div>
                </div>
                <span className="font-mono text-xs text-emerald-300 shrink-0 text-right">{m.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 1.5  Calibration inspector                                          */
/* ------------------------------------------------------------------ */

function CalibrationLab() {
  const [score, setScore] = useState(0.8);

  return (
    <div className="space-y-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div>
          <h3 className="font-bold text-slate-100 text-base">A score of 0.80 does not mean 80%</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Move the score and read both interpretations. Only one of them is defensible for this model.
          </p>
        </div>

        <div className="space-y-1">
          <label htmlFor="causal-score" className="flex items-baseline justify-between text-xs text-slate-400">
            <span className="font-bold uppercase tracking-widest text-slate-500">Model output score</span>
            <span className="font-mono text-lg text-blue-300">{score.toFixed(2)}</span>
          </label>
          <input
            id="causal-score"
            type="range"
            min={0.01}
            max={0.99}
            step={0.01}
            value={score}
            onChange={(e) => setScore(Number(e.target.value))}
            aria-valuetext={`Model score ${score.toFixed(2)}`}
            className="w-full accent-blue-500 cursor-pointer"
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-4 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-red-300">
              <XCircle className="w-3.5 h-3.5" /> The naive reading
            </div>
            <p className="text-sm text-red-100/90 leading-relaxed">
              &ldquo;This customer has a {(score * 100).toFixed(0)}% probability of churning next month.&rdquo;
            </p>
            <p className="text-[11px] text-red-200/70 leading-relaxed">
              This is the sentence that loses you the viva. It claims a calibrated posterior the model was never trained
              to produce.
            </p>
          </div>
          <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-4 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5" /> The Meridian reading
            </div>
            <p className="text-sm text-emerald-100/90 leading-relaxed">
              &ldquo;This customer sits at {(score * 100).toFixed(0)} on an uncalibrated ranking score.
              {score >= MODEL.opsThresholdPrecise
                ? ` That is above the ops cut (${formatOpsThreshold('precise')}), so they enter the review queue.`
                : ` That is below the ops cut (${formatOpsThreshold('precise')}), so no draft is produced.`}
              &rdquo;
            </p>
            <p className="text-[11px] text-emerald-200/70 leading-relaxed">
              The score is only meaningful relative to other customers&apos; scores. Its job is to order the queue.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-950 p-4 space-y-2">
          <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Why it came out this way</div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Training used <code className="font-mono text-blue-300">scale_pos_weight</code> to up-weight the{' '}
            {(MODEL.baseRate * 100).toFixed(1)}% minority class. Boosting then optimises a loss in which a churner
            counts for many non-churners, so the ensemble is rewarded for separating the classes rather than for
            matching observed frequencies. The result is exactly what was asked for — better ranking — and exactly what
            was not asked for: the output distribution is shifted away from the true posterior. It is a deliberate
            trade, not a bug.
          </p>
          <p className="text-xs text-slate-400 leading-relaxed">
            The evidence is in the slices: even the top 1% of validation scores is only about{' '}
            {Math.round(MODEL.top1PctPrecision * 100)}% precise. If the scores were probabilities, the top bucket at
            ~0.9 would be around 90% precise.
          </p>
        </div>

        <Callout tone="warn" title="API debt: the field is called churn_probability">
          The serving contract names the field <code className="font-mono">churn_probability</code>, which is legacy
          naming debt from before the calibration question was settled. Renaming it is a breaking change to a published
          contract, so it is documented rather than silently patched. Say so out loud before an assessor finds it —
          calling the field a probability in the schema is not the same as claiming the number is one.
        </Callout>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 1.6  ML vs AI Engineering dual track                                */
/* ------------------------------------------------------------------ */

const ML_TRACK = {
  question: 'Which customer-months appear most at risk of next-month churn?',
  items: [
    ['Features', 'Month-t behaviour only: balances, transaction counts, shifted lags and rolls.'],
    ['XGBoost', `${MODEL.objective}, ${MODEL.featureCount} features, gradient-boosted trees.`],
    ['Loss', 'Log-loss with scale_pos_weight — gradients, leaf weights, shrinkage η.'],
    ['ROC-AUC', `${MODEL.rocAuc.model} on test vs ${MODEL.rocAuc.heuristic} for the heuristic.`],
    ['PR-AUC', `${MODEL.prAuc.model} vs ${MODEL.prAuc.heuristic} — the metric that survives the base rate.`],
  ],
};

const AIE_TRACK = {
  question: 'How do we safely turn that evidence into a bounded, auditable workflow?',
  items: [
    ['FastAPI serving contract', 'Single enforcement point: role check, re-score from raw features, threshold gate, audit row.'],
    ['SQLite WAL', 'One writer, many readers, one replica — the audit trail cannot fork.'],
    ['Friction Gate', 'Attention acknowledgement, fast-decide warning, no /send route. Approve ≠ Sent.'],
    ['Prompty + Pydantic', `Versioned prompt template; structured output clamped to the ${GENAI.rateCapDisplay} rate cap.`],
    ['RAG', 'Methodology Q&A over one report — grounded answers, not an email generator.'],
    ['ZDR PII scrub', 'Blocked keys dropped and regex redaction before anything reaches Azure.'],
    ['Human review', 'A person reads, edits and approves. The queue is a proposal, not a decision.'],
  ],
};

function DualTrack() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-700 bg-slate-950 p-5 text-center">
        <p className="text-base font-bold text-slate-100 tracking-tight">
          A model score is evidence, not permission to act.
        </p>
        <p className="text-[11px] text-slate-500 mt-1">
          Everything left of the line produces the evidence. Everything right of it decides what may be done with it.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr] items-stretch">
        <section className="rounded-2xl border border-blue-900/50 bg-blue-950/20 p-5 space-y-3">
          <h3 className="font-bold text-blue-200 text-sm uppercase tracking-widest">Machine Learning</h3>
          <p className="text-xs text-blue-100/90 leading-relaxed italic">&ldquo;{ML_TRACK.question}&rdquo;</p>
          <ul className="space-y-2">
            {ML_TRACK.items.map(([name, detail]) => (
              <li key={name} className="rounded-lg border border-blue-900/40 bg-slate-950 p-2.5">
                <div className="text-xs font-bold text-slate-200">{name}</div>
                <div className="text-[11px] text-slate-400 leading-snug">{detail}</div>
              </li>
            ))}
          </ul>
        </section>

        <div className="flex lg:flex-col items-center justify-center gap-2 py-2 lg:py-0" aria-hidden>
          <div className="hidden lg:block w-px flex-1 bg-gradient-to-b from-transparent via-slate-600 to-transparent" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 lg:[writing-mode:vertical-rl] whitespace-nowrap">
            the boundary
          </span>
          <div className="hidden lg:block w-px flex-1 bg-gradient-to-b from-transparent via-slate-600 to-transparent" />
          <div className="lg:hidden h-px flex-1 bg-gradient-to-r from-transparent via-slate-600 to-transparent" />
        </div>

        <section className="rounded-2xl border border-purple-900/50 bg-purple-950/20 p-5 space-y-3">
          <h3 className="font-bold text-purple-200 text-sm uppercase tracking-widest">AI Engineering</h3>
          <p className="text-xs text-purple-100/90 leading-relaxed italic">&ldquo;{AIE_TRACK.question}&rdquo;</p>
          <ul className="space-y-2">
            {AIE_TRACK.items.map(([name, detail]) => (
              <li key={name} className="rounded-lg border border-purple-900/40 bg-slate-950 p-2.5">
                <div className="text-xs font-bold text-slate-200">{name}</div>
                <div className="text-[11px] text-slate-400 leading-snug">{detail}</div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <Callout tone="info" title="Why the split matters in a viva">
        Most candidates answer an AI-engineering question with an ML answer, or defend a threshold as if it were a
        modelling result. Naming which side of the boundary a question sits on before answering it is the single
        cheapest way to sound like you have shipped something.
      </Callout>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function CausalLab({ onThresholdMoved }: { onThresholdMoved: () => void }) {
  const [section, setSection] = useState<Section>('dial');

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
          <FlaskConical className="w-4 h-4 text-blue-400" /> The Meridian learning loop
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          See the real system → change one thing → watch what changes → predict why → attach the technical term → learn
          the formula → explain it back through Meridian. A term is learned when you can predict what happens
          downstream, not when you can recite its definition.
        </p>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Causal Lab sections">
        {SECTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            id={`causal-tab-${id}`}
            role="tab"
            aria-selected={section === id}
            aria-controls="causal-panel"
            tabIndex={section === id ? 0 : -1}
            onClick={() => setSection(id)}
            onKeyDown={(e) => onTabKey(e, SECTIONS.map((s) => s.id), section, setSection)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
              section === id
                ? 'bg-blue-500/20 border-blue-500/50 text-blue-200'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
            }`}
          >
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      <div id="causal-panel" role="tabpanel" aria-labelledby={`causal-tab-${section}`}>
        {section === 'dial' && <ThresholdDial onMoved={onThresholdMoved} />}
        {section === 'boosting' && <BoostingLab />}
        {section === 'testset' && <TestSetLab />}
        {section === 'calibration' && <CalibrationLab />}
        {section === 'tracks' && <DualTrack />}
      </div>
    </div>
  );
}
