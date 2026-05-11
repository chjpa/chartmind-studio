"use client";

import { useMemo, useState } from "react";
import type { ChartState, ChartStateUpdate, ExchangeId, Instrument, MarketType } from "@/lib/types/market";
import {
  formatRealtimeOHLCVCapability,
  getInstrumentCapabilities,
  getIntervalCapabilities,
  getUnsupportedIntervalMessage,
  isIntervalSupported
} from "@/lib/market/exchangeCapabilities";
import {
  exchangeOptions,
  getExchangeOption,
  getInstruments,
  getMarketTypeOptionsForExchange,
  providerNotImplementedMessage
} from "@/lib/market/exchangeRegistry";
import { internalIntervals, intervalLabels, type InternalInterval } from "@/lib/market/timeframeMapper";

type MarketSelectorProps = {
  chartState: ChartState;
  onSelectInstrument: (instrument: Instrument) => void;
  onUpdateChartState: (update: ChartStateUpdate) => void;
};

const selectFirstInstrument = (
  exchange: ExchangeId,
  marketType: MarketType,
  query: string
): Instrument | undefined =>
  getInstruments({
    exchange,
    marketType,
    query
  })[0] ??
  getInstruments({
    exchange,
    marketType
  })[0];

const formatUserNotice = (message: string) =>
  message.replaceAll("provider", "연결").replaceAll("Provider", "연결").replaceAll("fallback", "기본 안내");

export function MarketSelector({ chartState, onSelectInstrument, onUpdateChartState }: MarketSelectorProps) {
  const [symbolQuery, setSymbolQuery] = useState("");
  const selectedExchangeOption = getExchangeOption(chartState.selectedExchange);
  const isProviderEnabled = selectedExchangeOption?.isProviderEnabled ?? false;
  const marketTypeOptions = getMarketTypeOptionsForExchange(chartState.selectedExchange);
  const intervalCapabilities = getIntervalCapabilities(
    chartState.selectedInstrument.exchange,
    chartState.selectedInstrument.marketType
  );
  const instrumentCapabilities = getInstrumentCapabilities(chartState.selectedInstrument);
  const supportedIntervalSet = new Set(intervalCapabilities.map((capability) => capability.interval));
  const isSelectedIntervalSupported = isIntervalSupported(chartState.selectedInstrument, chartState.selectedInterval);
  const matchingInstruments = useMemo(
    () =>
      getInstruments({
        exchange: chartState.selectedExchange,
        marketType: chartState.selectedMarketType,
        query: symbolQuery
      }),
    [chartState.selectedExchange, chartState.selectedMarketType, symbolQuery]
  );

  const handleExchangeChange = (exchange: ExchangeId) => {
    const supportedMarketTypes = getMarketTypeOptionsForExchange(exchange);
    const nextMarketType = supportedMarketTypes.some((marketType) => marketType.id === chartState.selectedMarketType)
      ? chartState.selectedMarketType
      : supportedMarketTypes[0]?.id;

    if (!nextMarketType) {
      onUpdateChartState({ selectedExchange: exchange });
      return;
    }

    const nextInstrument = selectFirstInstrument(exchange, nextMarketType, symbolQuery);

    if (nextInstrument) {
      onSelectInstrument(nextInstrument);
      return;
    }

    onUpdateChartState({
      selectedExchange: exchange,
      selectedMarketType: nextMarketType
    });
  };

  const handleMarketTypeChange = (marketType: MarketType) => {
    const nextInstrument = selectFirstInstrument(chartState.selectedExchange, marketType, symbolQuery);

    if (nextInstrument) {
      onSelectInstrument(nextInstrument);
      return;
    }

    onUpdateChartState({ selectedMarketType: marketType });
  };

  const handleIntervalChange = (interval: InternalInterval) => {
    if (!isIntervalSupported(chartState.selectedInstrument, interval)) {
      return;
    }

    onUpdateChartState({ selectedInterval: interval });
  };

  return (
    <section className="market-selector" aria-label="시장 선택">
      <label>
        <span>거래소</span>
        <select
          value={chartState.selectedExchange}
          onChange={(event) => handleExchangeChange(event.target.value)}
        >
          {exchangeOptions.map((exchange) => (
            <option key={exchange.id} value={exchange.id}>
              {exchange.isProviderEnabled ? exchange.label : `${exchange.label} (준비 중)`}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span>시장</span>
        <select
          value={chartState.selectedMarketType}
          onChange={(event) => handleMarketTypeChange(event.target.value as MarketType)}
        >
          {marketTypeOptions.map((marketType) => (
            <option key={marketType.id} value={marketType.id}>
              {marketType.label}
            </option>
          ))}
        </select>
      </label>

      <label className="symbol-search">
        <span>심볼 검색</span>
        <input
          type="search"
          value={symbolQuery}
          onChange={(event) => setSymbolQuery(event.target.value)}
          placeholder="BTC/USDT"
        />
      </label>

      <label>
        <span>인터벌</span>
        <select
          value={chartState.selectedInterval}
          onChange={(event) => handleIntervalChange(event.target.value as InternalInterval)}
        >
          {internalIntervals.map((interval) => (
            <option
              key={interval}
              value={interval}
              disabled={!supportedIntervalSet.has(interval)}
            >
              {intervalLabels[interval]}
            </option>
          ))}
        </select>
      </label>

      {!isProviderEnabled ? (
        <p className="provider-notice">
          {formatUserNotice(selectedExchangeOption?.disabledReason ?? providerNotImplementedMessage)}
        </p>
      ) : null}

      {!isSelectedIntervalSupported ? (
        <p className="provider-notice">
          {formatUserNotice(getUnsupportedIntervalMessage(chartState.selectedInstrument, chartState.selectedInterval))}
        </p>
      ) : null}

      <div className="instrument-results" aria-label="선택 가능한 종목">
        {matchingInstruments.map((instrument) => (
          <button
            key={instrument.id}
            type="button"
            className={instrument.id === chartState.selectedInstrument.id ? "instrument-option selected" : "instrument-option"}
            onClick={() => onSelectInstrument(instrument)}
          >
            <span>{instrument.displaySymbol}</span>
            <small>{instrument.description}</small>
          </button>
        ))}
        {isProviderEnabled && matchingInstruments.length === 0 ? <p>검색 결과가 없습니다.</p> : null}
      </div>

      <div className="selected-instrument">
        <span>선택한 종목</span>
        <strong>{chartState.selectedInstrument.displaySymbol}</strong>
      </div>

      <div className="capability-panel" aria-label="현재 종목 데이터 지원 범위">
        <span>데이터 지원 범위</span>
        <dl>
          <div>
            <dt>과거 캔들</dt>
            <dd>{instrumentCapabilities.historicalOHLCV ? "지원" : "미지원"}</dd>
          </div>
          <div>
            <dt>실시간</dt>
            <dd>{formatRealtimeOHLCVCapability(instrumentCapabilities.realtimeOHLCV)}</dd>
          </div>
          <div>
            <dt>호가창</dt>
            <dd>{instrumentCapabilities.orderbook ? "지원" : "미지원"}</dd>
          </div>
          <div>
            <dt>체결</dt>
            <dd>{instrumentCapabilities.trades ? "지원" : "미지원"}</dd>
          </div>
          <div>
            <dt>펀딩비</dt>
            <dd>{instrumentCapabilities.fundingRate ? "지원" : "지원 예정"}</dd>
          </div>
          <div>
            <dt>미결제약정</dt>
            <dd>{instrumentCapabilities.openInterest ? "지원" : "미지원"}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
