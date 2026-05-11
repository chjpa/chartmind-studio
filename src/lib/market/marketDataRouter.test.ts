import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MarketDataRouter } from "./marketDataRouter.ts";
import type { DerivativesDataProvider } from "./derivativesDataProvider.ts";
import type { MarketDataProvider } from "./marketDataProvider.ts";
import type { Candle, Instrument } from "../types/market.ts";

const instrument: Instrument = {
  id: "demo:spot:ETH/USDT",
  exchange: "demo",
  marketType: "spot",
  base: "ETH",
  quote: "USDT",
  symbol: "ETHUSDT",
  displaySymbol: "ETH/USDT",
  tradingViewTicker: "DEMO:SPOT:ETHUSDT",
  description: "ETHUSDT 현물",
  priceScale: 100,
  minMove: 1,
  isActive: true
};

const candles: Candle[] = [
  {
    time: 1710000000000,
    open: 2000,
    high: 2020,
    low: 1980,
    close: 2010,
    volume: 45
  }
];

const provider: MarketDataProvider = {
  id: "demo",
  name: "데모 거래소",
  supportedMarketTypes: ["spot"],
  async loadInstruments() {
    return [instrument];
  },
  async searchInstruments() {
    return [instrument];
  },
  async fetchOHLCV() {
    return candles;
  }
};

const linearPerpInstrument: Instrument = {
  id: "demo:linear_perp:BTC/USDT:USDT",
  exchange: "demo",
  marketType: "linear_perp",
  base: "BTC",
  quote: "USDT",
  settle: "USDT",
  symbol: "BTCUSDT",
  displaySymbol: "BTC/USDT 무기한",
  tradingViewTicker: "DEMO:PERP:BTCUSDT",
  description: "BTCUSDT USDT 무기한 선물",
  priceScale: 100,
  minMove: 1,
  isActive: true
};

describe("MarketDataRouter", () => {
  it("ticker로 instrument를 찾는다", async () => {
    const router = new MarketDataRouter([provider]);

    const result = await router.resolveInstrument("DEMO:SPOT:ETHUSDT");

    assert.deepEqual(result, instrument);
  });

  it("instrument의 exchange에 맞는 provider로 OHLCV를 요청한다", async () => {
    const router = new MarketDataRouter([provider]);

    const result = await router.fetchOHLCV({
      instrument,
      interval: "1h",
      from: 1710000000,
      to: 1710003600
    });

    assert.deepEqual(result, candles);
  });

  it("provider 예외를 공통 오류로 감싼다", async () => {
    const failingProvider: MarketDataProvider = {
      id: "demo",
      name: "데모 거래소",
      supportedMarketTypes: ["spot"],
      async loadInstruments() {
        return [instrument];
      },
      async searchInstruments() {
        return [instrument];
      },
      async fetchOHLCV() {
        throw new Error("exchange-specific failure");
      }
    };
    const router = new MarketDataRouter([failingProvider]);

    await assert.rejects(
      () =>
        router.fetchOHLCV({
          instrument,
          interval: "1h",
          from: 1710000000,
          to: 1710003600
        }),
      /캔들 데이터를 불러오지 못했습니다/
    );
  });

  it("provider가 한국어 오류를 제공하면 그대로 전달한다", async () => {
    const failingProvider: MarketDataProvider = {
      id: "demo",
      name: "데모 거래소",
      supportedMarketTypes: ["spot"],
      async loadInstruments() {
        return [instrument];
      },
      async searchInstruments() {
        return [instrument];
      },
      async fetchOHLCV() {
        throw new Error("Demo 캔들 데이터를 불러오지 못했습니다.");
      }
    };
    const router = new MarketDataRouter([failingProvider]);

    await assert.rejects(
      () =>
        router.fetchOHLCV({
          instrument,
          interval: "1h",
          from: 1710000000,
          to: 1710003600
        }),
      /Demo 캔들 데이터를 불러오지 못했습니다/
    );
  });

  it("같은 OHLCV 요청은 캐시된 Candle을 반환한다", async () => {
    let fetchCount = 0;
    const cachingProvider: MarketDataProvider = {
      id: "demo",
      name: "데모 거래소",
      supportedMarketTypes: ["spot"],
      async loadInstruments() {
        return [instrument];
      },
      async searchInstruments() {
        return [instrument];
      },
      async fetchOHLCV() {
        fetchCount += 1;
        return candles;
      }
    };
    const router = new MarketDataRouter([cachingProvider]);
    const params = {
      instrument,
      interval: "1h",
      from: 1710000000,
      to: 1710003600,
      limit: 100
    };

    assert.deepEqual(await router.fetchOHLCV(params), candles);
    assert.deepEqual(await router.fetchOHLCV(params), candles);
    assert.equal(fetchCount, 1);
  });

  it("현물 instrument는 파생상품 context를 unavailable로 반환한다", async () => {
    const router = new MarketDataRouter([provider]);

    const result = await router.fetchDerivativesContext(instrument);

    assert.equal(result.status, "unavailable");
    assert.equal(result.data, null);
    assert.match(result.reason ?? "", /현물 시장/);
    assert.deepEqual(result.availableFields, []);
    assert.deepEqual(result.unavailableFields, [
      "fundingRate",
      "nextFundingTime",
      "openInterest",
      "openInterestChange24h",
      "longShortRatio",
      "liquidationLevels"
    ]);
  });

  it("선물 instrument는 데이터 연결이 제공한 파생상품 필드만 available로 표시한다", async () => {
    const derivativesProvider: DerivativesDataProvider = {
      id: "demo-derivatives",
      supports(targetInstrument) {
        return targetInstrument.exchange === "demo" && targetInstrument.marketType === "linear_perp";
      },
      async fetchDerivativesContext() {
        return {
          fundingRate: 0.0001,
          openInterest: 12500
        };
      }
    };
    const router = new MarketDataRouter([provider], [derivativesProvider]);

    const result = await router.fetchDerivativesContext(linearPerpInstrument);

    assert.equal(result.status, "available");
    assert.deepEqual(result.data, {
      fundingRate: 0.0001,
      openInterest: 12500
    });
    assert.deepEqual(result.availableFields, ["fundingRate", "openInterest"]);
    assert.deepEqual(result.unavailableFields, [
      "nextFundingTime",
      "openInterestChange24h",
      "longShortRatio",
      "liquidationLevels"
    ]);
  });

  it("선물 provider가 없으면 값을 추측하지 않고 unavailable로 반환한다", async () => {
    const router = new MarketDataRouter([provider]);

    const result = await router.fetchDerivativesContext(linearPerpInstrument);

    assert.equal(result.status, "unavailable");
    assert.equal(result.data, null);
    assert.match(result.reason ?? "", /데이터 연결이 아직 구현되지 않았습니다/);
    assert.deepEqual(result.availableFields, []);
  });
});
