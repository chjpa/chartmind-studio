"use client";

import { useCallback, useMemo, useState } from "react";
import { defaultInstrument } from "../lib/types/market.ts";
import type {
  ChartPanelState,
  ChartState,
  ChartStateUpdate,
  Instrument,
  MultiChartLayout,
  MultiChartState
} from "../lib/types/market.ts";

const chartCountByLayout: Record<MultiChartLayout, number> = {
  single: 1,
  double: 2,
  quad: 4
};

const createChartId = (index: number) => `chart-${index + 1}`;

export const createInitialChartState = (): ChartState => ({
  selectedExchange: defaultInstrument.exchange,
  selectedMarketType: defaultInstrument.marketType,
  selectedInstrument: defaultInstrument,
  selectedInterval: "60",
  currentPrice: null,
  selectedDrawingId: null,
  selectedIndicators: []
});

export const createChartPanelState = (chartId: string, baseState: ChartState = createInitialChartState()): ChartPanelState => ({
  ...baseState,
  chartId
});

export const createInitialMultiChartState = (): MultiChartState => ({
  layout: "single",
  activeChartId: "chart-1",
  panels: [createChartPanelState("chart-1")]
});

export const getActiveChartPanel = (state: MultiChartState): ChartPanelState =>
  state.panels.find((panel) => panel.chartId === state.activeChartId) ?? state.panels[0] ?? createChartPanelState("chart-1");

const syncSameInstrumentPanels = (
  panels: ChartPanelState[],
  sourcePanel: ChartPanelState,
  update: Pick<ChartState, "selectedInterval" | "selectedDrawingId" | "selectedIndicators">
) =>
  panels.map((panel) =>
    panel.chartId !== sourcePanel.chartId && panel.selectedInstrument.id === sourcePanel.selectedInstrument.id
      ? {
          ...panel,
          selectedInterval: update.selectedInterval,
          selectedDrawingId: update.selectedDrawingId,
          selectedIndicators: update.selectedIndicators
        }
      : panel
  );

export const updateChartState = <TChartState extends ChartState>(
  currentState: TChartState,
  update: ChartStateUpdate
): TChartState => ({
  ...currentState,
  ...update
});

export const selectInstrument = <TChartState extends ChartState>(
  currentState: TChartState,
  instrument: Instrument
): TChartState => ({
  ...currentState,
  selectedExchange: instrument.exchange,
  selectedMarketType: instrument.marketType,
  selectedInstrument: instrument
});

export const updateChartPanelState = (
  currentState: MultiChartState,
  chartId: string,
  update: ChartStateUpdate
): MultiChartState => {
  const targetPanel = currentState.panels.find((panel) => panel.chartId === chartId);

  if (!targetPanel) {
    return currentState;
  }

  const nextTargetPanel = updateChartState(targetPanel, update);
  const nextPanels = currentState.panels.map((panel) =>
    panel.chartId === chartId ? nextTargetPanel : panel
  );
  const shouldSync =
    update.selectedInterval !== undefined ||
    update.selectedDrawingId !== undefined ||
    update.selectedIndicators !== undefined;

  return {
    ...currentState,
    panels: shouldSync
      ? syncSameInstrumentPanels(nextPanels, nextTargetPanel, {
          selectedInterval: nextTargetPanel.selectedInterval,
          selectedDrawingId: nextTargetPanel.selectedDrawingId,
          selectedIndicators: nextTargetPanel.selectedIndicators
        })
      : nextPanels
  };
};

export const selectInstrumentForPanel = (
  currentState: MultiChartState,
  chartId: string,
  instrument: Instrument
): MultiChartState => {
  const targetPanel = currentState.panels.find((panel) => panel.chartId === chartId);

  if (!targetPanel) {
    return currentState;
  }

  const nextTargetPanel = selectInstrument(targetPanel, instrument);
  const nextPanels = currentState.panels.map((panel) =>
    panel.chartId === chartId ? nextTargetPanel : panel
  );

  return {
    ...currentState,
    panels: syncSameInstrumentPanels(nextPanels, nextTargetPanel, {
      selectedInterval: nextTargetPanel.selectedInterval,
      selectedDrawingId: nextTargetPanel.selectedDrawingId,
      selectedIndicators: nextTargetPanel.selectedIndicators
    })
  };
};

export const setMultiChartLayout = (
  currentState: MultiChartState,
  layout: MultiChartLayout
): MultiChartState => {
  const nextCount = chartCountByLayout[layout];
  const activePanel = getActiveChartPanel(currentState);
  const retainedPanels = currentState.panels.slice(0, nextCount);
  const nextPanels = [...retainedPanels];

  while (nextPanels.length < nextCount) {
    nextPanels.push(createChartPanelState(createChartId(nextPanels.length), activePanel));
  }

  const nextActiveChartId = nextPanels.some((panel) => panel.chartId === currentState.activeChartId)
    ? currentState.activeChartId
    : nextPanels[0]?.chartId ?? "chart-1";

  return {
    layout,
    activeChartId: nextActiveChartId,
    panels: nextPanels
  };
};

export const selectActiveChart = (
  currentState: MultiChartState,
  chartId: string
): MultiChartState =>
  currentState.panels.some((panel) => panel.chartId === chartId)
    ? {
        ...currentState,
        activeChartId: chartId
      }
    : currentState;

export const useChartStore = () => {
  const [multiChartState, setMultiChartState] = useState<MultiChartState>(() => createInitialMultiChartState());
  const chartState = useMemo(() => getActiveChartPanel(multiChartState), [multiChartState]);

  const updateState = useCallback((update: ChartStateUpdate, chartId?: string) => {
    setMultiChartState((currentState) =>
      updateChartPanelState(currentState, chartId ?? currentState.activeChartId, update)
    );
  }, []);

  const selectInstrumentState = useCallback((instrument: Instrument, chartId?: string) => {
    setMultiChartState((currentState) =>
      selectInstrumentForPanel(currentState, chartId ?? currentState.activeChartId, instrument)
    );
  }, []);

  const setLayout = useCallback((layout: MultiChartLayout) => {
    setMultiChartState((currentState) => setMultiChartLayout(currentState, layout));
  }, []);

  const selectChart = useCallback((chartId: string) => {
    setMultiChartState((currentState) => selectActiveChart(currentState, chartId));
  }, []);

  return {
    chartState,
    multiChartState,
    updateState,
    selectInstrument: selectInstrumentState,
    setLayout,
    selectChart
  };
};
