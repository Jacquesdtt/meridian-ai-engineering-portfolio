import { useState } from 'react';
import {
  Sliders,
  Cpu,
  BarChart3,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Users,
  FlaskConical,
} from 'lucide-react';
import { MODEL, VAL_SLICES, TEMPORAL_SPLIT, FAIRNESS, OPS_MATH, formatOpsThreshold } from '../content/facts';
import { useAppProgress } from '../context/AppProgress';
import { Callout, MetricCard, ModuleHeader, CodeBlock } from '../components/shared/ui';
import { CausalLab } from '../components/shared/CausalLab';
import { MemoryChains } from '../components/shared/MemoryChains';

type SubView = 'threshold' | 'causal' | 'model' | 'shap' | 'governance';
type Rule = 'maxF1' | 'floor' | 'capacity';

const RULES: { id: Rule; label: string; sub: string }[] = [
  { id: 'maxF1', label: '1. Maximise F1', sub: `t = ${MODEL.maxF1Threshold} · run ${MODEL.firstRunId.slice(0, 8)}` },
  { id: 'floor', label: `2. Precision ≥ ${MODEL.precisionFloorTarget * 100}%`, sub: 'The target Product/Risk asked for' },
  { id: 'capacity', label: '3. Top 5% Capacity', sub: `${formatOpsThreshold()} · run ${MODEL.runId.slice(0, 8)} (shipped)` },
];

const SHAP_ENTRIES = Object.entries(MODEL.topShap);
const SHAP_MAX = Math.max(...SHAP_ENTRIES.map(([, v]) => v));
const alwaysNegativeAccuracy = 1 - MODEL.baseRate;

export function MlModule() {
  const { setInteraction } = useAppProgress();
  const [subView, setSubView] = useState<SubView>('threshold');
  const [rule, setRule] = useState<Rule>('capacity');
  const [seen, setSeen] = useState<Set<Rule>>(new Set(['capacity']));
  const [img, setImg] = useState<'summary' | 'high' | 'low'>('summary');

  const pick = (r: Rule) => {
    setRule(r);
    const next = new Set(seen).add(r);
    setSeen(next);
    if (next.has('maxF1') && next.has('capacity')) {
      setInteraction('adjustedThreshold');
    }
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-5 pb-8">
      <ModuleHeader
        title="XGBoost & Operational Threshold Decision"
        subtitle="Two separate questions: does the model rank customers better than a realistic baseline, and who should actually be contacted?"
      />

      {/* Sub-view Navigation Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3" role="tablist" aria-label="ML module subviews">
        <button
          type="button"
          role="tab"
          aria-selected={subView === 'threshold'}
          onClick={() => setSubView('threshold')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border ${
            subView === 'threshold'
              ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/20'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" /> Operational Threshold Decision
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={subView === 'causal'}
          onClick={() => setSubView('causal')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border ${
            subView === 'causal'
              ? 'bg-cyan-600 text-white border-cyan-500 shadow-lg shadow-cyan-500/20'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <FlaskConical className="w-3.5 h-3.5" /> Causal Lab & Decision Simulator
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={subView === 'model'}
          onClick={() => setSubView('model')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border ${
            subView === 'model'
              ? 'bg-amber-600 text-white border-amber-500 shadow-lg shadow-amber-500/20'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" /> Model Architecture & Benchmarking
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={subView === 'shap'}
          onClick={() => setSubView('shap')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border ${
            subView === 'shap'
              ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-500/20'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" /> SHAP Drivers & Explainability
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={subView === 'governance'}
          onClick={() => setSubView('governance')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border ${
            subView === 'governance'
              ? 'bg-purple-600 text-white border-purple-500 shadow-lg shadow-purple-500/20'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" /> Governance & Serving
        </button>
      </div>

      {/* VIEW 1: THRESHOLD DECISION */}
      {subView === 'threshold' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricCard label="Shipped Cut" value={formatOpsThreshold()} sub={MODEL.thresholdRule} accent="emerald" />
            <MetricCard label="Test Precision" value={`${(MODEL.opsPrecision * 100).toFixed(1)}%`} sub="1.7x base rate lift" accent="emerald" />
            <MetricCard label="Test False Positives" value={MODEL.opsFalsePositives.toLocaleString()} sub="Down from 248k" accent="emerald" />
            <MetricCard label="Test Recall" value={`${(MODEL.opsRecall * 100).toFixed(1)}%`} sub="Top-5% queue constraint" />
          </div>

          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-slate-100 text-base">The 3-Way Threshold Decision Matrix</h3>
                <p className="text-xs text-slate-400">
                  Ranking quality (PR-AUC {MODEL.prAuc.model}) is unchanged by the cutoff. The threshold decides queue feasibility.
                </p>
              </div>
              <span className="text-xs font-mono px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300">
                Tuned on Val ({TEMPORAL_SPLIT.val}) · Evaluated on Test
              </span>
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              {RULES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => pick(r.id)}
                  className={`text-left rounded-xl p-3.5 border transition-all ${
                    rule === r.id
                      ? 'border-blue-500/80 bg-blue-950/40 shadow-lg shadow-blue-500/10'
                      : 'border-slate-800 bg-slate-950 hover:border-slate-700 text-slate-400'
                  }`}
                >
                  <div className="font-bold text-slate-200 text-sm">{r.label}</div>
                  <div className="text-xs text-slate-400 mt-1">{r.sub}</div>
                </button>
              ))}
            </div>

            {rule === 'maxF1' && (
              <div className="space-y-3 bg-red-950/20 border border-red-900/30 rounded-xl p-4">
                <div className="flex items-center gap-2 text-xs font-bold text-red-400 uppercase tracking-wide">
                  <AlertTriangle className="w-4 h-4" /> Option 1: Max-F1 Trap — Operational Meltdown
                </div>
                <div className="grid sm:grid-cols-3 gap-3">
                  <MetricCard label="Test Precision" value={(MODEL.maxF1Precision * 100).toFixed(1) + '%'} accent="amber" />
                  <MetricCard label="Test Recall" value={(MODEL.maxF1Recall * 100).toFixed(1) + '%'} accent="amber" />
                  <MetricCard label="False Positives" value={MODEL.maxF1FalsePositives.toLocaleString()} accent="red" />
                </div>
                <p className="text-xs text-red-200/90 leading-relaxed">
                  Maximising F1 balances precision and recall equally without counting the operational cost of false alarms.
                  At <code className="font-mono">t={MODEL.maxF1Threshold}</code>, the model flags nearly every customer (Recall ≈ 99.9%),
                  generating <strong>{MODEL.maxF1FalsePositives.toLocaleString()} false positives</strong> on test. The retention desk
                  would collapse under review fatigue within 48 hours.
                </p>
              </div>
            )}

            {rule === 'floor' && (
              <div className="space-y-3 bg-amber-950/20 border border-amber-900/30 rounded-xl p-4">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wide">
                  <AlertTriangle className="w-4 h-4" /> Option 2: 40% Precision Floor — Mathematically Infeasible
                </div>
                <table className="w-full text-xs">
                  <thead className="text-slate-400 text-left border-b border-slate-800">
                    <tr>
                      <th className="py-1.5">Contact Slice (Validation)</th>
                      <th>Share</th>
                      <th>Precision</th>
                      <th>Recall</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-300 font-mono">
                    {VAL_SLICES.map((v) => (
                      <tr key={v.slice} className="border-t border-slate-800/60">
                        <td className="py-1.5 font-sans">{v.slice}</td>
                        <td>{(v.share * 100).toFixed(0)}%</td>
                        <td>{(v.precision * 100).toFixed(0)}%</td>
                        <td>{(v.recall * 100).toFixed(0)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-xs text-amber-200/90 leading-relaxed">
                  Management requested a 40% precision floor. Slicing the validation set revealed that even the <strong>top 1% highest-risk score bucket reached only ~24% precision</strong> (about 2× the 12% base rate).
                  Because the model was trained with <code className="font-mono">scale_pos_weight</code>, raw scores are <strong>ranks, not calibrated probabilities</strong>.
                  Cutting higher shrinks queue size without improving purity. The team documented this limitation honestly rather than fabricating an arbitrary threshold.
                </p>
              </div>
            )}

            {rule === 'capacity' && (
              <div className="space-y-3 bg-emerald-950/20 border border-emerald-900/30 rounded-xl p-4">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wide">
                  <CheckCircle2 className="w-4 h-4" /> Option 3: Shipped Capacity Cut (t ≈ {MODEL.opsThresholdPrecise})
                </div>
                <div className="grid sm:grid-cols-3 gap-3">
                  <MetricCard label="Test Precision" value={(MODEL.opsPrecision * 100).toFixed(1) + '%'} accent="emerald" />
                  <MetricCard label="Test Recall" value={(MODEL.opsRecall * 100).toFixed(1) + '%'} accent="emerald" />
                  <MetricCard label="False Positives" value={MODEL.opsFalsePositives.toLocaleString()} accent="emerald" />
                </div>
                <p className="text-xs text-emerald-200/90 leading-relaxed">
                  When the precision floor was proven infeasible, the team fell back to Morgan&apos;s operational budget: the validation top-5% score (<code className="font-mono">{formatOpsThreshold('precise')}</code>).
                  False alarms plummet by <strong>{OPS_MATH.fpReductionFactor}×</strong> (from {MODEL.maxF1FalsePositives.toLocaleString()} down to {MODEL.opsFalsePositives.toLocaleString()}),
                  delivering a human-scale queue where {OPS_MATH.contactedPrecisionPct} out of every 100 flagged accounts genuinely churn.
                </p>
              </div>
            )}

            <Callout tone="info" title="The Core Defense">
              Ranking quality (PR-AUC {MODEL.prAuc.model}) is an ML property; deciding where to cut the list is a business decision owned by the retention budget holder.
            </Callout>
          </section>
        </div>
      )}

      {/* VIEW 1b: CAUSAL LAB & DECISION SIMULATOR */}
      {subView === 'causal' && (
        <div className="space-y-5">
          <CausalLab onThresholdMoved={() => setInteraction('adjustedThreshold')} />
          <MemoryChains
            ids={['pr-auc', 'calibration', 'serving-contract']}
            subtitle="The three chains this module owns. Recall the first link and let it pull the rest."
          />
        </div>
      )}

      {/* VIEW 2: MODEL ARCHITECTURE & BENCHMARKING */}
      {subView === 'model' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricCard label="Model" value={MODEL.name} sub={MODEL.objective} accent="blue" />
            <MetricCard label="PR-AUC (Test)" value={String(MODEL.prAuc.model)} sub={`vs heuristic ${MODEL.prAuc.heuristic}`} accent="emerald" />
            <MetricCard label="ROC-AUC (Test)" value={String(MODEL.rocAuc.model)} sub={`vs heuristic ${MODEL.rocAuc.heuristic}`} accent="emerald" />
            <MetricCard label="Features" value={String(MODEL.featureCount)} sub={`${MODEL.stateOheCount} state OHE + ${MODEL.numericFeatureCount} other`} />
          </div>

          <Callout tone="warn" title="Why Accuracy is Useless in Churn Modeling">
            Predicting &ldquo;nobody churns&rdquo; yields <strong>{(alwaysNegativeAccuracy * 100).toFixed(1)}% accuracy</strong> because only{' '}
            {(MODEL.baseRate * 100).toFixed(1)}% of rows churn. That dumb baseline beats both the shipped model at its ops cut ({(MODEL.opsAccuracy * 100).toFixed(1)}%)
            and the heuristic ({(MODEL.heuristicAccuracy * 100).toFixed(1)}%), while saving zero customers.
            PR-AUC asks the useful question: how effectively do true churners rise to the top of the queue?
          </Callout>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                <Cpu className="w-4 h-4 text-blue-400" />
                Why XGBoost over Deep Learning / TabFM?
              </h3>
              <ul className="text-xs text-slate-400 space-y-2 list-disc pl-4 leading-relaxed">
                <li>
                  <strong className="text-slate-200">ML Fundamentals Bootcamp Requirement:</strong> Core predictive algorithm must be traditional ML, not a zero-shot foundation model.
                </li>
                <li>
                  <strong className="text-slate-200">Tabular Data Dominance:</strong> Gradient boosted trees consistently outperform deep networks on heterogeneous tabular bank data.
                </li>
                <li>
                  <strong className="text-slate-200">AppLocker & CPU Efficiency:</strong> Runs with deterministic low CPU latency in local and containerised environments without GPU dependencies.
                </li>
                <li>
                  <strong className="text-slate-200">Staff & Risk Auditability:</strong> TreeExplainer provides mathematically exact SHAP feature attributions required by Risk (Jamie).
                </li>
                <li>
                  <strong className="text-slate-200">Honest Documentation:</strong> LightGBM was initially considered in project scoping but never trained; only XGBoost was shipped.
                </li>
              </ul>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                Benchmark vs Baseline Heuristic
              </h3>
              <div className="space-y-3 text-xs">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                  <div className="flex justify-between font-semibold">
                    <span className="text-slate-300">Precision-Recall AUC (PR-AUC)</span>
                    <span className="text-emerald-400 font-mono">0.219 vs 0.151 (+45% lift)</span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    XGBoost significantly outperforms the <code className="text-blue-300">gone_this_month</code> heuristic on test holdout data.
                  </p>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                  <div className="flex justify-between font-semibold">
                    <span className="text-slate-300">ROC-AUC</span>
                    <span className="text-emerald-400 font-mono">0.723 vs 0.551 (+31% lift)</span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Heuristic ROC-AUC of 0.551 is barely better than a random coin flip (0.50), whereas XGBoost demonstrates strong discriminatory separation.
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-blue-950/20 border border-blue-900/30 text-[11px] text-blue-200/90">
                  <strong>scale_pos_weight:</strong> Up-weights rare churners during gradient boosting to optimize ranking purity. As a result, model outputs are <strong>uncalibrated risk ranks</strong>, not probabilities.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: SHAP DRIVERS & EXPLAINABILITY */}
      {subView === 'shap' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
            <div>
              <h3 className="font-bold text-slate-100 text-base">Global SHAP: Feature Importance Ranking</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Mean |SHAP| values in log-odds units frozen in <code className="font-mono">Models/ops/serving_meta.json</code>.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              {SHAP_ENTRIES.map(([name, v]) => (
                <div key={name} className="grid grid-cols-[minmax(0,12rem)_1fr_3.5rem] items-center gap-3 text-xs">
                  <span className="font-mono text-slate-300 truncate" title={name}>
                    {name}
                  </span>
                  <div className="h-3 bg-slate-800 rounded">
                    <div className="h-3 bg-blue-500/80 rounded" style={{ width: `${Math.max(1, (v / SHAP_MAX) * 100)}%` }} />
                  </div>
                  <span className="font-mono text-slate-400 text-right">{v.toFixed(3)}</span>
                </div>
              ))}
            </div>

            <Callout tone="info" title="Why Running_Balance_Rounded Dominates (~3.037 vs 0.643)">
              One feature carries almost all predictive signal. Because ADR 004 defines churn as zero balance in month t+1, a low or rapidly declining balance in month t is the single clearest indicator that account drain-out is already underway.
              This is <strong>not leakage</strong> (balance is strictly from observation month t), but it explains why precision plateaus around ~24% — the model is identifying accounts already mid-drain.
            </Callout>

            <div className="pt-2 space-y-3">
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ['summary', 'Summary Plot'],
                    ['high', 'Waterfall: High Risk'],
                    ['low', 'Waterfall: Low Risk'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setImg(id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                      img === id ? 'bg-blue-600 border-blue-500 text-white' : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 flex justify-center">
                <img
                  src={
                    img === 'summary'
                      ? '/assets/shap_summary.png'
                      : img === 'high'
                        ? '/assets/shap_waterfall_high_risk.png'
                        : '/assets/shap_waterfall_low_risk.png'
                  }
                  alt="SHAP TreeExplainer Plot"
                  className="w-full max-w-2xl rounded-lg border border-slate-800 bg-white"
                  loading="lazy"
                />
              </div>

              <p className="text-xs text-slate-500">
                Visualizations generated via TreeExplainer from <code className="font-mono">Docs/Sprint2/reports/</code>.
                Note: <code className="font-mono">dtreeviz</code> was attempted during Sprint 2 but failed-soft due to missing values (NaNs) in <code className="font-mono">Active_Txn_Lag3</code>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 4: GOVERNANCE & SERVING */}
      {subView === 'governance' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                ADR 014: Continuous Probabilities vs Ops Cut
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                A critical governance distinction:
              </p>
              <ul className="text-xs text-slate-400 space-y-2 list-disc pl-4 leading-relaxed">
                <li>
                  <strong className="text-slate-200">Bootcamp / Competition Grading:</strong> Must submit <strong>continuous unthresholded probabilities</strong>. Thresholding the submission file artificially harms ranking metrics (PR-AUC / ROC-AUC).
                </li>
                <li>
                  <strong className="text-slate-200">Serving & Retention Outreach:</strong> Applies the binary <code className="font-mono">t ≈ {MODEL.opsThresholdPrecise}</code> cutoff strictly to populate the human review queue.
                </li>
              </ul>
              <CodeBlock className="text-xs font-mono">{`# Models/ops/serving_meta.json
"threshold": ${MODEL.opsThresholdPrecise},
"threshold_rule": "${MODEL.thresholdRule}"
# Binary cut applies to serving queue only; grading gets raw probabilities`}</CodeBlock>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                Fairness & Equalized Odds Audit
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Equalized Odds differences across demographic slices were evaluated in Sprint 2 and reported to Risk (Jamie):
              </p>
              <div className="space-y-2 text-xs">
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex justify-between items-center">
                  <span className="text-slate-300">Age Disparity (EOD)</span>
                  <span className="font-mono text-amber-300 font-bold">{FAIRNESS.eodAge.toFixed(3)}</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex justify-between items-center">
                  <span className="text-slate-300">State Disparity (EOD)</span>
                  <span className="font-mono text-amber-300 font-bold">{FAIRNESS.eodState.toFixed(3)}</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Older customers (65+) have a higher selection rate (14.6% vs ~4.8% for younger bands) driven by legitimate retirement drawdowns.
                Rather than forcing demographic parity which would ignore true savings behavior, this disparity is disclosed in the Model Card and kept under human review.
              </p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
              <FileCode className="w-4 h-4 text-blue-400" />
              MLflow Provenance & Portable Ops Export (ADR 005)
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              MLflow runs track training provenance (<code className="font-mono">run_id: {MODEL.runId}</code>).
              Because the local SQLite MLflow store (<code className="font-mono">mlflow.db</code>) is gitignored, serving runs from the portable, committed export in <code className="font-mono">Models/ops/</code> (booster.json and serving_meta.json).
              The run ID travels with every drafted retention email for complete auditability.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
