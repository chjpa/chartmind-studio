import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { GET } from "./route.ts";

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

describe("/api/markets/ohlcv", () => {
  it("instrumentId로 candles를 반환한다", async () => {
    mockBinanceFetch();
    const instrumentId = encodeURIComponent("binance:spot:BTC/USDT");
    try {
      const response = await GET(
        new Request(`http://localhost/api/markets/ohlcv?instrumentId=${instrumentId}&interval=60&limit=9999`)
      );
      const body = await response.json();

      assert.equal(response.status, 200);
      assert.deepEqual(body, [
        {
          time: 1710000000000,
          open: 100,
          high: 110,
          low: 90,
          close: 105,
          volume: 12.5
        }
      ]);
    } finally {
      restoreFetch();
    }
  });

  it("현물과 선물 instrument에서 각각 과거 candles를 반환한다", async () => {
    mockBinanceFetch();
    try {
      const spotInstrumentId = encodeURIComponent("binance:spot:BTC/USDT");
      const perpInstrumentId = encodeURIComponent("binance:linear_perp:BTC/USDT:USDT");
      const spotResponse = await GET(
        new Request(`http://localhost/api/markets/ohlcv?instrumentId=${spotInstrumentId}&interval=60&limit=1`)
      );
      const perpResponse = await GET(
        new Request(`http://localhost/api/markets/ohlcv?instrumentId=${perpInstrumentId}&interval=60&limit=1`)
      );
      const spotBody = await spotResponse.json();
      const perpBody = await perpResponse.json();

      assert.equal(spotResponse.status, 200);
      assert.equal(perpResponse.status, 200);
      assert.equal(spotBody.length, 1);
      assert.equal(perpBody.length, 1);
    } finally {
      restoreFetch();
    }
  });

  it("잘못된 instrumentId를 한국어 오류로 거절한다", async () => {
    const response = await GET(
      new Request("http://localhost/api/markets/ohlcv?instrumentId=binance:spot:BAD/USDT")
    );
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error, "지원하지 않는 instrumentId입니다.");
  });

  it("instrumentId 누락을 한국어 오류로 거절한다", async () => {
    const response = await GET(new Request("http://localhost/api/markets/ohlcv"));
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error, "instrumentId가 필요합니다.");
  });
});
