import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { classifyAccessScope, createSystemStatus } from "../../../../lib/security/accessPolicy.ts";
import { GET } from "./route.ts";

describe("system status access policy", () => {
  it("localhost와 loopback 주소를 local로 분류한다", () => {
    assert.equal(classifyAccessScope("localhost:3000"), "local");
    assert.equal(classifyAccessScope("127.0.0.1:3000"), "local");
    assert.equal(classifyAccessScope("::1"), "local");
    assert.equal(classifyAccessScope("[::1]:3000"), "local");
  });

  it("사설망 주소를 lan으로 분류한다", () => {
    assert.equal(classifyAccessScope("10.0.0.12:3000"), "lan");
    assert.equal(classifyAccessScope("172.16.0.12:3000"), "lan");
    assert.equal(classifyAccessScope("172.31.0.12:3000"), "lan");
    assert.equal(classifyAccessScope("192.168.0.12:3000"), "lan");
  });

  it("그 외 주소와 누락된 host를 public 또는 unknown으로 분류한다", () => {
    assert.equal(classifyAccessScope("example.com"), "public");
    assert.equal(classifyAccessScope("8.8.8.8:3000"), "public");
    assert.equal(classifyAccessScope(null), "unknown");
  });

  it("시스템 상태에 한국어 메시지와 secretPolicy를 포함한다", () => {
    const status = createSystemStatus({
      host: "localhost:3000",
      nodeEnv: "development",
      hasAiApiKey: false
    });

    assert.equal(status.accessScope, "local");
    assert.equal(status.isPubliclyExposed, false);
    assert.equal(status.nodeEnv, "development");
    assert.equal(status.hasAiApiKey, false);
    assert.match(status.message, /로컬/);
    assert.match(status.secretPolicy, /API 키는 브라우저에 저장하지 않습니다/);
  });
});

describe("/api/system/status", () => {
  it("host header를 기준으로 local 상태를 반환한다", async () => {
    const response = await GET(
      new Request("http://localhost/api/system/status", {
        headers: {
          host: "localhost:3000"
        }
      })
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.accessScope, "local");
    assert.equal(body.isPubliclyExposed, false);
    assert.equal(body.message.includes("로컬"), true);
    assert.equal(typeof body.secretPolicy, "string");
  });
});
