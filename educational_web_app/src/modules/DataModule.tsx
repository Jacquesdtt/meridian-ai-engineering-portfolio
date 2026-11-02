import { useState } from 'react';
import {
  Calendar,
  ShieldAlert,
  PlayCircle,
  Database,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Clock,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CHURN_DEFINITION, TEMPORAL_SPLIT, AUM_AT_RISK, MODEL } from '../content/facts';
import { useAppProgress } from '../context/AppProgress';
import { Callout, CodeBlock, ModuleHeader, MetricCard, ResizableBottomPanel } from '../components/shared/ui';
import { MemoryChains } from '../components/shared/MemoryChains';

type SubView = 'timeline' | 'controls' | 'simulators' | 'schema';

const SERIES = [
  { month: 't-2', balance: 4200 },
  { month: 't-1', balance: 2800 },
  { month: 't (obs)', balance: 900 },
  { month: 't+1 (label)', balance: 0 },
];

const LEAKAGE_CONTROLS = [
  {
    id: 'target',
    name: '1. Temporal Target Leakage',
    badge: 'Critical Defense',
    accent: 'red',
    summary: 'Never let feature matrix X include prediction-window (t+1) information.',
    risk: 'Including t+1 balance or transactions gives 99% validation accuracy and complete collapse in live production.',
    control: 'Features strictly stop at observation month t. Lags and rolling stats shift prior to rolling: df["bal"].shift(1).rolling(3).mean(), ensuring month t only sees t-1, t-2, and t-3.',
    code: '# Defensive rolling feature calculation\ndf["Bal_Roll3_Mean"] = df.groupby("account_id")["Running_Balance"]\\\n    .shift(1).rolling(window=3, min_periods=1).mean()',
  },
  {
    id: 'heuristic',
    name: '2. "Gone This Month" Trap',
    badge: 'Feature vs Label',
    accent: 'amber',
    summary: 'Current month zero-balance is a feature knowable at t, NOT the t+1 churn label.',
    risk: 'Mistaking current-month inactivity for churn causes label leakage and misidentifies temporary zero-balances.',
    control: 'gone_this_month (balance == 0 and txns == 0 at month t) agrees with the t+1 label only ~82% of the time. It is a legitimate observation feature and serves as the baseline heuristic the ML model must beat (PR-AUC 0.151 vs XGBoost 0.219).',
    code: '# Legitimate observation feature (knowable at month t)\ndf["gone_this_month"] = (\n    (df["Running_Balance_Rounded"] == 0) & \n    (df["Monthly_Active_Txn_Count"] == 0)\n).astype(int)',
  },
  {
    id: 'split',
    name: '3. Strict Chronological Split',
    badge: 'ADR 009',
    accent: 'blue',
    summary: 'Single time-based split: Fit, Validation, and Test. No random shuffling, no cross-validation.',
    risk: 'Random k-fold shuffling allows 2019 patterns to leak backward into 2016 predictions, fabricating artificial predictive power.',
    control: `Fit (${TEMPORAL_SPLIT.fit}), Validation (${TEMPORAL_SPLIT.val}), and Test (${TEMPORAL_SPLIT.test}). All hyperparameter and threshold tuning occurred strictly on Validation; the Test set was held out and evaluated exactly once.`,
    code: `# ADR 009: Strict temporal cutoffs (no k-fold shuffle)\nfit_mask = (df["snapshot_month"] <= "2016-08")\nval_mask = (df["snapshot_month"] >= "2016-09") & (df["snapshot_month"] <= "2017-08")\ntest_mask = (df["snapshot_month"] >= "2017-09")`,
  },
  {
    id: 'pipeline',
    name: '4. Preprocessing & Imputation Leakage',
    badge: 'Pipeline Isolation',
    accent: 'emerald',
    summary: 'Scalers, imputers, and categorical encoders fitted strictly on the Fit partition.',
    risk: 'Fitting transformers on the whole dataset leaks future mean, variance, and class distribution into the training set.',
    control: 'All 37 state one-hot encoders (handling dirty strings like CALIFORNIA, MASS, -999) and numerical imputers were fitted on Fit data only and saved into Models/ops/ for serving.',
    code: '# Fit on training window only; transform val/test\nohe = OneHotEncoder(handle_unknown="ignore")\nohe.fit(X_train[categorical_cols])\nX_val_ohe = ohe.transform(X_val[categorical_cols])',
  },
  {
    id: 'hidden_state',
    name: '5. Notebook State Leakage',
    badge: 'Defensive Engineering',
    accent: 'purple',
    summary: 'Prevent out-of-order execution and notebook hidden-state bugs from invalidating results.',
    risk: 'Running notebook cells interactively creates out-of-order global variable mutations that do not reproduce linearly.',
    control: 'Exploration code in notebooks was strictly refactored into tested, modular Python scripts in src/ with regression pytest coverage.',
    code: '# Verified via automated test suite\npy -3.13 -m pytest tests/serving tests/genai -q',
  },
];

export function DataModule() {
  const { setInteraction } = useAppProgress();
  const [subView, setSubView] = useState<SubView>('timeline');
  const [selectedControl, setSelectedControl] = useState<string>('target');
  const [scenario, setScenario] = useState<'churn' | 'dormant' | 'active'>('churn');

  // Simulator states
  const [includeFuture, setIncludeFuture] = useState(false);
  const [cells, setCells] = useState([
    { id: 1, name: 'Load StartingFiles CSVs', executed: false, order: 0 },
    { id: 2, name: 'Build month-level features (≤ t only)', executed: false, order: 0 },
    { id: 3, name: 'Attach ADR 004 label from t+1', executed: false, order: 0 },
  ]);
  const [order, setOrder] = useState<number[]>([]);

  const execute = (index: number) => {
    const next = [...cells];
    const n = order.length + 1;
    next[index] = { ...next[index], executed: true, order: n };
    setCells(next);
    const newOrder = [...order, index];
    setOrder(newOrder);
    if (newOrder.length === 3 && newOrder[2] === 2 && newOrder[1] !== 1) {
      setInteraction('simulatedLeakage');
    }
  };

  const resetCells = () => {
    setCells(cells.map((c) => ({ ...c, executed: false, order: 0 })));
    setOrder([]);
  };

  const activeControl = LEAKAGE_CONTROLS.find((c) => c.id === selectedControl) ?? LEAKAGE_CONTROLS[0];

  return (
    <div className="flex flex-col gap-4 sm:gap-5 pb-8">
      <ModuleHeader
        title="Label & Temporal Feature Engineering"
        subtitle="Features stop at observation month t; the churn label is the state of prediction month t+1. Meridian enforces 5 defensive controls against temporal leakage."
      />

      {/* Sub-view Navigation Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3" role="tablist" aria-label="Data module subviews">
        <button
          type="button"
          role="tab"
          aria-selected={subView === 'timeline'}
          onClick={() => setSubView('timeline')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border ${
            subView === 'timeline'
              ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/20'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" /> Observation vs Prediction (ADR 004)
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={subView === 'controls'}
          onClick={() => setSubView('controls')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border ${
            subView === 'controls'
              ? 'bg-amber-600 text-white border-amber-500 shadow-lg shadow-amber-500/20'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" /> 5 Leakage Controls Matrix
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={subView === 'simulators'}
          onClick={() => setSubView('simulators')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border ${
            subView === 'simulators'
              ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-500/20'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <PlayCircle className="w-3.5 h-3.5" /> Interactive Simulators
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={subView === 'schema'}
          onClick={() => setSubView('schema')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border ${
            subView === 'schema'
              ? 'bg-purple-600 text-white border-purple-500 shadow-lg shadow-purple-500/20'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <Database className="w-3.5 h-3.5" /> Data Sources & Schema
        </button>
      </div>

      {/* VIEW 1: OBSERVATION VS PREDICTION (ADR 004) */}
      {subView === 'timeline' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <MetricCard label="Fit window" value="2007-03 → 2016-08" sub={TEMPORAL_SPLIT.fit} accent="blue" />
            <MetricCard label="Validation" value="2016-09 → 2017-08" sub={TEMPORAL_SPLIT.val} accent="amber" />
            <MetricCard label="Test" value="2017-09 → 2020-04" sub={TEMPORAL_SPLIT.test} accent="emerald" />
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-100 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-400" />
                  ADR 004: Observation Window (≤ t) vs Prediction Window (t+1)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  The model operates in month t predicting who will drain out in month t+1.
                </p>
              </div>
              <span className="text-xs font-mono px-2.5 py-1 rounded bg-blue-950/60 border border-blue-800 text-blue-300">
                Baseline Sizing: {AUM_AT_RISK.display} AUM
              </span>
            </div>

            {/* Visual Timeline Diagram */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="border-l-4 border-blue-500 pl-3 space-y-1">
                <div className="text-xs font-bold text-blue-400 uppercase tracking-wider">Observation Period (History ≤ t)</div>
                <div className="text-sm font-semibold text-slate-200">Feature Matrix X[t]</div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  All transaction counts, velocity metrics, rolling averages, and balance levels knowable up to the final day of month t.
                  Strict tenure rule: <code className="text-blue-300 font-mono">{CHURN_DEFINITION.observationRule}</code>.
                </p>
              </div>
              <div className="border-l-4 border-emerald-500 pl-3 space-y-1">
                <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Prediction Window (Month t+1)</div>
                <div className="text-sm font-semibold text-slate-200">Ground Truth Label Y[t+1]</div>
                <p className="text-xs text-slate-400 leading-relaxed font-mono">
                  {CHURN_DEFINITION.label}
                </p>
              </div>
            </div>

            {/* Dormancy vs Churn Interactive Scenarios */}
            <div className="space-y-3 pt-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                ADR 004 Edge Case Check: What counts as churn?
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setScenario('churn')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    scenario === 'churn' ? 'bg-red-950/30 border-red-500/50 text-red-200' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-bold text-sm">Account A: Silent Drain</div>
                  <div className="text-xs mt-1 opacity-80">Bal = $0, Txns = 0 in t+1</div>
                  <div className="text-xs font-bold mt-2 text-red-400">Verdict: CHURN = 1</div>
                </button>

                <button
                  type="button"
                  onClick={() => setScenario('dormant')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    scenario === 'dormant' ? 'bg-amber-950/30 border-amber-500/50 text-amber-200' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-bold text-sm">Account B: Dormant Savers</div>
                  <div className="text-xs mt-1 opacity-80">Bal = $40,000, Txns = 0 in t+1</div>
                  <div className="text-xs font-bold mt-2 text-emerald-400">Verdict: NOT CHURN (0)</div>
                </button>

                <button
                  type="button"
                  onClick={() => setScenario('active')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    scenario === 'active' ? 'bg-blue-950/30 border-blue-500/50 text-blue-200' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-bold text-sm">Account C: Active Zero-Bal</div>
                  <div className="text-xs mt-1 opacity-80">Bal = $0, Txns = 3 in t+1</div>
                  <div className="text-xs font-bold mt-2 text-emerald-400">Verdict: NOT CHURN (0)</div>
                </button>
              </div>

              {scenario === 'churn' && (
                <Callout tone="warn" title="True Silent Churn">
                  Balance drained to zero and all activity ceased. This represents the primary target of Meridian's retention workflow.
                </Callout>
              )}
              {scenario === 'dormant' && (
                <Callout tone="info" title="Why high-balance dormancy is NOT churn">
                  {CHURN_DEFINITION.notChurn} The customer still keeps their savings at Meridian; flagging them would waste outreach capacity.
                </Callout>
              )}
              {scenario === 'active' && (
                <Callout tone="tip" title="Why zero-balance with transactions is NOT churn">
                  A customer actively transacting through a zero-balance account is still engaged with the bank (e.g. overdraft or paycheck transit).
                </Callout>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: 5 LEAKAGE CONTROLS MATRIX */}
      {subView === 'controls' && (
        <div className="grid grid-cols-1 lg:grid-cols-[20rem_1fr] gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">Defensive Engineering Pillars</span>
            {LEAKAGE_CONTROLS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedControl(c.id)}
                className={`text-left p-3 rounded-xl border transition-all ${
                  selectedControl === c.id
                    ? 'bg-amber-950/30 border-amber-500/60 text-amber-200 shadow-md'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-bold text-sm text-slate-200">{c.name}</div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                    {c.badge}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1 line-clamp-1">{c.summary}</div>
              </button>
            ))}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-slate-100 text-base">{activeControl.name}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{activeControl.summary}</p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300">
                {activeControl.badge}
              </span>
            </div>

            <div className="space-y-3">
              <div className="bg-red-950/20 border border-red-900/30 rounded-xl p-3.5 space-y-1">
                <div className="text-xs font-bold text-red-400 flex items-center gap-1.5 uppercase tracking-wide">
                  <AlertTriangle className="w-3.5 h-3.5" /> Failure Mode if Ignored
                </div>
                <p className="text-xs text-red-200/90 leading-relaxed">{activeControl.risk}</p>
              </div>

              <div className="bg-emerald-950/20 border border-emerald-900/30 rounded-xl p-3.5 space-y-1">
                <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wide">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Meridian Technical Control
                </div>
                <p className="text-xs text-emerald-200/90 leading-relaxed">{activeControl.control}</p>
              </div>

              <div className="space-y-1 pt-1">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">Code Implementation Pattern</div>
                <CodeBlock className="text-xs font-mono">{activeControl.code}</CodeBlock>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <MemoryChains
              ids={['leakage']}
              subtitle="The chain this module owns. Say it forwards, then check whether each link forces the next."
            />
          </div>
        </div>
      )}

      {/* VIEW 3: INTERACTIVE SIMULATORS */}
      {subView === 'simulators' && (
        <div className="space-y-4">
          <div className="grid xl:grid-cols-2 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-200">Temporal Leakage Simulator</h3>
                  <p className="text-xs text-slate-400">See what happens when future prediction-window data enters features.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !includeFuture;
                    setIncludeFuture(next);
                    if (next) setInteraction('simulatedLeakage');
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    includeFuture ? 'bg-red-500' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      includeFuture ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={SERIES.map((d) => ({ ...d, balance: includeFuture || d.month !== 't+1 (label)' ? d.balance : null }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: '#1e293b', borderColor: '#334155' }} />
                    <Line type="monotone" dataKey="balance" stroke={includeFuture ? '#f87171' : '#3b82f6'} strokeWidth={3} connectNulls={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs space-y-1">
                <div className="font-bold text-slate-300">Feature Status: {includeFuture ? 'LEAKAGE ACTIVE (t+1 balance included)' : 'CLEAN (Observation window ≤ t only)'}</div>
                <p className="text-slate-400">
                  {includeFuture
                    ? 'The model easily achieves >99% test accuracy because it sees the balance dropping to zero before it happens. In production at month t, t+1 balance does not exist — causing total failure.'
                    : 'Model only sees features through month t. Ranking must be earned purely from behavioral warning signs (e.g. balance velocity, transaction drop-off).'}
                </p>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-200">Notebook Hidden-State Lab</h3>
                  <p className="text-xs text-slate-400">Execute cells out of order to experience hidden-state mutation.</p>
                </div>
                <button type="button" onClick={resetCells} className="text-xs text-blue-400 hover:text-blue-300 font-bold">
                  Reset
                </button>
              </div>

              <div className="space-y-2">
                {cells.map((c, i) => (
                  <button
                    key={c.id}
                    type="button"
                    disabled={c.executed}
                    onClick={() => execute(i)}
                    className={`w-full text-left px-4 py-3 rounded-xl border font-mono text-xs transition-all ${
                      c.executed
                        ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <span className="font-bold mr-2">{c.executed ? `[Step ${c.order}]` : '[ ]'}</span>
                    {c.name}
                  </button>
                ))}
              </div>

              {order.length === 3 && order[2] === 2 && order[1] !== 1 && (
                <Callout tone="warn" title="Hidden-State Bug Detected">
                  Running the label attachment before completing feature engineering introduces silent data shape mismatches or ghost columns.
                </Callout>
              )}
            </div>
          </div>

          <ResizableBottomPanel defaultHeight={170} label="Drag to resize engineering notes panel">
            <CodeBlock className="h-full min-h-full border-0 rounded-lg text-xs">{`# Observation month t features only (Running_Balance, Active_Txn_Lag1-3)
# Label = churn state in t+1 (ADR 004: balance == 0 AND txns == 0)
# Chronological fit / val / test — never shuffle rows across time`}</CodeBlock>
          </ResizableBottomPanel>
        </div>
      )}

      {/* VIEW 4: DATA SOURCES & SCHEMA */}
      {subView === 'schema' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
              <div className="text-xs font-bold text-blue-400 flex items-center gap-1.5 uppercase">
                <FileSpreadsheet className="w-3.5 h-3.5" /> accounts.csv
              </div>
              <div className="text-sm font-semibold text-slate-200">Account Profiles</div>
              <p className="text-xs text-slate-400">Account IDs, creation timestamps, starting balances, and product tiers.</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
              <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5 uppercase">
                <FileSpreadsheet className="w-3.5 h-3.5" /> transactions.csv
              </div>
              <div className="text-sm font-semibold text-slate-200">Ledger Activity</div>
              <p className="text-xs text-slate-400">Detailed transaction timestamps, credit/debit amounts, and transaction codes.</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
              <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 uppercase">
                <FileSpreadsheet className="w-3.5 h-3.5" /> customers.csv
              </div>
              <div className="text-sm font-semibold text-slate-200">Demographics</div>
              <p className="text-xs text-slate-400">Customer age, state codes, and segment identifiers for fairness audits.</p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="font-bold text-slate-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" />
              Serving Feature Contract (49 Features)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <div className="font-bold text-slate-300">12 Non-State Numeric & Behavioral Features</div>
                <ul className="text-slate-400 space-y-1 list-disc pl-4 font-mono text-[11px]">
                  <li>Running_Balance_Rounded (dominates global SHAP: ~3.037)</li>
                  <li>Active_Txn_Lag1, Active_Txn_Lag2, Active_Txn_Lag3</li>
                  <li>Credit_Txn_Count, Debit_Txn_Count</li>
                  <li>Monthly_Active_Txn_Count, Months_Since_Creation</li>
                  <li>gone_this_month (observation-level baseline heuristic)</li>
                  <li>customer_age, Balance_Roll3_Mean, Balance_Roll6_Mean</li>
                </ul>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <div className="font-bold text-slate-300">37 State One-Hot Encoded Features</div>
                <p className="text-slate-400 leading-relaxed">
                  Handles dirty state strings present in legacy data (including <code className="text-amber-300">CALIFORNIA</code> vs <code className="text-amber-300">California</code>, <code className="text-amber-300">MASS</code>, <code className="text-amber-300">UNK</code>, and <code className="text-amber-300">-999</code>).
                  All OHE encoders were fit strictly on the Fit partition and persisted in <code className="text-blue-300">Models/ops/serving_meta.json</code>.
                </p>
                <div className="font-mono text-[11px] text-slate-500">
                  Strict schema validator: .cursor/skills/validate-csv-schema
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
