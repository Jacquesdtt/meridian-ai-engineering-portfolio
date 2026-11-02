import { useState } from 'react';
import { GENAI, RAG_015 } from '../content/facts';
import { useAppProgress } from '../context/AppProgress';
import { Callout, GatePath, ModuleHeader } from '../components/shared/ui';

type RagTab = 'exposure' | 'compare';

const DEMO_QUERY = 'Why is Approve not the same as Sent?';

/** Packed-path demo chunks — mirrors rag_engine.py §6 grounding story. */
function packedRetrieveLog(query: string): string[] {
  return [
    `> retrieve("${query}") top_k=${GENAI.ragTopK}`,
    'Chunk A (412 chars): ADR 003 — no /send; Approved means ready for human outbound.',
    'Chunk B (380 chars): Friction-Gate terminal drafts immutable after Approve/Reject.',
    'Chunk C (290 chars): attention_ack required before Approve (anti rubber-stamp).',
    'Answer grounded in 3 small chunks — not a whole chapter.',
  ];
}

function chromaBlockLog(query: string): string[] {
  return [
    `> chromadb.Client(persist_directory="Data/chroma")`,
    `> collection.query("${query}", n_results=${GENAI.ragTopK})`,
    '[Sandbox Blocked: AppLocker] Unapproved native binary (ChromaDB / hnswlib) halted.',
    'Would persist collections on disk — never reaches query().',
    'Mitigation: pure-Python BM25 + Azure embeddings, fused with RRF, then LLM rerank (BM25 alone offline). ADR 010 + ADR 015.',
  ];
}

export function RagModule() {
  const { setInteraction, interactions } = useAppProgress();
  const [tab, setTab] = useState<RagTab>('compare');
  const [useChroma, setUseChroma] = useState(false);
  const [chunkMode, setChunkMode] = useState<'coarse' | 'packed'>('coarse');
  const [query, setQuery] = useState(DEMO_QUERY);
  const [log, setLog] = useState<string[]>([]);
  /** RT-06: must see AppLocker Chroma block before packed retrieve completes the gate. */
  const [sawChromaBlock, setSawChromaBlock] = useState(false);
  const [chromaLog, setChromaLog] = useState<string[]>([]);
  const [shippedLog, setShippedLog] = useState<string[]>([]);

  const runRetrieve = () => {
    if (useChroma) {
      setLog(chromaBlockLog(query));
      setSawChromaBlock(true);
      return;
    }
    if (chunkMode === 'coarse') {
      setLog([
        `> retrieve("${query}") top_k=${GENAI.ragTopK}`,
        'Hit: almost-entire Final Report chapter (H1/H2-only chunks) — noisy context.',
        'Symptom: Methodology bot pastes whole sections. Fix: pack #–###### ≤1200 chars.',
        sawChromaBlock
          ? 'Next: switch to Packed chunks and retrieve again to complete the RAG gate.'
          : 'Also toggle Attempt heavy DB (ChromaDB) once — the gate requires seeing the AppLocker block.',
      ]);
      return;
    }
    if (!sawChromaBlock) {
      setLog([
        `> retrieve("${query}") top_k=${GENAI.ragTopK}`,
        'Packed retrieve works — but mastery gate still needs the Chroma AppLocker block first.',
        'Toggle Attempt heavy DB (ChromaDB), run retrieve, then return to Packed and retrieve again.',
      ]);
      return;
    }
    setLog([
      ...packedRetrieveLog(query),
      'Gate complete: saw Chroma block + packed retrieve.',
    ]);
    setInteraction('completedRagPath');
  };

  const runCompare = () => {
    setChromaLog(chromaBlockLog(query));
    setShippedLog([
      `> build_index("${GENAI.ragCorpus}")`,
      `retrieval_mode: embedding (hybrid=true) | tfidf (offline label; ranking is BM25 alone)`,
      `rank: BM25 + dense → RRF fusion → LLM rerank → top_k=${GENAI.ragTopK}`,
      `schema_version=${RAG_015.cacheSchemaVersion} · max_chunk=${GENAI.ragChunkMaxChars}`,
      ...packedRetrieveLog(query),
    ]);
    setSawChromaBlock(true);
  };

  return (
    <div className="flex flex-col gap-6 pb-12">
      <ModuleHeader
        title="RAG under AppLocker"
        subtitle={`Methodology Q&A bot only: grounds answers in one document, ${GENAI.ragCorpus}, without Chroma/FAISS. Chunk packing ≤${GENAI.ragChunkMaxChars} chars; top_k=${GENAI.ragTopK}. The email drafter does not use RAG.`}
      />

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="RAG module views">
        {(
          [
            ['compare', 'With vs without Chroma'],
            ['exposure', 'Exposure check (mastery gate)'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
              tab === id ? 'bg-blue-500/20 border-blue-500/40 text-blue-200' : 'border-slate-700 text-slate-500'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'compare' ? (
        <div role="tabpanel" className="space-y-6">
          <Callout tone="info" title="Side-by-side — not the mastery gate">
            Meridian ships the right panel only (ADR 010). The left panel shows what a native vector DB would attempt —
            and why AppLocker blocks it. Complete the gate on the <strong>Exposure check</strong> tab.
          </Callout>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200"
              aria-label="Retrieval query"
            />
            <button
              type="button"
              onClick={runCompare}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2.5 rounded-xl"
            >
              Run side-by-side comparison
            </button>
            <span className={`block text-xs ${sawChromaBlock ? 'text-emerald-400' : 'text-slate-500'}`}>
              {sawChromaBlock ? 'Chroma block seen ✓ (counts toward gate)' : 'Chroma block pending'}
            </span>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <div className="bg-slate-900 border border-red-900/40 rounded-2xl p-5 space-y-3 flex flex-col">
              <h3 className="font-bold text-red-300">{GENAI.ragChromaWouldBe.title}</h3>
              <p className="text-xs text-slate-400 font-mono">{GENAI.ragChromaWouldBe.stack}</p>
              <pre className="flex-1 bg-slate-950 border border-red-900/30 rounded-xl p-4 text-xs font-mono text-red-200/90 min-h-[180px] whitespace-pre-wrap">
                {chromaLog.length ? chromaLog.join('\n') : 'Run comparison — Chroma path always blocks (no fake success).'}
              </pre>
              <Callout tone="warn" title="Not production">
                {GENAI.ragChromaWouldBe.outcome}
              </Callout>
            </div>

            <div className="bg-slate-900 border border-emerald-900/40 rounded-2xl p-5 space-y-3 flex flex-col">
              <h3 className="font-bold text-emerald-300">{GENAI.ragShipped.title}</h3>
              <p className="text-xs text-slate-400">{GENAI.ragShipped.stack}</p>
              <p className="text-xs text-slate-500 font-mono">{GENAI.ragShipped.chunking}</p>
              <pre className="flex-1 bg-slate-950 border border-emerald-900/30 rounded-xl p-4 text-xs font-mono text-emerald-200/90 min-h-[180px] whitespace-pre-wrap">
                {shippedLog.length ? shippedLog.join('\n') : 'Run comparison — shipped path uses packed chunks + pure-Python rank.'}
              </pre>
              <Callout tone="tip" title="Real module">
                {GENAI.ragShipped.outcome} See <code className="font-mono">src/genai/rag_engine.py</code>.
              </Callout>
            </div>
          </div>
        </div>
      ) : (
        <div role="tabpanel" className="space-y-6">
          <Callout tone="info" title="Mastery path (exposure check)">
            Gate requires: Chroma attempt (blocked) → then packed ≤{GENAI.ragChunkMaxChars} retrieve. Packed-only or
            Chroma-only clicks do not unlock the gate. Chroma block from the comparison tab also counts.
          </Callout>
          <GatePath steps={[{ label: 'See Chroma blocked', done: sawChromaBlock }, { label: 'Retrieve with packed chunks', done: interactions.completedRagPath }]} />

          <div className="flex flex-wrap gap-3 items-center">
            <label className="flex items-center gap-2 text-sm text-slate-300 bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl">
              <input
                type="checkbox"
                checked={useChroma}
                onChange={(e) => setUseChroma(e.target.checked)}
                className="accent-amber-500"
              />
              Attempt heavy DB (ChromaDB)
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setChunkMode('coarse')}
                className={`px-3 py-2 rounded-xl text-xs font-bold border ${
                  chunkMode === 'coarse'
                    ? 'border-amber-500/40 text-amber-200 bg-amber-500/10'
                    : 'border-slate-800 text-slate-500'
                }`}
              >
                Coarse H1/H2 chunks
              </button>
              <button
                type="button"
                onClick={() => setChunkMode('packed')}
                className={`px-3 py-2 rounded-xl text-xs font-bold border ${
                  chunkMode === 'packed'
                    ? 'border-emerald-500/40 text-emerald-200 bg-emerald-500/10'
                    : 'border-slate-800 text-slate-500'
                }`}
              >
                Packed ≤{GENAI.ragChunkMaxChars} chars
              </button>
            </div>
            <span className={`text-xs ${sawChromaBlock ? 'text-emerald-400' : 'text-slate-500'}`}>
              {sawChromaBlock ? 'Chroma block seen ✓' : 'Chroma block pending'}
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200"
            />
            <button
              type="button"
              onClick={runRetrieve}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2.5 rounded-xl"
            >
              Run retrieval simulation
            </button>
            <pre className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-300 min-h-[140px] whitespace-pre-wrap">
              {log.length ? log.join('\n') : 'Toggle Chroma or switch chunk mode, then retrieve.'}
            </pre>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <Callout tone="warn" title="ADR 010">
          {GENAI.ragNote}
        </Callout>
        <Callout tone="info" title="ADR 013">
          Shared Azure TPM: tenacity retries on 429/5xx + token telemetry. Dual API key fallback on 401 — resilience, not
          magic HA.
        </Callout>
      </div>
    </div>
  );
}
