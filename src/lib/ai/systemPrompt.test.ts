import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createChartAnalysisSystemPrompt } from "./systemPrompt.ts";

describe("systemPrompt", () => {
  it("현물과 선물 차트를 혼동하지 않도록 지시한다", () => {
    const prompt = createChartAnalysisSystemPrompt();

    assert.match(prompt, /현재 차트가 현물인지 선물인지 명확히 언급/);
    assert.match(prompt, /현물 차트와 선물 차트를 혼동하지 않는다/);
    assert.match(prompt, /derivativesContext.status/);
    assert.match(prompt, /fundingRate, openInterest, longShortRatio, liquidationLevels/);
    assert.match(prompt, /chartContext.capabilities/);
    assert.match(prompt, /historicalOHLCV, realtimeOHLCV, fundingRate, openInterest/);
    assert.match(prompt, /제공되지 않은 데이터를 추측하지 않는다/);
    assert.match(prompt, /레버리지와 청산 리스크는 일반적인 주의사항/);
    assert.match(prompt, /같은 BTCUSDT라도 거래소와 시장 유형이 다르면 다른 차트/);
  });
});
