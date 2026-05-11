import type { ChartAction, ChartActionType } from "../types/chartActions.ts";
import type { ChartDrawing, DrawingRole } from "../types/drawings.ts";
import type { ChartState, Instrument } from "../types/market.ts";

const roleByActionType: Record<ChartActionType, DrawingRole> = {
  drawEntryLine: "entry",
  drawStopLossLine: "stopLoss",
  drawTakeProfitLine: "takeProfit",
  drawScenarioLabel: "scenario"
};

export const canApplyChartActionToChart = (action: ChartAction, chartState: ChartState) =>
  action.instrumentId === chartState.selectedInstrument.id &&
  action.exchange === chartState.selectedInstrument.exchange &&
  action.marketType === chartState.selectedInstrument.marketType &&
  action.interval === chartState.selectedInterval;

export const chartActionToDrawing = (action: ChartAction, instrument: Instrument): ChartDrawing => {
  const now = new Date().toISOString();
  const price = action.price ?? 0;

  return {
    id: `ai:${action.id}`,
    instrumentId: instrument.id,
    exchange: instrument.exchange,
    marketType: instrument.marketType,
    symbol: instrument.symbol,
    interval: action.interval,
    source: "ai",
    type: action.type === "drawScenarioLabel" ? "text" : "horizontalLine",
    points: [{ time: Date.now(), price }],
    properties: {
      scenarioId: action.scenarioId,
      reason: action.reason,
      text: action.text ?? null
    },
    role: roleByActionType[action.type],
    label: action.text ?? action.reason,
    userModified: false,
    createdAt: action.createdAt || now,
    updatedAt: now
  };
};
