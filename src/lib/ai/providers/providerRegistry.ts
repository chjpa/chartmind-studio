import type { AiProvider } from "./aiProvider.ts";
import { createGeminiProvider } from "./geminiProvider.ts";
import { createLocalLlmProvider } from "./localLlmProvider.ts";
import { mockAiProvider } from "./mockAiProvider.ts";
import { createOpenAiProvider } from "./openAiProvider.ts";
import type { AiConnectionStatus, AiProviderId } from "../../connections/connectionTypes.ts";
import type { ChatRequestPayload, ChatResponsePayload } from "../../types/ai.ts";

export type AiProviderRegistry = {
  getProvider: (providerId: AiProviderId) => AiProvider | null;
  getProviders: () => AiProvider[];
  hasProvider: (providerId: AiProviderId) => boolean;
};

export const createAiProviderRegistry = (providers: AiProvider[]): AiProviderRegistry => {
  const providerMap = new Map<AiProviderId, AiProvider>();

  providers.forEach((provider) => {
    if (providerMap.has(provider.id)) {
      throw new Error("이미 등록된 AI provider입니다.");
    }

    providerMap.set(provider.id, provider);
  });

  return {
    getProvider: (providerId) => providerMap.get(providerId) ?? null,
    getProviders: () => Array.from(providerMap.values()),
    hasProvider: (providerId) => providerMap.has(providerId)
  };
};

export const createAiConnectionStatus = ({
  provider,
  hasApiKey,
  hasGeminiApiKey = false,
  hasLocalBaseUrl = true
}: {
  provider: AiProviderId;
  hasApiKey: boolean;
  hasGeminiApiKey?: boolean;
  hasLocalBaseUrl?: boolean;
}): AiConnectionStatus => {
  if (provider === "mock") {
    return {
      provider,
      status: "ready",
      message: "AI 연결 안 됨. 샘플 응답을 사용할 수 있습니다.",
      secretSource: "none"
    };
  }

  if (provider === "gemini") {
    if (!hasGeminiApiKey) {
      return {
        provider,
        status: "needs_configuration",
        message: "Gemini를 사용하려면 서버 환경 변수 GEMINI_API_KEY가 필요합니다.",
        secretSource: "none"
      };
    }

    return {
      provider,
      status: "ready",
      message: "Gemini가 서버 환경 변수 GEMINI_API_KEY로 연결 준비되었습니다.",
      secretSource: "server_env"
    };
  }

  if (provider === "ollama" || provider === "openai_compatible") {
    if (!hasLocalBaseUrl) {
      return {
        provider,
        status: "needs_configuration",
        message: "로컬 AI 연결 주소가 필요합니다.",
        secretSource: "none"
      };
    }

    return {
      provider,
      status: "ready",
      message: "로컬 AI 연결 주소가 준비되었습니다.",
      secretSource: "none"
    };
  }

  if (!hasApiKey) {
    return {
      provider,
      status: "needs_configuration",
      message: "OpenAI를 사용하려면 서버 환경 변수 OPENAI_API_KEY가 필요합니다.",
      secretSource: "none"
    };
  }

  return {
    provider,
    status: "ready",
    message: "OpenAI가 서버 환경 변수 OPENAI_API_KEY로 연결 준비되었습니다.",
    secretSource: "server_env"
  };
};

export type DeterministicResponder = (payload: ChatRequestPayload) => ChatResponsePayload;

export const createDeterministicAiProvider = (respond: DeterministicResponder): AiProvider => ({
  id: "mock",
  name: "Deterministic AI Provider",
  createChatResponse: async (payload) => respond(payload)
});

export const aiProviderRegistry = createAiProviderRegistry([
  mockAiProvider,
  createOpenAiProvider({ apiKey: process.env.OPENAI_API_KEY ?? null }),
  createGeminiProvider({ apiKey: process.env.GEMINI_API_KEY ?? null }),
  createLocalLlmProvider({
    id: "ollama",
    baseUrl: process.env.LOCAL_LLM_BASE_URL ?? "http://localhost:11434"
  }),
  createLocalLlmProvider({
    id: "openai_compatible",
    baseUrl: process.env.LOCAL_LLM_BASE_URL ?? "http://localhost:11434"
  })
]);
