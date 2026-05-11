import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildEngineDrawingsFromAnalysis } from "./engineDrawings.ts";
import type { AnalysisResult } from "../types/analysis.ts";

const analysisResult: AnalysisResult = {
  instrumentId: "binance:spot:BTC/USDT",
  exchange: "binance",
  marketType: "spot",
  displaySymbol: "BTC/USDT",
  interval: "60",
  currentPrice: 100,
  candleSummary: {
    latestClose: 100,
    high: 110,
    low: 90,
    candleCount: 100,
    trend: "up"
  },
  pivots: [],
  levels: [
    {
      id: "support-pivot-low-1",
      type: "support",
      price: 90,
      touches: 2,
      sourcePivotIds: ["pivot-low-1", "pivot-low-2"]
    }
  ],
  trendlines: [
    {
      id: "support-trendline-1",
      type: "support",
      points: [
        { time: 1710000000000, price: 90 },
        { time: 1710003600000, price: 95 }
      ],
      slope: 0.001,
      sourcePivotIds: ["pivot-low-1", "pivot-low-2"]
    }
  ],
  generatedAt: "2026-05-11T00:00:00.000Z"
};

describe("engineDrawings", () => {
  it("분석 결과를 instrumentId와 interval이 포함된 engine 도형으로 변환한다", () => {
    const drawings = buildEngineDrawingsFromAnalysis(analysisResult);

    assert.equal(drawings.length, 2);
    assert.deepEqual(
      drawings.map((drawing) => ({
        instrumentId: drawing.instrumentId,
        exchange: drawing.exchange,
        marketType: drawing.marketType,
        interval: drawing.interval,
        source: drawing.source,
        userModified: drawing.userModified
      })),
      [
        {
          instrumentId: "binance:spot:BTC/USDT",
          exchange: "binance",
          marketType: "spot",
          interval: "60",
          source: "engine",
          userModified: false
        },
        {
          instrumentId: "binance:spot:BTC/USDT",
          exchange: "binance",
          marketType: "spot",
          interval: "60",
          source: "engine",
          userModified: false
        }
      ]
    );
  });
});
