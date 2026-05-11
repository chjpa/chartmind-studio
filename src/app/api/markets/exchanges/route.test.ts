import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { GET } from "./route.ts";

describe("/api/markets/exchanges", () => {
  it("거래소 목록을 반환한다", async () => {
    const response = await GET();
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(body[0], {
      id: "binance",
      name: "Binance",
      supportedMarketTypes: ["spot", "linear_perp", "inverse_perp", "dated_future"],
      enabled: true
    });
    assert.equal(body.some((exchange: { id: string }) => exchange.id === "bybit"), true);
  });
});
