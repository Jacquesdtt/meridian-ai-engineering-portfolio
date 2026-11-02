/**
 * The five Meridian memory chains.
 *
 * Each chain is one causal sentence broken into links. The point is not the
 * facts — those live elsewhere — but the order: recalling link n should pull
 * link n+1, so that under viva pressure you rebuild the argument instead of
 * fishing for a remembered number. Numbers come from facts.ts only.
 */
import { useState } from 'react';
import { Link2, ChevronRight } from 'lucide-react';
import { GENAI, MODEL, RAG_CHUNKING, formatOpsThreshold } from '../../content/facts';

export type ChainId = 'pr-auc' | 'leakage' | 'calibration' | 'serving-contract' | 'rag-chunking';

interface Chain {
  id: ChainId;
  title: string;
  /** What this chain is for — the question it answers under pressure. */
  cue: string;
  links: string[];
  /** The one sentence to land if you only get one sentence. */
  punchline: string;
  accent: 'blue' | 'amber' | 'emerald' | 'purple' | 'red';
}

const ACCENTS: Record<Chain['accent'], { border: string; bg: string; text: string; chip: string }> = {
  blue: { border: 'border-blue-900/50', bg: 'bg-blue-950/20', text: 'text-blue-200', chip: 'bg-blue-500/15 border-blue-500/40 text-blue-200' },
  amber: { border: 'border-amber-900/50', bg: 'bg-amber-950/20', text: 'text-amber-200', chip: 'bg-amber-500/15 border-amber-500/40 text-amber-200' },
  emerald: { border: 'border-emerald-900/50', bg: 'bg-emerald-950/20', text: 'text-emerald-200', chip: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200' },
  purple: { border: 'border-purple-900/50', bg: 'bg-purple-950/20', text: 'text-purple-200', chip: 'bg-purple-500/15 border-purple-500/40 text-purple-200' },
  red: { border: 'border-red-900/50', bg: 'bg-red-950/20', text: 'text-red-200', chip: 'bg-red-500/15 border-red-500/40 text-red-200' },
};

export const MEMORY_CHAINS: Chain[] = [
  {
    id: 'pr-auc',
    title: 'PR-AUC chain',
    cue: 'Why is accuracy the wrong metric, and why did a better metric still not decide the threshold?',
    accent: 'blue',
    links: [
      `${(MODEL.baseRate * 100).toFixed(1)}% base rate`,
      'so accuracy can mislead',
      'we care about ranking positives',
      'precision–recall trade-off',
      `PR-AUC ${MODEL.prAuc.heuristic} → ${MODEL.prAuc.model}`,
      'the model improved the ranking',
      'BUT ranking ≠ operational policy',
      `max-F1 produced ${MODEL.maxF1FalsePositives.toLocaleString()} false positives`,
      `threshold redesigned around team capacity (${formatOpsThreshold()})`,
    ],
    punchline:
      'The model got better at ordering customers; the threshold decides how far down that order a real team can go. Two different wins, two different owners.',
  },
  {
    id: 'leakage',
    title: 'Leakage chain',
    cue: 'How do you prove the model never saw the future?',
    accent: 'amber',
    links: [
      'observation month t',
      'features ≤ t',
      'temporal boundary',
      'label = t+1',
      'the future cannot cross backwards',
    ],
    punchline:
      'Every feature is knowable at scoring time in production, before the label exists. That property — not the split — is what makes the pipeline leakage-safe.',
  },
  {
    id: 'calibration',
    title: 'Calibration chain',
    cue: 'Someone reads a score of 0.75 as a 75% chance. What do you say?',
    accent: 'red',
    links: [
      'XGBoost score = 0.75',
      '✗ do NOT say "75% probability"',
      'uncalibrated: scale_pos_weight + ranking objective',
      'call it a ranking score',
      'the API field name is legacy naming debt',
    ],
    punchline:
      'The number orders the queue. It does not estimate a frequency, and the schema calling it churn_probability is a documented debt, not a claim.',
  },
  {
    id: 'serving-contract',
    title: 'Serving contract chain',
    cue: 'What do you actually deploy? "The model" is not an answer.',
    accent: 'emerald',
    links: [
      'a booster alone is not enough',
      `+ fitted preprocessor (${MODEL.stateOheCount} state OHE columns)`,
      '+ feature schema and column order',
      `+ threshold (${formatOpsThreshold()})`,
      `+ provenance run ID (${MODEL.runId.slice(0, 8)})`,
      '= a deployable inference contract',
      'enforced at one point: FastAPI',
    ],
    punchline:
      'Ship the bundle, not the booster. Anything left out of the bundle becomes training-serving skew the first time someone reimplements it.',
  },
  {
    id: 'rag-chunking',
    title: 'RAG chunking chain',
    cue: 'Retrieval returned three chunks and the answer was still vague. Why?',
    accent: 'purple',
    links: [
      'document → chunks',
      'chunks → embeddings',
      'embeddings → cosine similarity',
      `top-${GENAI.ragTopK} evidence`,
      'evidence → LLM',
      'LLM → grounded answer',
      `BUT coarse chunking exposed ~${Math.round(RAG_CHUNKING.beforeCoverage * 100)}% of the report in ${RAG_CHUNKING.topK} chunks`,
      `fix: H1–H6 splitting, ≤${RAG_CHUNKING.afterMaxChars} chars, top-${RAG_CHUNKING.topK} (~${(RAG_CHUNKING.afterCoverage * 100).toFixed(1)}% coverage)`,
    ],
    punchline: RAG_CHUNKING.lesson,
  },
];

function ChainCard({ chain }: { chain: Chain }) {
  const [open, setOpen] = useState(false);
  const a = ACCENTS[chain.accent];

  return (
    <div className={`rounded-2xl border ${a.border} ${a.bg} overflow-hidden`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full text-left p-4 flex items-start gap-3 hover:bg-white/[0.03] transition-colors"
      >
        <Link2 className={`w-4 h-4 shrink-0 mt-0.5 ${a.text}`} aria-hidden />
        <span className="min-w-0 flex-1">
          <span className={`block text-sm font-bold ${a.text}`}>{chain.title}</span>
          <span className="block text-[11px] text-slate-400 leading-snug mt-0.5">{chain.cue}</span>
        </span>
        <ChevronRight
          className={`w-4 h-4 shrink-0 text-slate-500 transition-transform ${open ? 'rotate-90' : ''}`}
          aria-hidden
        />
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3">
          <ol className="flex flex-wrap items-center gap-1.5" aria-label={`${chain.title} links`}>
            {chain.links.map((link, i) => (
              <li key={link} className="flex items-center gap-1.5">
                <span className={`inline-block rounded-md border px-2 py-1 text-[11px] font-medium ${a.chip}`}>
                  {link}
                </span>
                {i < chain.links.length - 1 && (
                  <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" aria-hidden />
                )}
              </li>
            ))}
          </ol>
          <p className="text-xs text-slate-300 leading-relaxed border-l-2 border-slate-700 pl-3">
            {chain.punchline}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Renders the chains, optionally filtered. Pass `ids` to show only the chains a
 * module is responsible for; omit it in Practice, where all five belong.
 */
export function MemoryChains({
  ids,
  title = 'Memory chains',
  subtitle = 'Recall the first link and let it pull the rest. Open one, then try to say it with the card closed.',
}: {
  ids?: ChainId[];
  title?: string;
  subtitle?: string;
}) {
  const chains = ids ? MEMORY_CHAINS.filter((c) => ids.includes(c.id)) : MEMORY_CHAINS;
  if (chains.length === 0) return null;

  return (
    <section className="space-y-3">
      <div>
        <h3 className="font-bold text-slate-100 text-sm">{title}</h3>
        <p className="text-[11px] text-slate-500 leading-relaxed">{subtitle}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {chains.map((c) => (
          <div key={c.id}>
            <ChainCard chain={c} />
          </div>
        ))}
      </div>
    </section>
  );
}
