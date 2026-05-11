"use client";

import { AiChatPanel } from "@/components/AiChatPanel";
import { AppHeader } from "@/components/AppHeader";
import { ChartWorkspace } from "@/components/ChartWorkspace";
import { PreferencesPanel } from "@/components/PreferencesPanel";
import { ScenarioPanel } from "@/components/ScenarioPanel";
import { useChartStore } from "@/store/chartStore";
import { useState } from "react";

export default function Home() {
  const { chartState, multiChartState, selectChart, selectInstrument, setLayout, updateState } = useChartStore();
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);

  return (
    <div className="app-page">
      <AppHeader onOpenPreferences={() => setIsPreferencesOpen(true)} />
      <main className="app-shell">
        <ChartWorkspace
          multiChartState={multiChartState}
          activeChartState={chartState}
          onSelectChart={selectChart}
          onSelectInstrument={selectInstrument}
          onSetLayout={setLayout}
          onUpdateChartState={updateState}
        />
        <div className="side-column">
          <AiChatPanel chartState={chartState} />
          <ScenarioPanel />
        </div>
      </main>
      {isPreferencesOpen ? <PreferencesPanel onClose={() => setIsPreferencesOpen(false)} /> : null}
    </div>
  );
}
