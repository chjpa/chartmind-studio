import type { ChartInterval, ExchangeId, MarketType } from "./market.ts";

export type DrawingSource = "user" | "engine" | "engine_modified_by_user" | "ai";

export type DrawingRole = "analysis" | "entry" | "stopLoss" | "takeProfit" | "scenario" | "note";

export type DrawingPoint = {
  time: number;
  price: number;
};

export type DrawingProperties = Record<string, string | number | boolean | null>;

export type ChartDrawing = {
  id: string;
  instrumentId: string;
  exchange: ExchangeId;
  marketType: MarketType;
  symbol: string;
  interval: ChartInterval | string;
  source: DrawingSource;
  type: "trendline" | "horizontalLine" | "priceZone" | "text";
  points: DrawingPoint[];
  properties: DrawingProperties;
  role: DrawingRole;
  label?: string;
  userModified: boolean;
  createdAt: string;
  updatedAt: string;
};
