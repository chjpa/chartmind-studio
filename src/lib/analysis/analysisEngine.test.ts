import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { analyzeCandles } from "./analysisEngine.ts";
import { createCandleSummary } from "./candleSummary.ts";
import { detectLevels } from "./levels.ts";
import { detectPivots } from "./pivots.ts";
import { detectTrendlines } from "./trendlines.ts";
import type { Candle } from "../types/market.ts";

const candles: Candle[] = [
  { time: 1, open: 10, high: 10, low: 8, close: 10, volume: 1 },
  { time: 2, open: 10, high: 13, low: 9, close: 12, volume: 1 },
  { time: 3, open: 12, high: 12, low: 7, close: 11, volume: 1 },
  { time: 4, open: 11, high: 14, low: 8, close: 13, volume: 1 },
  { time: 5, open: 13, high: 11, low: 6, close: 10, volume: 1 },
  { time: 6, open: 10, high: 15, low: 7, close: 14, volume: 1 },
  { time: 7, open: 14, high: 14, low: 5, close: 15, volume: 1 }
];

describe("analysisEngine", () => {
  it("Candle[]만 받아 캔들 요약을 계산한다", () => {
    const result = analyzeCandles(candles);

    assert.equal(result.currentPrice, 15);
    assert.deepEqual(result.candleSummary, {
      latestClose: 15,
      high: 15,
      low: 5,
      candleCount: 7,
      trend: "up"
    });
  });

  it("개별 분석 함수는 Candle[]과 옵션만 받는다", () => {
    const candleSummary = createCandleSummary(candles);
    const pivots = detectPivots(candles);
    const levels = detectLevels(candles);
    const trendlines = detectTrendlines(candles);

    assert.deepEqual(
      pivots.map((pivot) => ({ type: pivot.type, time: pivot.time, price: pivot.price })),
      [
        { type: "high", time: 2, price: 13 },
        { type: "low", time: 3, price: 7 },
        { type: "high", time: 4, price: 14 },
        { type: "low", time: 5, price: 6 },
        { type: "high", time: 6, price: 15 }
      ]
    );
    assert.equal(candleSummary?.latestClose, 15);
    assert.equal(levels.some((level) => level.type === "support" && level.price === 6.5), true);
    assert.equal(levels.some((level) => level.type === "resistance" && level.price === 14), true);
    assert.equal(trendlines.length, 2);
    assert.deepEqual(trendlines.map((trendline) => trendline.type), ["resistance", "support"]);
  });
});
