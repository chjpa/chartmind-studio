import type { CandleSummary } from "./ai.ts";
import type { ExchangeId, MarketType } from "./market.ts";

export type PivotType = "high" | "low";

export type PricePivot = {
  id: string;
  type: PivotType;
  time: number;
  price: number;
  candleIndex: number;
};

export type PriceLevel = {
  id: string;
  type: "support" | "resistance";
  price: number;
  touches: number;
  sourcePivotIds: string[];
};

export type TrendlineCandidate = {
  id: string;
  type: "support" | "resistance";
  points: Array<{ time: number; price: number }>;
  slope: number;
  sourcePivotIds: string[];
};

export type AnalysisResult = {
  instrumentId: string;
  exchange: ExchangeId;
  marketType: MarketType;
  displaySymbol: string;
  interval: string;
  currentPrice: number | null;
  candleSummary: CandleSummary;
  pivots: PricePivot[];
  levels: PriceLevel[];
  trendlines: TrendlineCandidate[];
  generatedAt: string;
};

export type CandleAnalysisResult = Pick<
  AnalysisResult,
  "currentPrice" | "candleSummary" | "pivots" | "levels" | "trendlines"
>;
