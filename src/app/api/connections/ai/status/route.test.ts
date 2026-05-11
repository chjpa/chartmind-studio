import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createAiConnectionStatus } from "../../../../../lib/ai/providers/providerRegistry.ts";
import { GET } from "./route.ts";

describe("createAiConnectionStatus", () => {
  it("샘플 응답은 API 키 없이 ready 상태를 반환한다", () => {
    const status = createAiConnectionStatus({
      provider: "mock",
      hasApiKey: false
    });

    assert.equal(status.provider, "mock");
    assert.equal(status.status, "ready");
    assert.equal(status.secretSource, "none");
    assert.match(status.message, /AI 연결 안 됨/);
    assert.doesNotMatch(status.message, /mock provider/);
  });

  it("OpenAI는 API 키가 없으면 설정 필요 상태를 반환한다", () => {
    const status = createAiConnectionStatus({
      provider: "openai",
      hasApiKey: false
    });

    assert.equal(status.provider, "openai");
    assert.equal(status.status, "needs_configuration");
    assert.equal(status.secretSource, "none");
    assert.match(status.message, /OPENAI_API_KEY/);
  });

  it("OpenAI는 서버 환경변수 API 키가 있으면 ready 상태를 반환한다", () => {
    const status = createAiConnectionStatus({
      provider: "openai",
      hasApiKey: true
    });

    assert.equal(status.provider, "openai");
    assert.equal(status.status, "ready");
    assert.equal(status.secretSource, "server_env");
  });

  it("Gemini는 GEMINI_API_KEY 기준으로 연결 상태를 반환한다", () => {
    const status = createAiConnectionStatus({
      provider: "gemini",
      hasApiKey: false,
      hasGeminiApiKey: true
    });

    assert.equal(status.provider, "gemini");
    assert.equal(status.status, "ready");
    assert.equal(status.secretSource, "server_env");
  });
});

describe("/api/connections/ai/status", () => {
  it("기본 AI_PROVIDER 값으로 샘플 응답 연결 상태를 반환한다", async () => {
    const originalProvider = process.env.AI_PROVIDER;
    const originalLlmProvider = process.env.LLM_PROVIDER;
    const originalApiKey = process.env.OPENAI_API_KEY;
    delete process.env.AI_PROVIDER;
    delete process.env.LLM_PROVIDER;
    delete process.env.OPENAI_API_KEY;

    try {
      const response = await GET();
      const body = await response.json();

      assert.equal(response.status, 200);
      assert.equal(body.provider, "mock");
      assert.equal(body.status, "ready");
      assert.equal(body.secretSource, "none");
    } finally {
      if (originalProvider === undefined) {
        delete process.env.AI_PROVIDER;
      } else {
        process.env.AI_PROVIDER = originalProvider;
      }

      if (originalApiKey === undefined) {
        delete process.env.OPENAI_API_KEY;
      } else {
        process.env.OPENAI_API_KEY = originalApiKey;
      }

      if (originalLlmProvider === undefined) {
        delete process.env.LLM_PROVIDER;
      } else {
        process.env.LLM_PROVIDER = originalLlmProvider;
      }
    }
  });

  it("OpenAI에 API 키가 없으면 설정 필요 상태를 반환한다", async () => {
    const originalProvider = process.env.AI_PROVIDER;
    const originalLlmProvider = process.env.LLM_PROVIDER;
    const originalApiKey = process.env.OPENAI_API_KEY;
    process.env.AI_PROVIDER = "openai";
    delete process.env.LLM_PROVIDER;
    delete process.env.OPENAI_API_KEY;

    try {
      const response = await GET();
      const body = await response.json();

      assert.equal(response.status, 200);
      assert.equal(body.provider, "openai");
      assert.equal(body.status, "needs_configuration");
      assert.equal(body.secretSource, "none");
      assert.match(body.message, /OPENAI_API_KEY/);
    } finally {
      if (originalProvider === undefined) {
        delete process.env.AI_PROVIDER;
      } else {
        process.env.AI_PROVIDER = originalProvider;
      }

      if (originalApiKey === undefined) {
        delete process.env.OPENAI_API_KEY;
      } else {
        process.env.OPENAI_API_KEY = originalApiKey;
      }

      if (originalLlmProvider === undefined) {
        delete process.env.LLM_PROVIDER;
      } else {
        process.env.LLM_PROVIDER = originalLlmProvider;
      }
    }
  });

  it("OpenAI에 API 키가 있으면 서버 환경 변수 상태를 반환한다", async () => {
    const originalProvider = process.env.AI_PROVIDER;
    const originalLlmProvider = process.env.LLM_PROVIDER;
    const originalApiKey = process.env.OPENAI_API_KEY;
    process.env.AI_PROVIDER = "openai";
    delete process.env.LLM_PROVIDER;
    process.env.OPENAI_API_KEY = "test-key";

    try {
      const response = await GET();
      const body = await response.json();

      assert.equal(response.status, 200);
      assert.equal(body.provider, "openai");
      assert.equal(body.status, "ready");
      assert.equal(body.secretSource, "server_env");
      assert.equal(JSON.stringify(body).includes("test-key"), false);
    } finally {
      if (originalProvider === undefined) {
        delete process.env.AI_PROVIDER;
      } else {
        process.env.AI_PROVIDER = originalProvider;
      }

      if (originalApiKey === undefined) {
        delete process.env.OPENAI_API_KEY;
      } else {
        process.env.OPENAI_API_KEY = originalApiKey;
      }

      if (originalLlmProvider === undefined) {
        delete process.env.LLM_PROVIDER;
      } else {
        process.env.LLM_PROVIDER = originalLlmProvider;
      }
    }
  });
});
