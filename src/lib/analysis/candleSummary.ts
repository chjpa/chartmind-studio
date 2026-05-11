import type { CandleSummary } from "../types/ai.ts";
import type { Candle } from "../types/market.ts";

export const createCandleSummary = (candles: Candle[]): CandleSummary => {
  if (candles.length === 0) {
    return null;
  }

  const firstCandle = candles[0];
  const lastCandle = candles[candles.length - 1];
  const high = Math.max(...candles.map((candle) => candle.high));
  const low = Math.min(...candles.map((candle) => candle.low));
  const closeDelta = lastCandle.close - firstCandle.close;
  const trend = closeDelta > 0 ? "up" : closeDelta < 0 ? "down" : "sideways";

  return {
    latestClose: lastCandle.close,
    high,
    low,
    candleCount: candles.length,
    trend
  };
};
