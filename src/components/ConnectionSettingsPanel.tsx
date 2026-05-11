import React from "react";

import type { AiConnectionStatus, MarketConnectionStatusItem } from "@/lib/connections/connectionTypes.ts";

type ConnectionSettingsPanelProps = {
  aiStatus: AiConnectionStatus;
  marketStatus: MarketConnectionStatusItem[];
};

const statusLabelMap: Record<AiConnectionStatus["status"], string> = {
  ready: "연결됨",
  needs_configuration: "설정 필요",
  unavailable: "사용 불가",
  error: "오류"
};

const realtimeLabelMap: Record<MarketConnectionStatusItem["realtimeOHLCV"], string> = {
  websocket: "빠른 실시간 갱신",
  polling: "주기적 갱신",
  unsupported: "실시간 미지원"
};

const secretSourceLabelMap: Record<AiConnectionStatus["secretSource"], string> = {
  none: "저장된 키 없음",
  server_env: "서버 환경 변수",
  local_memory: "현재 세션"
};

const marketTypeLabelMap: Record<MarketConnectionStatusItem["supportedMarketTypes"][number], string> = {
  spot: "현물",
  linear_perp: "USDT/USDC 무기한",
  inverse_perp: "코인 마진 무기한",
  dated_future: "만기 선물"
};

const joinMarketTypes = (marketTypes: MarketConnectionStatusItem["supportedMarketTypes"]) =>
  marketTypes.length > 0 ? marketTypes.map((marketType) => marketTypeLabelMap[marketType]).join(", ") : "지원 시장 없음";

const aiDisplayNameMap: Record<AiConnectionStatus["provider"], string> = {
  mock: "샘플 응답",
  openai: "OpenAI",
  gemini: "Gemini",
  ollama: "Ollama",
  openai_compatible: "OpenAI 호환"
};

const formatAiMessage = (aiStatus: AiConnectionStatus) => {
  if (aiStatus.provider === "mock") {
    return "AI 연결 안 됨. 샘플 응답을 사용할 수 있습니다.";
  }

  return aiStatus.message
    .replaceAll("provider", "연결")
    .replaceAll("Provider", "연결")
    .replaceAll("fallback", "기본 안내")
    .replaceAll("mock", "샘플 응답");
};

const formatMarketMessage = (message: string) =>
  message
    .replaceAll("market provider", "시세 연결")
    .replaceAll("provider", "연결")
    .replaceAll("Provider", "연결")
    .replaceAll("fallback", "기본 안내")
    .replaceAll("WebSocket", "빠른 실시간 갱신")
    .replaceAll("Polling", "주기적 갱신");

export function ConnectionSettingsPanel({ aiStatus, marketStatus }: ConnectionSettingsPanelProps) {
  return React.createElement(
    "section",
    {
      className: "connection-settings-panel",
      "aria-labelledby": "connection-settings-title"
    },
    [
      React.createElement(
        "div",
        {
          className: "connection-settings-heading",
          key: "heading"
        },
        [
          React.createElement("p", { className: "eyebrow", key: "eyebrow" }, "연결"),
          React.createElement("h3", { id: "connection-settings-title", key: "title" }, "연결 상태")
        ]
      ),
      React.createElement(
        "p",
        {
          className: "connection-security-note",
          key: "security"
        },
        "브라우저에 API 키를 저장하지 않습니다"
      ),
      React.createElement(
        "div",
        {
          className: "connection-group",
          key: "ai"
        },
        [
          React.createElement(
            "div",
            {
              className: "connection-row-header",
              key: "header"
            },
            [
              React.createElement("strong", { key: "label" }, "AI 연결"),
              React.createElement(
                "span",
                {
                  className: `connection-status-badge ${aiStatus.status}`,
                  key: "status"
                },
                statusLabelMap[aiStatus.status]
              )
            ]
          ),
          React.createElement("p", { className: "connection-message", key: "message" }, formatAiMessage(aiStatus)),
          React.createElement(
            "dl",
            {
              className: "connection-meta",
              key: "meta"
            },
            [
              React.createElement("div", { key: "provider" }, [
                React.createElement("dt", { key: "dt" }, "AI 응답"),
                React.createElement("dd", { key: "dd" }, aiDisplayNameMap[aiStatus.provider])
              ]),
              React.createElement("div", { key: "secret" }, [
                React.createElement("dt", { key: "dt" }, "키 위치"),
                React.createElement("dd", { key: "dd" }, secretSourceLabelMap[aiStatus.secretSource])
              ])
            ]
          )
        ]
      ),
      React.createElement(
        "div",
        {
          className: "connection-group",
          key: "market"
        },
        [
          React.createElement(
            "div",
            {
              className: "connection-row-header",
              key: "header"
            },
            [
              React.createElement("strong", { key: "label" }, "거래소 시세 연결"),
              React.createElement("span", { className: "connection-count", key: "count" }, `${marketStatus.length}개`)
            ]
          ),
          React.createElement(
            "ul",
            {
              className: "connection-provider-list",
              key: "providers"
            },
            marketStatus.map((item) =>
              React.createElement(
                "li",
                {
                  className: "connection-provider-item",
                  key: item.id
                },
                [
                  React.createElement(
                    "div",
                    {
                      className: "connection-row-header",
                      key: "provider-header"
                    },
                    [
                      React.createElement("span", { key: "name" }, item.name),
                      React.createElement(
                        "span",
                        {
                          className: `connection-status-badge ${item.enabled ? "ready" : "needs_configuration"}`,
                          key: "enabled"
                        },
                        item.enabled ? "활성" : "준비 중"
                      )
                    ]
                  ),
                  React.createElement("p", { className: "connection-message", key: "message" }, formatMarketMessage(item.message)),
                  React.createElement(
                    "span",
                    {
                      className: "connection-provider-meta",
                      key: "meta"
                    },
                    `${joinMarketTypes(item.supportedMarketTypes)} · ${
                      item.historicalOHLCV ? "과거 캔들 지원" : "과거 캔들 준비 중"
                    } · ${realtimeLabelMap[item.realtimeOHLCV]}`
                  )
                ]
              )
            )
          )
        ]
      )
    ]
  );
}
