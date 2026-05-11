import type { AiProviderId } from "../../../../../lib/connections/connectionTypes.ts";
import { createAiConnectionStatus } from "../../../../../lib/ai/providers/providerRegistry.ts";

const isAiProviderId = (value: string): value is AiProviderId =>
  value === "mock" ||
  value === "openai" ||
  value === "gemini" ||
  value === "ollama" ||
  value === "openai_compatible";

const resolveAiProvider = (value: string | undefined): AiProviderId => {
  if (!value) {
    return "mock";
  }

  return isAiProviderId(value) ? value : "mock";
};

export const GET = async () => {
  const provider = resolveAiProvider(process.env.LLM_PROVIDER ?? process.env.AI_PROVIDER);

  return Response.json(
    createAiConnectionStatus({
      provider,
      hasApiKey: Boolean(process.env.OPENAI_API_KEY),
      hasGeminiApiKey: Boolean(process.env.GEMINI_API_KEY),
      hasLocalBaseUrl: Boolean(process.env.LOCAL_LLM_BASE_URL)
    })
  );
};
