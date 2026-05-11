import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

import type { AiConnectionStatus, MarketConnectionStatusItem } from "@/lib/connections/connectionTypes.ts";

declare global {
  var __testReact: typeof React;
}

const importConnectionSettingsPanel = async () => {
  const source = fs.readFileSync(new URL("./ConnectionSettingsPanel.tsx", import.meta.url), "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.React,
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true
    }
  });
  const runnableOutput = output.outputText.replace('import React from "react";', "const React = globalThis.__testReact;");
  globalThis.__testReact = React;
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(runnableOutput).toString("base64")}`;

  return import(moduleUrl) as Promise<typeof import("./ConnectionSettingsPanel.tsx")>;
};

describe("ConnectionSettingsPanel", () => {
  it("연결 상태 문구와 거래소별 메시지를 렌더링한다", async () => {
    const { ConnectionSettingsPanel } = await importConnectionSettingsPanel();
    const aiStatus: AiConnectionStatus = {
      provider: "mock",
      status: "needs_configuration",
      message: "서버 환경 변수에 AI API 키가 설정되지 않았습니다.",
      secretSource: "none"
    };
    const marketStatus: MarketConnectionStatusItem[] = [
      {
        id: "binance",
        name: "Binance",
        enabled: true,
        supportedMarketTypes: ["spot", "linear_perp"],
        historicalOHLCV: true,
        realtimeOHLCV: "websocket",
        message: "Binance 공개 REST와 빠른 실시간 갱신 시세를 사용할 수 있습니다."
      }
    ];

    const html = renderToStaticMarkup(
      React.createElement(ConnectionSettingsPanel, {
        aiStatus,
        marketStatus
      })
    );

    assert.match(html, /연결 상태/);
    assert.match(html, /AI 연결/);
    assert.match(html, /거래소 시세 연결/);
    assert.match(html, /브라우저에 API 키를 저장하지 않습니다/);
    assert.match(html, /Binance 공개 REST와 빠른 실시간 갱신 시세를 사용할 수 있습니다/);
  });
});
