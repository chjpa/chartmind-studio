import type { Candle, ExchangeId, Instrument, MarketType } from "../types/market.ts";

export type OHLCVParams = {
  instrument: Instrument;
  interval: string;
  from: number;
  to: number;
  limit?: number;
};

export type SubscriptionHandle = {
  id: string;
};

export type OHLCVCallback = (candle: Candle) => void;

export type InstrumentSearchOptions = {
  exchange?: ExchangeId;
  marketType?: MarketType;
};

export interface MarketDataProvider {
  id: ExchangeId;
  name: string;
  supportedMarketTypes: MarketType[];
  loadInstruments(marketType?: MarketType): Promise<Instrument[]>;
  searchInstruments(query: string, options?: InstrumentSearchOptions): Promise<Instrument[]>;
  fetchOHLCV(params: OHLCVParams): Promise<Candle[]>;
  subscribeOHLCV?(params: OHLCVParams, callback: OHLCVCallback): Promise<SubscriptionHandle>;
  unsubscribeOHLCV?(subscriptionId: string): Promise<void>;
}
