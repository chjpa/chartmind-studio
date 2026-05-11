import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { DELETE, GET, POST } from "./route.ts";
import { drawingRepository } from "../../../lib/drawings/drawingRepository.ts";
import type { ChartDrawing } from "../../../lib/types/drawings.ts";

const createDrawing = (override: Partial<ChartDrawing>): ChartDrawing => ({
  id: "drawing-1",
  instrumentId: "binance:spot:BTC/USDT",
  exchange: "binance",
  marketType: "spot",
  symbol: "BTCUSDT",
  interval: "60",
  source: "user",
  type: "trendline",
  points: [
    { time: 1710000000000, price: 100 },
    { time: 1710003600000, price: 110 }
  ],
  properties: {},
  role: "analysis",
  label: "사용자 추세선",
  userModified: true,
  createdAt: "2026-05-11T00:00:00.000Z",
  updatedAt: "2026-05-11T00:00:00.000Z",
  ...override
});

const createJsonRequest = (body: unknown) =>
  new Request("http://localhost/api/drawings", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" }
  });

describe("/api/drawings", () => {
  beforeEach(() => {
    drawingRepository.clear();
  });

  it("POST 후 instrumentId와 interval 기준으로 조회한다", async () => {
    const spotDrawing = createDrawing({ id: "spot-line" });
    const perpDrawing = createDrawing({
      id: "perp-line",
      instrumentId: "bybit:linear_perp:BTC/USDT:USDT",
      exchange: "bybit",
      marketType: "linear_perp",
      symbol: "BTCUSDT"
    });

    assert.equal((await POST(createJsonRequest(spotDrawing))).status, 201);
    assert.equal((await POST(createJsonRequest(perpDrawing))).status, 201);

    const response = await GET(
      new Request("http://localhost/api/drawings?instrumentId=binance:spot:BTC/USDT&interval=60")
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(body.map((drawing: ChartDrawing) => drawing.id), ["spot-line"]);
  });

  it("instrumentId 또는 interval이 없으면 한국어 오류를 반환한다", async () => {
    const response = await GET(new Request("http://localhost/api/drawings?instrumentId=binance:spot:BTC/USDT"));
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error, "instrumentId와 interval이 필요합니다.");
  });

  it("instrumentId와 exchange, marketType, symbol이 맞지 않으면 저장하지 않는다", async () => {
    const response = await POST(
      createJsonRequest(
        createDrawing({
          instrumentId: "binance:spot:BTC/USDT",
          exchange: "bybit",
          marketType: "linear_perp",
          symbol: "BTCUSDT"
        })
      )
    );
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error, "instrumentId와 드로잉 metadata가 일치하지 않습니다.");
    assert.deepEqual(drawingRepository.list("binance:spot:BTC/USDT", "60"), []);
  });

  it("DELETE는 id 기준으로 삭제한다", async () => {
    await POST(createJsonRequest(createDrawing({ id: "delete-me" })));

    const response = await DELETE(new Request("http://localhost/api/drawings?id=delete-me"));
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(body, { deleted: true });
    assert.deepEqual(drawingRepository.list("binance:spot:BTC/USDT", "60"), []);
  });
});
