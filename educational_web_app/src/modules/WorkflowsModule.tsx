import { useCallback, useState } from 'react';
import { GitBranch, Layers } from 'lucide-react';
import { WORKFLOW_DIAGRAMS } from '../content/workflow';
import { RUN_COMMANDS } from '../content/facts';
import { useAppProgress } from '../context/AppProgress';
import { Callout, CodeBlock, ModuleHeader } from '../components/shared/ui';
import { FlowchartExplorer } from '../components/shared/FlowchartExplorer';

export function WorkflowsModule() {
  const { setInteraction, interactions } = useAppProgress();
  const [diagramId, setDiagramId] = useState<string>('split-executor');
  const [visited, setVisited] = useState<Set<string>>(new Set());

  const activeDiagram =
    WORKFLOW_DIAGRAMS.find((d) => d.id === diagramId) ?? WORKFLOW_DIAGRAMS[0];

  const onVisit = (id: string) => {
    setVisited((prev) => new Set(prev).add(id));
  };

  const splitExecutorDone = Boolean(
    interactions.completedWorkflow ||
      WORKFLOW_DIAGRAMS[0].hotspots.every((h) => visited.has(h.id)),
  );

  const onAllVisited = useCallback(() => {
    if (splitExecutorDone) setInteraction('completedWorkflow');
  }, [splitExecutorDone, setInteraction]);

  return (
    <div className="flex flex-col gap-6 pb-12">
      <ModuleHeader
        title="Ways of Working"
        subtitle="Explore the real Meridian orchestration flowcharts. Split-Executor is an agent workflow — split-brain (ADR 008) is a database topology failure mode."
      />

      <div className="flex flex-wrap gap-2">
        {WORKFLOW_DIAGRAMS.map((d) => {
          const Icon = d.id === 'split-executor' ? GitBranch : Layers;
          const explored = d.hotspots.filter((h) => visited.has(h.id)).length;
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => setDiagramId(d.id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition-colors ${
                diagramId === d.id
                  ? 'bg-blue-500/20 border-blue-500/40 text-blue-200'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {d.title}
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">
                {explored}/{d.hotspots.length}
              </span>
            </button>
          );
        })}
      </div>

      <FlowchartExplorer
        diagram={activeDiagram}
        visitedIds={visited}
        onVisit={onVisit}
        onAllVisited={diagramId === 'split-executor' ? onAllVisited : undefined}
      />

      {diagramId === 'system-flow' && (
        <Callout tone="tip" title="Connect to later modules">
          This is the product runtime path — Serving (06), Friction-Gate (07), GenAI (08), and RAG (09) each map to nodes on this chart.
        </Callout>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <Callout tone="info" title="Split-Executor (workflow)">
          Human-in-the-loop execution: the agent writes files and suggests{' '}
          <code className="font-mono">py -3.13 -m …</code> commands; you run them in a native terminal because
          AppLocker blocks many agent-spawned and <code className="font-mono">.venv\Scripts\*.exe</code> paths.
        </Callout>
        <Callout tone="warn" title="Split-brain (ADR 008) — not the same thing">
          Two app replicas writing separate SQLite files diverge forever. Meridian uses one shared DB volume and{' '}
          <strong>maxReplicas: 1</strong>.
        </Callout>
      </div>

      <div>
        <h3 className="text-lg font-bold text-slate-200 mb-2">Canonical commands</h3>
        <CodeBlock>{`# AppLocker machine (global launcher, ADR 001)\n${RUN_COMMANDS.tests}\n${RUN_COMMANDS.api}\n${RUN_COMMANDS.ui}\n\n# Any other machine, inside a venv / uv env\n${RUN_COMMANDS.testsPortable}`}</CodeBlock>
      </div>

      {splitExecutorDone && (
        <Callout tone="tip" title="Workflow gate complete">
          You explored every Split-Executor hotspot. Optional: switch to Hybrid system orchestration to see how
          locked strategy becomes the Friction-Gate runtime.
        </Callout>
      )}
    </div>
  );
}
