import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { POST as analyzePost } from "../../app/api/analyze/route.ts";
import { POST as chatPost } from "../../app/api/chat/route.ts";
import { GET as instrumentsGet } from "../../app/api/markets/instruments/route.ts";
import { buildChartContext } from "../ai/chartContext.ts";
import { createDrawingRepository, drawingRepository } from "../drawings/drawingRepository.ts";
import {
  findInstrument,
  getInstruments
} from "./exchangeRegistry.ts";
import type { ChatRequestPayload } from "../types/ai.ts";
import type { ChartDrawing } from "../types/drawings.ts";
import type { ChartState, Instrument, MarketType } from "../types/market.ts";

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

type SelectionScenario = {
  label: string;
  instrumentId: string;
  exchange: string;
  marketType: MarketType;
  query: string;
  expectedTicker: string;
};

const scenarios: SelectionScenario[] = [
  {
    label: "Binance 현물 BTC/USDT",
    instrumentId: "binance:spot:BTC/USDT",
    exchange: "binance",
    marketType: "spot",
    query: "BTC",
    expectedTicker: "BINANCE:SPOT:BTCUSDT"
  },
  {
    label: "Binance 선물 BTC/USDT",
    instrumentId: "binance:linear_perp:BTC/USDT:USDT",
    exchange: "binance",
    marketType: "linear_perp",
    query: "BTC",
    expectedTicker: "BINANCE:PERP:BTCUSDT"
  },
  {
    label: "Bybit 현물 BTC/USDT",
    instrumentId: "bybit:spot:BTC/USDT",
    exchange: "bybit",
    marketType: "spot",
    query: "BTC",
    expectedTicker: "BYBIT:SPOT:BTCUSDT"
  },
  {
    label: "Bybit 선물 BTC/USDT",
    instrumentId: "bybit:linear_perp:BTC/USDT:USDT",
    exchange: "bybit",
    marketType: "linear_perp",
    query: "BTC",
    expectedTicker: "BYBIT:PERP:BTCUSDT"
  },
  {
    label: "Upbit 현물 BTC/KRW",
    instrumentId: "upbit:spot:BTC/KRW",
    exchange: "upbit",
    marketType: "spot",
    query: "BTC",
    expectedTicker: "UPBIT:SPOT:BTCKRW"
  },
  {
    label: "OKX 선물 ETH/USDT",
    instrumentId: "okx:linear_perp:ETH/USDT:USDT",
    exchange: "okx",
    marketType: "linear_perp",
    query: "ETH",
    expectedTicker: "OKX:PERP:ETHUSDT"
  }
];

const createChartState = (instrument: Instrument): ChartState => ({
  selectedExchange: instrument.exchange,
  selectedMarketType: instrument.marketType,
  selectedInstrument: instrument,
  selectedInterval: "60",
  currentPrice: 100,
  selectedDrawingId: `${instrument.id}:drawing`,
  selectedIndicators: []
});

const createDrawing = (instrument: Instrument): ChartDrawing => ({
  id: `${instrument.id}:drawing`,
  instrumentId: instrument.id,
  exchange: instrument.exchange,
  marketType: instrument.marketType,
  symbol: instrument.symbol,
  interval: "60",
  source: "user",
  type: "trendline",
  points: [
    { time: 1710000000000, price: 100 },
    { time: 1710003600000, price: 110 }
  ],
  properties: {},
  role: "analysis",
  label: `${instrument.displaySymbol} 사용자 추세선`,
  userModified: true,
  createdAt: "2026-05-11T00:00:00.000Z",
  updatedAt: "2026-05-11T00:00:00.000Z"
});

const createJsonRequest = (url: string, body: unknown) =>
  new Request(url, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" }
  });

describe("거래소/시장유형/심볼 선택 흐름", () => {
  beforeEach(() => {
    // analyze API가 전역 repository에 engine 도형을 저장하므로 테스트 간 영향을 줄인다.
    drawingRepository.clear();
  });

  it("6개 선택 시나리오의 차트 ticker, AI context, 분석 결과가 instrument별로 분리된다", async () => {
    mockBinanceFetch();
    try {
      const instruments = scenarios.map((scenario) => {
        const matches = getInstruments({
          exchange: scenario.exchange,
          marketType: scenario.marketType,
          query: scenario.query
        });
        const instrument = matches.find((item) => item.id === scenario.instrumentId);

        assert.ok(instrument, `${scenario.label} instrument가 필요합니다.`);
        return instrument;
      });
      const tickers = instruments.map((instrument) => instrument.tradingViewTicker);
      const repository = createDrawingRepository();
      const drawings = instruments.map(createDrawing);

      drawings.forEach((drawing) => repository.save(drawing));

      assert.equal(new Set(tickers).size, scenarios.length);
      assert.deepEqual(tickers, scenarios.map((scenario) => scenario.expectedTicker));

      for (const instrument of instruments) {
        assert.deepEqual(
          repository.list(instrument.id, "60").map((drawing) => drawing.instrumentId),
          [instrument.id]
        );
      }

      const contexts = instruments.map((instrument) =>
        buildChartContext({
          chartState: createChartState(instrument),
          candleSummary: null,
          drawings
        })
      );

      assert.equal(new Set(contexts.map((context) => context.instrumentId)).size, scenarios.length);
      assert.equal(
        new Set(contexts.map((context) => `${context.exchange}:${context.marketType}`)).size,
        scenarios.length
      );

      for (const context of contexts) {
        assert.equal(context.selectedDrawing?.instrumentId, context.instrumentId);

        const chatPayload: ChatRequestPayload = {
          userMessage: "이 차트 기준으로 설명해줘",
          instrumentId: context.instrumentId,
          exchange: context.exchange,
          marketType: context.marketType,
          displaySymbol: context.displaySymbol,
          interval: context.interval,
          currentPrice: context.currentPrice,
          selectedDrawingId: context.selectedDrawingId,
          drawings,
          candleSummary: context.candleSummary,
          capabilities: context.capabilities,
          analysisResult: null,
          derivativesContext: context.derivativesContext
        };
        const chatResponse = await chatPost(createJsonRequest("http://localhost/api/chat", chatPayload));
        const chatBody = await chatResponse.json();

        assert.equal(chatResponse.status, 200);
        assert.equal(chatBody.instrumentId, context.instrumentId);
        assert.equal(chatBody.marketType, context.marketType);
        assert.equal(chatBody.selectedDrawing?.instrumentId, context.instrumentId);

        const analyzeResponse = await analyzePost(
          createJsonRequest("http://localhost/api/analyze", {
            instrumentId: context.instrumentId,
            interval: context.interval,
            lookback: 100
          })
        );
        const analysisBody = await analyzeResponse.json();

        assert.equal(analyzeResponse.status, 200);
        assert.equal(analysisBody.instrumentId, context.instrumentId);
        assert.equal(analysisBody.exchange, context.exchange);
        assert.equal(analysisBody.marketType, context.marketType);
        assert.equal(analysisBody.displaySymbol, context.displaySymbol);
      }
    } finally {
      restoreFetch();
    }
  });

  it("지원하지 않는 거래소/시장 유형 조합은 한국어 안내를 반환한다", async () => {
    const response = await instrumentsGet(
      new Request("http://localhost/api/markets/instruments?exchange=upbit&marketType=linear_perp&query=BTC")
    );
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error, "해당 거래소에서 지원하지 않는 시장 유형입니다.");
  });

  it("시나리오 instrument를 id로 다시 찾을 수 있다", () => {
    for (const scenario of scenarios) {
      const instrument = findInstrument(scenario.instrumentId);

      assert.equal(instrument?.tradingViewTicker, scenario.expectedTicker);
    }
  });
});
