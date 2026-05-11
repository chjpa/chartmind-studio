import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { POST } from "./route.ts";

const createJsonRequest = (body: unknown) =>
  new Request("http://localhost/api/connections/llm/test", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });

const withMockedFetch = async (
  fetchImpl: typeof fetch,
  run: () => Promise<void>
) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = fetchImpl;

  try {
    await run();
  } finally {
    globalThis.fetch = originalFetch;
  }
};

describe("/api/connections/llm/test", () => {
  it("OpenAI 연결은 Responses API와 Bearer 헤더로 테스트한다", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];

    await withMockedFetch(
      async (input, init) => {
        calls.push({ url: String(input), init });
        return Response.json({ id: "resp-test" });
      },
      async () => {
        const response = await POST(
          createJsonRequest({
            provider: "openai",
            apiKey: "openai-secret",
            model: "gpt-test"
          })
        );
        const body = await response.json();

        assert.equal(response.status, 200);
        assert.equal(body.provider, "openai");
        assert.equal(body.ok, true);
        assert.equal(JSON.stringify(body).includes("openai-secret"), false);
        assert.equal(calls.length, 1);
        assert.equal(calls[0]?.url, "https://api.openai.com/v1/responses");
        assert.equal(calls[0]?.init?.method, "POST");
        assert.equal((calls[0]?.init?.headers as Record<string, string>).Authorization, "Bearer openai-secret");
        assert.match(String(calls[0]?.init?.body), /gpt-test/);
      }
    );
  });

  it("Gemini 연결은 generateContent endpoint와 x-goog-api-key 헤더로 테스트한다", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];

    await withMockedFetch(
      async (input, init) => {
        calls.push({ url: String(input), init });
        return Response.json({ candidates: [] });
      },
      async () => {
        const response = await POST(
          createJsonRequest({
            provider: "gemini",
            apiKey: "gemini-secret",
            model: "gemini-test"
          })
        );
        const body = await response.json();

        assert.equal(response.status, 200);
        assert.equal(body.provider, "gemini");
        assert.equal(body.ok, true);
        assert.equal(JSON.stringify(body).includes("gemini-secret"), false);
        assert.equal(calls.length, 1);
        assert.equal(
          calls[0]?.url,
          "https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent"
        );
        assert.equal((calls[0]?.init?.headers as Record<string, string>)["x-goog-api-key"], "gemini-secret");
      }
    );
  });

  it("Ollama 연결은 baseUrl의 /api/chat으로 테스트한다", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];

    await withMockedFetch(
      async (input, init) => {
        calls.push({ url: String(input), init });
        return Response.json({ message: { content: "ok" } });
      },
      async () => {
        const response = await POST(
          createJsonRequest({
            provider: "ollama",
            baseUrl: "http://localhost:11434",
            model: "gemma3"
          })
        );
        const body = await response.json();

        assert.equal(response.status, 200);
        assert.equal(body.provider, "ollama");
        assert.equal(body.ok, true);
        assert.equal(calls.length, 1);
        assert.equal(calls[0]?.url, "http://localhost:11434/api/chat");
        assert.match(String(calls[0]?.init?.body), /gemma3/);
      }
    );
  });

  it("apiKey나 baseUrl이 없으면 외부 호출 없이 설정 안내를 반환한다", async () => {
    let fetchCalled = false;

    await withMockedFetch(
      async () => {
        fetchCalled = true;
        return Response.json({});
      },
      async () => {
        const response = await POST(createJsonRequest({ provider: "openai" }));
        const body = await response.json();

        assert.equal(response.status, 200);
        assert.equal(body.provider, "openai");
        assert.equal(body.ok, false);
        assert.match(body.message, /API 키/);
        assert.equal(fetchCalled, false);
      }
    );
  });

  it("지원하지 않는 AI 연결 종류는 한국어 오류로 거절한다", async () => {
    const response = await POST(createJsonRequest({ provider: "unknown" }));
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.match(body.error, /지원하지 않는 AI 연결 종류/);
  });
});
