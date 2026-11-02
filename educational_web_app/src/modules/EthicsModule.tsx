import { ANTI_CLAIMS, FAIRNESS, MODEL, CORRECTIONS_REGISTER } from '../content/facts';
import { useAppProgress } from '../context/AppProgress';
import { Callout, MetricCard, ModuleHeader } from '../components/shared/ui';

const RATE_MAX = Math.max(...FAIRNESS.ageSelectionRates.map((r) => r.rate));

export function EthicsModule() {
  const { setInteraction } = useAppProgress();

  return (
    <div className="flex flex-col gap-6 pb-12">
      <ModuleHeader
        title="Fairness & Glass-Box"
        subtitle="Measure and disclose residual gaps (ADR 012). No remediator shipped, and fairness is not a release gate — yet."
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="EOD · age" value={MODEL.eodAge.toFixed(3)} sub={`notebook flags > ${FAIRNESS.notebookFlag}`} accent="amber" />
        <MetricCard label="EOD · state" value={MODEL.eodState.toFixed(3)} sub={`${FAIRNESS.stateGroupsKept} of ${FAIRNESS.stateGroupsTotal} groups (n ≥ ${FAIRNESS.minGroupN})`} accent="red" />
        <MetricCard label="Selection-rate gap · age" value={FAIRNESS.selectionRateDiffAge.toFixed(3)} sub="max − min flagged share" />
        <MetricCard label="Sample" value={FAIRNESS.nSample.toLocaleString()} sub={`rows sampled, scored at t≈${MODEL.opsThreshold}`} />
      </div>

      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h3 className="font-bold text-slate-200">Who gets flagged at the ops cut? (age band)</h3>
        <div className="space-y-2">
          {FAIRNESS.ageSelectionRates.map((r) => (
            <div key={r.band} className="grid grid-cols-[7rem_1fr_4.5rem] items-center gap-3 text-sm">
              <span className="text-slate-300">{r.band}</span>
              <div className="h-3 bg-slate-800 rounded">
                <div className="h-3 bg-amber-500/70 rounded" style={{ width: `${(r.rate / RATE_MAX) * 100}%` }} />
              </div>
              <span className="font-mono text-slate-400 text-right">{'note' in r ? r.note : `${(r.rate * 100).toFixed(1)}%`}</span>
            </div>
          ))}
        </div>
        <p className="text-sm text-slate-400">
          Customers aged 65+ are flagged about three times as often as most bands. That could be a real difference in churn
          (older savers drawing down balances) or model bias — nobody has checked yet. Either way, Risk needs to see it. The
          investigation is open future work (Corrections F3).
        </p>
      </section>

      <div className="grid md:grid-cols-2 gap-4">
        <Callout tone="info" title="What equalized odds measures">
          For each group, compare the true-positive rate (churners we catch) and the false-positive rate (loyal customers we
          bother). EOD is the largest gap between groups on either rate. 0 means every group is treated the same way;{' '}
          {MODEL.eodAge} for age means one band’s TPR or FPR is ~16 points away from another’s. Small state groups were dropped
          (n &lt; {FAIRNESS.minGroupN}) so noise does not dominate.
        </Callout>
        <Callout tone="warn" title="Why disclose instead of gate?">
          ADR 012 Decision 1 chose periodic human review plus disclosure over an automated release gate, to avoid brittle
          deployment blockers caused by noise in small demographic groups. Every flagged customer also passes a human
          Approve. Making fairness a hard gate would need Risk to agree numeric limits and an amendment to that decision.
        </Callout>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
        <h3 className="font-bold text-slate-200">Anti-claims wall (never teach these)</h3>
        <p className="text-xs text-slate-500">
          Synced from FACT_SHEET / <code className="font-mono">facts.ts</code>, following{' '}
          <code className="font-mono">{CORRECTIONS_REGISTER}</code> — {ANTI_CLAIMS.length} traps.
        </p>
        <ul className="grid sm:grid-cols-2 gap-2 text-sm text-slate-400 list-disc pl-5">
          {ANTI_CLAIMS.map((claim) => (
            <li key={claim}>{claim}</li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => setInteraction('viewedFairness')}
          className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold px-4 py-2.5 rounded-xl"
        >
          I have read the fairness facts and anti-claims
        </button>
      </div>

      <Callout tone="tip" title="Glass-box for Jamie">
        Friction-Gate shows the frozen threshold, the run ID and the global SHAP drivers so Risk can challenge a draft
        without retraining. The top drivers are balance and flow features, not demographics — but age and state are still
        model inputs, which is exactly why the gaps above are measured.
      </Callout>
    </div>
  );
}
