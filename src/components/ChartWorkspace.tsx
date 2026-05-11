import type {
  ChartPanelState,
  ChartStateUpdate,
  Instrument,
  MultiChartLayout,
  MultiChartState
} from "@/lib/types/market";
import { exchangeOptions, marketTypeOptions } from "@/lib/market/exchangeRegistry";
import { intervalLabels } from "@/lib/market/timeframeMapper";
import {
  formatInstrumentBadgeLabel,
  formatInstrumentIdentity,
  formatInstrumentPair,
  formatMarketTypeLabel
} from "@/lib/tradingview/symbolMapper";
import { MarketSelector } from "./MarketSelector";
import { TradingViewChart } from "./TradingViewChart";

type ChartWorkspaceProps = {
  multiChartState: MultiChartState;
  activeChartState: ChartPanelState;
  onSelectChart: (chartId: string) => void;
  onSelectInstrument: (instrument: Instrument, chartId?: string) => void;
  onSetLayout: (layout: MultiChartLayout) => void;
  onUpdateChartState: (update: ChartStateUpdate, chartId?: string) => void;
};

const layoutOptions: Array<{ id: MultiChartLayout; label: string }> = [
  { id: "single", label: "1분할" },
  { id: "double", label: "2분할" },
  { id: "quad", label: "4분할" }
];

const getExchangeLabel = (panel: ChartPanelState) =>
  exchangeOptions.find((exchange) => exchange.id === panel.selectedExchange)?.label ?? panel.selectedExchange;

const getMarketTypeLabel = (panel: ChartPanelState) =>
  marketTypeOptions.find((marketType) => marketType.id === panel.selectedMarketType)?.label ?? panel.selectedMarketType;

const createPriceText = (panel: ChartPanelState) =>
  panel.currentPrice === null
    ? "현재 가격 대기 중"
    : `${panel.currentPrice.toLocaleString()} ${panel.selectedInstrument.quote}`;

const createPanelLabel = (panel: ChartPanelState) =>
  `${formatInstrumentIdentity(panel.selectedInstrument)} · ${intervalLabels[panel.selectedInterval]}`;

export function ChartWorkspace({
  multiChartState,
  activeChartState,
  onSelectChart,
  onSelectInstrument,
  onSetLayout,
  onUpdateChartState
}: ChartWorkspaceProps) {
  const badgeKind = activeChartState.selectedInstrument.marketType === "spot" ? "spot" : "futures";

  return (
    <section className="workspace-panel chart-panel" aria-labelledby="chart-workspace-title">
      <div className="chart-symbol-bar">
        <div>
          <span className={`market-badge ${badgeKind}`}>{formatInstrumentBadgeLabel(activeChartState.selectedInstrument)}</span>
          <h1 id="chart-workspace-title">{formatInstrumentIdentity(activeChartState.selectedInstrument)}</h1>
        </div>
        <div className="chart-symbol-meta" aria-label="활성 차트 요약">
          <span>{getExchangeLabel(activeChartState)}</span>
          <span>{getMarketTypeLabel(activeChartState)}</span>
          <span>{intervalLabels[activeChartState.selectedInterval]}</span>
          <strong>{createPriceText(activeChartState)}</strong>
        </div>
      </div>

      <div className="chart-command-bar" aria-label="차트 도구">
        <span>십자선</span>
        <span>추세선</span>
        <span>피보나치</span>
        <span>알림</span>
        <span>비교</span>
        <div className="layout-switcher" aria-label="차트 분할">
          {layoutOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              className={multiChartState.layout === option.id ? "active" : undefined}
              onClick={() => onSetLayout(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="chart-workspace-grid">
        <nav className="chart-side-toolbar" aria-label="그리기 도구">
          <button type="button" aria-label="커서">⌖</button>
          <button type="button" aria-label="추세선">／</button>
          <button type="button" aria-label="수평선">━</button>
          <button type="button" aria-label="텍스트">T</button>
          <button type="button" aria-label="측정">↕</button>
        </nav>

        <div className="chart-main-area">
          <MarketSelector
            chartState={activeChartState}
            onSelectInstrument={(instrument) => onSelectInstrument(instrument, activeChartState.chartId)}
            onUpdateChartState={(update) => onUpdateChartState(update, activeChartState.chartId)}
          />

          <div className="instrument-summary" aria-label="활성 차트 종목 정보">
            <dl>
              <div>
                <dt>거래소</dt>
                <dd>{getExchangeLabel(activeChartState)}</dd>
              </div>
              <div>
                <dt>시장 유형</dt>
                <dd>{formatMarketTypeLabel(activeChartState.selectedInstrument)}</dd>
              </div>
              <div>
                <dt>거래쌍</dt>
                <dd>{formatInstrumentPair({ ...activeChartState.selectedInstrument, settle: undefined })}</dd>
              </div>
              <div>
                <dt>정산 통화</dt>
                <dd>{activeChartState.selectedInstrument.settle ?? "없음"}</dd>
              </div>
            </dl>
          </div>

          <div className={`multi-chart-grid ${multiChartState.layout}`} aria-label="멀티 차트">
            {multiChartState.panels.map((panel) => {
              const isActive = panel.chartId === multiChartState.activeChartId;
              const panelBadgeKind = panel.selectedInstrument.marketType === "spot" ? "spot" : "futures";

              return (
                <article
                  key={panel.chartId}
                  className={isActive ? "chart-tile active" : "chart-tile"}
                  aria-label={createPanelLabel(panel)}
                  onClick={() => onSelectChart(panel.chartId)}
                >
                  <div className="chart-tile-header">
                    <div>
                      <span className={`market-badge ${panelBadgeKind}`}>
                        {formatInstrumentBadgeLabel(panel.selectedInstrument)}
                      </span>
                      <strong>{formatInstrumentIdentity(panel.selectedInstrument)}</strong>
                    </div>
                    <span>{intervalLabels[panel.selectedInterval]}</span>
                  </div>
                  <div className="chart-canvas-area">
                    <TradingViewChart
                      instrument={panel.selectedInstrument}
                      interval={panel.selectedInterval}
                      onInstrumentChange={(instrument) => onSelectInstrument(instrument, panel.chartId)}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>

      <div className="chart-status-bar" aria-label="차트 상태">
        <span>활성 차트: {createPanelLabel(activeChartState)}</span>
        <span>선택 도형: {activeChartState.selectedDrawingId ?? "없음"}</span>
        <span>동기화: 같은 종목끼리 인터벌, 지표, 작도 공유</span>
      </div>
    </section>
  );
}
