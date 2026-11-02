import { useState } from 'react';
import { GENAI, MODEL } from '../content/facts';
import { useAppProgress } from '../context/AppProgress';
import { Callout, CodeBlock, ModuleHeader } from '../components/shared/ui';

/** JS port of src/genai/pii_scrubber.py (same patterns, same order). */
const EMAIL = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const PHONE = /(?:\b|(?<=\s)|(?<=^))(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
const SSN_LIKE = /\b\d{3}-\d{2}-\d{4}\b/g;
const DOB_LIKE = /\b(?:19|20)\d{2}[-/](?:0?[1-9]|1[0-2])[-/](?:0?[1-9]|[12]\d|3[01])\b/g;
const LONG_DIGIT = /\b\d{8,}\b/g;
const BLOCKED_KEYS = new Set([
  'customer_id', 'Customer_ID', 'email', 'Email', 'name', 'Name', 'full_name',
  'dob', 'date_of_birth', 'ssn', 'phone', 'account_number',
]);

function scrubText(t: string): string {
  return t
    .replace(EMAIL, '[REDACTED_EMAIL]')
    .replace(PHONE, '[REDACTED_PHONE]')
    .replace(SSN_LIKE, '[REDACTED_SSN]')
    .replace(DOB_LIKE, '[REDACTED_DATE]')
    .replace(LONG_DIGIT, '[REDACTED_ID]');
}

const SAMPLE_CONTEXT = `{
  "name": "Jane Doe",
  "customer_id": "99887766",
  "tenure_note": "Jane called from 555-201-3344, email jane.d@example.com",
  "dob_note": "born 1961-04-09",
  "segment": "long-tenure saver"
}`;

const TOP_DRIVERS = Object.keys(MODEL.topShap);

export function GenaiModule() {
  const { setInteraction } = useAppProgress();
  const [raw, setRaw] = useState(SAMPLE_CONTEXT);
  const [scrubbed, setScrubbed] = useState('');
  const [parseError, setParseError] = useState('');
  const [llmRate, setLlmRate] = useState(0.042);
  const [validated, setValidated] = useState<null | { stored: number; rejected: boolean }>(null);
  const [source, setSource] = useState<'stub' | 'azure' | 'stub_fallback'>('azure');

  const scrub = () => {
    try {
      const obj = JSON.parse(raw) as Record<string, unknown>;
      const clean: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(obj)) {
        if (BLOCKED_KEYS.has(k)) continue;
        clean[k] = typeof v === 'string' ? scrubText(v) : v;
      }
      setScrubbed(JSON.stringify(clean, null, 2));
      setParseError('');
    } catch {
      setParseError('Context must be a flat JSON object (scrub_mapping only takes key/value pairs).');
      setScrubbed('');
    }
  };

  const sanitize = () => {
    const rejected = llmRate > GENAI.rateCap;
    setValidated({ stored: rejected ? GENAI.rateCap : llmRate, rejected });
    if (scrubbed) setInteraction('validatedDraftWithScrub');
  };

  return (
    <div className="flex flex-col gap-6 pb-12">
      <ModuleHeader
        title="Prompty, Pydantic & ZDR"
        subtitle={`Azure OpenAI writes draft text only after the model flags a customer. Context is scrubbed before the call, the output is scrubbed and sanitized after it, and a human still approves. ${GENAI.pathNote}`}
      />

      <div className="grid xl:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <h3 className="font-bold text-slate-200">1 · PII scrub (scrub_mapping)</h3>
          <p className="text-xs text-slate-500">
            Same rules as <code className="font-mono">src/genai/pii_scrubber.py</code>: drop blocked keys, then regex-redact
            emails, phones, SSNs, ISO dates and 8+ digit IDs in the remaining values.
          </p>
          <textarea
            value={raw}
            onChange={(e) => {
              setRaw(e.target.value);
              setScrubbed('');
            }}
            className="w-full h-40 bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-300 font-mono"
          />
          <button type="button" onClick={scrub} className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold px-4 py-2 rounded-xl">
            Scrub before LLM
          </button>
          {parseError && <p className="text-xs text-red-400">{parseError}</p>}
          {scrubbed && (
            <>
              <pre className="bg-slate-950 border border-emerald-800/40 rounded-xl p-3 font-mono text-xs text-emerald-300 whitespace-pre-wrap">
                {scrubbed}
              </pre>
              <Callout tone="warn" title="Look closely">
                The <code className="font-mono">name</code> key was dropped, but “Jane” inside <code className="font-mono">tenure_note</code>{' '}
                survived: the scrubber has no name detection in free text. It relies on blocked keys, so free-text notes are a
                real residual risk to disclose.
              </Callout>
            </>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <h3 className="font-bold text-slate-200">2 · Sanitize the LLM output (sanitize_llm_draft)</h3>
          <label className="text-sm text-slate-400 flex justify-between">
            <span>offered_interest_rate the LLM returned</span>
            <span className="font-mono text-slate-200">{(llmRate * 100).toFixed(1)}%</span>
          </label>
          <input
            type="range"
            min={0.01}
            max={0.06}
            step={0.001}
            value={llmRate}
            onChange={(e) => {
              setLlmRate(Number(e.target.value));
              setValidated(null);
            }}
            className="w-full accent-amber-500"
          />
          <button type="button" onClick={sanitize} className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold px-4 py-2 rounded-xl">
            Run sanitize_llm_draft
          </button>
          {validated && (
            <div className="bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs font-mono text-slate-300 space-y-1">
              <div className={validated.rejected ? 'text-amber-300' : 'text-emerald-300'}>
                {validated.rejected
                  ? `Rejected ${llmRate.toFixed(3)} → stub_fallback with a safe ${validated.stored.toFixed(3)} offer`
                  : `Accepted offered_interest_rate = ${validated.stored.toFixed(3)}`}
              </div>
              <div>subject, body → scrub_text(), then check numeric percentage claims against the offer</div>
              <div>drivers → [{TOP_DRIVERS.slice(0, 3).join(', ')}, …] (server list, LLM drivers ignored)</div>
              {!scrubbed && <div className="text-amber-300">Scrub the context first to complete this step.</div>}
            </div>
          )}
          <p className="text-xs text-slate-500">
            {GENAI.rateCapBehaviour} Nothing is sent back to the LLM for a redraft.
          </p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
        <h3 className="font-bold text-slate-200">3 · Which drafter ran? (create_draft)</h3>
        <div className="flex flex-wrap gap-2">
          {(['azure', 'stub', 'stub_fallback'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSource(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono border ${
                source === s ? 'bg-purple-500/20 border-purple-500/40 text-purple-200' : 'border-slate-700 text-slate-500'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <p className="text-sm text-slate-400">
          {source === 'azure' &&
            `Used when Azure is configured: .prompty template, JSON response format. Tenacity retries 429/5xx/timeouts up to ${GENAI.retryAttempts} attempts with exponential backoff; on a 401 it tries key 2 (ADR 013).`}
          {source === 'stub' && 'Used when Azure is not configured at all: a deterministic local draft for offline demos and tests.'}
          {source === 'stub_fallback' &&
            'Used when Azure is configured but the call fails or its output fails validation. The queue keeps working, and drafter_source is saved on the draft so reviewers know.'}
        </p>
        <Callout tone="info" title="What the drafter sees">
          The score, the scrubbed context and the frozen global SHAP driver names from{' '}
          <code className="font-mono">serving_meta.json</code>. No RAG: retrieval is only used by the Methodology Q&amp;A bot (09).
        </Callout>
      </div>

      <CodeBlock>{`# ${GENAI.promptyPath}   (pinned prompty<2: 2.x cannot render it)
def create_draft(...):
    if config.azure_configured:
        try:    return azure_draft(...), "azure"          # scrub in → LLM → scrub out + validate
        except Exception: return stub_draft(...), "stub_fallback"
    return stub_draft(...), "stub"`}</CodeBlock>
    </div>
  );
}
