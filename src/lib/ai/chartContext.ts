import { getInstrumentCapabilities, getSupportedIntervals } from "../market/exchangeCapabilities.ts";
import {
  createUnavailableDerivativesContext,
  isDerivativeMarketType
} from "../market/derivativesDataProvider.ts";
import type { CandleSummary } from "../types/ai.ts";
import type { DerivativesContextAvailability } from "../types/derivatives.ts";
import type { ChartDrawing } from "../types/drawings.ts";
import type { ChartState, InstrumentCapabilities } from "../types/market.ts";
import { formatInstrumentIdentity } from "../tradingview/symbolMapper.ts";

type BuildChartContextParams = {
  chartState: ChartState;
  candleSummary: CandleSummary;
  drawings?: ChartDrawing[];
  derivativesContext?: DerivativesContextAvailability;
};

export type AvailableMarketInfo = {
  instrumentIdentity: string;
  base: string;
  quote: string;
  settle: string | null;
  isDerivative: boolean;
  supportedIntervals: string[];
  unavailableDerivativeData: string[];
};

export type ChartContext = {
  instrumentId: string;
  exchange: string;
  marketType: ChartState["selectedMarketType"];
  displaySymbol: string;
  interval: string;
  currentPrice: number | null;
  candleSummary: CandleSummary;
  userDrawings: ChartDrawing[];
  engineDrawings: ChartDrawing[];
  selectedDrawingId: string | null;
  selectedDrawing: ChartDrawing | null;
  capabilities: InstrumentCapabilities;
  availableMarketInfo: AvailableMarketInfo;
  derivativesContext: DerivativesContextAvailability;
};

const belongsToCurrentChart = (drawing: ChartDrawing, chartState: ChartState) =>
  drawing.instrumentId === chartState.selectedInstrument.id && drawing.interval === chartState.selectedInterval;

const createDefaultDerivativesContext = (chartState: ChartState) => {
  if (!isDerivativeMarketType(chartState.selectedMarketType)) {
    return createUnavailableDerivativesContext("현물 시장에는 파생상품 컨텍스트가 없습니다.");
  }

  return createUnavailableDerivativesContext("파생상품 데이터 연결이 아직 연결되지 않았습니다.");
};

export const buildChartContext = ({
  chartState,
  candleSummary,
  drawings = [],
  derivativesContext
}: BuildChartContextParams): ChartContext => {
  const instrument = chartState.selectedInstrument;
  const currentChartDrawings = drawings.filter((drawing) => belongsToCurrentChart(drawing, chartState));
  const userDrawings = currentChartDrawings.filter((drawing) =>
    drawing.source === "user" || drawing.source === "engine_modified_by_user"
  );
  const engineDrawings = currentChartDrawings.filter((drawing) => drawing.source === "engine");
  const selectedDrawing =
    currentChartDrawings.find((drawing) => drawing.id === chartState.selectedDrawingId) ?? null;
  const isDerivative = isDerivativeMarketType(instrument.marketType);
  const resolvedDerivativesContext = derivativesContext ?? createDefaultDerivativesContext(chartState);
  const capabilities = getInstrumentCapabilities(instrument);

  return {
    instrumentId: instrument.id,
    exchange: instrument.exchange,
    marketType: instrument.marketType,
    displaySymbol: instrument.displaySymbol,
    interval: chartState.selectedInterval,
    currentPrice: chartState.currentPrice,
    candleSummary,
    userDrawings,
    engineDrawings,
    selectedDrawingId: chartState.selectedDrawingId,
    selectedDrawing,
    capabilities,
    derivativesContext: resolvedDerivativesContext,
    availableMarketInfo: {
      instrumentIdentity: formatInstrumentIdentity(instrument),
      base: instrument.base,
      quote: instrument.quote,
      settle: instrument.settle ?? null,
      isDerivative,
      supportedIntervals: [...getSupportedIntervals(instrument.exchange, instrument.marketType)],
      unavailableDerivativeData: resolvedDerivativesContext.unavailableFields
    }
  };
};
