import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createInitialChartState,
  createInitialMultiChartState,
  selectInstrument,
  selectInstrumentForPanel,
  setMultiChartLayout,
  updateChartPanelState,
  updateChartState
} from "./chartStore.ts";

describe("chartStore", () => {
  it("기본 차트 상태를 제공한다", () => {
    const state = createInitialChartState();

    assert.equal(state.selectedExchange, "binance");
    assert.equal(state.selectedMarketType, "spot");
    assert.equal(state.selectedInstrument.tradingViewTicker, "BINANCE:SPOT:BTCUSDT");
    assert.equal(state.selectedInstrument.displaySymbol, "BTC/USDT");
    assert.equal(state.selectedInterval, "60");
    assert.equal(state.currentPrice, null);
    assert.equal(state.selectedDrawingId, null);
    assert.deepEqual(state.selectedIndicators, []);
  });

  it("선택된 instrument와 interval을 갱신한다", () => {
    const state = updateChartState(createInitialChartState(), {
      selectedInstrument: {
        id: "demo:linear_perp:BTC/USDT:USDT",
        exchange: "demo",
        marketType: "linear_perp",
        base: "BTC",
        quote: "USDT",
        settle: "USDT",
        symbol: "BTCUSDT",
        displaySymbol: "BTC/USDT 무기한",
        tradingViewTicker: "DEMO:PERP:BTCUSDT",
        description: "BTCUSDT 무기한 선물",
        priceScale: 100,
        minMove: 1,
        isActive: true
      },
      selectedExchange: "demo",
      selectedMarketType: "linear_perp",
      selectedInterval: "240"
    });

    assert.equal(state.selectedInstrument.tradingViewTicker, "DEMO:PERP:BTCUSDT");
    assert.equal(state.selectedExchange, "demo");
    assert.equal(state.selectedMarketType, "linear_perp");
    assert.equal(state.selectedInterval, "240");
  });

  it("instrument 선택 시 거래소와 시장 유형도 함께 갱신한다", () => {
    const state = selectInstrument(createInitialChartState(), {
      id: "okx:linear_perp:BTC/USDT:USDT",
      exchange: "okx",
      marketType: "linear_perp",
      base: "BTC",
      quote: "USDT",
      settle: "USDT",
      symbol: "BTC-USDT-SWAP",
      displaySymbol: "BTC/USDT 무기한",
      tradingViewTicker: "OKX:PERP:BTCUSDT",
      description: "OKX BTC/USDT USDT 무기한 선물",
      priceScale: 100,
      minMove: 1,
      isActive: true
    });

    assert.equal(state.selectedExchange, "okx");
    assert.equal(state.selectedMarketType, "linear_perp");
    assert.equal(state.selectedInstrument.tradingViewTicker, "OKX:PERP:BTCUSDT");
  });

  it("멀티 차트 레이아웃을 1분할에서 4분할로 확장한다", () => {
    const state = setMultiChartLayout(createInitialMultiChartState(), "quad");

    assert.equal(state.layout, "quad");
    assert.equal(state.panels.length, 4);
    assert.equal(state.activeChartId, "chart-1");
    assert.equal(state.panels[3]?.selectedInstrument.id, "binance:spot:BTC/USDT");
  });

  it("같은 종목을 보는 차트끼리는 인터벌과 선택 도형, 지표를 동기화한다", () => {
    const multiState = setMultiChartLayout(createInitialMultiChartState(), "double");
    const nextState = updateChartPanelState(multiState, "chart-1", {
      selectedInterval: "240",
      selectedDrawingId: "drawing-1",
      selectedIndicators: ["volume", "rsi"]
    });

    assert.equal(nextState.panels[0]?.selectedInterval, "240");
    assert.equal(nextState.panels[1]?.selectedInterval, "240");
    assert.equal(nextState.panels[1]?.selectedDrawingId, "drawing-1");
    assert.deepEqual(nextState.panels[1]?.selectedIndicators, ["volume", "rsi"]);
  });

  it("다른 종목을 보는 차트는 인터벌과 작도 선택을 독립적으로 유지한다", () => {
    const multiState = setMultiChartLayout(createInitialMultiChartState(), "double");
    const bybitInstrument = {
      id: "bybit:linear_perp:BTC/USDT:USDT",
      exchange: "bybit",
      marketType: "linear_perp" as const,
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
    const separatedState = selectInstrumentForPanel(multiState, "chart-2", bybitInstrument);
    const nextState = updateChartPanelState(separatedState, "chart-1", {
      selectedInterval: "240",
      selectedDrawingId: "drawing-spot"
    });

    assert.equal(nextState.panels[0]?.selectedInterval, "240");
    assert.equal(nextState.panels[1]?.selectedInterval, "60");
    assert.equal(nextState.panels[1]?.selectedDrawingId, null);
    assert.equal(nextState.panels[1]?.selectedInstrument.id, "bybit:linear_perp:BTC/USDT:USDT");
  });
});
