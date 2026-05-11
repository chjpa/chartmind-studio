export type ExchangeId = string;

export type MarketType = "spot" | "linear_perp" | "inverse_perp" | "dated_future" | "index" | "mark";

export type ChartInterval = "1" | "3" | "5" | "15" | "30" | "60" | "240" | "1D" | "1W";

export type InstrumentId = string;

export type RealtimeOHLCVCapability = "websocket" | "polling" | "unsupported";

export type InstrumentCapabilities = {
  historicalOHLCV: boolean;
  realtimeOHLCV: RealtimeOHLCVCapability;
  orderbook: boolean;
  trades: boolean;
  fundingRate: boolean;
  openInterest: boolean;
  spot: boolean;
  linearPerp: boolean;
  inversePerp: boolean;
};

export type ParsedTradingViewTicker = {
  exchange: ExchangeId;
  marketType: MarketType;
  base: string;
  quote: string;
  settle?: string;
};

export type Instrument = {
  id: InstrumentId;
  exchange: ExchangeId;
  marketType: MarketType;
  base: string;
  quote: string;
  settle?: string;
  symbol: string;
  displaySymbol: string;
  tradingViewTicker: string;
  description: string;
  priceScale: number;
  minMove: number;
  volumePrecision?: number;
  pricePrecision?: number;
  isActive: boolean;
};

export type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type MarketPrice = {
  instrument: Instrument;
  price: number;
  updatedAt: string;
};

export type ChartState = {
  selectedExchange: ExchangeId;
  selectedMarketType: MarketType;
  selectedInstrument: Instrument;
  selectedInterval: ChartInterval;
  currentPrice: number | null;
  selectedDrawingId: string | null;
  selectedIndicators: string[];
};

export type ChartStateUpdate = Partial<ChartState>;

export type ChartPanelState = ChartState & {
  chartId: string;
};

export type MultiChartLayout = "single" | "double" | "quad";

export type MultiChartState = {
  layout: MultiChartLayout;
  activeChartId: string;
  panels: ChartPanelState[];
};

export const defaultInstrument: Instrument = {
  id: "binance:spot:BTC/USDT",
  exchange: "binance",
  marketType: "spot",
  base: "BTC",
  quote: "USDT",
  symbol: "BTCUSDT",
  displaySymbol: "BTC/USDT",
  tradingViewTicker: "BINANCE:SPOT:BTCUSDT",
  description: "Binance BTC/USDT 현물",
  priceScale: 100,
  minMove: 1,
  volumePrecision: 8,
  pricePrecision: 2,
  isActive: true
};
