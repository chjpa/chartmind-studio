import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { MarketConnectionStatusItem } from "../../../../../lib/connections/connectionTypes.ts";
import { GET } from "./route.ts";

const findExchange = (exchanges: MarketConnectionStatusItem[], id: string) => {
  const exchange = exchanges.find((item) => item.id === id);

  assert.ok(exchange, `${id} 연결 상태가 응답에 포함되어야 합니다.`);

  return exchange;
};

describe("/api/connections/market/status", () => {
  it("거래소별 시세 연결 상태를 반환한다", async () => {
    const response = await GET();
    const body = (await response.json()) as { exchanges: MarketConnectionStatusItem[] };

    assert.equal(response.status, 200);
    assert.ok(Array.isArray(body.exchanges));

    const binance = findExchange(body.exchanges, "binance");
    assert.equal(binance.enabled, true);
    assert.equal(binance.historicalOHLCV, true);
    assert.equal(binance.realtimeOHLCV, "websocket");
    assert.deepEqual(binance.supportedMarketTypes, ["spot", "linear_perp", "inverse_perp", "dated_future"]);

    const coinbase = findExchange(body.exchanges, "coinbase");
    assert.equal(coinbase.enabled, false);
    assert.equal(coinbase.historicalOHLCV, false);
    assert.equal(coinbase.realtimeOHLCV, "unsupported");
    assert.deepEqual(coinbase.supportedMarketTypes, ["spot"]);
    assert.match(coinbase.message, /시세 연결이 아직 구현되지 않았습니다/);

    const bybit = findExchange(body.exchanges, "bybit");
    assert.equal(bybit.enabled, true);
    assert.equal(bybit.historicalOHLCV, false);
    assert.match(bybit.message, /과거 캔들 시세 연결이 준비 중/);
  });
});
