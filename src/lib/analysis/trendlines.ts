import type { PricePivot, TrendlineCandidate } from "../types/analysis.ts";
import type { Candle } from "../types/market.ts";
import { detectPivots } from "./pivots.ts";

const createTrendline = (
  type: TrendlineCandidate["type"],
  pivots: PricePivot[]
): TrendlineCandidate | null => {
  if (pivots.length < 2) {
    return null;
  }

  const [firstPivot, secondPivot] = pivots;
  const timeDelta = secondPivot.time - firstPivot.time;
  const slope = timeDelta === 0 ? 0 : (secondPivot.price - firstPivot.price) / timeDelta;

  return {
    id: `${type}-${firstPivot.id}-${secondPivot.id}`,
    type,
    points: [
      { time: firstPivot.time, price: firstPivot.price },
      { time: secondPivot.time, price: secondPivot.price }
    ],
    slope,
    sourcePivotIds: [firstPivot.id, secondPivot.id]
  };
};

export const detectTrendlines = (candles: Candle[]): TrendlineCandidate[] => {
  const pivots = detectPivots(candles);

  return [
    createTrendline("resistance", pivots.filter((pivot) => pivot.type === "high")),
    createTrendline("support", pivots.filter((pivot) => pivot.type === "low"))
  ].filter((trendline): trendline is TrendlineCandidate => trendline !== null);
};
