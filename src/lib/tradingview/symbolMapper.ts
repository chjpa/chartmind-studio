import type { Instrument, MarketType, ParsedTradingViewTicker } from "../types/market.ts";
import { getSupportedIntervals } from "../market/exchangeCapabilities.ts";
import { internalIntervals } from "../market/timeframeMapper.ts";
import type { TradingViewSearchResult, TradingViewSymbolInfo } from "./types.ts";

export const supportedResolutions = internalIntervals;

const knownQuotes = ["USDT", "USDC", "KRW", "USD", "BTC", "ETH", "EUR", "JPY"] as const;

const marketTypeToTickerToken = (marketType: MarketType) => {
  if (marketType === "spot") {
    return "SPOT";
  }

  if (marketType === "linear_perp" || marketType === "inverse_perp") {
    return "PERP";
  }

  if (marketType === "dated_future") {
    return "FUTURE";
  }

  return marketType.toUpperCase();
};

const formatExchangeLabel = (exchange: string) => {
  if (exchange === "binance") {
    return "Binance";
  }

  if (exchange === "bybit") {
    return "Bybit";
  }

  if (exchange === "okx") {
    return "OKX";
  }

  if (exchange === "upbit") {
    return "Upbit";
  }

  if (exchange === "coinbase") {
    return "Coinbase";
  }

  if (exchange === "bitget") {
    return "Bitget";
  }

  return exchange.charAt(0).toUpperCase() + exchange.slice(1);
};

const buildInstrumentId = ({ exchange, marketType, base, quote, settle }: ParsedTradingViewTicker) =>
  `${exchange}:${marketType}:${base}/${quote}${settle ? `:${settle}` : ""}`;

const splitBaseQuote = (symbol: string) => {
  const normalizedSymbol = symbol.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const quote = knownQuotes.find((candidate) => normalizedSymbol.endsWith(candidate));

  if (!quote) {
    throw new Error("TradingView ticker의 quote를 해석할 수 없습니다.");
  }

  const base = normalizedSymbol.slice(0, -quote.length);

  if (!base) {
    throw new Error("TradingView ticker의 base를 해석할 수 없습니다.");
  }

  return { base, quote };
};

export const normalizeExchangeSymbol = (
  rawSymbol: string,
  _exchange: string,
  marketType: MarketType
) => {
  let normalizedSymbol = rawSymbol.toUpperCase().replace(/[^A-Z0-9]/g, "");

  if (marketType === "linear_perp" || marketType === "inverse_perp") {
    normalizedSymbol = normalizedSymbol.replace(/(PERP|SWAP)$/u, "");
  }

  return normalizedSymbol;
};

export const formatDisplaySymbol = (instrument: Instrument) => {
  const baseSymbol = `${instrument.base}/${instrument.quote}`;

  if (instrument.marketType === "linear_perp") {
    return `${baseSymbol} 무기한`;
  }

  if (instrument.marketType === "inverse_perp") {
    return `${baseSymbol} 코인 무기한`;
  }

  if (instrument.marketType === "dated_future") {
    return `${baseSymbol} 만기 선물`;
  }

  return baseSymbol;
};

export const formatInstrumentPair = (instrument: Instrument) => {
  const pair = `${instrument.base}/${instrument.quote}`;

  if (instrument.settle) {
    return `${pair}:${instrument.settle}`;
  }

  return pair;
};

export const formatMarketTypeLabel = (instrument: Instrument) => {
  if (instrument.marketType === "spot") {
    return "현물";
  }

  if (instrument.marketType === "linear_perp") {
    return `${instrument.settle ?? instrument.quote} 무기한 선물`;
  }

  if (instrument.marketType === "inverse_perp") {
    return "코인 무기한 선물";
  }

  if (instrument.marketType === "dated_future") {
    return "만기 선물";
  }

  if (instrument.marketType === "index") {
    return "인덱스";
  }

  return "마크 가격";
};

export const formatInstrumentBadgeLabel = (instrument: Instrument) =>
  instrument.marketType === "spot" ? "현물" : "선물";

export const formatInstrumentIdentity = (instrument: Instrument) =>
  `${formatInstrumentPair(instrument)} · ${formatExchangeLabel(instrument.exchange)} · ${formatMarketTypeLabel(instrument)}`;

export const instrumentToTradingViewSymbol = (instrument: Instrument) =>
  `${instrument.exchange.toUpperCase()}:${marketTypeToTickerToken(instrument.marketType)}:${instrument.base}${instrument.quote}`;

export const parseTradingViewTicker = (ticker: string): ParsedTradingViewTicker => {
  const [exchangeToken, marketTypeToken, symbolToken] = ticker.split(":");

  if (!exchangeToken || !marketTypeToken || !symbolToken) {
    throw new Error("TradingView ticker 형식이 올바르지 않습니다.");
  }

  const { base, quote } = splitBaseQuote(symbolToken);
  const exchange = exchangeToken.toLowerCase();
  const normalizedMarketType = marketTypeToken.toUpperCase();

  if (normalizedMarketType === "SPOT") {
    return { exchange, marketType: "spot", base, quote };
  }

  if (normalizedMarketType === "PERP") {
    if (quote === "USD") {
      return { exchange, marketType: "inverse_perp", base, quote, settle: base };
    }

    return { exchange, marketType: "linear_perp", base, quote, settle: quote };
  }

  if (normalizedMarketType === "FUTURE") {
    return { exchange, marketType: "dated_future", base, quote, settle: quote };
  }

  if (normalizedMarketType === "INDEX") {
    return { exchange, marketType: "index", base, quote };
  }

  if (normalizedMarketType === "MARK") {
    return { exchange, marketType: "mark", base, quote };
  }

  throw new Error("지원하지 않는 TradingView market type입니다.");
};

export const tradingViewSymbolToInstrumentId = (ticker: string) =>
  buildInstrumentId(parseTradingViewTicker(ticker));

export const instrumentToSymbolInfo = (instrument: Instrument): TradingViewSymbolInfo => ({
  name: formatDisplaySymbol(instrument),
  ticker: instrumentToTradingViewSymbol(instrument),
  description: formatInstrumentIdentity(instrument),
  type: "crypto",
  session: "24x7",
  timezone: "Etc/UTC",
  exchange: instrument.exchange,
  listed_exchange: instrument.exchange,
  minmov: instrument.minMove,
  pricescale: instrument.priceScale,
  has_intraday: true,
  has_daily: true,
  supported_resolutions: [...getSupportedIntervals(instrument.exchange, instrument.marketType)],
  volume_precision: instrument.volumePrecision ?? 8,
  data_status: "streaming"
});

export const instrumentToSearchResult = (instrument: Instrument): TradingViewSearchResult => ({
  symbol: formatDisplaySymbol(instrument),
  full_name: instrumentToTradingViewSymbol(instrument),
  description: instrument.description,
  exchange: instrument.exchange,
  ticker: instrumentToTradingViewSymbol(instrument),
  type: "crypto"
});
