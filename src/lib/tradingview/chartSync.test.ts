import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveInstrumentFromTicker, shouldSetChartSymbol } from "./chartSync.ts";
import type { Instrument } from "../types/market.ts";

const okxSpotEth: Instrument = {
  id: "okx:spot:ETH/USDT",
  exchange: "okx",
  marketType: "spot",
  base: "ETH",
  quote: "USDT",
  symbol: "ETH-USDT",
  displaySymbol: "ETH/USDT",
  tradingViewTicker: "OKX:SPOT:ETHUSDT",
  description: "OKX ETH/USDT 현물",
  priceScale: 100,
  minMove: 1,
  isActive: true
};

describe("chartSync", () => {
  it("TradingView ticker를 공통 instruments API로 복원한다", async () => {
    const requests: string[] = [];
    const fetcher = async (input: string | URL | Request) => {
      requests.push(String(input));

      return new Response(JSON.stringify([okxSpotEth]), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    };

    const instrument = await resolveInstrumentFromTicker("OKX:SPOT:ETHUSDT", fetcher);

    assert.equal(instrument?.id, "okx:spot:ETH/USDT");
    assert.deepEqual(requests, ["/api/markets/instruments?query=ETH%2FUSDT&exchange=okx&marketType=spot"]);
  });

  it("ticker에 맞는 instrument가 없으면 null을 반환한다", async () => {
    const fetcher = async () =>
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });

    const instrument = await resolveInstrumentFromTicker("OKX:SPOT:ETHUSDT", fetcher);

    assert.equal(instrument, null);
  });

  it("동일한 ticker는 TradingView setSymbol 호출 대상에서 제외한다", () => {
    assert.equal(shouldSetChartSymbol("OKX:SPOT:ETHUSDT", "OKX:SPOT:ETHUSDT"), false);
    assert.equal(shouldSetChartSymbol("BINANCE:SPOT:BTCUSDT", "BYBIT:PERP:BTCUSDT"), true);
  });
});
