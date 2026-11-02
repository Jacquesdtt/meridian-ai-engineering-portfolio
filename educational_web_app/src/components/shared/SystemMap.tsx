/**
 * One picture of Meridian, always in the same orientation, with the part the
 * current module is about lit up. The point is that thirteen topics are one
 * system: the learner should be able to place any lesson on this strip.
 *
 * Pipeline nodes are the runtime path. The two bands underneath are the things
 * that wrap the whole path rather than sitting at one point in it.
 */
import type { ModuleId } from '../../content/modules';

type NodeId = 'data' | 'model' | 'api' | 'rag' | 'draft' | 'gate' | 'human';
type BandId = 'build' | 'govern';

const NODES: { id: NodeId; label: string; caption: string }[] = [
  { id: 'data', label: 'Data', caption: 'Monthly customer panel, features up to month t' },
  { id: 'model', label: 'Model', caption: 'XGBoost ranks next-month churn risk' },
  { id: 'api', label: 'API', caption: 'FastAPI scores and enforces the rules' },
  { id: 'rag', label: 'Retrieve', caption: 'Grounding passages for the draft' },
  { id: 'draft', label: 'Draft', caption: 'GenAI writes the outreach email' },
  { id: 'gate', label: 'Gate', caption: 'Friction gate: approve is not send' },
  { id: 'human', label: 'Human', caption: 'A person decides and contacts the customer' },
];

const BANDS: { id: BandId; label: string; caption: string }[] = [
  { id: 'build', label: 'Repo · ADRs · CI', caption: 'How the system is built and shipped' },
  { id: 'govern', label: 'Fairness · audit · ZDR', caption: 'What holds the system accountable' },
];

/** Where each lesson sits on the map. Modules with no place on it return undefined. */
const PLACE: Partial<Record<ModuleId, NodeId | BandId>> = {
  problem: 'human',
  architecture: 'build',
  workflows: 'build',
  data: 'data',
  ml: 'model',
  serving: 'api',
  friction: 'gate',
  genai: 'draft',
  rag: 'rag',
  ethics: 'govern',
  deploy: 'build',
};

const W = 764;
const GAP = 8;
const NODE_W = (W - GAP * (NODES.length - 1)) / NODES.length;

export function SystemMap({ activeModule }: { activeModule: ModuleId }) {
  const place = PLACE[activeModule];
  const here = NODES.find((n) => n.id === place) ?? BANDS.find((b) => b.id === place);

  return (
    <div className="shrink-0 overflow-x-auto" aria-hidden={false}>
      <svg
        viewBox={`0 0 ${W} 92`}
        className="w-full min-w-[520px] h-[74px]"
        role="img"
        aria-label={here ? `System map. This module covers: ${here.label}.` : 'System map of the Meridian pipeline.'}
      >
        {NODES.map((n, i) => {
          const x = i * (NODE_W + GAP);
          const on = place === n.id;
          return (
            <g key={n.id}>
              {i > 0 && (
                <path
                  d={`M ${x - GAP + 1} 21 L ${x - 1} 21`}
                  stroke="#334155"
                  strokeWidth="1.5"
                  markerEnd="url(#sm-arrow)"
                />
              )}
              <rect
                x={x}
                y={6}
                width={NODE_W}
                height={30}
                rx={7}
                fill={on ? '#1e3a8a' : '#0f172a'}
                fillOpacity={on ? 0.55 : 1}
                stroke={on ? '#60a5fa' : '#1e293b'}
                strokeWidth={on ? 1.5 : 1}
              />
              <text
                x={x + NODE_W / 2}
                y={25}
                textAnchor="middle"
                fontSize="12"
                fontWeight={on ? 700 : 500}
                fill={on ? '#dbeafe' : '#64748b'}
              >
                {n.label}
              </text>
            </g>
          );
        })}

        {BANDS.map((b, i) => {
          const bw = (W - GAP) / 2;
          const x = i * (bw + GAP);
          const on = place === b.id;
          return (
            <g key={b.id}>
              <rect
                x={x}
                y={46}
                width={bw}
                height={24}
                rx={6}
                fill={on ? '#1e3a8a' : '#0f172a'}
                fillOpacity={on ? 0.55 : 1}
                stroke={on ? '#60a5fa' : '#1e293b'}
                strokeWidth={on ? 1.5 : 1}
                strokeDasharray={on ? undefined : '3 3'}
              />
              <text
                x={x + bw / 2}
                y={62}
                textAnchor="middle"
                fontSize="11"
                fontWeight={on ? 700 : 500}
                fill={on ? '#dbeafe' : '#64748b'}
              >
                {b.label}
              </text>
            </g>
          );
        })}

        <defs>
          <marker id="sm-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto">
            <path d="M 0 1 L 7 4 L 0 7 z" fill="#334155" />
          </marker>
        </defs>
      </svg>
      <p className="text-[11px] text-slate-500 -mt-1">
        {here ? (
          <>
            <span className="text-slate-400 font-semibold">You are here: {here.label}.</span> {here.caption}
          </>
        ) : (
          'The whole pipeline — this view is not about one part of it.'
        )}
      </p>
    </div>
  );
}
