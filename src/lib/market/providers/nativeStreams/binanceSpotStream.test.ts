import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createBinanceSpotStreamProvider } from "./binanceSpotStream.ts";
import type { Instrument } from "../../../types/market.ts";

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

class MockWebSocket {
  static instances: MockWebSocket[] = [];

  readonly url: string;
  onmessage: ((event: { data: string }) => void) | null = null;
  closed = false;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  emitKline(payload: unknown) {
    this.onmessage?.({ data: JSON.stringify(payload) });
  }

  close() {
    this.closed = true;
  }
}

const createKlinePayload = (time: number, close: string) => ({
  e: "kline",
  E: time + 100,
  s: "BTCUSDT",
  k: {
    t: time,
    T: time + 59_999,
    s: "BTCUSDT",
    i: "1m",
    o: "100.0",
    c: close,
    h: "120.0",
    l: "90.0",
    v: "12.5",
    x: false
  }
});

describe("binanceSpotStream", () => {
  it("Binance spot instrument와 지원 interval만 처리한다", () => {
    const provider = createBinanceSpotStreamProvider({
      websocketFactory: (url) => new MockWebSocket(url)
    });

    assert.equal(provider.supports(binanceSpotInstrument, "1"), true);
    assert.equal(provider.supports(binanceSpotInstrument, "3"), true);
    assert.equal(provider.supports(binanceSpotInstrument, "30"), true);
    assert.equal(provider.supports(binanceSpotInstrument, "60"), true);
    assert.equal(provider.supports(binanceSpotInstrument, "1W"), true);
    assert.equal(provider.supports({ ...binanceSpotInstrument, marketType: "linear_perp" }, "60"), false);
    assert.equal(provider.supports({ ...binanceSpotInstrument, exchange: "okx" }, "60"), false);
    assert.equal(provider.supports(binanceSpotInstrument, "2"), false);
  });

  it("거래소 WebSocket 심볼과 interval로 kline stream URL을 만든다", async () => {
    MockWebSocket.instances = [];
    const provider = createBinanceSpotStreamProvider({
      websocketFactory: (url) => new MockWebSocket(url)
    });

    const handle = await provider.subscribeOHLCV({ instrument: binanceSpotInstrument, interval: "1" }, () => undefined);

    assert.equal(MockWebSocket.instances[0]?.url, "wss://stream.binance.com:9443/ws/btcusdt@kline_1m");

    await provider.unsubscribeOHLCV(handle.id);
  });

  it("같은 instrument와 interval subscriber는 WebSocket 연결을 재사용하고 마지막 subscriber 해제 시 닫는다", async () => {
    MockWebSocket.instances = [];
    const provider = createBinanceSpotStreamProvider({
      websocketFactory: (url) => new MockWebSocket(url)
    });
    const firstCandles: number[] = [];
    const secondCandles: number[] = [];

    const firstHandle = await provider.subscribeOHLCV({ instrument: binanceSpotInstrument, interval: "1" }, (candle) => {
      firstCandles.push(candle.close);
    });
    const secondHandle = await provider.subscribeOHLCV({ instrument: binanceSpotInstrument, interval: "1" }, (candle) => {
      secondCandles.push(candle.close);
    });
    const socket = MockWebSocket.instances[0];

    assert.equal(MockWebSocket.instances.length, 1);
    socket?.emitKline(createKlinePayload(1710000000000, "101.0"));
    socket?.emitKline(createKlinePayload(1710000000000, "102.0"));
    socket?.emitKline(createKlinePayload(1709999940000, "99.0"));
    socket?.emitKline(createKlinePayload(1710000060000, "103.0"));

    await provider.unsubscribeOHLCV(firstHandle.id);
    assert.equal(socket?.closed, false);
    await provider.unsubscribeOHLCV(secondHandle.id);

    assert.deepEqual(firstCandles, [101, 102, 103]);
    assert.deepEqual(secondCandles, [101, 102, 103]);
    assert.equal(socket?.closed, true);
  });
});
