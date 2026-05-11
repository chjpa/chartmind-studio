import type { PriceLevel, PricePivot } from "../types/analysis.ts";
import type { Candle } from "../types/market.ts";
import { detectPivots } from "./pivots.ts";

const average = (values: number[]) =>
  values.reduce((sum, value) => sum + value, 0) / values.length;

const createLevel = (type: PriceLevel["type"], pivots: PricePivot[]): PriceLevel | null => {
  if (pivots.length === 0) {
    return null;
  }

  return {
    id: `${type}-${pivots.map((pivot) => pivot.id).join("-")}`,
    type,
    price: average(pivots.map((pivot) => pivot.price)),
    touches: pivots.length,
    sourcePivotIds: pivots.map((pivot) => pivot.id)
  };
};

export const detectLevels = (candles: Candle[]): PriceLevel[] => {
  const pivots = detectPivots(candles);

  return [
    createLevel("support", pivots.filter((pivot) => pivot.type === "low")),
    createLevel("resistance", pivots.filter((pivot) => pivot.type === "high"))
  ].filter((level): level is PriceLevel => level !== null);
};
