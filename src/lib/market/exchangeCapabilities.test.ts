import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getInstrumentCapabilities,
  getSupportedIntervals,
  getUnsupportedIntervalMessage,
  isIntervalSupported
} from "./exchangeCapabilities.ts";
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

const upbitSpotInstrument: Instrument = {
  ...binanceSpotInstrument,
  id: "upbit:spot:BTC/KRW",
  exchange: "upbit",
  quote: "KRW",
  symbol: "BTCKRW",
  tradingViewTicker: "UPBIT:SPOT:BTCKRW"
};

const bybitLinearPerpInstrument: Instrument = {
  ...binanceSpotInstrument,
  id: "bybit:linear_perp:BTC/USDT:USDT",
  exchange: "bybit",
  marketType: "linear_perp",
  settle: "USDT",
  displaySymbol: "BTC/USDT 무기한",
  tradingViewTicker: "BYBIT:PERP:BTCUSDT"
};

const bitgetSpotInstrument: Instrument = {
  ...binanceSpotInstrument,
  id: "bitget:spot:BTC/USDT",
  exchange: "bitget",
  tradingViewTicker: "BITGET:SPOT:BTCUSDT"
};

const binanceInversePerpInstrument: Instrument = {
  ...binanceSpotInstrument,
  id: "binance:inverse_perp:BTC/USD:BTC",
  marketType: "inverse_perp",
  quote: "USD",
  settle: "BTC",
  symbol: "BTCUSD_PERP",
  displaySymbol: "BTC/USD 코인 무기한",
  tradingViewTicker: "BINANCE:PERP:BTCUSD"
};

describe("exchangeCapabilities", () => {
  it("거래소와 시장 유형별 지원 interval을 조회한다", () => {
    assert.deepEqual(getSupportedIntervals("binance", "spot"), ["1", "3", "5", "15", "30", "60", "240", "1D", "1W"]);
    assert.deepEqual(getSupportedIntervals("coinbase", "spot"), ["1", "5", "15", "60", "240", "1D"]);
  });

  it("instrument 기준으로 interval 지원 여부를 확인한다", () => {
    assert.equal(isIntervalSupported(binanceSpotInstrument, "3"), true);
    assert.equal(isIntervalSupported(upbitSpotInstrument, "1W"), false);
  });

  it("지원하지 않는 interval 오류 문구를 한국어로 만든다", () => {
    assert.equal(
      getUnsupportedIntervalMessage(upbitSpotInstrument, "1W"),
      "Upbit 현물은 1W interval을 지원하지 않습니다."
    );
  });

  it("instrument 기준 데이터 capability를 조회한다", () => {
    assert.deepEqual(getInstrumentCapabilities(binanceSpotInstrument), {
      historicalOHLCV: true,
      realtimeOHLCV: "websocket",
      orderbook: false,
      trades: false,
      fundingRate: false,
      openInterest: false,
      spot: true,
      linearPerp: false,
      inversePerp: false
    });

    assert.deepEqual(getInstrumentCapabilities(bybitLinearPerpInstrument), {
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

    assert.equal(getInstrumentCapabilities(bitgetSpotInstrument).historicalOHLCV, false);
    assert.equal(getInstrumentCapabilities(bitgetSpotInstrument).realtimeOHLCV, "unsupported");
    assert.equal(getInstrumentCapabilities(upbitSpotInstrument).historicalOHLCV, false);
    assert.equal(getInstrumentCapabilities(upbitSpotInstrument).realtimeOHLCV, "unsupported");
    assert.equal(getInstrumentCapabilities(binanceInversePerpInstrument).historicalOHLCV, false);
    assert.equal(getInstrumentCapabilities(binanceInversePerpInstrument).realtimeOHLCV, "unsupported");
  });
});
