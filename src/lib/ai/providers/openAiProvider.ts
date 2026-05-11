import type { ChatResponsePayload } from "../../types/ai.ts";
import type { AiProvider } from "./aiProvider.ts";

type OpenAiProviderOptions = {
  apiKey: string | null;
};

export const createOpenAiProvider = ({ apiKey }: OpenAiProviderOptions): AiProvider => ({
  id: "openai",
  name: "OpenAI Provider",
  async createChatResponse(payload): Promise<ChatResponsePayload> {
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY가 설정되지 않아 OpenAI를 사용할 수 없습니다.");
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
        "OpenAI 연결 설정이 감지되었습니다. 실제 모델 호출은 공식 문서 확인 후 별도 단계에서 활성화합니다."
    };
  }
});
