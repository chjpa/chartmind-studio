import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

import type { AiConnectionStatus, MarketConnectionStatusItem } from "@/lib/connections/connectionTypes.ts";
import type { ConnectionSettingsPanel } from "./ConnectionSettingsPanel.tsx";

declare global {
  var __testReact: typeof React;
  var __testConnectionSettingsPanel: typeof ConnectionSettingsPanel;
}

const transpileTsx = (source: string) =>
  ts.transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.React,
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true
    }
  }).outputText;

const importConnectionSettingsPanel = async () => {
  const source = fs.readFileSync(new URL("./ConnectionSettingsPanel.tsx", import.meta.url), "utf8");
  const runnableOutput = transpileTsx(source).replace(
    'import React from "react";',
    "const React = globalThis.__testReact;"
  );
  globalThis.__testReact = React;
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(runnableOutput).toString("base64")}`;

  return import(moduleUrl) as Promise<typeof import("./ConnectionSettingsPanel.tsx")>;
};

const importPreferencesPanel = async () => {
  const { ConnectionSettingsPanel } = await importConnectionSettingsPanel();
  const source = fs.readFileSync(new URL("./PreferencesPanel.tsx", import.meta.url), "utf8");
  const runnableOutput = transpileTsx(source)
    .replace('"use client";', "")
    .replace(
      'import React, { useEffect, useState } from "react";',
      "const React = globalThis.__testReact; const { useEffect, useState } = React;"
    )
    .replace('import { ConnectionSettingsPanel } from "./ConnectionSettingsPanel";', "const ConnectionSettingsPanel = globalThis.__testConnectionSettingsPanel;");

  globalThis.__testReact = React;
  globalThis.__testConnectionSettingsPanel = ConnectionSettingsPanel;
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(runnableOutput).toString("base64")}`;

  return import(moduleUrl) as Promise<typeof import("./PreferencesPanel.tsx")>;
};

const importAppHeader = async () => {
  const source = fs.readFileSync(new URL("./AppHeader.tsx", import.meta.url), "utf8");
  const runnableOutput = `const React = globalThis.__testReact;\n${transpileTsx(source).replace(
    'import { appBrand } from "@/lib/config/appBrand";',
    `const appBrand = ${JSON.stringify({
      koreanName: "차트 분석",
      name: "Trading Desk",
      tagline: "로컬 차트 워크스페이스",
      description: "시세와 AI 분석을 한 화면에서 확인합니다."
    })};`
  )}`;
  globalThis.__testReact = React;
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(runnableOutput).toString("base64")}`;

  return import(moduleUrl) as Promise<typeof import("./AppHeader.tsx")>;
};

describe("PreferencesPanel", () => {
  it("설정 섹션과 보안 안내를 렌더링한다", async () => {
    const { PreferencesPanel } = await importPreferencesPanel();
    const aiStatus: AiConnectionStatus = {
      provider: "mock",
      status: "needs_configuration",
      message: "AI 연결 안 됨. 샘플 응답을 사용할 수 있습니다.",
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
        message: "Binance 공개 시세를 사용할 수 있습니다."
      }
    ];

    const html = renderToStaticMarkup(
      React.createElement(PreferencesPanel, {
        aiStatus,
        marketStatus,
        onClose: () => undefined
      })
    );

    assert.match(html, /설정/);
    assert.match(html, /AI 연결/);
    assert.match(html, /거래소 시세 연결/);
    assert.match(html, /TradingView 라이브러리/);
    assert.match(html, /OpenAI/);
    assert.match(html, /Gemini/);
    assert.match(html, /Ollama/);
    assert.match(html, /연결 테스트/);
    assert.match(html, /브라우저에 API 키를 저장하지 않습니다/);
  });

  it("AppHeader가 설정 버튼을 렌더링한다", async () => {
    const { AppHeader } = await importAppHeader();
    const html = renderToStaticMarkup(React.createElement(AppHeader, { onOpenPreferences: () => undefined }));

    assert.match(html, /설정/);
  });
});
