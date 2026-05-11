import { createBinanceKlineStreamProvider, type WebSocketFactory } from "./binanceKlineStream.ts";

type BinanceLinearPerpStreamProviderOptions = {
  websocketFactory?: WebSocketFactory;
};

export const createBinanceLinearPerpStreamProvider = (options: BinanceLinearPerpStreamProviderOptions = {}) =>
  createBinanceKlineStreamProvider({
    id: "binance-linear-perp-stream",
    endpoint: "wss://fstream.binance.com/ws",
    marketType: "linear_perp",
    websocketFactory: options.websocketFactory
  });

export const binanceLinearPerpStreamProvider = createBinanceLinearPerpStreamProvider();
