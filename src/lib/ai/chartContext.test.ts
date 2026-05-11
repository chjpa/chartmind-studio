import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildChartContext } from "./chartContext.ts";
import type { ChartState, Instrument } from "../types/market.ts";
import type { ChartDrawing } from "../types/drawings.ts";

const bybitPerpInstrument: Instrument = {
  id: "bybit:linear_perp:BTC/USDT:USDT",
  exchange: "bybit",
  marketType: "linear_perp",
  base: "BTC",
  quote: "USDT",
  settle: "USDT",
  symbol: "BTCUSDT",
  displaySymbol: "BTC/USDT 무기한",
  tradingViewTicker: "BYBIT:PERP:BTCUSDT",
  description: "Bybit BTC/USDT USDT 무기한 선물",
  priceScale: 100,
  minMove: 1,
  isActive: true
};

const chartState: ChartState = {
  selectedExchange: "bybit",
  selectedMarketType: "linear_perp",
  selectedInstrument: bybitPerpInstrument,
  selectedInterval: "60",
  currentPrice: 102000,
  selectedDrawingId: "user-line",
  selectedIndicators: []
};

const createDrawing = (override: Partial<ChartDrawing>): ChartDrawing => ({
  id: "user-line",
  instrumentId: bybitPerpInstrument.id,
  exchange: bybitPerpInstrument.exchange,
  marketType: bybitPerpInstrument.marketType,
  symbol: bybitPerpInstrument.symbol,
  interval: "60",
  source: "user",
  type: "trendline",
  points: [
    { time: 1710000000000, price: 100000 },
    { time: 1710003600000, price: 101000 }
  ],
  properties: {},
  role: "analysis",
  label: "사용자 추세선",
  userModified: true,
  createdAt: "2026-05-11T00:00:00.000Z",
  updatedAt: "2026-05-11T00:00:00.000Z",
  ...override
});

describe("chartContext", () => {
  it("AI chartContext에 현재 instrument 식별자를 반드시 포함한다", () => {
    const userDrawing = createDrawing({});
    const engineDrawing = createDrawing({
      id: "engine-line",
      source: "engine",
      label: "엔진 추세선",
      userModified: false
    });
    const context = buildChartContext({
      chartState,
      candleSummary: {
        latestClose: 102000,
        high: 103000,
        low: 99000,
        candleCount: 120,
        trend: "up"
      },
      drawings: [userDrawing, engineDrawing]
    });

    assert.equal(context.instrumentId, "bybit:linear_perp:BTC/USDT:USDT");
    assert.equal(context.exchange, "bybit");
    assert.equal(context.marketType, "linear_perp");
    assert.equal(context.displaySymbol, "BTC/USDT 무기한");
    assert.equal(context.interval, "60");
    assert.equal(context.currentPrice, 102000);
    assert.equal(context.userDrawings.length, 1);
    assert.equal(context.engineDrawings.length, 1);
    assert.equal(context.selectedDrawingId, "user-line");
    assert.equal(context.selectedDrawing?.id, "user-line");
    assert.deepEqual(context.capabilities, {
      historicalOHLCV: false,
      realtimeOHLCV: "unsupported",
      orderbook: false,
      trades: false,
      fundingRate: false,
      openInterest: false,
      spot: false,
      linearPerp: true,
      inversePerp: false
    });
    assert.deepEqual(context.availableMarketInfo, {
      instrumentIdentity: "BTC/USDT:USDT · Bybit · USDT 무기한 선물",
      base: "BTC",
      quote: "USDT",
      settle: "USDT",
      isDerivative: true,
      supportedIntervals: ["1", "3", "5", "15", "30", "60", "240", "1D", "1W"],
      unavailableDerivativeData: [
        "fundingRate",
        "nextFundingTime",
        "openInterest",
        "openInterestChange24h",
        "longShortRatio",
        "liquidationLevels"
      ]
    });
    assert.deepEqual(context.derivativesContext, {
      status: "unavailable",
      data: null,
      availableFields: [],
      unavailableFields: [
        "fundingRate",
        "nextFundingTime",
        "openInterest",
        "openInterestChange24h",
        "longShortRatio",
        "liquidationLevels"
      ],
      reason: "파생상품 데이터 연결이 아직 연결되지 않았습니다."
    });
  });

  it("전달받은 파생상품 context의 available/unavailable 상태를 AI context에 포함한다", () => {
    const context = buildChartContext({
      chartState,
      candleSummary: null,
      derivativesContext: {
        status: "available",
        data: {
          fundingRate: 0.0001,
          openInterest: 12500
        },
        availableFields: ["fundingRate", "openInterest"],
        unavailableFields: [
          "nextFundingTime",
          "openInterestChange24h",
          "longShortRatio",
          "liquidationLevels"
        ]
      }
    });

    assert.deepEqual(context.derivativesContext, {
      status: "available",
      data: {
        fundingRate: 0.0001,
        openInterest: 12500
      },
      availableFields: ["fundingRate", "openInterest"],
      unavailableFields: [
        "nextFundingTime",
        "openInterestChange24h",
        "longShortRatio",
        "liquidationLevels"
      ]
    });
    assert.deepEqual(context.availableMarketInfo.unavailableDerivativeData, [
      "nextFundingTime",
      "openInterestChange24h",
      "longShortRatio",
      "liquidationLevels"
    ]);
  });

  it("다른 거래소 또는 시장 유형의 drawing은 현재 chartContext에서 제외한다", () => {
    const binanceSpotDrawing = createDrawing({
      id: "wrong-market",
      instrumentId: "binance:spot:BTC/USDT",
      exchange: "binance",
      marketType: "spot"
    });
    const context = buildChartContext({
      chartState,
      candleSummary: null,
      drawings: [binanceSpotDrawing]
    });

    assert.deepEqual(context.userDrawings, []);
    assert.equal(context.selectedDrawing, null);
  });
});
