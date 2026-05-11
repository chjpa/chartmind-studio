import type { Instrument } from "../types/market.ts";
import { parseTradingViewTicker, tradingViewSymbolToInstrumentId } from "./symbolMapper.ts";

export type InstrumentFetcher = (input: string | URL | Request) => Promise<Response>;

const getFetcher = (fetcher?: InstrumentFetcher): InstrumentFetcher => {
  if (fetcher) {
    return fetcher;
  }

  return (input) => fetch(input);
};

const buildInstrumentsUrl = (ticker: string) => {
  const parsedTicker = parseTradingViewTicker(ticker);
  const searchParams = new URLSearchParams({
    query: `${parsedTicker.base}/${parsedTicker.quote}`,
    exchange: parsedTicker.exchange,
    marketType: parsedTicker.marketType
  });

  return `/api/markets/instruments?${searchParams.toString()}`;
};

export const resolveInstrumentFromTicker = async (
  ticker: string,
  fetcher?: InstrumentFetcher
): Promise<Instrument | null> => {
  const expectedInstrumentId = tradingViewSymbolToInstrumentId(ticker);
  const response = await getFetcher(fetcher)(buildInstrumentsUrl(ticker));

  if (!response.ok) {
    return null;
  }

  const instruments = (await response.json()) as Instrument[];

  return instruments.find((instrument) => instrument.id === expectedInstrumentId) ?? null;
};

export const shouldSetChartSymbol = (currentTicker: string | null | undefined, nextTicker: string) =>
  currentTicker !== nextTicker;
