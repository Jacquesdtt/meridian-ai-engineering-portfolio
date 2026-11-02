import { ExternalLink } from 'lucide-react';
import { NEXT_STEPS } from '../content/nextSteps';
import { CORRECTIONS_REGISTER } from '../content/facts';
import { Callout, ModuleHeader } from '../components/shared/ui';

const BUILT = [
  'XGBoost ranking that beats the heuristic (PR-AUC, ROC-AUC)',
  'Top-5% capacity threshold frozen in Models/ops/',
  'FastAPI as the single enforcement point; Streamlit calls it',
  'Friction-Gate: roles, attention ack, audit, Approve ≠ Sent',
  'Azure OpenAI drafter (gpt-5-mini) with scrubbing, clamping and stub fallback',
  'AppLocker-safe hybrid RAG over the Official report (BM25 + embeddings, RRF, LLM rerank)',
  'Fairness measured and disclosed (ADR 012)',
  'Docker image of the API, built and smoke-tested locally (2026-09-24)',
  'Streamlit dashboard verified for every role and page (2026-09-24)',
  'Explain-it marker benchmarked on labelled answers (87.5% label accuracy, 80% required)',
];

const GUIDES_AND_APPS = [
  {
    title: 'AI-901 Interview Prep Guide',
    href: '/guides/interview_prep_ai901.html',
    desc: 'Self-test quizzes, predict-then-reveal sections, SVG architecture diagrams, and spoken interview soundbites.',
    badge: 'HTML Guide',
    badgeColor: 'bg-blue-500/20 text-blue-300',
  },
  {
    title: 'Foundry Design Edition (Interview Prep)',
    href: '/guides/interview_prep_ai901_foundry_design.html',
    desc: 'The interview guide plus the designed production path: keyless access to Microsoft Foundry through the Foundry SDK, Entra ID tokens and managed identity. Designed, not built.',
    badge: 'HTML Guide',
    badgeColor: 'bg-purple-500/20 text-purple-300',
  },
  {
    title: 'Official Final Report (Print Edition)',
    href: '/guides/Final_Report_Official_print.html',
    desc: 'Complete project report with methodology, data exploration, validation metrics, and governance registers.',
    badge: 'Report',
    badgeColor: 'bg-emerald-500/20 text-emerald-300',
  },
  {
    title: 'Streamlit Friction Gate UI',
    href: 'http://localhost:8501',
    desc: 'Interactive human-in-the-loop retention drafting portal with Glass-Box RBAC and Attention Gate.',
    badge: 'Live App :8501',
    badgeColor: 'bg-amber-500/20 text-amber-300',
  },
  {
    title: 'FastAPI Serving & Grader API',
    href: 'http://127.0.0.1:8000/docs',
    desc: 'Interactive Swagger UI: score customer records, query fairness audits, and test the viva grader.',
    badge: 'Live API :8000',
    badgeColor: 'bg-cyan-500/20 text-cyan-300',
  },
];

export function NextStepsModule() {
  return (
    <div className="flex flex-col gap-6 pb-12">
      <ModuleHeader
        title="Next Steps & Built Ecosystem"
        subtitle="Access all live companion applications, HTML study guides, and future roadmap items."
      />

      <section className="bg-slate-900 border border-blue-900/40 rounded-2xl p-5">
        <h3 className="font-bold text-slate-100 mb-3 flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">
            Interactive Ecosystem
          </span>
          Live Companion Apps & HTML Guides
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          All services are running locally and ready for interactive exploration:
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {GUIDES_AND_APPS.map((item) => (
            <a
              key={item.title}
              href={item.href}
              target="_blank"
              rel="noreferrer"
              className="flex flex-col justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-800/40 transition-all group"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400 transition-colors" />
                </div>
                <h4 className="font-semibold text-sm text-slate-200 group-hover:text-white transition-colors">
                  {item.title}
                </h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </a>
          ))}
        </div>
      </section>

      <section className="bg-slate-900 border border-emerald-900/40 rounded-2xl p-5">
        <h3 className="font-bold text-slate-200 mb-3 flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">Built</span>
          What exists today
        </h3>
        <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1 list-disc pl-5 text-sm text-slate-400">
          {BUILT.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </section>

      <Callout tone="warn" title="Rule">
        Everything below is future work from <code className="font-mono">{CORRECTIONS_REGISTER}</code>. Say “the next step
        would be…”, never “we have…”.
      </Callout>

      <div className="grid md:grid-cols-2 gap-4">
        {NEXT_STEPS.map((n) => (
          <article key={n.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">Next</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                {n.area} · {n.ref}
              </span>
            </div>
            <h3 className="font-bold text-slate-100">{n.title}</h3>
            <p className="text-sm text-slate-300">{n.what}</p>
            <p className="text-sm text-slate-400">
              <strong className="text-slate-300">Why:</strong> {n.why}
            </p>
            <p className="text-sm text-slate-400">
              <strong className="text-slate-300">Blocked by:</strong> {n.blocker}
            </p>
            <code className="block font-mono text-xs text-blue-300 break-all">{n.doc}</code>
          </article>
        ))}
      </div>
    </div>
  );
}
