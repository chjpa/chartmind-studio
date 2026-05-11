import type { Candle, Instrument } from "../types/market.ts";
import type { SubscriptionHandle } from "./marketDataProvider.ts";

export type StreamingOHLCVParams = {
  instrument: Instrument;
  interval: string;
};

export type StreamingOHLCVCallback = (candle: Candle) => void;

export interface StreamingProvider {
  id: string;
  supports(instrument: Instrument, interval: string): boolean;
  subscribeOHLCV(params: StreamingOHLCVParams, callback: StreamingOHLCVCallback): Promise<SubscriptionHandle>;
  unsubscribeOHLCV(subscriptionId: string): Promise<void>;
}
