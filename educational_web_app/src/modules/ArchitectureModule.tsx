import { useRef, useState, type ReactNode } from 'react';
import { Folder, FolderOpen, FileText, FileCode, FileSpreadsheet, HardDrive, Terminal, Info } from 'lucide-react';
import { getAdrBody } from '../content/adrs';
import { ADRS } from '../content/facts';
import { TREE_DATA, adrIdFromNode, type TreeNode } from '../content/tree';
import { useAppProgress } from '../context/AppProgress';
import { MarkdownBody } from '../components/shared/MarkdownBody';
import { AdrChip, Callout, ModuleHeader } from '../components/shared/ui';

function iconFor(icon: TreeNode['icon'], open: boolean) {
  switch (icon) {
    case 'folder':
      return open ? <FolderOpen className="w-4 h-4 text-blue-400" /> : <Folder className="w-4 h-4 text-blue-400/80" />;
    case 'code':
      return <FileCode className="w-4 h-4 text-emerald-500" />;
    case 'csv':
      return <FileSpreadsheet className="w-4 h-4 text-amber-500" />;
    case 'model':
      return <HardDrive className="w-4 h-4 text-purple-400" />;
    default:
      return <FileText className="w-4 h-4 text-slate-500" />;
  }
}

export function ArchitectureModule() {
  const { setInteraction } = useAppProgress();
  const adrPanelRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(['docs', 'docs-adr', 'starting', 'code', 'src', 'src-serving', 'src-genai', 'models']),
  );
  const [selected, setSelected] = useState<TreeNode | null>(TREE_DATA[0]);
  const [adrId, setAdrId] = useState<string>('003');

  const selectAdr = (id: string) => {
    setAdrId(id);
    adrPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const toggle = (node: TreeNode) => {
    if (node.type === 'folder') {
      const next = new Set(expanded);
      if (next.has(node.id)) next.delete(node.id);
      else next.add(node.id);
      setExpanded(next);
    }

    const linkedAdr = adrIdFromNode(node);
    if (linkedAdr) {
      setSelected(node);
      selectAdr(linkedAdr);
      setInteraction('exploredTree');
      return;
    }

    if (node.philosophy || node.description) {
      setSelected(node);
      setInteraction('exploredTree');
    }
  };

  const renderTree = (nodes: TreeNode[], depth = 0): ReactNode => (
    <ul className="flex flex-col">
      {nodes.map((node) => {
        const open = expanded.has(node.id);
        const isSel = selected?.id === node.id;
        const isAdrActive = node.adrId === adrId;
        return (
          <li key={node.id}>
            <button
              type="button"
              aria-current={isSel || isAdrActive ? 'true' : undefined}
              className={`w-full flex items-center gap-2 py-1.5 px-2 rounded-md text-left ${
                isSel || isAdrActive ? 'bg-blue-500/15 text-blue-300' : 'hover:bg-slate-800/50 text-slate-400'
              }`}
              style={{ paddingLeft: `${depth * 1.25 + 0.5}rem` }}
              onClick={() => toggle(node)}
            >
              {iconFor(node.icon, open)}
              <span className={`text-sm ${node.type === 'folder' ? 'font-semibold text-slate-300' : ''}`}>{node.name}</span>
            </button>
            {node.type === 'folder' && open && node.children && renderTree(node.children, depth + 1)}
          </li>
        );
      })}
    </ul>
  );

  const activeAdr = ADRS.find((a) => a.id === adrId) ?? ADRS[0];
  const adrBody = getAdrBody(activeAdr.id);

  return (
    <div className="flex flex-col gap-6 pb-12">
      <ModuleHeader
        title="Repo & ADR Spine"
        subtitle="Explore the real folder layout. Click ADR chips or ADR files in the tree to read the full decision records — bundled from Docs/Architecture/ADRs/."
      />

      <div className="flex flex-col xl:flex-row gap-6 min-h-[420px]">
        {/* IP-01: no nested max-h scroll — tree grows with the module page scroll */}
        <div className="w-full xl:w-[320px] bg-slate-900 border border-slate-800 rounded-xl p-4 font-mono">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 pb-2 border-b border-slate-800">
            Workspace explorer
          </div>
          {renderTree(TREE_DATA)}
        </div>

        <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden min-h-[280px]">
          <Terminal className="absolute top-4 right-4 w-40 h-40 text-slate-800 opacity-30 pointer-events-none" />
          {selected ? (
            <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                {iconFor(selected.icon, true)}
                <h3 className="text-xl font-bold text-slate-200 font-mono">{selected.name}</h3>
              </div>
              {selected.description && <p className="text-slate-300 leading-relaxed">{selected.description}</p>}
              {selected.philosophy && (
                <div className="bg-blue-950/20 border border-blue-900/30 rounded-xl p-5">
                  <div className="flex items-center gap-2 text-blue-400 mb-2 text-xs font-bold uppercase tracking-widest">
                    <Info className="w-4 h-4" /> Engineering philosophy
                  </div>
                  <p className="text-blue-100/80 leading-relaxed">{selected.philosophy}</p>
                </div>
              )}
              {selected.adrId && (
                <p className="text-xs text-slate-500">
                  Full ADR text is shown in the drawer below — same content as{' '}
                  <code className="font-mono text-emerald-300">Docs/Architecture/ADRs/{activeAdr.filename}</code>.
                </p>
              )}
            </div>
          ) : (
            <p className="text-slate-500">Select a directory.</p>
          )}
        </div>
      </div>

      <div ref={adrPanelRef} className="space-y-3" aria-label="ADR drawer">
        <h3 className="text-lg font-bold text-slate-200">ADR drawer</h3>
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Architecture Decision Records">
          {ADRS.map((a) => (
            <button
              key={a.id}
              type="button"
              role="tab"
              aria-selected={adrId === a.id}
              aria-controls={`adr-panel-${a.id}`}
              onClick={() => selectAdr(a.id)}
              className="focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-md"
            >
              <AdrChip id={a.id} title={a.title} active={adrId === a.id} />
            </button>
          ))}
        </div>
        <div
          id={`adr-panel-${activeAdr.id}`}
          role="tabpanel"
          aria-labelledby={`adr-tab-${activeAdr.id}`}
          className="bg-slate-900 border border-slate-800 rounded-xl p-5"
        >
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-3 pb-3 border-b border-slate-800">
            <div className="text-blue-400 font-mono text-sm">
              ADR {activeAdr.id} — {activeAdr.title}
            </div>
            <code className="text-[11px] font-mono text-slate-500">{activeAdr.filename}</code>
          </div>
          <p className="text-xs text-slate-500 mb-4 italic">{activeAdr.oneLiner}</p>
          <div className="max-h-[min(480px,50vh)] overflow-y-auto pr-2 border-t border-slate-800/60 pt-4">
            {adrBody ? (
              <MarkdownBody source={adrBody} />
            ) : (
              <p className="text-amber-400 text-sm">ADR body not found in bundle.</p>
            )}
          </div>
        </div>
        <Callout tone="tip">
          Canonical ADRs live in <code className="font-mono text-emerald-300">Docs/Architecture/ADRs/</code> in the main repo.
          This SPA bundles them at build time for offline teaching. Edu-specific ADRs remain under{' '}
          <code className="font-mono text-emerald-300">educational_web_app/docs/</code>.
        </Callout>
      </div>
    </div>
  );
}
