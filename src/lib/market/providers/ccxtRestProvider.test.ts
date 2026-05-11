import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createCcxtRestProvider } from "./ccxtRestProvider.ts";

describe("ccxtRestProvider", () => {
  it("CCXT market 정보를 Instrument로 정규화한다", async () => {
    const provider = createCcxtRestProvider({
      id: "demo",
      name: "Demo",
      supportedMarketTypes: ["spot", "linear_perp"],
      createClient: async () => ({
        async loadMarkets() {
          return {
            "BTC/USDT": {
              id: "BTCUSDT",
              symbol: "BTC/USDT",
              base: "BTC",
              quote: "USDT",
              spot: true,
              active: true,
              precision: { price: 2, amount: 8 }
            },
            "BTC/USDT:USDT": {
              id: "BTCUSDT",
              symbol: "BTC/USDT:USDT",
              base: "BTC",
              quote: "USDT",
              settle: "USDT",
              swap: true,
              linear: true,
              active: true,
              precision: { price: 2, amount: 8 }
            }
          };
        },
        async fetchOHLCV() {
          return [];
        }
      })
    });

    const instruments = await provider.loadInstruments("linear_perp");

    assert.equal(instruments.length, 1);
    assert.deepEqual(instruments[0], {
      id: "demo:linear_perp:BTC/USDT:USDT",
      exchange: "demo",
      marketType: "linear_perp",
      base: "BTC",
      quote: "USDT",
      settle: "USDT",
      symbol: "BTC/USDT:USDT",
      displaySymbol: "BTC/USDT 무기한",
      tradingViewTicker: "DEMO:PERP:BTCUSDT",
      description: "Demo BTC/USDT USDT 무기한 선물",
      priceScale: 100,
      minMove: 1,
      volumePrecision: 8,
      pricePrecision: 2,
      isActive: true
    });
  });

  it("fetchOHLCV 결과를 Candle 타입으로 정규화한다", async () => {
    const provider = createCcxtRestProvider({
      id: "demo",
      name: "Demo",
      supportedMarketTypes: ["spot"],
      createClient: async () => ({
        async loadMarkets() {
          return {};
        },
        async fetchOHLCV(symbol, timeframe, since, limit) {
          assert.equal(symbol, "BTC/USDT");
          assert.equal(timeframe, "1h");
          assert.equal(since, 1710000000000);
          assert.equal(limit, 2);

          return [
            [1710000000000, 100, 110, 90, 105, 12],
            [1710003600000, 105, 115, 95, 111, 20]
          ];
        }
      })
    });

    const candles = await provider.fetchOHLCV({
      instrument: {
        id: "demo:spot:BTC/USDT",
        exchange: "demo",
        marketType: "spot",
        base: "BTC",
        quote: "USDT",
        symbol: "BTC/USDT",
        displaySymbol: "BTC/USDT",
        tradingViewTicker: "DEMO:SPOT:BTCUSDT",
        description: "Demo BTC/USDT 현물",
        priceScale: 100,
        minMove: 1,
        isActive: true
      },
      interval: "60",
      from: 1710000000,
      to: 1710007200,
      limit: 2
    });

    assert.deepEqual(candles, [
      { time: 1710000000000, open: 100, high: 110, low: 90, close: 105, volume: 12 },
      { time: 1710003600000, open: 105, high: 115, low: 95, close: 111, volume: 20 }
    ]);
  });
});
