import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  exchangeOptions,
  findInstrument,
  getExchangeMarketTypes,
  getInstruments,
  isExchangeProviderEnabled,
  marketTypeOptions
} from "./exchangeRegistry.ts";

describe("exchangeRegistry", () => {
  it("거래소와 시장 유형 선택지를 제공한다", () => {
    assert.deepEqual(
      exchangeOptions.map((option) => option.id),
      ["binance", "bybit", "okx", "upbit", "coinbase", "bitget"]
    );
    assert.deepEqual(
      marketTypeOptions.map((option) => option.id),
      ["spot", "linear_perp", "inverse_perp", "dated_future"]
    );
  });

  it("거래소별 지원 시장 유형을 조회한다", () => {
    assert.deepEqual(getExchangeMarketTypes("bybit"), ["spot", "linear_perp", "inverse_perp"]);
    assert.deepEqual(getExchangeMarketTypes("upbit"), ["spot"]);
    assert.deepEqual(getExchangeMarketTypes("bitget"), ["spot", "linear_perp"]);
  });

  it("구현되지 않은 provider를 disabled 상태로 표시한다", () => {
    assert.equal(isExchangeProviderEnabled("binance"), true);
    assert.equal(isExchangeProviderEnabled("bybit"), true);
    assert.equal(isExchangeProviderEnabled("okx"), true);
    assert.equal(isExchangeProviderEnabled("upbit"), true);
    assert.equal(isExchangeProviderEnabled("bitget"), false);
    assert.equal(exchangeOptions.find((option) => option.id === "bitget")?.isProviderEnabled, false);
  });

  it("거래소와 시장 유형으로 instrument 목록을 좁힌다", () => {
    const instruments = getInstruments({
      exchange: "binance",
      marketType: "linear_perp",
      query: "BTC"
    });

    assert.equal(instruments.length, 1);
    assert.equal(instruments[0]?.tradingViewTicker, "BINANCE:PERP:BTCUSDT");
  });

  it("id로 선택된 instrument를 찾는다", () => {
    const instrument = findInstrument("binance:spot:BTC/USDT");

    assert.equal(instrument?.exchange, "binance");
    assert.equal(instrument?.marketType, "spot");
    assert.equal(instrument?.displaySymbol, "BTC/USDT");
  });

  it("Bybit 선물과 OKX 현물 선택 대상 instrument를 제공한다", () => {
    const bybitPerp = getInstruments({
      exchange: "bybit",
      marketType: "linear_perp",
      query: "BTC"
    });
    const okxSpot = getInstruments({
      exchange: "okx",
      marketType: "spot",
      query: "ETH"
    });

    assert.equal(bybitPerp[0]?.id, "bybit:linear_perp:BTC/USDT:USDT");
    assert.equal(bybitPerp[0]?.tradingViewTicker, "BYBIT:PERP:BTCUSDT");
    assert.equal(okxSpot[0]?.id, "okx:spot:ETH/USDT");
    assert.equal(okxSpot[0]?.tradingViewTicker, "OKX:SPOT:ETHUSDT");
  });

  it("Upbit 현물과 OKX ETH 선물 선택 대상 instrument를 제공한다", () => {
    const upbitSpot = getInstruments({
      exchange: "upbit",
      marketType: "spot",
      query: "BTC"
    });
    const okxPerp = getInstruments({
      exchange: "okx",
      marketType: "linear_perp",
      query: "ETH"
    });

    assert.equal(upbitSpot[0]?.id, "upbit:spot:BTC/KRW");
    assert.equal(upbitSpot[0]?.tradingViewTicker, "UPBIT:SPOT:BTCKRW");
    assert.equal(okxPerp[0]?.id, "okx:linear_perp:ETH/USDT:USDT");
    assert.equal(okxPerp[0]?.tradingViewTicker, "OKX:PERP:ETHUSDT");
  });
});
