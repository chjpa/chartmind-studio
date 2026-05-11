export type TradingViewResolutionString = "1" | "3" | "5" | "15" | "30" | "60" | "240" | "1D" | "1W";

export type TradingViewBar = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

export type TradingViewSymbolInfo = {
  name: string;
  ticker: string;
  description: string;
  type: "crypto";
  session: "24x7";
  timezone: "Etc/UTC";
  exchange: string;
  listed_exchange: string;
  minmov: number;
  pricescale: number;
  has_intraday: boolean;
  has_daily: boolean;
  supported_resolutions: TradingViewResolutionString[];
  volume_precision: number;
  data_status: "streaming";
};

export type TradingViewSearchResult = {
  symbol: string;
  full_name: string;
  description: string;
  exchange: string;
  ticker: string;
  type: "crypto";
};

export type TradingViewConfiguration = {
  supported_resolutions: TradingViewResolutionString[];
  exchanges: Array<{
    value: string;
    name: string;
    desc: string;
  }>;
  symbols_types: Array<{
    name: string;
    value: string;
  }>;
};

export type TradingViewPeriodParams = {
  from: number;
  to: number;
  firstDataRequest: boolean;
  countBack?: number;
};

export type TradingViewHistoryMetadata = {
  noData?: boolean;
};

export type TradingViewDatafeed = {
  onReady: (callback: (configuration: TradingViewConfiguration) => void) => void;
  searchSymbols: (
    userInput: string,
    exchange: string,
    symbolType: string,
    onResultReadyCallback: (results: TradingViewSearchResult[]) => void
  ) => void;
  resolveSymbol: (
    symbolName: string,
    onSymbolResolvedCallback: (symbolInfo: TradingViewSymbolInfo) => void,
    onResolveErrorCallback: (reason: string) => void
  ) => void;
  getBars: (
    symbolInfo: TradingViewSymbolInfo,
    resolution: TradingViewResolutionString,
    periodParams: TradingViewPeriodParams,
    onHistoryCallback: (bars: TradingViewBar[], metadata: TradingViewHistoryMetadata) => void,
    onErrorCallback: (reason: string) => void
  ) => void;
  subscribeBars: (
    symbolInfo: TradingViewSymbolInfo,
    resolution: TradingViewResolutionString,
    onRealtimeCallback: (bar: TradingViewBar) => void,
    subscriberUid: string,
    onResetCacheNeededCallback: () => void
  ) => void;
  unsubscribeBars: (subscriberUid: string) => void;
};

export type TradingViewSubscription<TCallback extends (...args: never[]) => void> = {
  subscribe: (scope: unknown, callback: TCallback) => void;
  unsubscribe: (scope: unknown, callback: TCallback) => void;
};

export type TradingViewChartApi = {
  onSymbolChanged: () => TradingViewSubscription<(symbolInfo: TradingViewSymbolInfo) => void>;
};

export type TradingViewWidget = {
  onChartReady: (callback: () => void) => void;
  activeChart: () => TradingViewChartApi;
  setSymbol: (symbol: string, interval: TradingViewResolutionString, callback?: () => void) => void;
  remove: () => void;
};

export type TradingViewWidgetOptions = {
  symbol: string;
  interval: TradingViewResolutionString;
  container: HTMLElement;
  datafeed: TradingViewDatafeed;
  library_path: string;
  locale: string;
  autosize: boolean;
  theme: "dark" | "light";
  timezone: "Etc/UTC";
  disabled_features?: string[];
  enabled_features?: string[];
};

export type TradingViewGlobal = {
  widget: new (options: TradingViewWidgetOptions) => TradingViewWidget;
};

declare global {
  interface Window {
    TradingView?: TradingViewGlobal;
  }
}
