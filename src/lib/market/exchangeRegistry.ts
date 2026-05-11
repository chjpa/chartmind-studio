import type { ExchangeId, Instrument, MarketType } from "../types/market.ts";
import type { InstrumentSearchOptions } from "./marketDataProvider.ts";
import { createProviderRegistry, type ProviderRegistry } from "./providerRegistry.ts";
import { createStaticMarketDataProvider } from "./providers/baseProvider.ts";
import { createBinanceRestProvider } from "./providers/binanceRestProvider.ts";

export type ExchangeConfig = {
  id: ExchangeId;
  label: string;
  supportedMarketTypes: Exclude<MarketType, "index" | "mark">[];
};

export type ExchangeOption = ExchangeConfig & {
  isProviderEnabled: boolean;
  disabledReason?: string;
};

export type MarketTypeOption = {
  id: Exclude<MarketType, "index" | "mark">;
  label: string;
  shortLabel: string;
};

export const providerNotImplementedMessage = "아직 데이터 연결이 구현되지 않았습니다.";

export const exchangeConfigs: ExchangeConfig[] = [
  { id: "binance", label: "Binance", supportedMarketTypes: ["spot", "linear_perp", "inverse_perp", "dated_future"] },
  { id: "bybit", label: "Bybit", supportedMarketTypes: ["spot", "linear_perp", "inverse_perp"] },
  { id: "okx", label: "OKX", supportedMarketTypes: ["spot", "linear_perp", "inverse_perp"] },
  { id: "upbit", label: "Upbit", supportedMarketTypes: ["spot"] },
  { id: "coinbase", label: "Coinbase", supportedMarketTypes: ["spot"] },
  { id: "bitget", label: "Bitget", supportedMarketTypes: ["spot", "linear_perp"] }
];

export const marketTypeOptions: MarketTypeOption[] = [
  { id: "spot", label: "현물", shortLabel: "현물" },
  { id: "linear_perp", label: "USDT/USDC 무기한 선물", shortLabel: "선물" },
  { id: "inverse_perp", label: "코인 무기한 선물", shortLabel: "선물" },
  { id: "dated_future", label: "만기 선물", shortLabel: "선물" }
];

export const instrumentCatalog: Instrument[] = [
  {
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
  },
  {
    id: "binance:spot:ETH/USDT",
    exchange: "binance",
    marketType: "spot",
    base: "ETH",
    quote: "USDT",
    symbol: "ETHUSDT",
    displaySymbol: "ETH/USDT",
    tradingViewTicker: "BINANCE:SPOT:ETHUSDT",
    description: "Binance ETH/USDT 현물",
    priceScale: 100,
    minMove: 1,
    volumePrecision: 8,
    pricePrecision: 2,
    isActive: true
  },
  {
    id: "binance:linear_perp:BTC/USDT:USDT",
    exchange: "binance",
    marketType: "linear_perp",
    base: "BTC",
    quote: "USDT",
    settle: "USDT",
    symbol: "BTCUSDT",
    displaySymbol: "BTC/USDT 무기한",
    tradingViewTicker: "BINANCE:PERP:BTCUSDT",
    description: "Binance BTC/USDT USDT 무기한 선물",
    priceScale: 100,
    minMove: 1,
    volumePrecision: 8,
    pricePrecision: 2,
    isActive: true
  },
  {
    id: "binance:inverse_perp:BTC/USD:BTC",
    exchange: "binance",
    marketType: "inverse_perp",
    base: "BTC",
    quote: "USD",
    settle: "BTC",
    symbol: "BTCUSD_PERP",
    displaySymbol: "BTC/USD 코인 무기한",
    tradingViewTicker: "BINANCE:PERP:BTCUSD",
    description: "Binance BTC/USD 코인 무기한 선물",
    priceScale: 100,
    minMove: 1,
    volumePrecision: 8,
    pricePrecision: 2,
    isActive: true
  },
  {
    id: "binance:dated_future:BTC/USDT:USDT",
    exchange: "binance",
    marketType: "dated_future",
    base: "BTC",
    quote: "USDT",
    settle: "USDT",
    symbol: "BTCUSDT_260327",
    displaySymbol: "BTC/USDT 만기 선물",
    tradingViewTicker: "BINANCE:FUTURE:BTCUSDT",
    description: "Binance BTC/USDT 만기 선물",
    priceScale: 100,
    minMove: 1,
    volumePrecision: 8,
    pricePrecision: 2,
    isActive: true
  },
  {
    id: "bybit:spot:BTC/USDT",
    exchange: "bybit",
    marketType: "spot",
    base: "BTC",
    quote: "USDT",
    symbol: "BTCUSDT",
    displaySymbol: "BTC/USDT",
    tradingViewTicker: "BYBIT:SPOT:BTCUSDT",
    description: "Bybit BTC/USDT 현물",
    priceScale: 100,
    minMove: 1,
    volumePrecision: 8,
    pricePrecision: 2,
    isActive: true
  },
  {
    id: "bybit:linear_perp:BTC/USDT:USDT",
    exchange: "bybit",
    marketType: "linear_perp",
    base: "BTC",
    quote: "USDT",
    settle: "USDT",
    symbol: "BTCUSDT",
    displaySymbol: "BTC/USDT 무기한",
    tradingViewTicker: "BYBIT:PERP:BTCUSDT",
    description: "Bybit BTC/USDT USDT 무기한 선물",
    priceScale: 100,
    minMove: 1,
    volumePrecision: 8,
    pricePrecision: 2,
    isActive: true
  },
  {
    id: "okx:spot:BTC/USDT",
    exchange: "okx",
    marketType: "spot",
    base: "BTC",
    quote: "USDT",
    symbol: "BTC-USDT",
    displaySymbol: "BTC/USDT",
    tradingViewTicker: "OKX:SPOT:BTCUSDT",
    description: "OKX BTC/USDT 현물",
    priceScale: 100,
    minMove: 1,
    volumePrecision: 8,
    pricePrecision: 2,
    isActive: true
  },
  {
    id: "okx:spot:ETH/USDT",
    exchange: "okx",
    marketType: "spot",
    base: "ETH",
    quote: "USDT",
    symbol: "ETH-USDT",
    displaySymbol: "ETH/USDT",
    tradingViewTicker: "OKX:SPOT:ETHUSDT",
    description: "OKX ETH/USDT 현물",
    priceScale: 100,
    minMove: 1,
    volumePrecision: 8,
    pricePrecision: 2,
    isActive: true
  },
  {
    id: "okx:linear_perp:BTC/USDT:USDT",
    exchange: "okx",
    marketType: "linear_perp",
    base: "BTC",
    quote: "USDT",
    settle: "USDT",
    symbol: "BTC-USDT-SWAP",
    displaySymbol: "BTC/USDT 무기한",
    tradingViewTicker: "OKX:PERP:BTCUSDT",
    description: "OKX BTC/USDT USDT 무기한 선물",
    priceScale: 100,
    minMove: 1,
    volumePrecision: 8,
    pricePrecision: 2,
    isActive: true
  },
  {
    id: "okx:linear_perp:ETH/USDT:USDT",
    exchange: "okx",
    marketType: "linear_perp",
    base: "ETH",
    quote: "USDT",
    settle: "USDT",
    symbol: "ETH-USDT-SWAP",
    displaySymbol: "ETH/USDT 무기한",
    tradingViewTicker: "OKX:PERP:ETHUSDT",
    description: "OKX ETH/USDT USDT 무기한 선물",
    priceScale: 100,
    minMove: 1,
    volumePrecision: 8,
    pricePrecision: 2,
    isActive: true
  },
  {
    id: "upbit:spot:BTC/KRW",
    exchange: "upbit",
    marketType: "spot",
    base: "BTC",
    quote: "KRW",
    symbol: "KRW-BTC",
    displaySymbol: "BTC/KRW",
    tradingViewTicker: "UPBIT:SPOT:BTCKRW",
    description: "Upbit BTC/KRW 현물",
    priceScale: 1,
    minMove: 1,
    volumePrecision: 8,
    pricePrecision: 0,
    isActive: true
  }
];

type InstrumentFilter = InstrumentSearchOptions & {
  query?: string;
};

export const binanceProvider = createBinanceRestProvider({
  instruments: instrumentCatalog
});

export const bybitProvider = createStaticMarketDataProvider({
  id: "bybit",
  name: "Bybit",
  supportedMarketTypes: ["spot", "linear_perp", "inverse_perp"],
  instruments: instrumentCatalog
});

export const okxProvider = createStaticMarketDataProvider({
  id: "okx",
  name: "OKX",
  supportedMarketTypes: ["spot", "linear_perp", "inverse_perp"],
  instruments: instrumentCatalog
});

export const upbitProvider = createStaticMarketDataProvider({
  id: "upbit",
  name: "Upbit",
  supportedMarketTypes: ["spot"],
  instruments: instrumentCatalog
});

export const providerRegistry = createProviderRegistry([binanceProvider, bybitProvider, okxProvider, upbitProvider]);

const createExchangeOptions = (
  configs: ExchangeConfig[],
  registry: ProviderRegistry
): ExchangeOption[] =>
  configs.map((exchange) => {
    const isProviderEnabled = registry.hasProvider(exchange.id);

    return {
      ...exchange,
      isProviderEnabled,
      disabledReason: isProviderEnabled ? undefined : providerNotImplementedMessage
    };
  });

export const exchangeOptions = createExchangeOptions(exchangeConfigs, providerRegistry);

export const getExchangeOption = (exchange: ExchangeId): ExchangeOption | undefined =>
  exchangeOptions.find((option) => option.id === exchange);

export const isExchangeProviderEnabled = (exchange: ExchangeId) =>
  providerRegistry.hasProvider(exchange);

export const getExchangeMarketTypes = (exchange: ExchangeId) =>
  getExchangeOption(exchange)?.supportedMarketTypes ?? [];

export const getMarketTypeOption = (marketType: MarketType) =>
  marketTypeOptions.find((option) => option.id === marketType);

export const getMarketTypeOptionsForExchange = (exchange: ExchangeId) => {
  const supportedMarketTypes = getExchangeMarketTypes(exchange);

  return marketTypeOptions.filter((option) => supportedMarketTypes.includes(option.id));
};

export const getInstruments = (filter: InstrumentFilter = {}): Instrument[] => {
  if (filter.exchange && !isExchangeProviderEnabled(filter.exchange)) {
    return [];
  }

  return providerRegistry
    .getProviders()
    .flatMap((provider) =>
      instrumentCatalog.filter((instrument) => {
        if (instrument.exchange !== provider.id) {
          return false;
        }

        if (filter.exchange && instrument.exchange !== filter.exchange) {
          return false;
        }

        if (filter.marketType && instrument.marketType !== filter.marketType) {
          return false;
        }

        if (!filter.query) {
          return true;
        }

        const normalizedQuery = filter.query.trim().toUpperCase().replaceAll("/", "");
        const searchableText = [
          instrument.symbol,
          instrument.displaySymbol,
          instrument.tradingViewTicker,
          instrument.description
        ]
          .join(" ")
          .toUpperCase()
          .replaceAll("/", "");

        return searchableText.includes(normalizedQuery);
      })
    );
};

export const findInstrument = (instrumentId: string): Instrument | undefined =>
  getInstruments().find((instrument) => instrument.id === instrumentId);

export const marketDataRouter = providerRegistry.createRouter();
