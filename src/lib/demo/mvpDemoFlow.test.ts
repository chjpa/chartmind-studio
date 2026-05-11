import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { POST as chatPost } from "../../app/api/chat/route.ts";
import { buildChartContext } from "../ai/chartContext.ts";
import { canApplyChartActionToChart, chartActionToDrawing } from "../chartActions/chartActions.ts";
import { createDrawingRepository } from "../drawings/drawingRepository.ts";
import { normalizeTradingViewDrawing } from "../drawings/drawingBridge.ts";
import { findInstrument } from "../market/exchangeRegistry.ts";
import { mvpDemoAcceptanceCriteria, mvpDemoFlow } from "./mvpDemo.ts";
import type { ChatRequestPayload } from "../types/ai.ts";
import type { ChartAction } from "../types/chartActions.ts";
import type { ChartState, Instrument } from "../types/market.ts";

const createChartState = (instrument: Instrument, selectedDrawingId: string | null): ChartState => ({
  selectedExchange: instrument.exchange,
  selectedMarketType: instrument.marketType,
  selectedInstrument: instrument,
  selectedInterval: "60",
  currentPrice: 100,
  selectedDrawingId,
  selectedIndicators: []
});

const createJsonRequest = (body: unknown) =>
  new Request("http://localhost/api/chat", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" }
  });

const createChatPayload = (context: ReturnType<typeof buildChartContext>, userMessage: string): ChatRequestPayload => ({
  userMessage,
  instrumentId: context.instrumentId,
  exchange: context.exchange,
  marketType: context.marketType,
  displaySymbol: context.displaySymbol,
  interval: context.interval,
  currentPrice: context.currentPrice,
  selectedDrawingId: context.selectedDrawingId,
  drawings: [...context.userDrawings, ...context.engineDrawings],
  candleSummary: context.candleSummary,
  capabilities: context.capabilities,
  analysisResult: null,
  derivativesContext: context.derivativesContext
});

const createBybitAction = (override: Partial<ChartAction>): ChartAction => ({
  id: "bybit-entry",
  instrumentId: "bybit:linear_perp:BTC/USDT:USDT",
  exchange: "bybit",
  marketType: "linear_perp",
  displaySymbol: "BTC/USDT 무기한",
  interval: "60",
  type: "drawEntryLine",
  scenarioId: "bybit-short",
  price: 100,
  reason: "Bybit 선물 시나리오 기준선",
  createdAt: "2026-05-11T00:00:00.000Z",
  ...override
});

describe("첫 MVP 데모 플로우", () => {
  it("데모 단계와 완료 기준을 다중 거래소/현물/선물 기준으로 정의한다", () => {
    assert.equal(mvpDemoFlow.length, 14);
    assert.match(mvpDemoFlow[0], /앱을 연다/);
    assert.match(mvpDemoFlow[7], /Binance 현물 BTC\/USDT 기준/);
    assert.match(mvpDemoFlow[12], /Bybit 선물 BTC\/USDT 기준/);
    assert.deepEqual(mvpDemoAcceptanceCriteria, [
      "현물/선물 드로잉이 섞이지 않는다.",
      "거래소별 드로잉이 섞이지 않는다.",
      "AI가 현재 instrument 기준으로만 답한다.",
      "chartActions가 현재 instrument 차트에만 적용된다."
    ]);
  });

  it("Binance 현물 드로잉과 Bybit 선물 드로잉, AI 응답, chartActions가 instrumentId 기준으로 분리된다", async () => {
    const binanceSpot = findInstrument("binance:spot:BTC/USDT");
    const bybitPerp = findInstrument("bybit:linear_perp:BTC/USDT:USDT");

    assert.ok(binanceSpot);
    assert.ok(bybitPerp);

    const repository = createDrawingRepository();
    const binanceDrawing = normalizeTradingViewDrawing({
      rawDrawingId: "binance-user-trendline",
      instrument: binanceSpot,
      interval: "60",
      type: "trendline",
      points: [
        { time: 1710000000000, price: 95 },
        { time: 1710003600000, price: 105 }
      ],
      properties: {}
    });

    repository.save(binanceDrawing);

    assert.deepEqual(repository.list(binanceSpot.id, "60").map((drawing) => drawing.id), ["binance-user-trendline"]);
    assert.deepEqual(repository.list(bybitPerp.id, "60"), []);

    const binanceContext = buildChartContext({
      chartState: createChartState(binanceSpot, binanceDrawing.id),
      candleSummary: null,
      drawings: repository.list(binanceSpot.id, "60")
    });
    const binanceChatResponse = await chatPost(
      createJsonRequest(createChatPayload(binanceContext, "이 선 기준으로 롱/숏 시나리오 짜줘"))
    );
    const binanceChatBody = await binanceChatResponse.json();

    assert.equal(binanceChatResponse.status, 200);
    assert.equal(binanceChatBody.instrumentId, binanceSpot.id);
    assert.match(binanceChatBody.assistantMessage, /Binance/);
    assert.match(binanceChatBody.assistantMessage, /현물 기준/);

    const bybitContextBeforeDrawing = buildChartContext({
      chartState: createChartState(bybitPerp, binanceDrawing.id),
      candleSummary: null,
      drawings: repository.list(binanceSpot.id, "60")
    });

    assert.equal(bybitContextBeforeDrawing.selectedDrawing, null);
    assert.deepEqual(bybitContextBeforeDrawing.userDrawings, []);

    const bybitDrawing = normalizeTradingViewDrawing({
      rawDrawingId: "bybit-user-trendline",
      instrument: bybitPerp,
      interval: "60",
      type: "trendline",
      points: [
        { time: 1710000000000, price: 101 },
        { time: 1710003600000, price: 108 }
      ],
      properties: {}
    });

    repository.save(bybitDrawing);

    const bybitContext = buildChartContext({
      chartState: createChartState(bybitPerp, bybitDrawing.id),
      candleSummary: null,
      drawings: repository.list(bybitPerp.id, "60")
    });
    const bybitChatResponse = await chatPost(
      createJsonRequest(createChatPayload(bybitContext, "이 선 기준으로 롱/숏 시나리오 짜줘"))
    );
    const bybitChatBody = await bybitChatResponse.json();

    assert.equal(bybitChatResponse.status, 200);
    assert.equal(bybitChatBody.instrumentId, bybitPerp.id);
    assert.match(bybitChatBody.assistantMessage, /Bybit/);
    assert.match(bybitChatBody.assistantMessage, /선물 기준/);

    const bybitChartState = createChartState(bybitPerp, bybitDrawing.id);
    const binanceChartState = createChartState(binanceSpot, binanceDrawing.id);
    const chartActions = [
      createBybitAction({ id: "bybit-entry", type: "drawEntryLine", price: 100 }),
      createBybitAction({ id: "bybit-stop", type: "drawStopLossLine", price: 95 }),
      createBybitAction({ id: "bybit-take-profit", type: "drawTakeProfitLine", price: 112 })
    ];

    chartActions.forEach((action) => {
      assert.equal(canApplyChartActionToChart(action, bybitChartState), true);
      assert.equal(canApplyChartActionToChart(action, binanceChartState), false);
      repository.save(chartActionToDrawing(action, bybitPerp));
    });

    assert.deepEqual(
      repository.list(bybitPerp.id, "60").filter((drawing) => drawing.source === "ai").map((drawing) => drawing.role),
      ["entry", "stopLoss", "takeProfit"]
    );
    assert.deepEqual(
      repository.list(binanceSpot.id, "60").filter((drawing) => drawing.source === "ai"),
      []
    );
  });
});
