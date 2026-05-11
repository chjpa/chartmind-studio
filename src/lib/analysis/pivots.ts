import type { PricePivot, PivotType } from "../types/analysis.ts";
import type { Candle } from "../types/market.ts";

const createPivotId = (type: PivotType, candle: Candle) => `pivot-${type}-${candle.time}`;

export const detectPivots = (candles: Candle[]): PricePivot[] => {
  const pivots: PricePivot[] = [];

  for (let index = 1; index < candles.length - 1; index += 1) {
    const previous = candles[index - 1];
    const current = candles[index];
    const next = candles[index + 1];

    if (current.high > previous.high && current.high > next.high) {
      pivots.push({
        id: createPivotId("high", current),
        type: "high",
        time: current.time,
        price: current.high,
        candleIndex: index
      });
    }

    if (current.low < previous.low && current.low < next.low) {
      pivots.push({
        id: createPivotId("low", current),
        type: "low",
        time: current.time,
        price: current.low,
        candleIndex: index
      });
    }
  }

  return pivots.sort((left, right) => left.time - right.time);
};
