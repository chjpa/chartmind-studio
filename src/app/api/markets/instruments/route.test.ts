import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { GET } from "./route.ts";

describe("/api/markets/instruments", () => {
  it("거래소와 시장 유형으로 instrument를 검색한다", async () => {
    const response = await GET(
      new Request("http://localhost/api/markets/instruments?exchange=binance&marketType=spot&query=BTC")
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.length, 1);
    assert.equal(body[0].id, "binance:spot:BTC/USDT");
  });

  it("지원하지 않는 marketType을 한국어 오류로 거절한다", async () => {
    const response = await GET(
      new Request("http://localhost/api/markets/instruments?exchange=upbit&marketType=linear_perp")
    );
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error, "해당 거래소에서 지원하지 않는 시장 유형입니다.");
  });
});
