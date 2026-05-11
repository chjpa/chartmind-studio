import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  internalIntervals,
  normalizeInternalInterval,
  toCcxtTimeframe,
  toExchangeTimeframe,
  toSinceTimestamp
} from "./timeframeMapper.ts";

describe("timeframeMapper", () => {
  it("내부 interval 목록을 제공한다", () => {
    assert.deepEqual(internalIntervals, ["1", "3", "5", "15", "30", "60", "240", "1D", "1W"]);
  });

  it("기존 UI interval 문자열을 내부 interval로 정규화한다", () => {
    assert.equal(normalizeInternalInterval("1m"), "1");
    assert.equal(normalizeInternalInterval("1h"), "60");
    assert.equal(normalizeInternalInterval("4h"), "240");
    assert.equal(normalizeInternalInterval("1D"), "1D");
  });

  it("앱 interval을 CCXT timeframe으로 변환한다", () => {
    assert.equal(toCcxtTimeframe("1"), "1m");
    assert.equal(toCcxtTimeframe("3"), "3m");
    assert.equal(toCcxtTimeframe("5"), "5m");
    assert.equal(toCcxtTimeframe("15"), "15m");
    assert.equal(toCcxtTimeframe("30"), "30m");
    assert.equal(toCcxtTimeframe("60"), "1h");
    assert.equal(toCcxtTimeframe("240"), "4h");
    assert.equal(toCcxtTimeframe("1D"), "1d");
    assert.equal(toCcxtTimeframe("1W"), "1w");
  });

  it("거래소 native interval로 변환한다", () => {
    assert.equal(toExchangeTimeframe("binance", "spot", "1D"), "1d");
    assert.equal(toExchangeTimeframe("binance", "linear_perp", "60"), "1h");
  });

  it("초 단위 from 값을 CCXT since 밀리초로 변환한다", () => {
    assert.equal(toSinceTimestamp(1710000000), 1710000000000);
    assert.equal(toSinceTimestamp(1710000000000), 1710000000000);
  });
});
