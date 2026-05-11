import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createDrawingRepository } from "./drawingRepository.ts";
import type { ChartDrawing } from "../types/drawings.ts";

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

describe("drawingRepository", () => {
  it("instrumentId와 interval 기준으로 드로잉을 분리한다", () => {
    const repository = createDrawingRepository();
    const binanceSpotDrawing = createDrawing({ id: "spot-line" });
    const bybitPerpDrawing = createDrawing({
      id: "perp-line",
      instrumentId: "bybit:linear_perp:BTC/USDT:USDT",
      exchange: "bybit",
      marketType: "linear_perp",
      interval: "60",
      symbol: "BTCUSDT"
    });

    repository.save(binanceSpotDrawing);
    repository.save(bybitPerpDrawing);

    assert.deepEqual(repository.list("binance:spot:BTC/USDT", "60").map((drawing) => drawing.id), ["spot-line"]);
    assert.deepEqual(repository.list("bybit:linear_perp:BTC/USDT:USDT", "60").map((drawing) => drawing.id), ["perp-line"]);
  });

  it("같은 instrument라도 interval이 다르면 드로잉을 분리한다", () => {
    const repository = createDrawingRepository();
    repository.save(createDrawing({ id: "one-hour", interval: "60" }));
    repository.save(createDrawing({ id: "one-day", interval: "1D" }));

    assert.deepEqual(repository.list("binance:spot:BTC/USDT", "60").map((drawing) => drawing.id), ["one-hour"]);
    assert.deepEqual(repository.list("binance:spot:BTC/USDT", "1D").map((drawing) => drawing.id), ["one-day"]);
  });

  it("id 기준으로 드로잉을 삭제한다", () => {
    const repository = createDrawingRepository();
    repository.save(createDrawing({ id: "delete-me" }));

    assert.equal(repository.delete("delete-me"), true);
    assert.deepEqual(repository.list("binance:spot:BTC/USDT", "60"), []);
  });

  it("사용자가 자동 도형을 수정하면 source를 engine_modified_by_user로 바꾼다", () => {
    const repository = createDrawingRepository();
    repository.save(createDrawing({ id: "engine-line", source: "engine", userModified: false }));

    const savedDrawing = repository.save(
      createDrawing({
        id: "engine-line",
        source: "engine",
        userModified: true,
        points: [
          { time: 1710000000000, price: 101 },
          { time: 1710003600000, price: 111 }
        ]
      })
    );

    assert.equal(savedDrawing.source, "engine_modified_by_user");
    assert.equal(repository.list("binance:spot:BTC/USDT", "60")[0]?.source, "engine_modified_by_user");
  });

  it("재분석 시 같은 instrumentId와 interval의 순수 engine 도형만 교체한다", () => {
    const repository = createDrawingRepository();
    repository.save(createDrawing({ id: "old-engine", source: "engine", userModified: false }));
    repository.save(createDrawing({ id: "modified-engine", source: "engine_modified_by_user", userModified: true }));
    repository.save(createDrawing({
      id: "bybit-engine",
      instrumentId: "bybit:linear_perp:BTC/USDT:USDT",
      exchange: "bybit",
      marketType: "linear_perp",
      source: "engine",
      userModified: false
    }));

    repository.replaceEngineDrawings("binance:spot:BTC/USDT", "60", [
      createDrawing({ id: "new-engine", source: "engine", userModified: false })
    ]);

    assert.deepEqual(
      repository.list("binance:spot:BTC/USDT", "60").map((drawing) => drawing.id).sort(),
      ["modified-engine", "new-engine"]
    );
    assert.deepEqual(
      repository.list("bybit:linear_perp:BTC/USDT:USDT", "60").map((drawing) => drawing.id),
      ["bybit-engine"]
    );
  });
});
