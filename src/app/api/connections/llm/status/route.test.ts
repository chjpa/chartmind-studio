import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createLlmConnectionStatus } from "../../../../../lib/ai/providers/llmConnectionStatus.ts";
import { GET } from "./route.ts";

const withEnv = async (
  values: Record<string, string | undefined>,
  run: () => Promise<void> | void
) => {
  const originals = new Map<string, string | undefined>();

  Object.keys(values).forEach((key) => {
    originals.set(key, process.env[key]);

    if (values[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = values[key];
    }
  });

  try {
    await run();
  } finally {
    originals.forEach((value, key) => {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    });
  }
};

describe("createLlmConnectionStatus", () => {
  it("API 키 원문 없이 cloud/local 연결 상태와 기본 모델을 반환한다", () => {
    const status = createLlmConnectionStatus({
      env: {
        OPENAI_API_KEY: "openai-secret",
        GEMINI_API_KEY: undefined,
        LOCAL_LLM_BASE_URL: undefined,
        LOCAL_LLM_MODEL: undefined,
        AI_PROVIDER: "openai",
        LLM_PROVIDER: undefined
      }
    });

    assert.equal(status.cloud.openai.configured, true);
    assert.equal(status.cloud.openai.label, "OpenAI");
    assert.match(status.cloud.openai.message, /연결 준비/);
    assert.equal(status.cloud.gemini.configured, false);
    assert.equal(status.local.ollama.baseUrlConfigured, false);
    assert.equal(status.local.ollama.model, "gemma3");
    assert.equal(status.local.openai_compatible.model, "gemma3");
    assert.equal(status.active.provider, "openai");
    assert.equal(JSON.stringify(status).includes("openai-secret"), false);
  });

  it("선택한 AI 연결이 없으면 샘플 응답 사용 메시지를 반환한다", () => {
    const status = createLlmConnectionStatus({
      env: {
        OPENAI_API_KEY: undefined,
        GEMINI_API_KEY: undefined,
        AI_PROVIDER: undefined,
        LLM_PROVIDER: undefined
      }
    });

    assert.equal(status.active.provider, "sample");
    assert.match(status.active.message, /AI 연결 안 됨, 샘플 응답 사용/);
  });
});

describe("/api/connections/llm/status", () => {
  it("환경 변수 기반 연결 상태를 반환하고 key 값은 숨긴다", async () => {
    await withEnv(
      {
        OPENAI_API_KEY: "test-openai-key",
        OPENAI_MODEL: undefined,
        GEMINI_API_KEY: "test-gemini-key",
        GEMINI_MODEL: "gemini-test-model",
        LOCAL_LLM_BASE_URL: "http://localhost:11434",
        LOCAL_LLM_MODEL: "local-test-model",
        AI_PROVIDER: undefined,
        LLM_PROVIDER: "gemini"
      },
      async () => {
        const response = await GET();
        const body = await response.json();

        assert.equal(response.status, 200);
        assert.equal(body.cloud.openai.configured, true);
        assert.equal(body.cloud.openai.model, "gpt-4.1-mini");
        assert.equal(body.cloud.gemini.configured, true);
        assert.equal(body.cloud.gemini.model, "gemini-test-model");
        assert.equal(body.local.ollama.configured, true);
        assert.equal(body.local.ollama.baseUrlConfigured, true);
        assert.equal(body.local.ollama.model, "local-test-model");
        assert.equal(body.active.provider, "gemini");
        assert.equal(JSON.stringify(body).includes("test-openai-key"), false);
        assert.equal(JSON.stringify(body).includes("test-gemini-key"), false);
      }
    );
  });
});
