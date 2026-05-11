import type { ChatRequestPayload, ChatResponsePayload } from "../../types/ai.ts";
import type { AiProvider } from "./aiProvider.ts";

const createMockAssistantMessage = (payload: ChatRequestPayload) =>
  [
    "이 응답은 실제 AI 연결이 아니라 샘플 응답 모드에서 생성되었습니다.",
    `${payload.displaySymbol} ${payload.interval} 차트 요청을 받았고, 전달된 데이터 범위 안에서만 답변하는 자리표시자 응답입니다.`
  ].join(" ");

export const mockAiProvider: AiProvider = {
  id: "mock",
  name: "Mock AI Provider",
  createChatResponse: async (payload): Promise<ChatResponsePayload> => ({
    instrumentId: payload.instrumentId,
    exchange: payload.exchange,
    marketType: payload.marketType,
    displaySymbol: payload.displaySymbol,
    interval: payload.interval,
    selectedDrawingId: payload.selectedDrawingId,
    selectedDrawing:
      payload.drawings.find((drawing) =>
        drawing.id === payload.selectedDrawingId &&
        drawing.instrumentId === payload.instrumentId &&
        drawing.interval === payload.interval
      ) ?? null,
    assistantMessage: createMockAssistantMessage(payload)
  })
};
