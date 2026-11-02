import { useState } from 'react';
import { ArrowRight, Database, Server, Monitor } from 'lucide-react';
import { DASHBOARD, RUN_COMMANDS, formatOpsThreshold } from '../content/facts';
import { useAppProgress } from '../context/AppProgress';
import { Callout, CodeBlock, ModuleHeader } from '../components/shared/ui';

export function ServingModule() {
  const { setInteraction } = useAppProgress();
  const [mode, setMode] = useState<'http' | 'inprocess'>('http');

  return (
    <div className="flex flex-col gap-6 pb-12">
      <ModuleHeader
        title="Serving Topology"
        subtitle="FastAPI is the single enforcement point: the Streamlit Friction-Gate calls it for every score, draft, decision and audit read. Only the API writes to SQLite."
      />

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row items-stretch gap-4 md:gap-2">
          <div className="flex-1 bg-slate-950 border border-slate-700 rounded-xl p-4 flex flex-col gap-2">
            <Monitor className="w-6 h-6 text-blue-400" />
            <h4 className="font-bold text-slate-100">Streamlit Friction-Gate</h4>
            <p className="text-xs text-slate-500">Code/Sprint3/friction_gate_app.py</p>
            <p className="text-sm text-slate-400">
              Holds a <code className="font-mono">FrictionGateClient</code> (src/serving/client.py). No draft_store or
              drafter imports — a test enforces that.
            </p>
          </div>
          <div className="flex flex-col items-center justify-center text-slate-600 text-[10px] gap-1">
            <ArrowRight className="w-6 h-6 rotate-90 md:rotate-0" />
            <span className="font-mono">{mode === 'http' ? 'HTTP :8000' : 'ASGI (no socket)'}</span>
          </div>
          <div className="flex-1 bg-slate-950 border border-purple-700/40 rounded-xl p-4 flex flex-col gap-2">
            <Server className="w-6 h-6 text-purple-400" />
            <h4 className="font-bold text-slate-100">FastAPI</h4>
            <p className="text-xs text-slate-500">src/serving/app.py</p>
            <p className="text-sm text-slate-400">
              /score · /drafts · PATCH /drafts/{'{id}'} · /audit/events · /model/fairness · /rag/ask · /viva/grade ·
              public /health · <strong className="text-red-400">no /send</strong>. Checks role (X-Demo-Role), re-scores raw
              features, gates on the threshold.
            </p>
          </div>
          <div className="flex items-center justify-center text-slate-600">
            <ArrowRight className="w-6 h-6 rotate-90 md:rotate-0" />
          </div>
          <div className="flex-1 bg-slate-950 border border-emerald-700/40 rounded-xl p-4 flex flex-col gap-2">
            <Database className="w-6 h-6 text-emerald-400" />
            <h4 className="font-bold text-slate-100">SQLite WAL</h4>
            <p className="text-xs text-slate-500">draft queue + audit events</p>
            <p className="text-sm text-slate-400">One volume · maxReplicas: 1 (ADR 008)</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setMode('http');
            setInteraction('understoodServing');
          }}
          className={`px-4 py-2 rounded-xl text-sm font-bold border ${
            mode === 'http' ? 'bg-blue-500/20 border-blue-500/40 text-blue-200' : 'border-slate-800 text-slate-500'
          }`}
        >
          FRICTION_GATE_MODE=http (default)
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('inprocess');
            setInteraction('understoodServing');
          }}
          className={`px-4 py-2 rounded-xl text-sm font-bold border ${
            mode === 'inprocess' ? 'bg-amber-500/20 border-amber-500/40 text-amber-200' : 'border-slate-800 text-slate-500'
          }`}
        >
          inprocess (AppLocker fallback)
        </button>
      </div>

      {mode === 'http' ? (
        <Callout tone="info" title="Default: real HTTP">
          The UI sends requests to uvicorn at <code className="font-mono">http://127.0.0.1:8000</code> with timeouts and
          retries. Start the API first. Every rule (role check, re-score, threshold gate, rate cap, audit) runs once, in
          the API.
        </Callout>
      ) : (
        <Callout tone="warn" title="Fallback: same API, no socket">
          On the AppLocker machine localhost HTTP was blocked (the original reason for ADR 006). Setting{' '}
          <code className="font-mono">FRICTION_GATE_MODE=inprocess</code> runs the <em>same FastAPI app</em> through an ASGI
          test client inside the Streamlit process. No rules are duplicated — this is why the 2026-09-18 follow-on to ADR 006
          replaced the old “UI imports serving modules directly” design.
        </Callout>
      )}

      <div>
        <h3 className="text-lg font-bold text-slate-200 mb-2">Run it (API first)</h3>
        <CodeBlock>{`${RUN_COMMANDS.api}\n${RUN_COMMANDS.ui}\n\n# or run the API in Docker instead of uvicorn (module 11):\n${RUN_COMMANDS.apiDocker}\n\n# or, with no API process:\n${RUN_COMMANDS.uiInProcess}`}</CodeBlock>
      </div>

      <Callout tone="info" title="Dashboard pages (verified 2026-09-24)">
        <ul className="list-disc pl-5 space-y-1">
          <li>{DASHBOARD.verified}.</li>
          <li>
            <strong>Crash fixed:</strong> {DASHBOARD.crashFixed}
          </li>
          <li>
            <strong>Morgan:</strong> {DASHBOARD.morgan}
          </li>
          <li>
            <strong>Sam:</strong> {DASHBOARD.sam}
          </li>
        </ul>
      </Callout>

      <div className="grid md:grid-cols-2 gap-4">
        <Callout tone="tip" title="Server-side gate">
          <code className="font-mono">POST /drafts</code> takes raw features only (<code className="font-mono">extra="forbid"</code>,
          so a client cannot send its own score), re-scores with <code className="font-mono">Models/ops/</code>, and returns{' '}
          <strong>422</strong> unless {formatOpsThreshold('p-gate')}. Nothing drafts automatically — a human asks for each draft.
        </Callout>
        <Callout tone="warn" title="Still open (be honest)">
          Roles come from a demo header, not Entra ID, and the SQLite file lives on one host, so the guarantee is in the code
          rather than the network. The target design gives database credentials to the API only (Postgres, Corrections F8).
        </Callout>
      </div>
    </div>
  );
}
