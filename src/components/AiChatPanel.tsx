"use client";

import type { ChartState } from "@/lib/types/market";
import { buildChartContext } from "@/lib/ai/chartContext";

type AiChatPanelProps = {
  chartState: ChartState;
};

export function AiChatPanel({ chartState }: AiChatPanelProps) {
  const chartContext = buildChartContext({
    chartState,
    candleSummary: null,
    drawings: []
  });
  const realtimeText =
    chartContext.capabilities.realtimeOHLCV === "websocket"
      ? "빠른 실시간 갱신"
      : chartContext.capabilities.realtimeOHLCV === "polling"
        ? "주기적 갱신"
      : "미지원";

  return (
    <aside className="workspace-panel ai-panel" aria-labelledby="ai-chat-title">
      <div className="panel-header">
        <div>
          <p className="eyebrow">AI</p>
          <h2 id="ai-chat-title">AI 채팅 패널</h2>
        </div>
      </div>

      <div className="chat-placeholder">
        <p>AI 분석 연결 전입니다.</p>
        <span>
          현재 {chartContext.availableMarketInfo.instrumentIdentity} {chartContext.interval} 상태를 이후 AI 요청에
          전달합니다. 차트 고유 기준은 내부에서 안전하게 구분합니다. 실시간: {realtimeText}, 펀딩비:{" "}
          {chartContext.capabilities.fundingRate ? "지원" : "지원 예정"}, 미결제약정:{" "}
          {chartContext.capabilities.openInterest ? "지원" : "미지원"}
        </span>
      </div>

      <label className="chat-input-label" htmlFor="chat-input">
        메시지
      </label>
      <textarea id="chat-input" placeholder="AI 연결 후 여기에 질문을 입력합니다." disabled />
      <button type="button" disabled>
        전송
      </button>
    </aside>
  );
}
