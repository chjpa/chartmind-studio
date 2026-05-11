import type { ChatRequestPayload, ChatResponsePayload } from "../../../lib/types/ai.ts";
import type { ChartDrawing } from "../../../lib/types/drawings.ts";
import type { InstrumentCapabilities, MarketType, RealtimeOHLCVCapability } from "../../../lib/types/market.ts";
import {
  aiProviderRegistry,
  createDeterministicAiProvider
} from "../../../lib/ai/providers/providerRegistry.ts";
import { createGeminiProvider } from "../../../lib/ai/providers/geminiProvider.ts";
import { createLocalLlmProvider } from "../../../lib/ai/providers/localLlmProvider.ts";
import { createOpenAiProvider } from "../../../lib/ai/providers/openAiProvider.ts";
import { findInstrument } from "../../../lib/market/exchangeRegistry.ts";
import type { AiProviderId } from "../../../lib/connections/connectionTypes.ts";
import type { AiProvider } from "../../../lib/ai/providers/aiProvider.ts";

const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status
  });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isRecordOrNull = (value: unknown) => value === null || isRecord(value);

const isDrawing = (value: unknown): value is ChartDrawing => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.instrumentId === "string" &&
    typeof value.interval === "string" &&
    typeof value.exchange === "string" &&
    typeof value.marketType === "string" &&
    typeof value.source === "string" &&
    Array.isArray(value.points)
  );
};

const isSupportedMarketType = (value: unknown): value is MarketType =>
  value === "spot" ||
  value === "linear_perp" ||
  value === "inverse_perp" ||
  value === "dated_future" ||
  value === "index" ||
  value === "mark";

const isRealtimeOHLCVCapability = (value: unknown): value is RealtimeOHLCVCapability =>
  value === "websocket" || value === "polling" || value === "unsupported";

const isInstrumentCapabilities = (value: unknown): value is InstrumentCapabilities => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.historicalOHLCV === "boolean" &&
    isRealtimeOHLCVCapability(value.realtimeOHLCV) &&
    typeof value.orderbook === "boolean" &&
    typeof value.trades === "boolean" &&
    typeof value.fundingRate === "boolean" &&
    typeof value.openInterest === "boolean" &&
    typeof value.spot === "boolean" &&
    typeof value.linearPerp === "boolean" &&
    typeof value.inversePerp === "boolean"
  );
};

const validatePayload = (value: unknown): ChatRequestPayload | { error: string } => {
  if (!isRecord(value)) {
    return { error: "요청 본문이 올바른 JSON 형식이 아닙니다." };
  }

  if (typeof value.instrumentId !== "string" || value.instrumentId.length === 0) {
    return { error: "instrumentId가 필요합니다." };
  }

  if (typeof value.userMessage !== "string" || value.userMessage.length === 0) {
    return { error: "userMessage가 필요합니다." };
  }

  if (typeof value.exchange !== "string" || value.exchange.length === 0) {
    return { error: "exchange가 필요합니다." };
  }

  if (!isSupportedMarketType(value.marketType)) {
    return { error: "marketType이 필요합니다." };
  }

  if (typeof value.displaySymbol !== "string" || value.displaySymbol.length === 0) {
    return { error: "displaySymbol이 필요합니다." };
  }

  if (typeof value.interval !== "string" || value.interval.length === 0) {
    return { error: "interval이 필요합니다." };
  }

  if (typeof value.currentPrice !== "number" && value.currentPrice !== null) {
    return { error: "currentPrice 형식이 올바르지 않습니다." };
  }

  if (typeof value.selectedDrawingId !== "string" && value.selectedDrawingId !== null) {
    return { error: "selectedDrawingId 형식이 올바르지 않습니다." };
  }

  if (!isRecordOrNull(value.candleSummary)) {
    return { error: "candleSummary 형식이 올바르지 않습니다." };
  }

  if (!isRecordOrNull(value.analysisResult)) {
    return { error: "analysisResult 형식이 올바르지 않습니다." };
  }

  if (value.derivativesContext !== undefined && !isRecord(value.derivativesContext)) {
    return { error: "derivativesContext 형식이 올바르지 않습니다." };
  }

  if (!Array.isArray(value.drawings) || !value.drawings.every(isDrawing)) {
    return { error: "drawings 형식이 올바르지 않습니다." };
  }

  if (!isInstrumentCapabilities(value.capabilities)) {
    return { error: "capabilities 형식이 올바르지 않습니다." };
  }

  const instrument = findInstrument(value.instrumentId);

  if (!instrument) {
    return { error: "지원하지 않는 instrumentId입니다." };
  }

  if (
    value.exchange !== instrument.exchange ||
    value.marketType !== instrument.marketType ||
    value.displaySymbol !== instrument.displaySymbol
  ) {
    return { error: "instrumentId와 chart metadata가 일치하지 않습니다." };
  }

  return value as ChatRequestPayload;
};

const toExchangeLabel = (exchange: string) => {
  const labels: Record<string, string> = {
    binance: "Binance",
    bybit: "Bybit",
    okx: "OKX",
    coinbase: "Coinbase",
    upbit: "Upbit",
    bitget: "Bitget"
  };

  return labels[exchange] ?? exchange;
};

const toMarketTypeLabel = (marketType: MarketType) => {
  if (marketType === "spot") {
    return "현물 기준";
  }

  if (marketType === "index") {
    return "인덱스 기준";
  }

  if (marketType === "mark") {
    return "마크 가격 기준";
  }

  return "선물 기준";
};

const toRealtimeLabel = (realtimeOHLCV: RealtimeOHLCVCapability) => {
  if (realtimeOHLCV === "websocket") {
    return "빠른 실시간 갱신";
  }

  if (realtimeOHLCV === "polling") {
    return "주기적 갱신";
  }

  return "미지원";
};

const isAiProviderId = (value: string | undefined): value is AiProviderId =>
  value === "mock" ||
  value === "openai" ||
  value === "gemini" ||
  value === "ollama" ||
  value === "openai_compatible";

const resolveConfiguredAiProvider = (): AiProviderId => {
  const requestedProvider = process.env.LLM_PROVIDER ?? process.env.AI_PROVIDER;

  if (!isAiProviderId(requestedProvider) || requestedProvider === "mock") {
    return "mock";
  }

  if (requestedProvider === "openai") {
    return process.env.OPENAI_API_KEY ? "openai" : "mock";
  }

  if (requestedProvider === "gemini") {
    return process.env.GEMINI_API_KEY ? "gemini" : "mock";
  }

  if (requestedProvider === "ollama" || requestedProvider === "openai_compatible") {
    return process.env.LOCAL_LLM_BASE_URL ? requestedProvider : "mock";
  }

  return "mock";
};

const createConfiguredAiProvider = (providerId: AiProviderId): AiProvider => {
  if (providerId === "openai" && aiProviderRegistry.hasProvider(providerId)) {
    return createOpenAiProvider({ apiKey: process.env.OPENAI_API_KEY ?? null });
  }

  if (providerId === "gemini" && aiProviderRegistry.hasProvider(providerId)) {
    return createGeminiProvider({ apiKey: process.env.GEMINI_API_KEY ?? null });
  }

  if ((providerId === "ollama" || providerId === "openai_compatible") && aiProviderRegistry.hasProvider(providerId)) {
    return createLocalLlmProvider({
      id: providerId,
      baseUrl: process.env.LOCAL_LLM_BASE_URL ?? null
    });
  }

  return defaultAiProvider;
};

const findSelectedDrawing = (payload: ChatRequestPayload) => {
  if (!payload.selectedDrawingId) {
    return null;
  }

  return payload.drawings.find((drawing) =>
    drawing.id === payload.selectedDrawingId &&
    drawing.instrumentId === payload.instrumentId &&
    drawing.interval === payload.interval
  ) ?? null;
};

const createAssistantMessage = (payload: ChatRequestPayload, selectedDrawing: ChartDrawing | null) => {
  const exchangeLabel = toExchangeLabel(payload.exchange);
  const marketTypeLabel = toMarketTypeLabel(payload.marketType);
  const currentPriceText = payload.currentPrice === null ? "현재가는 제공되지 않았습니다" : `현재가는 ${payload.currentPrice}입니다`;
  const selectedDrawingText = payload.selectedDrawingId
    ? selectedDrawing
      ? "선택된 도형은 현재 차트와 연결되어 있습니다."
      : "선택된 도형은 현재 차트와 연결되지 않았습니다."
    : "선택된 도형은 없습니다.";
  const derivativeText =
    payload.marketType === "spot"
      ? "현물 차트이므로 레버리지와 청산 리스크를 선물 포지션처럼 해석하지 않습니다."
      : "선물 차트에서는 레버리지와 청산 리스크를 일반적인 주의사항으로 봅니다. 제공되지 않은 파생상품 수치는 추측하지 않습니다.";
  const capabilityText = [
    `과거 캔들: ${payload.capabilities.historicalOHLCV ? "지원" : "미지원"}`,
    `실시간: ${toRealtimeLabel(payload.capabilities.realtimeOHLCV)}`,
    `펀딩비: ${payload.capabilities.fundingRate ? "지원" : "지원 예정"}`,
    `미결제약정: ${payload.capabilities.openInterest ? "지원" : "미지원"}`
  ].join(", ");

  return [
    `${exchangeLabel} ${payload.displaySymbol} ${payload.interval} 차트를 ${marketTypeLabel}으로 보겠습니다.`,
    "거래소와 현물/선물 구분은 현재 차트 기준으로만 보겠습니다.",
    currentPriceText,
    selectedDrawingText,
    `데이터 제공 범위는 ${capabilityText}입니다.`,
    derivativeText,
    "분석은 전달된 candleSummary, drawings, analysisResult, derivativesContext, capabilities 범위 안에서만 해석합니다."
  ].join(" ");
};

const defaultAiProvider = createDeterministicAiProvider((validPayload) => {
  const selectedDrawing = findSelectedDrawing(validPayload);

  return {
    instrumentId: validPayload.instrumentId,
    exchange: validPayload.exchange,
    marketType: validPayload.marketType,
    displaySymbol: validPayload.displaySymbol,
    interval: validPayload.interval,
    selectedDrawingId: validPayload.selectedDrawingId,
    selectedDrawing,
    assistantMessage: createAssistantMessage(validPayload, selectedDrawing)
  };
});

export const POST = async (request: Request) => {
  const body = await request.json().catch(() => null);
  const payload = validatePayload(body);

  if ("error" in payload) {
    return json({ error: payload.error }, 400);
  }

  const configuredProviderId = resolveConfiguredAiProvider();
  const provider = createConfiguredAiProvider(configuredProviderId);
  let response: ChatResponsePayload;

  try {
    response = await provider.createChatResponse(payload);
  } catch {
    return json({ error: "AI 연결 응답을 생성하지 못했습니다. 설정을 확인해주세요." }, 503);
  }

  return json(response);
};
