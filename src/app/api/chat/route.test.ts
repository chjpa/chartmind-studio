import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { POST } from "./route.ts";
import type { ChatRequestPayload } from "../../../lib/types/ai.ts";
import type { ChartDrawing } from "../../../lib/types/drawings.ts";

const createDrawing = (override: Partial<ChartDrawing>): ChartDrawing => ({
  id: "drawing-1",
  instrumentId: "bybit:linear_perp:BTC/USDT:USDT",
  exchange: "bybit",
  marketType: "linear_perp",
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
  label: "선택 추세선",
  userModified: true,
  createdAt: "2026-05-11T00:00:00.000Z",
  updatedAt: "2026-05-11T00:00:00.000Z",
  ...override
});

const createPayload = (override: Partial<ChatRequestPayload> = {}): ChatRequestPayload => ({
  userMessage: "이 차트 기준으로 설명해줘",
  instrumentId: "bybit:linear_perp:BTC/USDT:USDT",
  exchange: "bybit",
  marketType: "linear_perp",
  displaySymbol: "BTC/USDT 무기한",
  interval: "60",
  currentPrice: 102000,
  selectedDrawingId: "drawing-1",
  drawings: [createDrawing({})],
  candleSummary: {
    latestClose: 102000,
    high: 103000,
    low: 99000,
    candleCount: 120,
    trend: "up"
  },
  capabilities: {
    historicalOHLCV: true,
    realtimeOHLCV: "polling",
    orderbook: false,
    trades: false,
    fundingRate: false,
    openInterest: false,
    spot: false,
    linearPerp: true,
    inversePerp: false
  },
  analysisResult: null,
  derivativesContext: {
    status: "unavailable",
    data: null,
    availableFields: [],
    unavailableFields: ["fundingRate", "openInterest", "longShortRatio", "liquidationLevels"],
    reason: "파생상품 데이터 연결이 아직 구현되지 않았습니다."
  },
  ...override
});

const createJsonRequest = (body: unknown) =>
  new Request("http://localhost/api/chat", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" }
  });

describe("/api/chat", () => {
  it("instrumentId 중심 payload로 선물 차트를 구분해 답변한다", async () => {
    const response = await POST(createJsonRequest(createPayload()));
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.instrumentId, "bybit:linear_perp:BTC/USDT:USDT");
    assert.equal(body.exchange, "bybit");
    assert.equal(body.marketType, "linear_perp");
    assert.equal(body.selectedDrawing?.id, "drawing-1");
    assert.equal(body.selectedDrawing?.instrumentId, "bybit:linear_perp:BTC/USDT:USDT");
    assert.match(body.assistantMessage, /Bybit/);
    assert.match(body.assistantMessage, /선물 기준/);
    assert.match(body.assistantMessage, /실시간: 주기적 갱신/);
    assert.match(body.assistantMessage, /레버리지와 청산 리스크/);
    assert.match(body.assistantMessage, /제공되지 않은 파생상품 수치는 추측하지 않습니다/);
  });

  it("현물 차트는 현물 기준으로 답하고 선물 표현을 섞지 않는다", async () => {
    const response = await POST(
      createJsonRequest(
        createPayload({
          instrumentId: "binance:spot:BTC/USDT",
          exchange: "binance",
          marketType: "spot",
          displaySymbol: "BTC/USDT",
          selectedDrawingId: null,
          drawings: [],
          capabilities: {
            historicalOHLCV: true,
            realtimeOHLCV: "websocket",
            orderbook: false,
            trades: false,
            fundingRate: false,
            openInterest: false,
            spot: true,
            linearPerp: false,
            inversePerp: false
          },
          derivativesContext: undefined
        })
      )
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.instrumentId, "binance:spot:BTC/USDT");
    assert.equal(body.marketType, "spot");
    assert.match(body.assistantMessage, /Binance/);
    assert.match(body.assistantMessage, /현물 기준/);
    assert.doesNotMatch(body.assistantMessage, /선물 기준/);
  });

  it("selectedDrawingId는 같은 instrumentId와 interval의 drawing에만 연결한다", async () => {
    const response = await POST(
      createJsonRequest(
        createPayload({
          drawings: [
            createDrawing({
              id: "wrong-instrument",
              instrumentId: "binance:spot:BTC/USDT",
              exchange: "binance",
              marketType: "spot"
            })
          ],
          selectedDrawingId: "wrong-instrument"
        })
      )
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.selectedDrawingId, "wrong-instrument");
    assert.equal(body.selectedDrawing, null);
    assert.match(body.assistantMessage, /선택된 도형은 현재 차트와 연결되지 않았습니다/);
  });

  it("instrumentId와 exchange, marketType, displaySymbol이 맞지 않으면 거절한다", async () => {
    const response = await POST(
      createJsonRequest(
        createPayload({
          instrumentId: "binance:spot:BTC/USDT",
          exchange: "bybit",
          marketType: "linear_perp",
          displaySymbol: "BTC/USDT 무기한"
        })
      )
    );
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error, "instrumentId와 chart metadata가 일치하지 않습니다.");
  });

  it("instrumentId가 없으면 한국어 오류로 거절한다", async () => {
    const response = await POST(createJsonRequest({ userMessage: "안녕" }));
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error, "instrumentId가 필요합니다.");
  });

  it("selectedDrawingId 형식이 맞지 않으면 한국어 오류로 거절한다", async () => {
    const response = await POST(
      createJsonRequest(
        createPayload({
          selectedDrawingId: 123 as unknown as string
        })
      )
    );
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error, "selectedDrawingId 형식이 올바르지 않습니다.");
  });

  it("currentPrice 형식이 맞지 않으면 한국어 오류로 거절한다", async () => {
    const response = await POST(
      createJsonRequest(
        createPayload({
          currentPrice: "102000" as unknown as number
        })
      )
    );
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error, "currentPrice 형식이 올바르지 않습니다.");
  });

  it("AI 연결 설정이 없어도 기존 deterministic 응답을 유지한다", async () => {
    const response = await POST(createJsonRequest(createPayload()));
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.instrumentId, "bybit:linear_perp:BTC/USDT:USDT");
    assert.match(body.assistantMessage, /거래소와 현물\/선물 구분은 현재 차트 기준/);
    assert.match(body.assistantMessage, /분석은 전달된 candleSummary/);
  });

  it("OpenAI 연결 설정이 있으면 샘플 응답 대신 설정된 AI 연결을 사용한다", async () => {
    const originalProvider = process.env.LLM_PROVIDER;
    const originalOpenAiKey = process.env.OPENAI_API_KEY;
    process.env.LLM_PROVIDER = "openai";
    process.env.OPENAI_API_KEY = "test-key";

    try {
      const response = await POST(createJsonRequest(createPayload()));
      const body = await response.json();

      assert.equal(response.status, 200);
      assert.equal(body.instrumentId, "bybit:linear_perp:BTC/USDT:USDT");
      assert.match(body.assistantMessage, /OpenAI 연결 설정이 감지되었습니다/);
      assert.doesNotMatch(body.assistantMessage, /거래소와 현물\/선물 구분은 현재 차트 기준/);
    } finally {
      if (originalProvider === undefined) {
        delete process.env.LLM_PROVIDER;
      } else {
        process.env.LLM_PROVIDER = originalProvider;
      }

      if (originalOpenAiKey === undefined) {
        delete process.env.OPENAI_API_KEY;
      } else {
        process.env.OPENAI_API_KEY = originalOpenAiKey;
      }
    }
  });
});
