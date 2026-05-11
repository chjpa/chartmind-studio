import type { ChartInterval, ExchangeId, MarketType } from "./market.ts";

export type ChartActionType =
  | "drawEntryLine"
  | "drawStopLossLine"
  | "drawTakeProfitLine"
  | "drawScenarioLabel";

export type ChartAction = {
  id: string;
  instrumentId: string;
  exchange: ExchangeId;
  marketType: MarketType;
  displaySymbol: string;
  interval: ChartInterval | string;
  type: ChartActionType;
  scenarioId: string;
  price?: number;
  text?: string;
  reason: string;
  createdAt: string;
};
