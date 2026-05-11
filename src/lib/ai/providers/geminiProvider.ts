import type { ChatResponsePayload } from "../../types/ai.ts";
import type { AiProvider } from "./aiProvider.ts";

type GeminiProviderOptions = {
  apiKey: string | null;
};

export const createGeminiProvider = ({ apiKey }: GeminiProviderOptions): AiProvider => ({
  id: "gemini",
  name: "Gemini Provider",
  async createChatResponse(payload): Promise<ChatResponsePayload> {
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY가 설정되지 않아 Gemini를 사용할 수 없습니다.");
    }

    return {
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
      assistantMessage:
        "Gemini 연결 설정이 감지되었습니다. 실제 모델 호출은 연결 테스트 API 검증 후 별도 단계에서 활성화합니다."
    };
  }
});
