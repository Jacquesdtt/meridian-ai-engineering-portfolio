import { useState } from 'react';
import {
  Users,
  TrendingUp,
  ArrowDown,
  DollarSign,
  Compass,
  Layers,
  Table,
  CheckCircle2,
  Shield,
  Briefcase,
} from 'lucide-react';
import {
  AUM_AT_RISK,
  PERSONAS,
  TEACHING_SPINE,
  formatOpsThreshold,
  CATWOE,
  POPIT,
  RASCI_MATRIX,
} from '../content/facts';
import { useAppProgress } from '../context/AppProgress';
import { Callout, ModuleHeader } from '../components/shared/ui';

type SubView = 'personas' | 'catwoe' | 'popit' | 'rasci';

const COLOR: Record<string, { text: string; bg: string; border: string }> = {
  amber: { text: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-500/30' },
  emerald: { text: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-500/30' },
  blue: { text: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-500/30' },
};

const RASCI_BADGE_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  R: { bg: 'bg-blue-500/20', text: 'text-blue-300 font-bold', border: 'border-blue-500/40' },
  A: { bg: 'bg-amber-500/20', text: 'text-amber-300 font-extrabold', border: 'border-amber-500/50' },
  S: { bg: 'bg-purple-500/20', text: 'text-purple-300 font-semibold', border: 'border-purple-500/40' },
  C: { bg: 'bg-emerald-500/20', text: 'text-emerald-300 font-semibold', border: 'border-emerald-500/40' },
  I: { bg: 'bg-slate-700/40', text: 'text-slate-400 font-normal', border: 'border-slate-600/40' },
};

export function ProblemModule() {
  const { setInteraction } = useAppProgress();
  const [subView, setSubView] = useState<SubView>('personas');

  // Personas state
  const [selectedPersona, setSelectedPersona] = useState<string>('jamie');

  // CATWOE state
  const [selectedCatwoeKey, setSelectedCatwoeKey] = useState<string>('T');

  // POPIT state
  const [selectedPopitId, setSelectedPopitId] = useState<string>('people');

  // RASCI state
  const [selectedStreamId, setSelectedStreamId] = useState<string>('governance_guardrails');
  const [filterStakeholder, setFilterStakeholder] = useState<string>('All');

  const selectedCatwoe = CATWOE.find((c) => c.key === selectedCatwoeKey) ?? CATWOE[2];
  const selectedPopit = POPIT.find((p) => p.id === selectedPopitId) ?? POPIT[0];
  const selectedStream = RASCI_MATRIX.find((s) => s.id === selectedStreamId) ?? RASCI_MATRIX[2];

  const handleSubViewChange = (view: SubView) => {
    setSubView(view);
    setInteraction('viewedPersonas');
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-5 pb-8">
      <ModuleHeader
        title="Problem & Stakeholders"
        subtitle="Silent retail savings churn drains AUM without a clean close flag. Meridian aligns Data Science, Product, and Risk under proven business analysis frameworks."
      />

      <Callout tone="info" title="Teaching spine">
        {TEACHING_SPINE}
      </Callout>

      {/* Sub-view Navigation Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3" role="tablist" aria-label="Stakeholder views">
        <button
          type="button"
          role="tab"
          aria-selected={subView === 'personas'}
          onClick={() => handleSubViewChange('personas')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border ${
            subView === 'personas'
              ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/20'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <Users className="w-3.5 h-3.5" /> Personas & Sizing
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={subView === 'catwoe'}
          onClick={() => handleSubViewChange('catwoe')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border ${
            subView === 'catwoe'
              ? 'bg-amber-600 text-white border-amber-500 shadow-lg shadow-amber-500/20'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <Compass className="w-3.5 h-3.5" /> CATWOE Analysis
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={subView === 'popit'}
          onClick={() => handleSubViewChange('popit')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border ${
            subView === 'popit'
              ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-500/20'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <Layers className="w-3.5 h-3.5" /> POPIT Dimensions
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={subView === 'rasci'}
          onClick={() => handleSubViewChange('rasci')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border ${
            subView === 'rasci'
              ? 'bg-purple-600 text-white border-purple-500 shadow-lg shadow-purple-500/20'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
          }`}
        >
          <Table className="w-3.5 h-3.5" /> RASCI Matrix
        </button>
      </div>

      {/* VIEW 1: PERSONAS & SIZING */}
      {subView === 'personas' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
          <div className="flex flex-col gap-3">
            <h3 className="text-base sm:text-lg font-bold text-slate-200 flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-500" /> Stakeholder map
            </h3>
            {PERSONAS.map((p) => {
              const c = COLOR[p.color];
              const isSel = selectedPersona === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setSelectedPersona(p.id);
                    setInteraction('viewedPersonas');
                  }}
                  className={`text-left flex flex-col gap-2.5 p-3 sm:p-3.5 rounded-xl border transition-all ${
                    isSel ? 'bg-slate-800/80 border-slate-500 shadow-md' : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 ${c.bg} ${c.text} border ${c.border}`}>
                      <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm sm:text-base font-bold text-slate-100 truncate">
                        {p.name} <span className="text-xs font-normal text-slate-500">({p.roleplay})</span>
                      </h4>
                      <span className="text-xs text-slate-400 block truncate">{p.role}</span>
                    </div>
                  </div>
                  {isSel && (
                    <div className="pt-2.5 border-t border-slate-800 space-y-2">
                      <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">{p.alignment}</p>
                      <p className="text-slate-400 text-xs sm:text-sm italic bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                        "{p.concern}"
                      </p>
                    </div>
                  )}
                </button>
              );
            })}
            <Callout tone="warn" title="Persona map">
              Docs use Jamie / Morgan / Sam. Roleplay: <strong>Arvind ↔ Jamie (Risk)</strong>, <strong>Andy ↔ Morgan (Product)</strong>.
            </Callout>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-base sm:text-lg font-bold text-slate-200 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-slate-500" /> AUM at risk
            </h3>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col items-center gap-2.5 relative overflow-hidden">
              <DollarSign className="absolute top-3 right-3 w-16 h-16 text-slate-800 opacity-20 pointer-events-none" />
              <div className="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-3 sm:p-3.5 text-center">
                <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Historical AUM at risk</span>
                <div className="text-2xl sm:text-3xl font-bold text-slate-100 mt-0.5">{AUM_AT_RISK.display}</div>
                <div className="text-xs text-slate-500 mt-0.5">{AUM_AT_RISK.displayExact} locked in Sprint 1</div>
              </div>
              <ArrowDown className="w-4 h-4 text-slate-600" />
              <div className="w-[92%] bg-blue-900/20 border border-blue-800/30 rounded-lg p-3 text-center">
                <span className="text-[10px] sm:text-xs font-bold text-blue-400/80 uppercase tracking-wider">Intervention capacity</span>
                <div className="text-base sm:text-lg font-bold text-blue-300 mt-0.5">Top ~5% by score ({formatOpsThreshold()})</div>
                <div className="text-[11px] text-blue-400/60 mt-0.5">Ops cut — not "email everyone the model likes"</div>
              </div>
              <ArrowDown className="w-4 h-4 text-slate-600" />
              <div className="w-[82%] bg-emerald-900/30 border border-emerald-500/30 rounded-lg p-3.5 text-center">
                <span className="text-[10px] sm:text-xs font-bold text-emerald-400/80 uppercase tracking-wider">Goal</span>
                <div className="text-sm sm:text-base font-bold text-emerald-300 mt-0.5">Ranked HITL outreach before AUM leaves</div>
              </div>
              <p className="text-[11px] text-slate-500 mt-2 text-center max-w-sm">{AUM_AT_RISK.note}</p>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: CATWOE ANALYSIS */}
      {subView === 'catwoe' && (
        <div className="flex flex-col gap-4 sm:gap-5">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
                <Compass className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" /> CATWOE Framework (Soft Systems Methodology)
              </h3>
              <span className="text-[10px] sm:text-xs font-mono bg-amber-400/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">
                Peter Checkland SSM
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300">
              CATWOE identifies the high-level human perspective of the system: who benefits or loses, who operates it, the fundamental transformation, the philosophical worldview, ownership, and environmental limitations.
            </p>
          </div>

          {/* Letter selector grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
            {CATWOE.map((item) => {
              const isSel = selectedCatwoeKey === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setSelectedCatwoeKey(item.key);
                    setInteraction('viewedPersonas');
                  }}
                  className={`flex flex-col p-3 rounded-xl border text-left transition-all ${
                    isSel
                      ? 'bg-amber-950/40 border-amber-500 text-amber-200 shadow-md shadow-amber-500/10'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-0.5">
                    <span className="text-xl sm:text-2xl font-black text-amber-400">{item.key}</span>
                    <span className="text-[9px] uppercase font-bold tracking-wider text-slate-500">{item.label}</span>
                  </div>
                  <span className="text-xs font-semibold text-slate-200 truncate">{item.name}</span>
                </button>
              );
            })}
          </div>

          {/* Selected letter deep dive card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-xl font-black text-amber-400 shrink-0">
                  {selectedCatwoe.key}
                </div>
                <div>
                  <h4 className="text-base sm:text-lg font-bold text-slate-100">
                    {selectedCatwoe.label} — <span className="text-slate-400 text-sm sm:text-base font-normal">{selectedCatwoe.name}</span>
                  </h4>
                  <p className="text-xs text-slate-400">{selectedCatwoe.summary}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">System Details</span>
                <ul className="space-y-1.5">
                  {selectedCatwoe.details.map((d, idx) => (
                    <li key={idx} className="text-xs sm:text-sm text-slate-300 flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>

                {selectedCatwoe.external && (
                  <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-1">
                    <span className="text-xs font-semibold text-amber-300/80">External Beneficiaries / Stakeholders:</span>
                    <p className="text-xs text-slate-400">{selectedCatwoe.external.join(' ')}</p>
                  </div>
                )}

                {selectedCatwoe.internal && (
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-amber-300/80">Internal Users:</span>
                    <p className="text-xs text-slate-400">{selectedCatwoe.internal.join(' ')}</p>
                  </div>
                )}
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                    <Shield className="w-3.5 h-3.5 text-amber-400" /> Meridian Project Architectural Impact
                  </span>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {selectedCatwoe.meridianImpact}
                  </p>
                </div>
                <div className="text-[10px] text-slate-500 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
                  Grounding: <em>Docs/StakeholderManagement/stakeholder_engagement_plan.md §1</em>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: POPIT DIMENSIONS */}
      {subView === 'popit' && (
        <div className="flex flex-col gap-4 sm:gap-5">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
                <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" /> POPIT Business Change Model
              </h3>
              <span className="text-[10px] sm:text-xs font-mono bg-emerald-400/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                BCS Holistic Change
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300">
              POPIT reminds engineers that deploying an ML model is never just a "Technology" project. Sustainable ROI requires harmonizing People, Organisation, Process, Information, and Technology.
            </p>
          </div>

          {/* 5-pillar dimension selector */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
            {POPIT.map((item) => {
              const isSel = selectedPopitId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSelectedPopitId(item.id);
                    setInteraction('viewedPersonas');
                  }}
                  className={`flex flex-col p-3 rounded-xl border text-left transition-all ${
                    isSel
                      ? 'bg-emerald-950/40 border-emerald-500 text-emerald-200 shadow-md shadow-emerald-500/10'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-0.5">
                    <span className="text-xl sm:text-2xl font-black text-emerald-400">{item.letter}</span>
                    <span className="text-[9px] uppercase font-bold tracking-wider text-slate-500">{item.name}</span>
                  </div>
                  <span className="text-xs font-semibold text-slate-200 truncate">{item.name}</span>
                </button>
              );
            })}
          </div>

          {/* Selected POPIT Dimension Details */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-lg font-bold text-emerald-400 shrink-0">
                {selectedPopit.letter}
              </div>
              <div>
                <h4 className="text-base sm:text-lg font-bold text-slate-100">{selectedPopit.name} Dimension</h4>
                <p className="text-xs text-slate-400">{selectedPopit.summary}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
              <div className="space-y-2.5">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Holistic Impact Points</span>
                <ul className="space-y-2">
                  {selectedPopit.points.map((p, idx) => (
                    <li key={idx} className="text-xs sm:text-sm text-slate-300 flex items-start gap-2.5 bg-slate-950/60 p-3 rounded-lg border border-slate-800/60">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-emerald-400" /> Operational & Engineering Reality
                  </span>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {selectedPopit.meridianImpact}
                  </p>
                </div>
                <div className="text-[10px] text-slate-500 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
                  Grounded in: <em>Docs/StakeholderManagement/stakeholder_engagement_plan.md §2</em>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 4: RASCI MATRIX */}
      {subView === 'rasci' && (
        <div className="flex flex-col gap-4 sm:gap-5">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 sm:p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
              <h3 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
                <Table className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" /> RASCI Responsibility Assignment Matrix
              </h3>
              <span className="text-[10px] sm:text-xs font-mono bg-purple-400/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-full">
                Single Accountability (A)
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300">
              Clear RACI/RASCI governance prevents cross-departmental deadlock between Data Science, Product, and Risk. Every workstream has strictly <strong>ONE Accountable (A)</strong> owner.
            </p>
          </div>

          {/* Legend and Stakeholder Filter */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 p-3 sm:p-3.5 rounded-xl border border-slate-800">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-slate-400 font-semibold mr-1">Legend:</span>
              <span className="px-1.5 py-0.5 rounded border border-blue-500/40 bg-blue-500/10 text-blue-300 font-bold text-[11px]">R = Responsible</span>
              <span className="px-1.5 py-0.5 rounded border border-amber-500/40 bg-amber-500/10 text-amber-300 font-bold text-[11px]">A = Accountable</span>
              <span className="px-1.5 py-0.5 rounded border border-purple-500/40 bg-purple-500/10 text-purple-300 font-semibold text-[11px]">S = Supportive</span>
              <span className="px-1.5 py-0.5 rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 font-semibold text-[11px]">C = Consulted</span>
              <span className="px-1.5 py-0.5 rounded border border-slate-600/40 bg-slate-700/30 text-slate-400 text-[11px]">I = Informed</span>
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400 font-semibold">Filter:</span>
              {['All', 'Sam', 'Morgan', 'Jamie', 'AI Engineer'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setFilterStakeholder(st)}
                  className={`px-2 py-0.5 rounded-lg border text-xs transition-all ${
                    filterStakeholder === st
                      ? 'bg-purple-600 text-white border-purple-500 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Workstream selector pills */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {RASCI_MATRIX.map((stream) => {
              const isSel = selectedStreamId === stream.id;
              const matchesFilter =
                filterStakeholder === 'All' ||
                stream.assignments.some((a) => a.party.toLowerCase().includes(filterStakeholder.toLowerCase()));

              return (
                <button
                  key={stream.id}
                  type="button"
                  onClick={() => {
                    setSelectedStreamId(stream.id);
                    setInteraction('viewedPersonas');
                  }}
                  className={`flex flex-col p-3 rounded-xl border text-left transition-all ${
                    isSel
                      ? 'bg-purple-950/40 border-purple-500 shadow-md shadow-purple-500/10'
                      : matchesFilter
                      ? 'bg-slate-900 border-slate-800 hover:border-slate-700'
                      : 'bg-slate-900/40 border-slate-800/40 opacity-50'
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 mb-0.5">
                    {stream.accountable.split(' ')[0]} Accountable
                  </span>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-100 mb-1">{stream.title}</h4>
                  <p className="text-[11px] text-slate-400 line-clamp-2">{stream.deliverable}</p>
                </button>
              );
            })}
          </div>

          {/* Deep dive into selected stream */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <span className="text-[10px] sm:text-xs font-bold text-purple-400 uppercase tracking-wider">Workstream Lifecycle</span>
                <h4 className="text-base sm:text-lg font-bold text-slate-100">{selectedStream.title}</h4>
                <p className="text-xs text-slate-400 mt-0.5">{selectedStream.deliverable}</p>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold shrink-0 self-start sm:self-auto">
                Accountable (A): {selectedStream.accountable}
              </div>
            </div>

            <div className="space-y-2.5">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Stakeholder Role Assignments</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {selectedStream.assignments.map((asg, idx) => {
                  const b = RASCI_BADGE_STYLE[asg.role];
                  const isHighlighted =
                    filterStakeholder !== 'All' &&
                    asg.party.toLowerCase().includes(filterStakeholder.toLowerCase());

                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border flex items-start gap-2.5 transition-all ${
                        isHighlighted
                          ? 'bg-purple-900/20 border-purple-500 shadow-sm'
                          : 'bg-slate-950 border-slate-800/80'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border text-xs ${b.bg} ${b.text} ${b.border}`}>
                        {asg.role}
                      </div>
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-bold text-slate-200">{asg.title}</span>
                          <span className="text-[10px] text-slate-500 font-mono">({asg.party})</span>
                        </div>
                        <p className="text-[11px] sm:text-xs text-slate-400 leading-relaxed">{asg.why}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <Callout tone="info" title="Governance rule: strictly one Accountable (A) per stream">
              {selectedStream.notes} In engineering reviews, shared accountability is no accountability. If Sam and Jamie both held "A" on model metrics, disagreements over fairness vs PR-AUC would deadlock deployment.
            </Callout>
          </div>
        </div>
      )}
    </div>
  );
}
