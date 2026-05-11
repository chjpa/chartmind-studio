import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { POST } from "./route.ts";

const originalFetch = globalThis.fetch;

const mockBinanceFetch = () => {
  globalThis.fetch = async () =>
    new Response(JSON.stringify([[1710000000000, "100", "110", "90", "105", "12.5"]]), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
};

const restoreFetch = () => {
  globalThis.fetch = originalFetch;
};

describe("/api/analyze", () => {
  it("instrumentId 기준으로 분석 결과를 반환한다", async () => {
    mockBinanceFetch();
    try {
      const response = await POST(
        new Request("http://localhost/api/analyze", {
          method: "POST",
          body: JSON.stringify({
            instrumentId: "binance:spot:BTC/USDT",
            interval: "60"
          })
        })
      );
      const body = await response.json();

      assert.equal(response.status, 200);
      assert.equal(body.instrumentId, "binance:spot:BTC/USDT");
      assert.equal(body.exchange, "binance");
      assert.equal(body.marketType, "spot");
      assert.equal(body.displaySymbol, "BTC/USDT");
      assert.equal(body.interval, "60");
      assert.equal(body.currentPrice, 105);
      assert.deepEqual(body.pivots, []);
      assert.deepEqual(body.levels, []);
      assert.deepEqual(body.trendlines, []);
      assert.equal(typeof body.generatedAt, "string");
    } finally {
      restoreFetch();
    }
  });

  it("같은 BTCUSDT라도 거래소와 시장 유형별 결과를 분리한다", async () => {
    const response = await POST(
      new Request("http://localhost/api/analyze", {
        method: "POST",
        body: JSON.stringify({
          instrumentId: "bybit:linear_perp:BTC/USDT:USDT",
          interval: "60",
          lookback: 100
        })
      })
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.instrumentId, "bybit:linear_perp:BTC/USDT:USDT");
    assert.equal(body.exchange, "bybit");
    assert.equal(body.marketType, "linear_perp");
    assert.equal(body.displaySymbol, "BTC/USDT 무기한");
  });

  it("instrumentId 누락을 한국어 오류로 거절한다", async () => {
    const response = await POST(
      new Request("http://localhost/api/analyze", {
        method: "POST",
        body: JSON.stringify({ interval: "60" })
      })
    );
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error, "instrumentId가 필요합니다.");
  });

  it("지원하지 않는 instrumentId를 한국어 오류로 거절한다", async () => {
    const response = await POST(
      new Request("http://localhost/api/analyze", {
        method: "POST",
        body: JSON.stringify({
          instrumentId: "binance:spot:BAD/USDT",
          interval: "60"
        })
      })
    );
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error, "지원하지 않는 instrumentId입니다.");
  });
});
