import { createBinanceKlineStreamProvider, type WebSocketFactory } from "./binanceKlineStream.ts";

type BinanceSpotStreamProviderOptions = {
  websocketFactory?: WebSocketFactory;
};

export const createBinanceSpotStreamProvider = (options: BinanceSpotStreamProviderOptions = {}) =>
  createBinanceKlineStreamProvider({
    id: "binance-spot-stream",
    endpoint: "wss://stream.binance.com:9443/ws",
    marketType: "spot",
    websocketFactory: options.websocketFactory
  });

export const binanceSpotStreamProvider = createBinanceSpotStreamProvider();
