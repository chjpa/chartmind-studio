import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createTradingViewDatafeed } from "./datafeed.ts";
import type { Candle, Instrument } from "../types/market.ts";
import type { TradingViewConfiguration, TradingViewSymbolInfo } from "./types.ts";

const spotInstrument: Instrument = {
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
  volumePrecision: 8,
  pricePrecision: 2,
  isActive: true
};

const perpInstrument: Instrument = {
  id: "demo:linear_perp:BTC/USDT:USDT",
  exchange: "demo",
  marketType: "linear_perp",
  base: "BTC",
  quote: "USDT",
  settle: "USDT",
  symbol: "BTCUSDT",
  displaySymbol: "BTC/USDT 무기한",
  tradingViewTicker: "DEMO:PERP:BTCUSDT",
  description: "Demo BTC/USDT USDT 무기한 선물",
  priceScale: 100,
  minMove: 1,
  volumePrecision: 8,
  pricePrecision: 2,
  isActive: true
};

const candles: Candle[] = [
  {
    time: 1710003600000,
    open: 105,
    high: 115,
    low: 95,
    close: 111,
    volume: 20
  },
  {
    time: 1710000000000,
    open: 100,
    high: 110,
    low: 90,
    close: 105,
    volume: 12
  }
];

const createJsonResponse = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" }
  });

const createFetch = (requests: string[] = []) =>
  async (input: string | URL | Request) => {
    const url = input instanceof Request ? input.url : input.toString();
    const { pathname, searchParams } = new URL(url, "http://localhost");
    requests.push(`${pathname}?${searchParams.toString()}`);

    if (pathname === "/api/markets/instruments") {
      const marketType = searchParams.get("marketType");

      if (marketType === "spot") {
        return createJsonResponse([spotInstrument]);
      }

      if (marketType === "linear_perp") {
        return createJsonResponse([perpInstrument]);
      }

      return createJsonResponse([spotInstrument, perpInstrument]);
    }

    if (pathname === "/api/markets/ohlcv") {
      return createJsonResponse(candles);
    }

    return new Response(JSON.stringify({ error: "알 수 없는 API입니다." }), { status: 404 });
  };

describe("datafeed", () => {
  it("TradingView Datafeed 기본 메서드를 제공한다", () => {
    const datafeed = createTradingViewDatafeed({ fetcher: createFetch() });

    assert.equal(typeof datafeed.onReady, "function");
    assert.equal(typeof datafeed.searchSymbols, "function");
    assert.equal(typeof datafeed.resolveSymbol, "function");
    assert.equal(typeof datafeed.getBars, "function");
    assert.equal(typeof datafeed.subscribeBars, "function");
    assert.equal(typeof datafeed.unsubscribeBars, "function");
  });

  it("onReady는 enabled exchange와 지원 resolution을 반환한다", async () => {
    const datafeed = createTradingViewDatafeed({ fetcher: createFetch() });
    const configuration = await new Promise<TradingViewConfiguration>((resolve) => {
      datafeed.onReady(resolve);
    });

    assert.equal(configuration.exchanges.some((exchange) => exchange.value === "binance"), true);
    assert.equal(configuration.exchanges.some((exchange) => exchange.value === "bybit"), true);
    assert.equal(configuration.exchanges.some((exchange) => exchange.value === "okx"), true);
    assert.equal(configuration.exchanges.some((exchange) => exchange.value === "upbit"), true);
    assert.deepEqual(configuration.supported_resolutions, ["1", "3", "5", "15", "30", "60", "240", "1D", "1W"]);
    assert.deepEqual(configuration.symbols_types, [
      { name: "암호화폐", value: "crypto" },
      { name: "현물", value: "spot" },
      { name: "선물", value: "futures" }
    ]);
  });

  it("searchSymbols는 공통 instruments API를 호출하고 현물/선물을 구분한다", async () => {
    const requests: string[] = [];
    const datafeed = createTradingViewDatafeed({ fetcher: createFetch(requests) });
    const results = await new Promise((resolve) => {
      datafeed.searchSymbols("BTC", "demo", "futures", resolve);
    });

    assert.deepEqual(requests, ["/api/markets/instruments?query=BTC&exchange=demo&marketType=linear_perp"]);
    assert.deepEqual(results, [
      {
        symbol: "BTC/USDT 무기한",
        full_name: "DEMO:PERP:BTCUSDT",
        description: "Demo BTC/USDT USDT 무기한 선물",
        exchange: "demo",
        ticker: "DEMO:PERP:BTCUSDT",
        type: "crypto"
      }
    ]);
  });

  it("resolveSymbol은 ticker를 instrumentId로 복원하고 symbolInfo를 만든다", async () => {
    const requests: string[] = [];
    const datafeed = createTradingViewDatafeed({ fetcher: createFetch(requests) });
    const symbolInfo = await new Promise<TradingViewSymbolInfo>((resolve, reject) => {
      datafeed.resolveSymbol("DEMO:PERP:BTCUSDT", resolve, reject);
    });

    assert.equal(requests[0], "/api/markets/instruments?query=BTC%2FUSDT&exchange=demo&marketType=linear_perp");
    assert.deepEqual(symbolInfo, {
      name: "BTC/USDT 무기한",
      ticker: "DEMO:PERP:BTCUSDT",
      description: "BTC/USDT:USDT · Demo · USDT 무기한 선물",
      type: "crypto",
      session: "24x7",
      timezone: "Etc/UTC",
      exchange: "demo",
      listed_exchange: "demo",
      minmov: 1,
      pricescale: 100,
      has_intraday: true,
      has_daily: true,
      supported_resolutions: ["1", "3", "5", "15", "30", "60", "240", "1D", "1W"],
      volume_precision: 8,
      data_status: "streaming"
    });
  });

  it("getBars는 공통 OHLCV API를 호출하고 시간 오름차순 bar를 반환한다", async () => {
    const requests: string[] = [];
    const datafeed = createTradingViewDatafeed({ fetcher: createFetch(requests) });
    const result = await new Promise((resolve, reject) => {
      datafeed.getBars(
        {
          name: "BTC/USDT 무기한",
          ticker: "DEMO:PERP:BTCUSDT",
          description: "Demo BTC/USDT USDT 무기한 선물",
          type: "crypto",
          session: "24x7",
          timezone: "Etc/UTC",
          exchange: "demo",
          listed_exchange: "demo",
          minmov: 1,
          pricescale: 100,
          has_intraday: true,
          has_daily: true,
          supported_resolutions: ["1", "5", "15", "60", "240", "1D"],
          volume_precision: 8,
          data_status: "streaming"
        },
        "60",
        { from: 1710000000, to: 1710007200, firstDataRequest: true, countBack: 2 },
        (bars, metadata) => resolve({ bars, metadata }),
        reject
      );
    });

    assert.equal(
      requests[0],
      "/api/markets/ohlcv?instrumentId=demo%3Alinear_perp%3ABTC%2FUSDT%3AUSDT&interval=60&from=1710000000&to=1710007200&limit=2"
    );
    assert.deepEqual(result, {
      bars: [
        { time: 1710000000000, open: 100, high: 110, low: 90, close: 105, volume: 12 },
        { time: 1710003600000, open: 105, high: 115, low: 95, close: 111, volume: 20 }
      ],
      metadata: { noData: false }
    });
  });

  it("지원하지 않는 interval 요청은 한국어 오류로 거절한다", async () => {
    const datafeed = createTradingViewDatafeed({ fetcher: createFetch() });
    const error = await new Promise((resolve) => {
      datafeed.getBars(
        {
          name: "BTC/USDT 무기한",
          ticker: "DEMO:PERP:BTCUSDT",
          description: "Demo BTC/USDT USDT 무기한 선물",
          type: "crypto",
          session: "24x7",
          timezone: "Etc/UTC",
          exchange: "demo",
          listed_exchange: "demo",
          minmov: 1,
          pricescale: 100,
          has_intraday: true,
          has_daily: true,
          supported_resolutions: ["1", "3", "5", "15", "30", "60", "240", "1D", "1W"],
          volume_precision: 8,
          data_status: "streaming"
        },
        "2" as never,
        { from: 1710000000, to: 1710007200, firstDataRequest: true, countBack: 2 },
        () => undefined,
        resolve
      );
    });

    assert.equal(error, "Demo USDT/USDC 무기한 선물은 2 interval을 지원하지 않습니다.");
  });

  it("subscribeBars는 streamingRouter를 통해 실시간 candle을 bar로 변환한다", async () => {
    const unsubscribedIds: string[] = [];
    const datafeed = createTradingViewDatafeed({
      fetcher: createFetch(),
      streamingRouter: {
        async subscribeOHLCV(params, callback) {
          assert.equal(params.instrument.id, "demo:linear_perp:BTC/USDT:USDT");
          assert.equal(params.interval, "60");
          callback({
            time: 1710007200000,
            open: 111,
            high: 120,
            low: 108,
            close: 118,
            volume: 30
          });

          return { id: "stream-1" };
        },
        async unsubscribeOHLCV(subscriptionId) {
          unsubscribedIds.push(subscriptionId);
        }
      }
    });
    const bar = await new Promise((resolve) => {
      datafeed.subscribeBars(
        {
          name: "BTC/USDT 무기한",
          ticker: "DEMO:PERP:BTCUSDT",
          description: "Demo BTC/USDT USDT 무기한 선물",
          type: "crypto",
          session: "24x7",
          timezone: "Etc/UTC",
          exchange: "demo",
          listed_exchange: "demo",
          minmov: 1,
          pricescale: 100,
          has_intraday: true,
          has_daily: true,
          supported_resolutions: ["1", "3", "5", "15", "30", "60", "240", "1D", "1W"],
          volume_precision: 8,
          data_status: "streaming"
        },
        "60",
        resolve,
        "subscriber-1",
        () => undefined
      );
    });

    datafeed.unsubscribeBars("subscriber-1");

    assert.deepEqual(bar, {
      time: 1710007200000,
      open: 111,
      high: 120,
      low: 108,
      close: 118,
      volume: 30
    });
    assert.deepEqual(unsubscribedIds, ["stream-1"]);
  });
});
