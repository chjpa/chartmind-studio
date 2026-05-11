import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createProviderRegistry } from "./providerRegistry.ts";
import { createStaticMarketDataProvider } from "./providers/baseProvider.ts";
import type { Instrument } from "../types/market.ts";

const instruments: Instrument[] = [
  {
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
  }
];

describe("providerRegistry", () => {
  it("구현된 provider만 등록하고 조회한다", () => {
    const provider = createStaticMarketDataProvider({
      id: "demo",
      name: "Demo",
      supportedMarketTypes: ["spot"],
      instruments
    });
    const registry = createProviderRegistry([provider]);

    assert.equal(registry.hasProvider("demo"), true);
    assert.equal(registry.hasProvider("missing"), false);
    assert.deepEqual(registry.getProviders(), [provider]);
  });

  it("같은 거래소 provider 중복 등록을 막는다", () => {
    const provider = createStaticMarketDataProvider({
      id: "demo",
      name: "Demo",
      supportedMarketTypes: ["spot"],
      instruments
    });

    assert.throws(
      () => createProviderRegistry([provider, provider]),
      /이미 등록된 거래소 provider입니다/
    );
  });

  it("등록된 provider로 MarketDataRouter를 만든다", async () => {
    const provider = createStaticMarketDataProvider({
      id: "demo",
      name: "Demo",
      supportedMarketTypes: ["spot"],
      instruments
    });
    const registry = createProviderRegistry([provider]);
    const router = registry.createRouter();

    const result = await router.resolveInstrument("DEMO:SPOT:BTCUSDT");

    assert.equal(result.id, "demo:spot:BTC/USDT");
  });
});
