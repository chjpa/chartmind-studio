import type { Candle, ExchangeId, Instrument, MarketType } from "../../types/market.ts";
import { formatDisplaySymbol, instrumentToTradingViewSymbol } from "../../tradingview/symbolMapper.ts";
import type { InstrumentSearchOptions, MarketDataProvider, OHLCVParams } from "../marketDataProvider.ts";
import { toCcxtTimeframe, toSinceTimestamp } from "../timeframeMapper.ts";

type CcxtMarket = {
  id?: string;
  symbol?: string;
  base?: string;
  quote?: string;
  settle?: string;
  spot?: boolean;
  swap?: boolean;
  future?: boolean;
  linear?: boolean;
  inverse?: boolean;
  active?: boolean;
  precision?: {
    price?: number;
    amount?: number;
  };
};

type CcxtOHLCV = [number, number, number, number, number, number];

type CcxtClient = {
  loadMarkets(): Promise<Record<string, CcxtMarket>>;
  fetchOHLCV(symbol: string, timeframe: string, since?: number, limit?: number): Promise<CcxtOHLCV[]>;
};

type CcxtModule = Record<string, new (options?: Record<string, unknown>) => CcxtClient>;

type CcxtRestProviderConfig = {
  id: ExchangeId;
  name: string;
  supportedMarketTypes: MarketType[];
  options?: Record<string, unknown>;
  createClient?: () => Promise<CcxtClient>;
};

const ccxtPackageName = "ccxt";

const loadCcxtModule = async () => {
  const ccxtModule = await import(/* webpackIgnore: true */ ccxtPackageName);

  return ccxtModule as CcxtModule;
};

const assertServerRuntime = () => {
  if (typeof window !== "undefined") {
    throw new Error("CCXT REST provider는 서버 환경에서만 사용할 수 있습니다.");
  }
};

const precisionToScale = (precision?: number) => {
  if (typeof precision !== "number" || precision < 0) {
    return 100;
  }

  return 10 ** precision;
};

const mapMarketType = (market: CcxtMarket): MarketType | undefined => {
  if (market.spot) {
    return "spot";
  }

  if (market.swap && market.inverse) {
    return "inverse_perp";
  }

  if (market.swap) {
    return "linear_perp";
  }

  if (market.future) {
    return "dated_future";
  }

  return undefined;
};

const buildInstrumentId = (instrument: Pick<Instrument, "exchange" | "marketType" | "base" | "quote" | "settle">) =>
  `${instrument.exchange}:${instrument.marketType}:${instrument.base}/${instrument.quote}${instrument.settle ? `:${instrument.settle}` : ""}`;

const toDescription = (exchangeName: string, instrument: Pick<Instrument, "base" | "quote" | "marketType" | "settle">) => {
  if (instrument.marketType === "linear_perp") {
    return `${exchangeName} ${instrument.base}/${instrument.quote} ${instrument.settle ?? instrument.quote} 무기한 선물`;
  }

  if (instrument.marketType === "inverse_perp") {
    return `${exchangeName} ${instrument.base}/${instrument.quote} 코인 무기한 선물`;
  }

  if (instrument.marketType === "dated_future") {
    return `${exchangeName} ${instrument.base}/${instrument.quote} 만기 선물`;
  }

  return `${exchangeName} ${instrument.base}/${instrument.quote} 현물`;
};

const marketToInstrument = (
  exchangeId: ExchangeId,
  exchangeName: string,
  market: CcxtMarket
): Instrument | undefined => {
  const marketType = mapMarketType(market);

  if (!marketType || !market.base || !market.quote) {
    return undefined;
  }

  const instrumentBase = {
    exchange: exchangeId,
    marketType,
    base: market.base,
    quote: market.quote,
    settle: market.settle,
    symbol: market.symbol ?? market.id ?? `${market.base}/${market.quote}`,
    priceScale: precisionToScale(market.precision?.price),
    minMove: 1,
    volumePrecision: market.precision?.amount,
    pricePrecision: market.precision?.price,
    isActive: market.active ?? true
  };
  const displayInstrument = {
    ...instrumentBase,
    id: "",
    displaySymbol: "",
    tradingViewTicker: "",
    description: ""
  };
  const instrument: Instrument = {
    ...instrumentBase,
    id: buildInstrumentId(instrumentBase),
    displaySymbol: formatDisplaySymbol(displayInstrument),
    tradingViewTicker: instrumentToTradingViewSymbol(displayInstrument),
    description: toDescription(exchangeName, instrumentBase)
  };

  return instrument;
};

const normalizeQuery = (query: string) => query.trim().toUpperCase().replaceAll("/", "");

const normalizeCandles = (rows: CcxtOHLCV[]): Candle[] =>
  rows.map(([time, open, high, low, close, volume]) => ({
    time,
    open,
    high,
    low,
    close,
    volume
  }));

export const createCcxtRestProvider = ({
  id,
  name,
  supportedMarketTypes,
  options,
  createClient
}: CcxtRestProviderConfig): MarketDataProvider => {
  let clientPromise: Promise<CcxtClient> | undefined;

  const getClient = async () => {
    assertServerRuntime();

    if (!clientPromise) {
      clientPromise = createClient?.() ?? loadCcxtModule().then((ccxt) => {
        const ExchangeClass = ccxt[id];

        if (!ExchangeClass) {
          throw new Error("CCXT에서 지원하지 않는 거래소입니다.");
        }

        return new ExchangeClass({
          enableRateLimit: true,
          ...options
        });
      });
    }

    return clientPromise;
  };

  const loadMappedInstruments = async (marketType?: MarketType) => {
    const markets = await (await getClient()).loadMarkets();

    return Object.values(markets)
      .map((market) => marketToInstrument(id, name, market))
      .filter((instrument): instrument is Instrument => Boolean(instrument))
      .filter((instrument) => supportedMarketTypes.includes(instrument.marketType))
      .filter((instrument) => !marketType || instrument.marketType === marketType);
  };

  return {
    id,
    name,
    supportedMarketTypes,
    loadInstruments(marketType) {
      return loadMappedInstruments(marketType);
    },
    async searchInstruments(query, options: InstrumentSearchOptions = {}) {
      const normalizedQuery = normalizeQuery(query);
      const instruments = await loadMappedInstruments(options.marketType);

      return instruments.filter((instrument) => {
        if (options.exchange && instrument.exchange !== options.exchange) {
          return false;
        }

        if (!normalizedQuery) {
          return true;
        }

        return [
          instrument.symbol,
          instrument.displaySymbol,
          instrument.tradingViewTicker,
          instrument.description
        ]
          .join(" ")
          .toUpperCase()
          .replaceAll("/", "")
          .includes(normalizedQuery);
      });
    },
    async fetchOHLCV(params: OHLCVParams) {
      const client = await getClient();
      const rows = await client.fetchOHLCV(
        params.instrument.symbol,
        toCcxtTimeframe(params.interval),
        toSinceTimestamp(params.from),
        params.limit
      );

      return normalizeCandles(rows);
    }
  };
};
