import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { appBrand } from "./appBrand.ts";

describe("appBrand", () => {
  it("제품명과 한국어명, 설명 문구를 제공한다", () => {
    assert.equal(appBrand.name, "ChartMind Studio");
    assert.equal(appBrand.koreanName, "차트마인드 스튜디오");
    assert.match(appBrand.description, /AI 보조 트레이딩 차트 분석/);
  });
});
