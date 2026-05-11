import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Instrument } from "../types/market.ts";
import {
  formatDisplaySymbol,
  formatInstrumentBadgeLabel,
  formatInstrumentIdentity,
  formatMarketTypeLabel,
  instrumentToSymbolInfo,
  instrumentToTradingViewSymbol,
  normalizeExchangeSymbol,
  parseTradingViewTicker,
  tradingViewSymbolToInstrumentId
} from "./symbolMapper.ts";

const spotInstrument: Instrument = {
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

const perpInstrument: Instrument = {
  id: "binance:linear_perp:BTC/USDT:USDT",
  exchange: "binance",
  marketType: "linear_perp",
  base: "BTC",
  quote: "USDT",
  settle: "USDT",
  symbol: "BTCUSDT",
  displaySymbol: "BTC/USDT 무기한",
  tradingViewTicker: "BINANCE:PERP:BTCUSDT",
  description: "Binance BTC/USDT USDT 무기한 선물",
  priceScale: 100,
  minMove: 1,
  isActive: true
};

const inversePerpInstrument: Instrument = {
  id: "binance:inverse_perp:BTC/USD:BTC",
  exchange: "binance",
  marketType: "inverse_perp",
  base: "BTC",
  quote: "USD",
  settle: "BTC",
  symbol: "BTCUSD_PERP",
  displaySymbol: "BTC/USD 코인 무기한",
  tradingViewTicker: "BINANCE:PERP:BTCUSD",
  description: "Binance BTC/USD 코인 무기한 선물",
  priceScale: 100,
  minMove: 1,
  isActive: true
};

describe("symbolMapper", () => {
  it("현물과 무기한 선물에 서로 다른 TradingView ticker를 만든다", () => {
    assert.equal(instrumentToTradingViewSymbol(spotInstrument), "BINANCE:SPOT:BTCUSDT");
    assert.equal(instrumentToTradingViewSymbol(perpInstrument), "BINANCE:PERP:BTCUSDT");
    assert.notEqual(instrumentToTradingViewSymbol(spotInstrument), instrumentToTradingViewSymbol(perpInstrument));
  });

  it("TradingView ticker에서 내부 instrument id를 복원한다", () => {
    assert.equal(tradingViewSymbolToInstrumentId("BINANCE:SPOT:BTCUSDT"), "binance:spot:BTC/USDT");
    assert.equal(
      tradingViewSymbolToInstrumentId("BINANCE:PERP:BTCUSDT"),
      "binance:linear_perp:BTC/USDT:USDT"
    );
    assert.equal(tradingViewSymbolToInstrumentId("UPBIT:SPOT:BTCKRW"), "upbit:spot:BTC/KRW");
  });

  it("ticker를 exchange, marketType, base, quote, settle로 파싱한다", () => {
    assert.deepEqual(parseTradingViewTicker("BYBIT:PERP:BTCUSDT"), {
      exchange: "bybit",
      marketType: "linear_perp",
      base: "BTC",
      quote: "USDT",
      settle: "USDT"
    });
    assert.deepEqual(parseTradingViewTicker("BINANCE:PERP:BTCUSD"), {
      exchange: "binance",
      marketType: "inverse_perp",
      base: "BTC",
      quote: "USD",
      settle: "BTC"
    });
  });

  it("거래소 원본 심볼을 TradingView ticker용 BASEQUOTE로 정규화한다", () => {
    assert.equal(normalizeExchangeSymbol("BTC-USDT-SWAP", "okx", "linear_perp"), "BTCUSDT");
    assert.equal(normalizeExchangeSymbol("btc/krw", "upbit", "spot"), "BTCKRW");
    assert.equal(normalizeExchangeSymbol("BTCUSD_PERP", "binance", "inverse_perp"), "BTCUSD");
  });

  it("화면 표시용 심볼과 내부 id를 분리한다", () => {
    assert.equal(formatDisplaySymbol(spotInstrument), "BTC/USDT");
    assert.equal(formatDisplaySymbol(perpInstrument), "BTC/USDT 무기한");
  });

  it("차트 상단과 TradingView description에 쓸 instrument 정체성을 만든다", () => {
    assert.equal(formatMarketTypeLabel(spotInstrument), "현물");
    assert.equal(formatMarketTypeLabel(perpInstrument), "USDT 무기한 선물");
    assert.equal(formatMarketTypeLabel(inversePerpInstrument), "코인 무기한 선물");
    assert.equal(formatInstrumentBadgeLabel(spotInstrument), "현물");
    assert.equal(formatInstrumentBadgeLabel(perpInstrument), "선물");
    assert.equal(formatInstrumentIdentity(spotInstrument), "BTC/USDT · Binance · 현물");
    assert.equal(formatInstrumentIdentity(perpInstrument), "BTC/USDT:USDT · Binance · USDT 무기한 선물");
    assert.equal(formatInstrumentIdentity(inversePerpInstrument), "BTC/USD:BTC · Binance · 코인 무기한 선물");
  });

  it("TradingView symbol description에 거래소와 시장 유형을 포함한다", () => {
    assert.equal(instrumentToSymbolInfo(spotInstrument).description, "BTC/USDT · Binance · 현물");
    assert.equal(
      instrumentToSymbolInfo(perpInstrument).description,
      "BTC/USDT:USDT · Binance · USDT 무기한 선물"
    );
  });
});
