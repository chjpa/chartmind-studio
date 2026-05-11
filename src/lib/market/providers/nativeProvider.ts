import type { Candle, ExchangeId, Instrument, MarketType } from "../../types/market.ts";
import type { InstrumentSearchOptions, MarketDataProvider, OHLCVParams } from "../marketDataProvider.ts";

type NativeProviderAdapter = {
  id: ExchangeId;
  name: string;
  supportedMarketTypes: MarketType[];
  loadInstruments(marketType?: MarketType): Promise<Instrument[]>;
  searchInstruments?(query: string, options?: InstrumentSearchOptions): Promise<Instrument[]>;
  fetchOHLCV(params: OHLCVParams): Promise<Candle[]>;
};

const normalizeQuery = (query: string) => query.trim().toUpperCase().replaceAll("/", "");

const defaultSearchInstruments = async (
  adapter: NativeProviderAdapter,
  query: string,
  options: InstrumentSearchOptions = {}
) => {
  const instruments = await adapter.loadInstruments(options.marketType);
  const normalizedQuery = normalizeQuery(query);

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
};

export const createNativeProvider = (adapter: NativeProviderAdapter): MarketDataProvider => ({
  id: adapter.id,
  name: adapter.name,
  supportedMarketTypes: adapter.supportedMarketTypes,
  loadInstruments(marketType) {
    return adapter.loadInstruments(marketType);
  },
  searchInstruments(query, options) {
    return adapter.searchInstruments?.(query, options) ?? defaultSearchInstruments(adapter, query, options);
  },
  fetchOHLCV(params) {
    return adapter.fetchOHLCV(params);
  }
});
