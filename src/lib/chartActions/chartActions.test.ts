import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { canApplyChartActionToChart, chartActionToDrawing } from "./chartActions.ts";
import type { ChartAction } from "../types/chartActions.ts";
import type { ChartState, Instrument } from "../types/market.ts";

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

const chartState: ChartState = {
  selectedExchange: "binance",
  selectedMarketType: "spot",
  selectedInstrument: binanceSpotInstrument,
  selectedInterval: "60",
  currentPrice: null,
  selectedDrawingId: null,
  selectedIndicators: []
};

const createAction = (override: Partial<ChartAction> = {}): ChartAction => ({
  id: "action-entry",
  instrumentId: "binance:spot:BTC/USDT",
  exchange: "binance",
  marketType: "spot",
  displaySymbol: "BTC/USDT",
  interval: "60",
  type: "drawEntryLine",
  scenarioId: "scenario-long",
  price: 100,
  reason: "진입 후보",
  createdAt: "2026-05-11T00:00:00.000Z",
  ...override
});

describe("chartActions", () => {
  it("instrumentId와 interval이 같은 chartAction만 현재 차트에 적용한다", () => {
    assert.equal(canApplyChartActionToChart(createAction(), chartState), true);
    assert.equal(
      canApplyChartActionToChart(
        createAction({
          instrumentId: bybitPerpInstrument.id,
          exchange: bybitPerpInstrument.exchange,
          marketType: bybitPerpInstrument.marketType,
          displaySymbol: bybitPerpInstrument.displaySymbol
        }),
        chartState
      ),
      false
    );
  });

  it("chartAction을 현재 instrumentId 기준 AI 도형으로 변환한다", () => {
    const drawing = chartActionToDrawing(createAction({ type: "drawStopLossLine", price: 95 }), binanceSpotInstrument);

    assert.equal(drawing.instrumentId, "binance:spot:BTC/USDT");
    assert.equal(drawing.exchange, "binance");
    assert.equal(drawing.marketType, "spot");
    assert.equal(drawing.symbol, "BTCUSDT");
    assert.equal(drawing.interval, "60");
    assert.equal(drawing.source, "ai");
    assert.equal(drawing.role, "stopLoss");
    assert.equal(drawing.points[0].price, 95);
  });
});
