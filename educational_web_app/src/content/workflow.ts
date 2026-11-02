/**
 * Workflow orchestration teaching content — captions tied to presentation flowcharts.
 * Visual SoT: Docs/Presentations/assets/{system_flow,split_executor}.png (bundled in public/assets/).
 */

export type WorkflowHotspot = {
  id: string;
  label: string;
  caption: string;
  /** Percentage box overlay on the diagram (0–100). */
  top: number;
  left: number;
  width: number;
  height: number;
  /** Highlight in purple when this is the AppLocker / Split-Executor key step. */
  keyStep?: boolean;
};

export type WorkflowDiagram = {
  id: 'system-flow' | 'split-executor';
  title: string;
  subtitle: string;
  imageSrc: string;
  imageAlt: string;
  /** wide = horizontal hybrid flow; tall = vertical orchestration chart */
  layout: 'wide' | 'tall';
  hotspots: WorkflowHotspot[];
};

/** Hybrid product orchestration — left-to-right serving + GenAI path (presentation slide ~20). */
export const SYSTEM_FLOW: WorkflowDiagram = {
  id: 'system-flow',
  title: 'Hybrid system orchestration',
  subtitle:
    'Walk left → right: ML ranks who to contact; guarded GenAI drafts what to say; humans approve before anything is “sent”.',
  imageSrc: '/assets/system_flow.png',
  imageAlt: 'Meridian hybrid system flow: Friction-Gate → XGBoost threshold → Azure drafter → Pydantic → HITL review',
  layout: 'wide',
  hotspots: [
    {
      id: 'sf-friction-gate',
      label: 'Friction-Gate UI',
      caption:
        'Streamlit Friction-Gate calls FastAPI for every score and draft (ADR 006 follow-on, 2026-09-18). On the AppLocker machine it can run the same API in-process via an ASGI client.',
      top: 38,
      left: 1,
      width: 16,
      height: 28,
    },
    {
      id: 'sf-ops-model',
      label: 'XGBoost ops cut',
      caption:
        'Ops threshold t≈0.701 (~top 5%) decides whether a customer enters the draft queue. Below threshold → no draft, no action.',
      top: 38,
      left: 22,
      width: 14,
      height: 28,
    },
    {
      id: 'sf-no-action',
      label: 'Below threshold',
      caption:
        'Most accounts stop here — capacity-constrained review queue. Morgan cares about precision at this cut, not max-F1.',
      top: 8,
      left: 40,
      width: 18,
      height: 22,
    },
    {
      id: 'sf-drafter',
      label: 'Azure OpenAI drafter',
      caption:
        'GenAI drafts retention email text only after ML flags risk. Inputs: score, scrubbed context and frozen global SHAP driver names, rendered through .prompty. No RAG here — RAG only powers the Methodology Q&A bot.',
      top: 52,
      left: 48,
      width: 16,
      height: 28,
    },
    {
      id: 'sf-pydantic',
      label: 'Pydantic validation',
      caption:
        'Schema gate (ADR 002): sanitize_llm_draft clamps offered_interest_rate to 3.5% and re-scrubs the text; Pydantic rejects anything unclamped. The slide draws a loop-back arrow, but the code has no redraft loop: Azure errors are retried, then the stub drafts (stub_fallback).',
      top: 52,
      left: 64,
      width: 14,
      height: 28,
    },
    {
      id: 'sf-hitl',
      label: 'Review queue (HITL)',
      caption:
        'Pending Review state (ADR 003). Retention agent approves; Compliance can audit but cannot Approve (ADR 007).',
      top: 52,
      left: 78,
      width: 14,
      height: 28,
    },
    {
      id: 'sf-approved',
      label: 'Approved ≠ Sent',
      caption:
        'Approve records intent in SQLite — there is no /send route. Jamie’s anti-rubber-stamp control: attention_ack required.',
      top: 52,
      left: 92,
      width: 8,
      height: 28,
    },
  ],
};

/** Solo AI-engineering operating system — strategic vs tactical split (presentation slide ~25). */
export const SPLIT_EXECUTOR: WorkflowDiagram = {
  id: 'split-executor',
  title: 'Split-Executor orchestration',
  subtitle:
    'How a solo builder orchestrates agents: lock strategy first, then dispatch scoped tactical work — human review diffs closes the loop.',
  imageSrc: '/assets/split_executor.png',
  imageAlt: 'Split-Executor workflow: Strategic Definition with Red Team loop; Tactical Execution with MEMORY.md and human diff review',
  layout: 'tall',
  hotspots: [
    {
      id: 'se-define',
      label: 'Define Architecture / PRD',
      caption:
        'Ideation: frame the problem for the orchestrator (churn ranker + HITL drafts — not an auto-emailer). PRD locks ~$7.3M AUM and personas.',
      top: 6,
      left: 28,
      width: 44,
      height: 10,
    },
    {
      id: 'se-red-team',
      label: 'Red Team loop',
      caption:
        'Docs-before-code circuit breaker: attack note → revision checklist → update docs/ADRs → then code. Prevents agents writing flawed logic at scale.',
      top: 18,
      left: 36,
      width: 28,
      height: 14,
    },
    {
      id: 'se-revise',
      label: 'Revise docs & ADRs',
      caption:
        'When Red Team finds a flaw, revise permanent records first — not a drive-by code patch. ADRs are the playbook agents must follow.',
      top: 18,
      left: 4,
      width: 28,
      height: 14,
    },
    {
      id: 'se-lock',
      label: 'Lock strategy',
      caption:
        'Plan phase complete: architecture, leakage rules, and guardrails are frozen before tactical agents touch src/.',
      top: 18,
      left: 68,
      width: 28,
      height: 14,
    },
    {
      id: 'se-memory',
      label: 'Update MEMORY.md',
      caption:
        'State sync hand-off: .agents/MEMORY.md is the living save-state so the next session inherits context without re-reading the whole repo.',
      top: 48,
      left: 28,
      width: 44,
      height: 10,
    },
    {
      id: 'se-dispatch',
      label: 'Dispatch tactical agent',
      caption:
        'Split-Executor (workflow): agent drafts files and commands; you run them natively. This is not split-brain (ADR 008 DB topology).',
      top: 58,
      left: 28,
      width: 44,
      height: 10,
      keyStep: true,
    },
    {
      id: 'se-generate',
      label: 'Generate code',
      caption:
        'Scoped implementation only — e.g. fix RAG chunking, add a test. Stops tunnel vision from rewriting the whole stack for one bug.',
      top: 68,
      left: 28,
      width: 44,
      height: 10,
      keyStep: true,
    },
    {
      id: 'se-review',
      label: 'Human review diffs',
      caption:
        'Validate before “done”: py -3.13 -m pytest, Streamlit smoke, then commit. AppLocker blocks many agent-spawned and .venv\\Scripts\\*.exe paths.',
      top: 78,
      left: 28,
      width: 44,
      height: 12,
      keyStep: true,
    },
  ],
};

export const WORKFLOW_DIAGRAMS = [SPLIT_EXECUTOR, SYSTEM_FLOW] as const;
