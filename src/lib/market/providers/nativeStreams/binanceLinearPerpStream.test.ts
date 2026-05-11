import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createBinanceLinearPerpStreamProvider } from "./binanceLinearPerpStream.ts";
import type { Instrument } from "../../../types/market.ts";

const binanceLinearPerpInstrument: Instrument = {
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

class MockWebSocket {
  static instances: MockWebSocket[] = [];

  readonly url: string;
  onmessage: ((event: { data: string }) => void) | null = null;
  closed = false;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  close() {
    this.closed = true;
  }
}

describe("binanceLinearPerpStream", () => {
  it("Binance USDT 무기한 선물 kline stream URL을 만든다", async () => {
    MockWebSocket.instances = [];
    const provider = createBinanceLinearPerpStreamProvider({
      websocketFactory: (url) => new MockWebSocket(url)
    });

    const handle = await provider.subscribeOHLCV(
      { instrument: binanceLinearPerpInstrument, interval: "60" },
      () => undefined
    );

    assert.equal(provider.supports(binanceLinearPerpInstrument, "60"), true);
    assert.equal(MockWebSocket.instances[0]?.url, "wss://fstream.binance.com/ws/btcusdt@kline_1h");

    await provider.unsubscribeOHLCV(handle.id);
    assert.equal(MockWebSocket.instances[0]?.closed, true);
  });
});
