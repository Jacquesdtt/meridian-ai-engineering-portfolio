import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Eye, Lock, ShieldAlert, XCircle } from 'lucide-react';
import { useAppProgress } from '../context/AppProgress';
import { GENAI, MODEL } from '../content/facts';
import { Callout, GatePath, ModuleHeader } from '../components/shared/ui';

type Role = 'retention_agent' | 'compliance_viewer' | 'data_scientist';
type Status = 'pending' | 'approved' | 'rejected';

const ROLES: { id: Role; label: string; canApprove: boolean }[] = [
  { id: 'retention_agent', label: 'Retention agent', canApprove: true },
  { id: 'compliance_viewer', label: 'Compliance viewer', canApprove: false },
  { id: 'data_scientist', label: 'Data scientist', canApprove: false },
];

export function FrictionModule() {
  const { setInteraction } = useAppProgress();
  const [role, setRole] = useState<Role>('compliance_viewer');
  const [ack, setAck] = useState(false);
  const [status, setStatus] = useState<Status>('pending');
  const [denied, setDenied] = useState(false);
  /** RT-06: must see a Compliance/DS deny before Retention Approve counts. */
  const [sawDeny, setSawDeny] = useState(false);
  const [traceOpen, setTraceOpen] = useState(false);

  const roleMeta = ROLES.find((r) => r.id === role)!;
  const openedAt = useRef(Date.now());
  const [secondsOpen, setSecondsOpen] = useState<number | null>(null);
  useEffect(() => {
    openedAt.current = Date.now();
    setSecondsOpen(null);
  }, [role]);

  const score = 0.751;
  const highStakesBar = Math.max(MODEL.opsThreshold + 0.1, 0.8);
  const drivers = Object.keys(MODEL.topShap);

  const tryApprove = () => {
    if (!roleMeta.canApprove) {
      setDenied(true);
      setSawDeny(true);
      return;
    }
    if (!ack || status !== 'pending') return;
    if (!sawDeny) {
      setDenied(true);
      return;
    }
    setSecondsOpen((Date.now() - openedAt.current) / 1000);
    setStatus('approved');
    setDenied(false);
    setInteraction('rbacFrictionApproved');
  };

  return (
    <div className="flex flex-col min-h-0 gap-8 pb-12">
      <ModuleHeader
        title="Friction-Gate & RBAC"
        subtitle="The API enforces demo roles from the X-Demo-Role header (403 + audit row on deny) and requires attention_ack on every Approve. Compliance can see everything and Approve nothing."
      />

      <Callout tone="info" title="Mastery path (exposure check)">
        Gate requires: attempt Approve as Compliance (or Data scientist) → see 403 → switch to Retention agent → ack →
        Approve. Happy-path Retention-only clicks do not unlock the gate.
      </Callout>

      <GatePath steps={[{ label: 'See a non-approver deny', done: sawDeny }, { label: 'Retention acknowledges and approves', done: status === 'approved' }]} />

      <div className="flex flex-wrap gap-2">
        {ROLES.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => {
              setRole(r.id);
              setDenied(false);
              setStatus('pending');
              setAck(false);
            }}
            className={`px-4 py-2 rounded-xl text-sm font-bold border ${
              role === r.id ? 'bg-blue-500/20 border-blue-500/40 text-blue-200' : 'border-slate-800 text-slate-500'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl">
        <div className="bg-slate-800/50 p-4 border-b border-slate-700/50 space-y-2 text-sm">
          <div className="flex gap-3">
            <span className="text-slate-500 w-16">Customer</span>
            <span className="text-slate-200">
              #8492 · score {score} (≥ {MODEL.opsThreshold} → draft eligible · not “high stakes”: that cue starts at{' '}
              {highStakesBar.toFixed(2)})
            </span>
          </div>
          <div className="flex gap-3">
            <span className="text-slate-500 w-16">Status</span>
            <span
              className={`font-bold ${
                status === 'approved' ? 'text-emerald-400' : status === 'rejected' ? 'text-red-400' : 'text-amber-400'
              }`}
            >
              {status === 'approved' ? 'Approved (ready for human outbound)' : status}
            </span>
          </div>
          <div className="flex gap-3 text-xs">
            <span className="text-slate-500 w-16">Gate</span>
            <span className={sawDeny ? 'text-emerald-400' : 'text-slate-500'}>
              {sawDeny ? 'Saw deny ✓ — Retention Approve will count' : 'Need a non-approver deny first'}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setTraceOpen(!traceOpen)}
          className="w-full flex items-center justify-between p-4 text-sm font-bold text-slate-400 hover:bg-slate-950"
        >
          <span className="flex items-center gap-2">
            <Eye className="w-4 h-4" /> Glass-box context
          </span>
          {traceOpen ? 'Hide' : 'Show'}
        </button>
        {traceOpen && (
          <div className="px-4 pb-4 font-mono text-xs text-slate-400 space-y-2 border-t border-slate-800 pt-3">
            <p>Drivers (frozen global mean |SHAP|, same for every customer): {drivers.join(' · ')}</p>
            <p className="text-slate-500">
              These draft drivers are global context. Per-customer TreeSHAP is available separately through the
              explanation API and Prediction browser. Do not read the draft drivers as “why this customer”.
            </p>
            <p>Policy: offered_interest_rate ≤ 3.5% · PII scrubbed before LLM · no /send</p>
          </div>
        )}

        <div className="p-5 border-t border-slate-800 space-y-4">
          <label className="flex items-start gap-3 text-sm text-slate-300 cursor-pointer">
            <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-1 accent-blue-500" />
            <span>
              <strong className="text-slate-100">Attention acknowledgement</strong> — I read the draft and SHAP drivers
              (JR-REQ-19). Approve does <em>not</em> send email.
            </span>
          </label>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              disabled={!ack || status !== 'pending'}
              onClick={tryApprove}
              className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl font-bold flex items-center justify-center gap-2"
            >
              {roleMeta.canApprove ? <CheckCircle2 className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
              Approve draft
            </button>
            <button
              type="button"
              disabled={status !== 'pending'}
              onClick={() => setStatus('rejected')}
              className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-xl font-bold flex items-center justify-center gap-2"
            >
              <XCircle className="w-5 h-5" /> Reject
            </button>
          </div>

          {denied && (
            <div className="flex gap-2 items-start bg-red-950/40 border border-red-800/50 text-red-200 text-sm p-3 rounded-xl">
              <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                {!roleMeta.canApprove ? (
                  <>
                    403 — role <code className="font-mono">{role}</code> cannot Approve. Denial is audited (ADR 007).
                    Switch to Retention agent after this deny to complete the mastery gate.
                  </>
                ) : (
                  <>
                    Gate not ready — first attempt Approve as Compliance (or Data scientist) to learn the 403 path, then
                    return as Retention agent.
                  </>
                )}
              </span>
            </div>
          )}

          {status === 'approved' && secondsOpen !== null && (
            <div
              className={`text-xs font-mono p-3 rounded-xl border ${
                secondsOpen < GENAI.fastDecideSeconds
                  ? 'border-amber-700/50 bg-amber-950/30 text-amber-200'
                  : 'border-slate-700 bg-slate-950 text-slate-400'
              }`}
            >
              audit detail: {'{'} attention_ack: true, seconds_open: {secondsOpen.toFixed(1)}, fast_decide_warn:{' '}
              {String(secondsOpen < GENAI.fastDecideSeconds)} {'}'}
              {secondsOpen < GENAI.fastDecideSeconds &&
                ` — approved in under ${GENAI.fastDecideSeconds}s. This is a soft warning recorded for Compliance, not a block (a hard block invites rage-clicking).`}
            </div>
          )}

          {status === 'approved' && (
            <Callout tone="info" title="Approve ≠ Sent (ADR 003)">
              Draft is immutable and ready for a human to contact the customer <strong>outside</strong> this system.
              There is no send button and no /send API.
            </Callout>
          )}
        </div>
      </div>
    </div>
  );
}
