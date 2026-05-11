import type { ChartDrawing, DrawingPoint, DrawingProperties, DrawingSource } from "../types/drawings.ts";
import type { ChartInterval, Instrument } from "../types/market.ts";

type NormalizeTradingViewDrawingParams = {
  rawDrawingId: string;
  instrument: Instrument;
  interval: ChartInterval | string;
  type: ChartDrawing["type"];
  points: DrawingPoint[];
  properties: DrawingProperties;
  source?: DrawingSource;
  label?: string;
  createdAt?: string;
};

export const normalizeTradingViewDrawing = ({
  rawDrawingId,
  instrument,
  interval,
  type,
  points,
  properties,
  source = "user",
  label,
  createdAt
}: NormalizeTradingViewDrawingParams): ChartDrawing => {
  const now = new Date().toISOString();

  return {
    id: rawDrawingId,
    instrumentId: instrument.id,
    exchange: instrument.exchange,
    marketType: instrument.marketType,
    symbol: instrument.symbol,
    interval,
    source,
    type,
    points,
    properties,
    role: "analysis",
    label,
    userModified: source === "user",
    createdAt: createdAt ?? now,
    updatedAt: now
  };
};
