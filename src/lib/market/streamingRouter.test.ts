import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createStreamingRouter, getPollingIntervalMs } from "./streamingRouter.ts";
import type { StreamingProvider } from "./streamingProvider.ts";
import type { Candle, Instrument } from "../types/market.ts";

const instrument: Instrument = {
  id: "demo:spot:BTC/USDT",
  exchange: "demo",
  marketType: "spot",
  base: "BTC",
  quote: "USDT",
  symbol: "BTCUSDT",
  displaySymbol: "BTC/USDT",
  tradingViewTicker: "DEMO:SPOT:BTCUSDT",
  description: "Demo BTC/USDT 현물",
  priceScale: 100,
  minMove: 1,
  isActive: true
};

const olderCandle: Candle = {
  time: 1710000000000,
  open: 100,
  high: 110,
  low: 90,
  close: 105,
  volume: 10
};

const latestCandle: Candle = {
  time: 1710003600000,
  open: 105,
  high: 115,
  low: 95,
  close: 111,
  volume: 12
};

const createJsonResponse = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" }
  });

describe("StreamingRouter", () => {
  it("지원 provider가 있으면 provider의 실시간 구독을 사용한다", async () => {
    const calls: string[] = [];
    const provider: StreamingProvider = {
      id: "demo-native",
      supports(targetInstrument, interval) {
        return targetInstrument.exchange === "demo" && interval === "60";
      },
      async subscribeOHLCV(params, callback) {
        calls.push(`subscribe:${params.instrument.id}:${params.interval}`);
        callback(latestCandle);

        return { id: "native-1" };
      },
      async unsubscribeOHLCV(subscriptionId) {
        calls.push(`unsubscribe:${subscriptionId}`);
      }
    };
    const router = createStreamingRouter({
      providers: [provider],
      fetcher: async () => createJsonResponse([])
    });
    const candles: Candle[] = [];

    const handle = await router.subscribeOHLCV({ instrument, interval: "60" }, (candle) => {
      candles.push(candle);
    });
    await router.unsubscribeOHLCV(handle.id);

    assert.equal(handle.id, "native-1");
    assert.deepEqual(calls, ["subscribe:demo:spot:BTC/USDT:60", "unsubscribe:native-1"]);
    assert.deepEqual(candles, [latestCandle]);
  });

  it("지원 provider가 없으면 polling fallback으로 최신 candle만 전달한다", async () => {
    const requests: string[] = [];
    const router = createStreamingRouter({
      providers: [],
      pollingIntervalMs: 60_000,
      fetcher: async (input) => {
        const url = input instanceof Request ? input.url : input.toString();
        const { pathname, searchParams } = new URL(url, "http://localhost");
        requests.push(`${pathname}?${searchParams.toString()}`);

        return createJsonResponse([olderCandle, latestCandle]);
      }
    });
    const candles: Candle[] = [];

    const handle = await router.subscribeOHLCV({ instrument, interval: "60" }, (candle) => {
      candles.push(candle);
    });
    await router.unsubscribeOHLCV(handle.id);

    assert.equal(handle.id.startsWith("polling:"), true);
    assert.deepEqual(requests, [
      "/api/markets/ohlcv?instrumentId=demo%3Aspot%3ABTC%2FUSDT&interval=60&limit=1"
    ]);
    assert.deepEqual(candles, [latestCandle]);
  });

  it("캔들 interval에 따라 polling 간격을 다르게 설정한다", () => {
    assert.equal(getPollingIntervalMs("1"), 5_000);
    assert.equal(getPollingIntervalMs("5"), 10_000);
    assert.equal(getPollingIntervalMs("60"), 10_000);
    assert.equal(getPollingIntervalMs("1D"), 60_000);
  });

  it("같은 instrument와 interval의 polling subscription은 fetchOHLCV 호출을 공유한다", async () => {
    let fetchCount = 0;
    const router = createStreamingRouter({
      providers: [],
      pollingDataSource: {
        async fetchOHLCV() {
          fetchCount += 1;
          return [latestCandle];
        }
      },
      pollingScheduler: {
        setInterval() {
          return "timer";
        },
        clearInterval() {
          return undefined;
        }
      }
    });
    const firstCandles: Candle[] = [];
    const secondCandles: Candle[] = [];

    const firstHandle = await router.subscribeOHLCV({ instrument, interval: "60" }, (candle) => {
      firstCandles.push(candle);
    });
    const secondHandle = await router.subscribeOHLCV({ instrument, interval: "60" }, (candle) => {
      secondCandles.push(candle);
    });

    assert.equal(fetchCount, 1);
    assert.deepEqual(firstCandles, [latestCandle]);
    assert.deepEqual(secondCandles, [latestCandle]);

    await router.unsubscribeOHLCV(firstHandle.id);
    assert.equal(fetchCount, 1);
    await router.unsubscribeOHLCV(secondHandle.id);
  });

  it("rate limit 오류가 발생하면 polling 간격을 늘리고 callback 오류로 전파하지 않는다", async () => {
    const scheduledDelays: number[] = [];
    let intervalCallback: (() => void) | undefined;
    let fetchCount = 0;
    const router = createStreamingRouter({
      providers: [],
      pollingDataSource: {
        async fetchOHLCV() {
          fetchCount += 1;

          if (fetchCount === 1) {
            const error = new Error("rate limit");
            Object.assign(error, { status: 429 });
            throw error;
          }

          return [latestCandle];
        }
      },
      pollingScheduler: {
        setInterval(callback, delayMs) {
          intervalCallback = callback;
          scheduledDelays.push(delayMs);
          return `timer-${scheduledDelays.length}`;
        },
        clearInterval() {
          return undefined;
        }
      }
    });
    const candles: Candle[] = [];

    const handle = await router.subscribeOHLCV({ instrument, interval: "1" }, (candle) => {
      candles.push(candle);
    });

    assert.deepEqual(candles, []);
    assert.deepEqual(scheduledDelays, [5_000, 10_000]);

    if (!intervalCallback) {
      assert.fail("polling interval callback이 등록되어야 합니다.");
    }

    intervalCallback();
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.deepEqual(candles, [latestCandle]);
    await router.unsubscribeOHLCV(handle.id);
  });
});
