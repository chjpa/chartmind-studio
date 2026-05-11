import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createBinanceRestProvider } from "./binanceRestProvider.ts";
import type { Instrument } from "../../types/market.ts";

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

const linearPerpInstrument: Instrument = {
  ...spotInstrument,
  id: "binance:linear_perp:BTC/USDT:USDT",
  marketType: "linear_perp",
  settle: "USDT",
  displaySymbol: "BTC/USDT 무기한",
  tradingViewTicker: "BINANCE:PERP:BTCUSDT",
  description: "Binance BTC/USDT USDT 무기한 선물"
};

const createResponse = (body: unknown, ok = true): Response =>
  new Response(JSON.stringify(body), {
    status: ok ? 200 : 500,
    headers: { "content-type": "application/json" }
  });

describe("binanceRestProvider", () => {
  it("Binance spot kline REST 응답을 Candle로 정규화한다", async () => {
    const requestedUrls: string[] = [];
    const provider = createBinanceRestProvider({
      instruments: [spotInstrument, linearPerpInstrument],
      fetcher: async (input) => {
        requestedUrls.push(String(input));

        return createResponse([[1710000000000, "100", "110", "90", "105", "12.5"]]);
      }
    });

    const candles = await provider.fetchOHLCV({
      instrument: spotInstrument,
      interval: "60",
      from: 1710000000,
      to: 1710003600,
      limit: 10
    });

    assert.equal(requestedUrls.length, 1);
    assert.match(requestedUrls[0], /^https:\/\/api\.binance\.com\/api\/v3\/klines/);
    assert.match(requestedUrls[0], /symbol=BTCUSDT/);
    assert.match(requestedUrls[0], /interval=1h/);
    assert.match(requestedUrls[0], /startTime=1710000000000/);
    assert.deepEqual(candles, [
      {
        time: 1710000000000,
        open: 100,
        high: 110,
        low: 90,
        close: 105,
        volume: 12.5
      }
    ]);
  });

  it("Binance USDT 무기한 선물은 futures endpoint를 사용한다", async () => {
    const requestedUrls: string[] = [];
    const provider = createBinanceRestProvider({
      instruments: [spotInstrument, linearPerpInstrument],
      fetcher: async (input) => {
        requestedUrls.push(String(input));

        return createResponse([[1710000000000, "100", "110", "90", "105", "12.5"]]);
      }
    });

    await provider.fetchOHLCV({
      instrument: linearPerpInstrument,
      interval: "15",
      from: 1710000000,
      to: 1710003600,
      limit: 10
    });

    assert.match(requestedUrls[0], /^https:\/\/fapi\.binance\.com\/fapi\/v1\/klines/);
    assert.match(requestedUrls[0], /interval=15m/);
  });

  it("Binance REST 오류는 한국어 오류로 감싼다", async () => {
    const provider = createBinanceRestProvider({
      instruments: [spotInstrument],
      fetcher: async () => createResponse({ msg: "bad request" }, false)
    });

    await assert.rejects(
      () =>
        provider.fetchOHLCV({
          instrument: spotInstrument,
          interval: "60",
          from: 1710000000,
          to: 1710003600
        }),
      /Binance 캔들 데이터를 불러오지 못했습니다/
    );
  });
});
