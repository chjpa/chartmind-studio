import type { AnalysisResult } from "./analysis.ts";
import type { DerivativesContextAvailability } from "./derivatives.ts";
import type { ChartDrawing } from "./drawings.ts";
import type { ExchangeId, InstrumentCapabilities, MarketType } from "./market.ts";

export type ScenarioSide = "long" | "short" | "wait";

export type ScenarioSummary = {
  id: string;
  side: ScenarioSide;
  title: string;
  description: string;
};

export type AiChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

export type CandleSummary = {
  latestClose?: number;
  high?: number;
  low?: number;
  candleCount: number;
  trend?: "up" | "down" | "sideways" | "unknown";
} | null;

export type ChatRequestPayload = {
  userMessage: string;
  instrumentId: string;
  exchange: ExchangeId;
  marketType: MarketType;
  displaySymbol: string;
  interval: string;
  currentPrice: number | null;
  selectedDrawingId: string | null;
  drawings: ChartDrawing[];
  candleSummary: CandleSummary;
  capabilities: InstrumentCapabilities;
  analysisResult: AnalysisResult | null;
  derivativesContext?: DerivativesContextAvailability;
};

export type ChatResponsePayload = {
  instrumentId: string;
  exchange: ExchangeId;
  marketType: MarketType;
  displaySymbol: string;
  interval: string;
  selectedDrawingId: string | null;
  selectedDrawing: ChartDrawing | null;
  assistantMessage: string;
};
