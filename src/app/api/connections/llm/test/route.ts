import {
  DEFAULT_GEMINI_MODEL,
  DEFAULT_LOCAL_LLM_MODEL,
  DEFAULT_OPENAI_MODEL,
  isLlmProviderId
} from "../../../../../lib/ai/providers/llmConnectionStatus.ts";
import type { LlmProviderId } from "../../../../../lib/connections/connectionTypes.ts";

type LlmTestRequest = {
  provider: LlmProviderId;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
};

const json = (body: unknown, status = 200) => Response.json(body, { status });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const normalizeBaseUrl = (baseUrl: string) => baseUrl.replace(/\/+$/, "");

const validateBody = (value: unknown): LlmTestRequest | { error: string } => {
  if (!isRecord(value)) {
    return { error: "요청 본문이 올바른 JSON 형식이 아닙니다." };
  }

  if (typeof value.provider !== "string" || !isLlmProviderId(value.provider)) {
    return { error: "지원하지 않는 AI 연결 종류입니다." };
  }

  if (value.apiKey !== undefined && typeof value.apiKey !== "string") {
    return { error: "apiKey 형식이 올바르지 않습니다." };
  }

  if (value.baseUrl !== undefined && typeof value.baseUrl !== "string") {
    return { error: "baseUrl 형식이 올바르지 않습니다." };
  }

  if (value.model !== undefined && typeof value.model !== "string") {
    return { error: "model 형식이 올바르지 않습니다." };
  }

  return {
    provider: value.provider,
    apiKey: value.apiKey,
    baseUrl: value.baseUrl,
    model: value.model
  };
};

const createOpenAiTest = async ({ apiKey, model }: LlmTestRequest) => {
  if (!apiKey) {
    return {
      provider: "openai",
      ok: false,
      attempted: false,
      message: "OpenAI 연결 테스트에는 API 키가 필요합니다."
    };
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: model ?? DEFAULT_OPENAI_MODEL,
      input: "연결 테스트"
    })
  });

  return {
    provider: "openai",
    ok: response.ok,
    attempted: true,
    status: response.status,
    message: response.ok ? "OpenAI 연결 테스트에 성공했습니다." : "OpenAI 연결 테스트에 실패했습니다."
  };
};

const createGeminiTest = async ({ apiKey, model }: LlmTestRequest) => {
  if (!apiKey) {
    return {
      provider: "gemini",
      ok: false,
      attempted: false,
      message: "Gemini 연결 테스트에는 API 키가 필요합니다."
    };
  }

  const selectedModel = model ?? DEFAULT_GEMINI_MODEL;
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent`,
    {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: "연결 테스트" }]
          }
        ]
      })
    }
  );

  return {
    provider: "gemini",
    ok: response.ok,
    attempted: true,
    status: response.status,
    message: response.ok ? "Gemini 연결 테스트에 성공했습니다." : "Gemini 연결 테스트에 실패했습니다."
  };
};

const createOllamaTest = async ({ baseUrl, model }: LlmTestRequest) => {
  if (!baseUrl) {
    return {
      provider: "ollama",
      ok: false,
      attempted: false,
      message: "Ollama 연결 테스트에는 로컬 주소가 필요합니다."
    };
  }

  const response = await fetch(`${normalizeBaseUrl(baseUrl)}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: model ?? DEFAULT_LOCAL_LLM_MODEL,
      stream: false,
      messages: [{ role: "user", content: "연결 테스트" }]
    })
  });

  return {
    provider: "ollama",
    ok: response.ok,
    attempted: true,
    status: response.status,
    message: response.ok ? "Ollama 연결 테스트에 성공했습니다." : "Ollama 연결 테스트에 실패했습니다."
  };
};

const createOpenAiCompatibleTest = async ({ baseUrl, apiKey, model }: LlmTestRequest) => {
  if (!baseUrl) {
    return {
      provider: "openai_compatible",
      ok: false,
      attempted: false,
      message: "OpenAI 호환 연결 테스트에는 로컬 주소가 필요합니다."
    };
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };

  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const response = await fetch(`${normalizeBaseUrl(baseUrl)}/v1/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: model ?? DEFAULT_LOCAL_LLM_MODEL,
      messages: [{ role: "user", content: "연결 테스트" }]
    })
  });

  return {
    provider: "openai_compatible",
    ok: response.ok,
    attempted: true,
    status: response.status,
    message: response.ok
      ? "OpenAI 호환 연결 테스트에 성공했습니다."
      : "OpenAI 호환 연결 테스트에 실패했습니다."
  };
};

export const POST = async (request: Request) => {
  const body = await request.json().catch(() => null);
  const payload = validateBody(body);

  if ("error" in payload) {
    return json({ error: payload.error }, 400);
  }

  if (payload.provider === "openai") {
    return json(await createOpenAiTest(payload));
  }

  if (payload.provider === "gemini") {
    return json(await createGeminiTest(payload));
  }

  if (payload.provider === "ollama") {
    return json(await createOllamaTest(payload));
  }

  return json(await createOpenAiCompatibleTest(payload));
};
