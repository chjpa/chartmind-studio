import type {
  ActiveLlmConnectionStatus,
  CloudLlmProviderId,
  LlmConnectionStatus,
  LlmProviderId,
  LocalLlmProviderId
} from "../../connections/connectionTypes.ts";

export const DEFAULT_OPENAI_MODEL = "gpt-4.1-mini";
export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
export const DEFAULT_LOCAL_LLM_BASE_URL = "http://localhost:11434";
export const DEFAULT_LOCAL_LLM_MODEL = "gemma3";

type LlmEnv = Partial<Record<string, string | undefined>>;

const isCloudLlmProviderId = (value: string): value is CloudLlmProviderId =>
  value === "openai" || value === "gemini";

const isLocalLlmProviderId = (value: string): value is LocalLlmProviderId =>
  value === "ollama" || value === "openai_compatible";

export const isLlmProviderId = (value: string): value is LlmProviderId =>
  isCloudLlmProviderId(value) || isLocalLlmProviderId(value);

const getEnv = (env: LlmEnv, key: string) => env[key];

const resolveActiveProvider = (env: LlmEnv): ActiveLlmConnectionStatus => {
  const rawProvider = getEnv(env, "LLM_PROVIDER") ?? getEnv(env, "AI_PROVIDER");

  if (!rawProvider) {
    return {
      provider: "sample",
      label: "샘플 응답",
      message: "AI 연결 안 됨, 샘플 응답 사용"
    };
  }

  if (!isLlmProviderId(rawProvider)) {
    return {
      provider: "sample",
      label: "샘플 응답",
      message: "선택한 AI 연결을 찾을 수 없어 샘플 응답을 사용합니다."
    };
  }

  const labels: Record<LlmProviderId, string> = {
    openai: "OpenAI",
    gemini: "Gemini",
    ollama: "Ollama",
    openai_compatible: "OpenAI 호환"
  };

  return {
    provider: rawProvider,
    label: labels[rawProvider],
    message: `${labels[rawProvider]} 연결을 사용하도록 선택되었습니다.`
  };
};

export const createLlmConnectionStatus = ({
  env = process.env
}: {
  env?: LlmEnv;
} = {}): LlmConnectionStatus => {
  const openAiModel = getEnv(env, "OPENAI_MODEL") ?? DEFAULT_OPENAI_MODEL;
  const geminiModel = getEnv(env, "GEMINI_MODEL") ?? DEFAULT_GEMINI_MODEL;
  const configuredLocalBaseUrl = getEnv(env, "LOCAL_LLM_BASE_URL");
  const localModel = getEnv(env, "LOCAL_LLM_MODEL") ?? DEFAULT_LOCAL_LLM_MODEL;
  const hasOpenAiKey = Boolean(getEnv(env, "OPENAI_API_KEY"));
  const hasGeminiKey = Boolean(getEnv(env, "GEMINI_API_KEY"));
  const hasLocalBaseUrl = Boolean(configuredLocalBaseUrl);

  return {
    cloud: {
      openai: {
        configured: hasOpenAiKey,
        label: "OpenAI",
        model: openAiModel,
        message: hasOpenAiKey
          ? "OpenAI API 키가 서버에 설정되어 연결 준비되었습니다."
          : "OpenAI를 쓰려면 서버에 OPENAI_API_KEY를 설정하세요."
      },
      gemini: {
        configured: hasGeminiKey,
        label: "Gemini",
        model: geminiModel,
        message: hasGeminiKey
          ? "Gemini API 키가 서버에 설정되어 연결 준비되었습니다."
          : "Gemini를 쓰려면 서버에 GEMINI_API_KEY를 설정하세요."
      }
    },
    local: {
      ollama: {
        configured: hasLocalBaseUrl,
        baseUrlConfigured: hasLocalBaseUrl,
        label: "Ollama",
        model: localModel,
        message: hasLocalBaseUrl
          ? "Ollama 로컬 주소가 설정되어 연결 테스트를 할 수 있습니다."
          : `Ollama를 쓰려면 LOCAL_LLM_BASE_URL을 설정하세요. 기본 후보 주소는 ${DEFAULT_LOCAL_LLM_BASE_URL}입니다.`
      },
      openai_compatible: {
        configured: hasLocalBaseUrl,
        baseUrlConfigured: hasLocalBaseUrl,
        label: "OpenAI 호환",
        model: localModel,
        message: hasLocalBaseUrl
          ? "OpenAI 호환 로컬 주소가 설정되어 연결 테스트를 할 수 있습니다."
          : `OpenAI 호환 로컬 AI를 쓰려면 LOCAL_LLM_BASE_URL을 설정하세요. 기본 후보 주소는 ${DEFAULT_LOCAL_LLM_BASE_URL}입니다.`
      }
    },
    active: resolveActiveProvider(env)
  };
};
