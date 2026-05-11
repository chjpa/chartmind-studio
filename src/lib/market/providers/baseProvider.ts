import type { ExchangeId, Instrument, MarketType } from "../../types/market.ts";
import type { InstrumentSearchOptions, MarketDataProvider } from "../marketDataProvider.ts";

type StaticMarketDataProviderConfig = {
  id: ExchangeId;
  name: string;
  supportedMarketTypes: MarketType[];
  instruments: Instrument[];
};

type InstrumentFilter = InstrumentSearchOptions & {
  query?: string;
};

const normalizeQuery = (query: string) => query.trim().toUpperCase().replaceAll("/", "");

const filterInstruments = (
  instruments: Instrument[],
  filter: InstrumentFilter = {}
) => {
  const normalizedQuery = normalizeQuery(filter.query ?? "");

  return instruments.filter((instrument) => {
    if (filter.exchange && instrument.exchange !== filter.exchange) {
      return false;
    }

    if (filter.marketType && instrument.marketType !== filter.marketType) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

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
  });
};

export const createStaticMarketDataProvider = ({
  id,
  name,
  supportedMarketTypes,
  instruments
}: StaticMarketDataProviderConfig): MarketDataProvider => ({
  id,
  name,
  supportedMarketTypes,
  async loadInstruments(marketType) {
    return filterInstruments(instruments, { exchange: id, marketType });
  },
  async searchInstruments(query, options) {
    return filterInstruments(instruments, {
      exchange: options?.exchange ?? id,
      marketType: options?.marketType,
      query
    });
  },
  async fetchOHLCV() {
    return [];
  }
});
