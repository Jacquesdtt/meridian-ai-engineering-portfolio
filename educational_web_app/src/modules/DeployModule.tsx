import { useState } from 'react';
import {
  Terminal,
  ShieldAlert,
  GitBranch,
  Box,
  Cloud,
  CheckCircle2,
  ArrowRightCircle,
  ArrowLeftCircle,
  Play,
} from 'lucide-react';
import { DEPLOY, RUN_COMMANDS } from '../content/facts';
import { useAppProgress } from '../context/AppProgress';
import { Callout, ModuleHeader } from '../components/shared/ui';

const STEPS = [
  { id: 0, label: 'Local machine', icon: Terminal },
  { id: 1, label: 'Tests (AppLocker)', icon: ShieldAlert },
  { id: 2, label: 'CI (partial)', icon: GitBranch },
  { id: 3, label: 'Container build', icon: Box },
  { id: 4, label: 'Hosting status', icon: Cloud },
];

export function DeployModule() {
  const { setInteraction } = useAppProgress();
  const [step, setStep] = useState(0);
  const [testOk, setTestOk] = useState(false);
  const [ignoreData, setIgnoreData] = useState(false);

  const applyBypass = () => setTestOk(true);

  const prev = () => {
    if (step > 0) setStep(step - 1);
  };

  const goToStep = (target: number) => {
    if (target < step) setStep(target);
  };

  const next = () => {
    // IP-03: bypass is only via the inline terminal CTA — Next never applies it.
    if (step === 1 && !testOk) return;
    if (step === 3 && !ignoreData) return;
    if (step < 4) setStep(step + 1);
    if (step === 3) setInteraction('honestDeploy');
    if (step === 4) setInteraction('honestDeploy');
  };

  // Block Next on step 1 until terminal bypass sets testOk; step 3 until dockerignore confirm.
  const nextBlocked = (step === 1 && !testOk) || (step === 3 && !ignoreData);
  const nextLabel =
    step === 4 ? 'Complete' : step === 1 && !testOk ? 'Waiting for tests…' : 'Next';

  return (
    <div className="flex flex-col gap-6 pb-12">
      <ModuleHeader
        title="Packaging (Honest Deploy)"
        subtitle={DEPLOY.status}
      />

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
        <div className="flex justify-between items-start relative gap-2">
          <div className="absolute left-6 right-6 top-6 h-0.5 bg-slate-800 pointer-events-none" />
          <div
            className="absolute left-6 top-6 h-0.5 bg-blue-500 transition-all pointer-events-none"
            style={{ width: `calc(${(step / 4) * 100}% - 3rem)` }}
          />
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const active = step === i;
            const past = step > i;
            const canJumpBack = past;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => goToStep(i)}
                disabled={!canJumpBack}
                title={canJumpBack ? `Back to ${s.label}` : active ? s.label : 'Complete earlier steps first'}
                className={`flex flex-col items-center gap-2 z-10 w-16 sm:w-24 rounded-lg transition-colors ${
                  canJumpBack ? 'cursor-pointer hover:bg-slate-800/40' : 'cursor-default'
                } disabled:opacity-100`}
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
                    active
                      ? 'bg-blue-900/50 border-blue-500 text-blue-400 ring-2 ring-blue-500/30'
                      : past
                        ? 'bg-emerald-900/30 border-emerald-500/50 text-emerald-500'
                        : 'bg-slate-950 border-slate-800 text-slate-600'
                  }`}
                >
                  {past ? <CheckCircle2 className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
                </div>
                <span
                  className={`text-[10px] sm:text-xs font-bold text-center ${active ? 'text-slate-200' : past ? 'text-emerald-400/80' : 'text-slate-500'}`}
                >
                  {s.label}
                </span>
              </button>
            );
          })}
        </div>

        {step === 1 && !testOk && (
          <Callout tone="warn" title="AppLocker blocks pytest.exe">
            Corporate group policy blocks executables in user-writable folders (including{' '}
            <code className="font-mono text-amber-200">.venv\Scripts\pytest.exe</code>). Use the global Python
            launcher with <code className="font-mono text-emerald-300">py -3.13 -m pytest</code> instead — the pattern in this
            repo&apos;s <code className="font-mono">.cursorrules</code> (ADR 001). On a normal machine you would use{' '}
            <code className="font-mono">python -m pytest</code> inside a venv.
          </Callout>
        )}

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 min-h-[200px]">
          {step === 0 && (
            <div className="space-y-1">
              <p className="text-blue-400">$ git status</p>
              <p>On branch main</p>
              <p>Models/ops/ committed · Data/ CSVs, StartingFiles/*.csv and mlflow.db are gitignored (not in a clone)</p>
            </div>
          )}
          {step === 1 && (
            <div className="space-y-2">
              {!testOk ? (
                <>
                  <p className="text-blue-400">$ pytest</p>
                  <p className="text-red-400">ERROR: blocked by group policy (AppLocker).</p>
                  <button
                    type="button"
                    onClick={applyBypass}
                    className="mt-3 w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 border border-emerald-400/50 px-4 py-3 rounded-xl text-white font-sans font-bold text-sm shadow-lg shadow-emerald-900/30"
                  >
                    <Play className="w-4 h-4" aria-hidden />
                    Run bypass: <code className="font-mono text-emerald-100">py -3.13 -m pytest</code>
                  </button>
                </>
              ) : (
                <>
                  <p className="text-blue-400">$ {RUN_COMMANDS.tests}</p>
                  <p className="text-emerald-400">{RUN_COMMANDS.testsEvidence}</p>
                  <p className="text-slate-500 font-sans text-[11px] mt-2">
                    Bypass applied. Click Next to see what CI would add.
                  </p>
                </>
              )}
            </div>
          )}
          {step === 2 && (
            <div className="space-y-1">
              <p className="text-purple-400"># CI pipeline: TEACHING APP ONLY</p>
              <p>{DEPLOY.ci}</p>
              <p className="text-slate-500">
                Extending CI would add {RUN_COMMANDS.testsPortable}, npm run facts:check and a Docker build on every
                push (future work, Corrections register).
              </p>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-2">
              <p className="text-blue-400"># .dockerignore hardening</p>
              <p>Exclude .git/, Data/, large CSVs, .claude/ and educational_web_app/ from the build context.</p>
              <p>Re-include the two Docs/ files the API reads at runtime (fairness JSON, Official report for RAG).</p>
              <p className="text-blue-400 pt-2"># Dockerfile</p>
              <p>{DEPLOY.serviceDeps}</p>
              <p>{DEPLOY.healthcheck}</p>
              <p className="text-blue-400 pt-2">$ {RUN_COMMANDS.apiDocker}</p>
              <p className="text-slate-500">{DEPLOY.portOverride}</p>
              <label className="flex items-center gap-2 text-slate-300 not-italic font-sans text-sm mt-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ignoreData}
                  onChange={(e) => setIgnoreData(e.target.checked)}
                  className="accent-emerald-500"
                />
                Confirm Data/ CSVs are dockerignored
              </label>
              {ignoreData && (
                <p className="text-emerald-400">
                  Built {DEPLOY.smokeDate} ({DEPLOY.imageSize}) and every smoke step passed — {DEPLOY.smokeEvidence}.
                </p>
              )}
              {!ignoreData && (
                <p className="text-amber-400/90 font-sans text-[11px]">Check the box above to unlock Next.</p>
              )}
            </div>
          )}
          {step === 4 && (
            <div className="space-y-2">
              <p className="text-amber-400">Hosting status: PENDING</p>
              <p>{DEPLOY.status}</p>
              <p>{DEPLOY.imageScope}</p>
              <p>Azure OpenAI drafting path: live since {DEPLOY.azureOpenAiLive} (the LLM is hosted; the app is not).</p>
              <p>
                Compose runs locally · ACA <code>maxReplicas: {DEPLOY.maxReplicas}</code> (ADR 008)
              </p>
              <p className="text-blue-400 pt-2"># What the local smoke run caught</p>
              <ul className="space-y-1">
                {DEPLOY.smokeFindings.map((f) => (
                  <li key={f.id}>
                    <span className="text-amber-300">{f.id}</span> {f.what}. <span className="text-emerald-400">Fix: {f.fix}.</span>
                  </li>
                ))}
              </ul>
              <p className="text-emerald-400 font-bold border-t border-slate-800 pt-2 mt-2">{DEPLOY.honestEnding}</p>
              <p className="text-slate-500">There is no fake https://meridian-churn-prod.azurewebsites.net in this project.</p>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <button
            type="button"
            onClick={prev}
            disabled={step === 0}
            className="py-2.5 px-5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-200 rounded-xl font-bold flex items-center justify-center gap-2 border border-slate-700"
          >
            <ArrowLeftCircle className="w-5 h-5" /> Back
          </button>

          <p className="text-xs text-slate-500 text-center sm:flex-1 px-2" aria-live="polite">
            {step === 1 && !testOk && 'Run the green bypass button in the terminal above.'}
            {step === 1 && testOk && 'Tests passed — continue.'}
            {step === 3 && !ignoreData && 'Confirm the dockerignore checkbox to continue.'}
          </p>

          <button
            type="button"
            onClick={next}
            disabled={nextBlocked || step === 4}
            className="py-2.5 px-6 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-bold flex items-center justify-center gap-2 shrink-0"
          >
            {nextLabel} <ArrowRightCircle className="w-5 h-5" />
          </button>
        </div>
      </div>

      <Callout tone="tip">
        Facilitators: <code className="font-mono text-emerald-300">Docs/Sprint5/docker_smoke_checklist.md</code> has the
        local smoke steps and the 2026-09-24 pass log — there is still no hosted URL, so do not invent one.
      </Callout>
    </div>
  );
}
