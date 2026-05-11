import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createNativeProvider } from "./nativeProvider.ts";
import type { Candle, Instrument } from "../../types/market.ts";

const instrument: Instrument = {
  id: "native:spot:BTC/KRW",
  exchange: "native",
  marketType: "spot",
  base: "BTC",
  quote: "KRW",
  symbol: "KRW-BTC",
  displaySymbol: "BTC/KRW",
  tradingViewTicker: "NATIVE:SPOT:BTCKRW",
  description: "Native BTC/KRW 현물",
  priceScale: 1,
  minMove: 1,
  isActive: true
};

const candles: Candle[] = [
  { time: 1710000000000, open: 1, high: 2, low: 1, close: 2, volume: 3 }
];

describe("nativeProvider", () => {
  it("거래소별 native adapter를 MarketDataProvider로 감싼다", async () => {
    const provider = createNativeProvider({
      id: "native",
      name: "Native",
      supportedMarketTypes: ["spot"],
      async loadInstruments() {
        return [instrument];
      },
      async fetchOHLCV() {
        return candles;
      }
    });

    assert.deepEqual(await provider.loadInstruments("spot"), [instrument]);
    assert.deepEqual(
      await provider.fetchOHLCV({ instrument, interval: "1h", from: 1710000000, to: 1710003600 }),
      candles
    );
  });
});
