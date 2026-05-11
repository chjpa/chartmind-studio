import type { ExchangeId, Instrument, InstrumentCapabilities, MarketType, RealtimeOHLCVCapability } from "../types/market.ts";
import {
  internalIntervals,
  toExchangeTimeframe,
  type InternalInterval
} from "./timeframeMapper.ts";

export type IntervalSupportMode = "native" | "aggregation";

export type IntervalCapability = {
  interval: InternalInterval;
  nativeInterval?: string;
  supportMode: IntervalSupportMode;
};

export type MarketCapability = {
  exchange: ExchangeId;
  marketType: MarketType;
  intervals: IntervalCapability[];
};

type DataCapabilityConfig = {
  exchange: ExchangeId;
  marketType: MarketType;
  historicalOHLCV: boolean;
  realtimeOHLCV: RealtimeOHLCVCapability;
  orderbook: boolean;
  trades: boolean;
  fundingRate: boolean;
  openInterest: boolean;
};

const createNativeIntervals = (
  exchange: ExchangeId,
  marketType: MarketType,
  intervals: InternalInterval[]
): IntervalCapability[] =>
  intervals.map((interval) => ({
    interval,
    nativeInterval: toExchangeTimeframe(exchange, marketType, interval),
    supportMode: "native"
  }));

const allNativeIntervals = [...internalIntervals];
const commonCryptoIntervals: InternalInterval[] = ["1", "5", "15", "60", "240", "1D"];

export const exchangeCapabilities: MarketCapability[] = [
  {
    exchange: "binance",
    marketType: "spot",
    intervals: createNativeIntervals("binance", "spot", allNativeIntervals)
  },
  {
    exchange: "binance",
    marketType: "linear_perp",
    intervals: createNativeIntervals("binance", "linear_perp", allNativeIntervals)
  },
  {
    exchange: "binance",
    marketType: "inverse_perp",
    intervals: createNativeIntervals("binance", "inverse_perp", allNativeIntervals)
  },
  {
    exchange: "binance",
    marketType: "dated_future",
    intervals: createNativeIntervals("binance", "dated_future", allNativeIntervals)
  },
  {
    exchange: "bybit",
    marketType: "spot",
    intervals: createNativeIntervals("bybit", "spot", allNativeIntervals)
  },
  {
    exchange: "bybit",
    marketType: "linear_perp",
    intervals: createNativeIntervals("bybit", "linear_perp", allNativeIntervals)
  },
  {
    exchange: "okx",
    marketType: "spot",
    intervals: createNativeIntervals("okx", "spot", allNativeIntervals)
  },
  {
    exchange: "okx",
    marketType: "linear_perp",
    intervals: createNativeIntervals("okx", "linear_perp", allNativeIntervals)
  },
  {
    exchange: "coinbase",
    marketType: "spot",
    intervals: createNativeIntervals("coinbase", "spot", commonCryptoIntervals)
  },
  {
    exchange: "upbit",
    marketType: "spot",
    intervals: createNativeIntervals("upbit", "spot", ["1", "3", "5", "15", "30", "60", "240", "1D"])
  }
];

const dataCapabilityConfigs: DataCapabilityConfig[] = [
  {
    exchange: "binance",
    marketType: "spot",
    historicalOHLCV: true,
    realtimeOHLCV: "websocket",
    orderbook: false,
    trades: false,
    fundingRate: false,
    openInterest: false
  },
  {
    exchange: "binance",
    marketType: "linear_perp",
    historicalOHLCV: true,
    realtimeOHLCV: "websocket",
    orderbook: false,
    trades: false,
    fundingRate: false,
    openInterest: false
  },
  {
    exchange: "binance",
    marketType: "inverse_perp",
    historicalOHLCV: false,
    realtimeOHLCV: "unsupported",
    orderbook: false,
    trades: false,
    fundingRate: false,
    openInterest: false
  },
  {
    exchange: "binance",
    marketType: "dated_future",
    historicalOHLCV: false,
    realtimeOHLCV: "unsupported",
    orderbook: false,
    trades: false,
    fundingRate: false,
    openInterest: false
  },
  {
    exchange: "bybit",
    marketType: "spot",
    historicalOHLCV: false,
    realtimeOHLCV: "unsupported",
    orderbook: false,
    trades: false,
    fundingRate: false,
    openInterest: false
  },
  {
    exchange: "bybit",
    marketType: "linear_perp",
    historicalOHLCV: false,
    realtimeOHLCV: "unsupported",
    orderbook: false,
    trades: false,
    fundingRate: false,
    openInterest: false
  },
  {
    exchange: "okx",
    marketType: "spot",
    historicalOHLCV: false,
    realtimeOHLCV: "unsupported",
    orderbook: false,
    trades: false,
    fundingRate: false,
    openInterest: false
  },
  {
    exchange: "okx",
    marketType: "linear_perp",
    historicalOHLCV: false,
    realtimeOHLCV: "unsupported",
    orderbook: false,
    trades: false,
    fundingRate: false,
    openInterest: false
  },
  {
    exchange: "coinbase",
    marketType: "spot",
    historicalOHLCV: false,
    realtimeOHLCV: "unsupported",
    orderbook: false,
    trades: false,
    fundingRate: false,
    openInterest: false
  },
  {
    exchange: "upbit",
    marketType: "spot",
    historicalOHLCV: false,
    realtimeOHLCV: "unsupported",
    orderbook: false,
    trades: false,
    fundingRate: false,
    openInterest: false
  }
];

const findCapability = (exchange: ExchangeId, marketType: MarketType): MarketCapability | undefined =>
  exchangeCapabilities.find((capability) => capability.exchange === exchange && capability.marketType === marketType);

const findDataCapability = (exchange: ExchangeId, marketType: MarketType): DataCapabilityConfig | undefined =>
  dataCapabilityConfigs.find((capability) => capability.exchange === exchange && capability.marketType === marketType);

export const getIntervalCapabilities = (exchange: ExchangeId, marketType: MarketType): IntervalCapability[] =>
  findCapability(exchange, marketType)?.intervals ??
  internalIntervals.map((interval) => ({
    interval,
    nativeInterval: toExchangeTimeframe(exchange, marketType, interval),
    supportMode: "native"
  }));

export const getSupportedIntervals = (exchange: ExchangeId, marketType: MarketType): InternalInterval[] =>
  getIntervalCapabilities(exchange, marketType).map((capability) => capability.interval);

export const isIntervalSupported = (instrument: Instrument, interval: string): boolean =>
  getSupportedIntervals(instrument.exchange, instrument.marketType).includes(interval as InternalInterval);

export const getInstrumentCapabilities = (instrument: Instrument): InstrumentCapabilities => {
  const dataCapability = findDataCapability(instrument.exchange, instrument.marketType);

  return {
    historicalOHLCV: dataCapability?.historicalOHLCV ?? false,
    realtimeOHLCV: dataCapability?.realtimeOHLCV ?? "unsupported",
    orderbook: dataCapability?.orderbook ?? false,
    trades: dataCapability?.trades ?? false,
    fundingRate: dataCapability?.fundingRate ?? false,
    openInterest: dataCapability?.openInterest ?? false,
    spot: instrument.marketType === "spot",
    linearPerp: instrument.marketType === "linear_perp",
    inversePerp: instrument.marketType === "inverse_perp"
  };
};

export const formatRealtimeOHLCVCapability = (capability: RealtimeOHLCVCapability) => {
  if (capability === "websocket") {
    return "빠른 실시간 갱신";
  }

  if (capability === "polling") {
    return "주기적 갱신";
  }

  return "미지원";
};

const formatExchangeName = (exchange: ExchangeId) => {
  if (exchange === "binance") {
    return "Binance";
  }

  if (exchange === "okx") {
    return "OKX";
  }

  if (exchange === "bybit") {
    return "Bybit";
  }

  if (exchange === "coinbase") {
    return "Coinbase";
  }

  if (exchange === "upbit") {
    return "Upbit";
  }

  return exchange.charAt(0).toUpperCase() + exchange.slice(1);
};

const formatMarketType = (marketType: MarketType) => {
  if (marketType === "spot") {
    return "현물";
  }

  if (marketType === "linear_perp") {
    return "USDT/USDC 무기한 선물";
  }

  if (marketType === "inverse_perp") {
    return "코인 무기한 선물";
  }

  if (marketType === "dated_future") {
    return "만기 선물";
  }

  return marketType;
};

export const getUnsupportedIntervalMessage = (instrument: Instrument, interval: string) =>
  `${formatExchangeName(instrument.exchange)} ${formatMarketType(instrument.marketType)}은 ${interval} interval을 지원하지 않습니다.`;
