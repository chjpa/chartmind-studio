import { analyzeCandles } from "../../../lib/analysis/analysisEngine.ts";
import { drawingRepository } from "../../../lib/drawings/drawingRepository.ts";
import { buildEngineDrawingsFromAnalysis } from "../../../lib/drawings/engineDrawings.ts";
import {
  findInstrument,
  getExchangeMarketTypes,
  getExchangeOption,
  isExchangeProviderEnabled,
  marketDataRouter,
  providerNotImplementedMessage
} from "../../../lib/market/exchangeRegistry.ts";
import { getUnsupportedIntervalMessage, isIntervalSupported } from "../../../lib/market/exchangeCapabilities.ts";
import type { AnalysisResult } from "../../../lib/types/analysis.ts";
import type { MarketType } from "../../../lib/types/market.ts";

type AnalyzeRequestBody = {
  instrumentId?: unknown;
  interval?: unknown;
  lookback?: unknown;
};

type SupportedMarketType = Exclude<MarketType, "index" | "mark">;

const defaultAnalysisLookback = 500;
const maxAnalysisLookback = 2000;

const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status
  });

const parseLookback = (value: unknown) => {
  if (typeof value !== "number") {
    return defaultAnalysisLookback;
  }

  return Math.max(1, Math.min(Math.floor(value), maxAnalysisLookback));
};

const readBody = async (request: Request): Promise<AnalyzeRequestBody | null> => {
  try {
    return await request.json();
  } catch {
    return null;
  }
};

export const POST = async (request: Request) => {
  const body = await readBody(request);

  if (!body) {
    return json({ error: "요청 본문이 올바른 JSON 형식이 아닙니다." }, 400);
  }

  if (typeof body.instrumentId !== "string" || body.instrumentId.length === 0) {
    return json({ error: "instrumentId가 필요합니다." }, 400);
  }

  const interval = typeof body.interval === "string" && body.interval.length > 0 ? body.interval : "60";
  const instrument = findInstrument(body.instrumentId);

  if (!instrument) {
    return json({ error: "지원하지 않는 instrumentId입니다." }, 400);
  }

  if (!getExchangeOption(instrument.exchange)) {
    return json({ error: "지원하지 않는 거래소입니다." }, 400);
  }

  if (!getExchangeMarketTypes(instrument.exchange).includes(instrument.marketType as SupportedMarketType)) {
    return json({ error: "해당 거래소에서 지원하지 않는 시장 유형입니다." }, 400);
  }

  if (!isExchangeProviderEnabled(instrument.exchange)) {
    return json({ error: providerNotImplementedMessage }, 400);
  }

  if (!isIntervalSupported(instrument, interval)) {
    return json({ error: getUnsupportedIntervalMessage(instrument, interval) }, 400);
  }

  try {
    const candles = await marketDataRouter.fetchOHLCV({
      instrument,
      interval,
      from: 0,
      to: Math.floor(Date.now() / 1000),
      limit: parseLookback(body.lookback)
    });
    const candleAnalysis = analyzeCandles(candles);
    const result: AnalysisResult = {
      instrumentId: instrument.id,
      exchange: instrument.exchange,
      marketType: instrument.marketType,
      displaySymbol: instrument.displaySymbol,
      interval,
      generatedAt: new Date().toISOString(),
      ...candleAnalysis
    };
    const engineDrawings = buildEngineDrawingsFromAnalysis(result);

    drawingRepository.replaceEngineDrawings(instrument.id, interval, engineDrawings);

    return json(result);
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : "기술적 분석을 실행하지 못했습니다." },
      500
    );
  }
};
