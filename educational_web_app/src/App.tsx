import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { getLesson } from './content/lessons';
import { LessonCheck, LessonLearn } from './components/shared/Lesson';
import { SystemMap } from './components/shared/SystemMap';
import { NextUp } from './components/shared/NextUp';
import { defaultTab, tabLabel, tabOrder } from './components/shared/lessonFlow';
import type { LessonTab } from './components/shared/lessonFlow';
import type { ModuleId } from './content/modules';
import { AppProgressProvider, useAppProgress } from './context/AppProgress';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { ProblemModule } from './modules/ProblemModule';
import { ArchitectureModule } from './modules/ArchitectureModule';
import { WorkflowsModule } from './modules/WorkflowsModule';
import { DataModule } from './modules/DataModule';
import { MlModule } from './modules/MlModule';
import { ServingModule } from './modules/ServingModule';
import { FrictionModule } from './modules/FrictionModule';
import { GenaiModule } from './modules/GenaiModule';
import { RagModule } from './modules/RagModule';
import { EthicsModule } from './modules/EthicsModule';
import { DeployModule } from './modules/DeployModule';
import { MasteryModule } from './modules/MasteryModule';
import { NextStepsModule } from './modules/NextStepsModule';
import { PracticeModule } from './modules/PracticeModule';

const MODULE_VIEW: Record<ModuleId, ReactNode> = {
  problem: <ProblemModule />,
  architecture: <ArchitectureModule />,
  workflows: <WorkflowsModule />,
  data: <DataModule />,
  ml: <MlModule />,
  serving: <ServingModule />,
  friction: <FrictionModule />,
  genai: <GenaiModule />,
  rag: <RagModule />,
  ethics: <EthicsModule />,
  deploy: <DeployModule />,
  mastery: <MasteryModule />,
  nextsteps: <NextStepsModule />,
  practice: <PracticeModule />,
};

function Shell() {
  const { activeModule, predictions, lastTabs, setLastTab, setActiveModule } = useAppProgress();
  const lesson = getLesson(activeModule);
  // Step order is per module: the ones with a strong demo start with the demo.
  const tabs = tabOrder(activeModule);
  const tab = lastTabs[activeModule] ?? defaultTab(activeModule, predictions);
  const stepIndex = Math.max(0, tabs.indexOf(tab));
  const contentRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (contentRef.current) contentRef.current.scrollTop = 0; }, [activeModule, tab]);
  const selectTab = (value: LessonTab) => setLastTab(activeModule, value);
  const goto = (id: string, value: LessonTab) => {
    setActiveModule(id as ModuleId);
    setLastTab(id as ModuleId, value);
  };
  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next: number | undefined;
    if (e.key === 'ArrowRight') next = (index + 1) % tabs.length;
    if (e.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = tabs.length - 1;
    if (next === undefined) return;
    e.preventDefault();
    selectTab(tabs[next]);
    document.getElementById(`lesson-tab-${tabs[next]}`)?.focus();
  };

  return (
    <div className="h-screen w-full min-w-0 max-w-full flex flex-col bg-slate-950 text-slate-200 font-sans overflow-hidden">
      <Header />
      <div className="flex flex-1 min-h-0 w-full min-w-0 overflow-hidden">
        <Sidebar />
        <main className="flex-1 min-w-0 min-h-0 flex flex-col p-3 sm:p-4 md:p-6 gap-3 md:gap-4 overflow-hidden">
          <SystemMap activeModule={activeModule} />
          {lesson && (
            <div className="flex flex-col gap-2 shrink-0">
              <div className="flex flex-wrap gap-2" role="tablist" aria-label="Lesson steps">
                {tabs.map((t, index) => (
                  <button
                    key={t}
                    type="button"
                    role="tab"
                    id={`lesson-tab-${t}`}
                    aria-controls="lesson-panel"
                    aria-selected={tab === t}
                    tabIndex={tab === t ? 0 : -1}
                    onKeyDown={(e) => onTabKey(e, index)}
                    onClick={() => selectTab(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                      tab === t ? 'bg-blue-500/20 border-blue-500/40 text-blue-200' : 'border-slate-700 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {index + 1} · {tabLabel(t)}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500">
                Step {stepIndex + 1} of {tabs.length} · about {lesson.estMinutes} min for this module, at your own pace
              </p>
            </div>
          )}
          <div ref={contentRef} className="flex-1 min-w-0 min-h-0 overflow-y-auto" role={lesson ? 'tabpanel' : undefined} id={lesson ? 'lesson-panel' : undefined} aria-labelledby={lesson ? `lesson-tab-${tab}` : undefined} tabIndex={lesson ? 0 : undefined}>
            {!lesson || tab === 'explore' ? (
              MODULE_VIEW[activeModule]
            ) : tab === 'learn' ? (
              <LessonLearn lesson={lesson} onExplore={() => selectTab('explore')} />
            ) : (
              <LessonCheck lesson={lesson} onLearn={() => selectTab('learn')} onExplore={() => selectTab('explore')} />
            )}
          </div>
          <NextUp onSelectTab={goto} />
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProgressProvider>
      <Shell />
    </AppProgressProvider>
  );
}
