"use client";

import React, { useEffect, useState } from "react";
import type {
  AiConnectionStatus,
  LlmConnectionStatus,
  LlmProviderId,
  MarketConnectionStatusItem
} from "@/lib/connections/connectionTypes";
import { ConnectionSettingsPanel } from "./ConnectionSettingsPanel";

type PreferencesPanelProps = {
  aiStatus?: AiConnectionStatus;
  llmStatus?: LlmConnectionStatus;
  marketStatus?: MarketConnectionStatusItem[];
  onClose: () => void;
};

type MarketConnectionStatusResponse = {
  exchanges: MarketConnectionStatusItem[];
};

const defaultAiStatus: AiConnectionStatus = {
  provider: "mock",
  status: "ready",
  message: "AI 연결 안 됨. 샘플 응답을 사용할 수 있습니다.",
  secretSource: "none"
};

const defaultMarketStatus: MarketConnectionStatusItem[] = [
  {
    id: "binance",
    name: "Binance",
    enabled: false,
    supportedMarketTypes: ["spot", "linear_perp"],
    historicalOHLCV: false,
    realtimeOHLCV: "unsupported",
    message: "거래소 연결 상태를 확인하기 전입니다."
  }
];

const defaultLlmStatus: LlmConnectionStatus = {
  cloud: {
    openai: {
      configured: false,
      label: "OpenAI",
      model: "gpt-4.1-mini",
      message: "OpenAI를 쓰려면 서버에 OPENAI_API_KEY를 설정하세요."
    },
    gemini: {
      configured: false,
      label: "Gemini",
      model: "gemini-2.5-flash",
      message: "Gemini를 쓰려면 서버에 GEMINI_API_KEY를 설정하세요."
    }
  },
  local: {
    ollama: {
      configured: false,
      baseUrlConfigured: false,
      label: "Ollama",
      model: "gemma3",
      message: "Ollama 로컬 주소를 설정하면 연결 테스트를 할 수 있습니다."
    },
    openai_compatible: {
      configured: false,
      baseUrlConfigured: false,
      label: "OpenAI 호환",
      model: "gemma3",
      message: "OpenAI 호환 로컬 주소를 설정하면 연결 테스트를 할 수 있습니다."
    }
  },
  active: {
    provider: "sample",
    label: "샘플 응답",
    message: "AI 연결 안 됨, 샘플 응답 사용"
  }
};

const llmProviderLabels: Record<LlmProviderId, string> = {
  openai: "OpenAI",
  gemini: "Gemini",
  ollama: "Ollama",
  openai_compatible: "OpenAI 호환"
};

export function PreferencesPanel({
  aiStatus: initialAiStatus,
  llmStatus: initialLlmStatus,
  marketStatus: initialMarketStatus,
  onClose
}: PreferencesPanelProps) {
  const [aiStatus, setAiStatus] = useState<AiConnectionStatus>(initialAiStatus ?? defaultAiStatus);
  const [llmStatus, setLlmStatus] = useState<LlmConnectionStatus>(initialLlmStatus ?? defaultLlmStatus);
  const [marketStatus, setMarketStatus] = useState<MarketConnectionStatusItem[]>(
    initialMarketStatus ?? defaultMarketStatus
  );
  const [testProvider, setTestProvider] = useState<LlmProviderId>("openai");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("http://localhost:11434");
  const [model, setModel] = useState("");
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    if (initialAiStatus || initialLlmStatus || initialMarketStatus) {
      return;
    }

    let isMounted = true;

    const loadConnectionStatus = async () => {
      try {
        const [aiResponse, llmResponse, marketResponse] = await Promise.all([
          fetch("/api/connections/ai/status"),
          fetch("/api/connections/llm/status"),
          fetch("/api/connections/market/status")
        ]);

        if (!aiResponse.ok || !llmResponse.ok || !marketResponse.ok) {
          throw new Error("연결 상태 API 응답이 올바르지 않습니다.");
        }

        const nextAiStatus = (await aiResponse.json()) as AiConnectionStatus;
        const nextLlmStatus = (await llmResponse.json()) as LlmConnectionStatus;
        const nextMarketStatus = (await marketResponse.json()) as MarketConnectionStatusResponse;

        if (isMounted) {
          setAiStatus(nextAiStatus);
          setLlmStatus(nextLlmStatus);
          setMarketStatus(nextMarketStatus.exchanges);
        }
      } catch {
        if (isMounted) {
          setAiStatus({
            ...defaultAiStatus,
            status: "error",
            message: "연결 상태를 불러오지 못했습니다. 현재 화면에서는 기본 안내를 표시합니다."
          });
          setLlmStatus(defaultLlmStatus);
          setMarketStatus(defaultMarketStatus);
        }
      }
    };

    void loadConnectionStatus();

    return () => {
      isMounted = false;
    };
  }, [initialAiStatus, initialLlmStatus, initialMarketStatus]);

  const handleConnectionTest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsTesting(true);
    setTestMessage(null);

    try {
      const response = await fetch("/api/connections/llm/test", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          provider: testProvider,
          apiKey: apiKey || undefined,
          baseUrl: baseUrl || undefined,
          model: model || undefined
        })
      });
      const body = (await response.json()) as { message?: string; error?: string };

      setTestMessage(body.message ?? body.error ?? "연결 테스트 결과를 확인하지 못했습니다.");
    } catch {
      setTestMessage("연결 테스트 요청을 보내지 못했습니다.");
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="preferences-backdrop" role="presentation">
      <aside className="preferences-panel" aria-labelledby="preferences-title" role="dialog" aria-modal="true">
        <div className="preferences-header">
          <div>
            <p className="eyebrow">환경</p>
            <h2 id="preferences-title">설정</h2>
          </div>
          <button type="button" className="preferences-close-button" onClick={onClose} aria-label="설정 닫기">
            닫기
          </button>
        </div>

        <ConnectionSettingsPanel aiStatus={aiStatus} marketStatus={marketStatus} />

        <section className="preferences-section" aria-labelledby="llm-preferences-title">
          <div className="preferences-section-heading">
            <p className="eyebrow">AI</p>
            <h3 id="llm-preferences-title">AI 연결</h3>
          </div>
          <p>{llmStatus.active.message}</p>
          <div className="llm-status-grid" aria-label="AI 연결 상태">
            <div>
              <strong>OpenAI</strong>
              <span>{llmStatus.cloud.openai.configured ? "서버에 키 있음" : "키 필요"}</span>
              <small>{llmStatus.cloud.openai.model}</small>
            </div>
            <div>
              <strong>Gemini</strong>
              <span>{llmStatus.cloud.gemini.configured ? "서버에 키 있음" : "키 필요"}</span>
              <small>{llmStatus.cloud.gemini.model}</small>
            </div>
            <div>
              <strong>Ollama</strong>
              <span>{llmStatus.local.ollama.baseUrlConfigured ? "주소 설정됨" : "주소 필요"}</span>
              <small>{llmStatus.local.ollama.model}</small>
            </div>
            <div>
              <strong>OpenAI 호환</strong>
              <span>{llmStatus.local.openai_compatible.baseUrlConfigured ? "주소 설정됨" : "주소 필요"}</span>
              <small>{llmStatus.local.openai_compatible.model}</small>
            </div>
          </div>

          <form className="llm-test-form" onSubmit={handleConnectionTest}>
            <label>
              <span>연결 종류</span>
              <select value={testProvider} onChange={(event) => setTestProvider(event.target.value as LlmProviderId)}>
                {Object.entries(llmProviderLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>API 키</span>
              <input
                type="password"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder="연결 테스트 때만 사용합니다"
              />
            </label>
            <label>
              <span>로컬 주소</span>
              <input
                value={baseUrl}
                onChange={(event) => setBaseUrl(event.target.value)}
                placeholder="http://localhost:11434"
              />
            </label>
            <label>
              <span>모델</span>
              <input value={model} onChange={(event) => setModel(event.target.value)} placeholder="비워두면 기본값 사용" />
            </label>
            <button type="submit" disabled={isTesting}>
              {isTesting ? "확인 중" : "연결 테스트"}
            </button>
          </form>
          {testMessage ? <p className="llm-test-message">{testMessage}</p> : null}
        </section>

        <section className="preferences-section" aria-labelledby="tradingview-library-title">
          <div className="preferences-section-heading">
            <p className="eyebrow">차트</p>
            <h3 id="tradingview-library-title">TradingView 라이브러리</h3>
          </div>
          <p>공식 접근 승인이 필요한 파일입니다. 승인받은 파일을 public/charting_library 경로에 넣어주세요.</p>
        </section>

        <section className="preferences-section" aria-labelledby="security-guidance-title">
          <div className="preferences-section-heading">
            <p className="eyebrow">보안</p>
            <h3 id="security-guidance-title">보안 안내</h3>
          </div>
          <p>브라우저에 API 키를 저장하지 않습니다. 서버 환경 변수 또는 현재 세션에서만 연결 정보를 확인합니다.</p>
        </section>
      </aside>
    </div>
  );
}
