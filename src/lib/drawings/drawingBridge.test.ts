import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizeTradingViewDrawing } from "./drawingBridge.ts";
import type { Instrument } from "../types/market.ts";

const binanceSpotInstrument: Instrument = {
  id: "binance:spot:BTC/USDT",
  exchange: "binance",
  marketType: "spot",
  base: "BTC",
  quote: "USDT",
  symbol: "BTCUSDT",
  displaySymbol: "BTC/USDT",
  tradingViewTicker: "BINANCE:SPOT:BTCUSDT",
  description: "Binance BTC/USDT 현물",
  priceScale: 100,
  minMove: 1,
  isActive: true
};

const bybitPerpInstrument: Instrument = {
  ...binanceSpotInstrument,
  id: "bybit:linear_perp:BTC/USDT:USDT",
  exchange: "bybit",
  marketType: "linear_perp",
  settle: "USDT",
  displaySymbol: "BTC/USDT 무기한",
  tradingViewTicker: "BYBIT:PERP:BTCUSDT",
  description: "Bybit BTC/USDT USDT 무기한 선물"
};

describe("drawingBridge", () => {
  it("TradingView drawing을 현재 instrumentId와 interval 기준으로 정규화한다", () => {
    const drawing = normalizeTradingViewDrawing({
      rawDrawingId: "tv-line-1",
      instrument: bybitPerpInstrument,
      interval: "60",
      type: "trendline",
      points: [
        { time: 1710000000000, price: 100 },
        { time: 1710003600000, price: 110 }
      ],
      properties: { color: "green" },
      createdAt: "2026-05-11T00:00:00.000Z"
    });

    assert.equal(drawing.id, "tv-line-1");
    assert.equal(drawing.instrumentId, "bybit:linear_perp:BTC/USDT:USDT");
    assert.equal(drawing.exchange, "bybit");
    assert.equal(drawing.marketType, "linear_perp");
    assert.equal(drawing.symbol, "BTCUSDT");
    assert.equal(drawing.interval, "60");
    assert.equal(drawing.source, "user");
  });

  it("같은 BTCUSDT라도 instrument가 다르면 드로잉 scope가 분리된다", () => {
    const spotDrawing = normalizeTradingViewDrawing({
      rawDrawingId: "same-symbol",
      instrument: binanceSpotInstrument,
      interval: "60",
      type: "trendline",
      points: [],
      properties: {}
    });
    const perpDrawing = normalizeTradingViewDrawing({
      rawDrawingId: "same-symbol",
      instrument: bybitPerpInstrument,
      interval: "60",
      type: "trendline",
      points: [],
      properties: {}
    });

    assert.notEqual(spotDrawing.instrumentId, perpDrawing.instrumentId);
    assert.equal(spotDrawing.symbol, perpDrawing.symbol);
  });
});
