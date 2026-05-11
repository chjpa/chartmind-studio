import type { ChatRequestPayload, ChatResponsePayload } from "../../types/ai.ts";
import type { AiProviderId, LlmProviderId } from "../../connections/connectionTypes.ts";

export type AiProvider = {
  id: AiProviderId;
  name: string;
  createChatResponse: (payload: ChatRequestPayload) => Promise<ChatResponsePayload>;
};

export type LlmTestProviderId = LlmProviderId;
