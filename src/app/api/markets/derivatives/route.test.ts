import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { GET } from "./route.ts";

describe("/api/markets/derivatives", () => {
  it("현물 instrument는 파생상품 context를 unavailable로 반환한다", async () => {
    const instrumentId = encodeURIComponent("binance:spot:BTC/USDT");
    const response = await GET(
      new Request(`http://localhost/api/markets/derivatives?instrumentId=${instrumentId}`)
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.status, "unavailable");
    assert.equal(body.data, null);
    assert.match(body.reason, /현물 시장/);
  });

  it("선물 instrument는 실제 데이터 연결이 없어도 지원 상태를 명확히 반환한다", async () => {
    const instrumentId = encodeURIComponent("bybit:linear_perp:BTC/USDT:USDT");
    const response = await GET(
      new Request(`http://localhost/api/markets/derivatives?instrumentId=${instrumentId}`)
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.status, "unavailable");
    assert.equal(body.data, null);
    assert.match(body.reason, /데이터 연결이 아직 구현되지 않았습니다/);
    assert.deepEqual(body.availableFields, []);
  });

  it("잘못된 instrumentId를 한국어 오류로 거절한다", async () => {
    const response = await GET(
      new Request("http://localhost/api/markets/derivatives?instrumentId=binance:spot:BAD/USDT")
    );
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error, "지원하지 않는 instrumentId입니다.");
  });

  it("instrumentId 누락을 한국어 오류로 거절한다", async () => {
    const response = await GET(new Request("http://localhost/api/markets/derivatives"));
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error, "instrumentId가 필요합니다.");
  });
});
