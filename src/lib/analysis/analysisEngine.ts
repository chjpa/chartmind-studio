import { createCandleSummary } from "./candleSummary.ts";
import { detectLevels } from "./levels.ts";
import { detectPivots } from "./pivots.ts";
import { detectTrendlines } from "./trendlines.ts";
import type { CandleAnalysisResult } from "../types/analysis.ts";
import type { Candle } from "../types/market.ts";

export const analyzeCandles = (candles: Candle[]): CandleAnalysisResult => {
  const candleSummary = createCandleSummary(candles);

  return {
    currentPrice: candleSummary?.latestClose ?? null,
    candleSummary,
    pivots: detectPivots(candles),
    levels: detectLevels(candles),
    trendlines: detectTrendlines(candles)
  };
};
