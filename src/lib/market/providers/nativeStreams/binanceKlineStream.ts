import type { Candle, Instrument, MarketType } from "../../../types/market.ts";
import type { SubscriptionHandle } from "../../marketDataProvider.ts";
import type { StreamingOHLCVCallback, StreamingOHLCVParams, StreamingProvider } from "../../streamingProvider.ts";
import { internalIntervals, toExchangeTimeframe } from "../../timeframeMapper.ts";

type WebSocketLike = {
  onmessage: ((event: { data: string }) => void) | null;
  close: () => void;
};

export type WebSocketFactory = (url: string) => WebSocketLike;

type BinanceKlineStreamProviderOptions = {
  id: string;
  endpoint: string;
  marketType: MarketType;
  websocketFactory?: WebSocketFactory;
};

type StreamConnection = {
  key: string;
  socket: WebSocketLike;
  callbacks: Map<string, StreamingOHLCVCallback>;
  lastCandleTime: number | null;
};

const createDefaultWebSocket = (url: string): WebSocketLike => {
  if (typeof WebSocket === "undefined") {
    throw new Error("브라우저 WebSocket을 사용할 수 없습니다.");
  }

  return new WebSocket(url) as unknown as WebSocketLike;
};

const createSubscriptionId = (providerId: string) =>
  `${providerId}:${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`}`;

const normalizeStreamSymbol = (instrument: Instrument) =>
  instrument.symbol.replace(/[^A-Z0-9]/giu, "").toLowerCase();

const parseKlineMessage = (rawData: string): Candle | null => {
  const payload = JSON.parse(rawData) as {
    data?: {
      k?: Record<string, string | number | boolean>;
    };
    k?: Record<string, string | number | boolean>;
  };
  const kline = payload.data?.k ?? payload.k;

  if (!kline) {
    return null;
  }

  return {
    time: Number(kline.t),
    open: Number(kline.o),
    high: Number(kline.h),
    low: Number(kline.l),
    close: Number(kline.c),
    volume: Number(kline.v)
  };
};

export const createBinanceKlineStreamProvider = ({
  id,
  endpoint,
  marketType,
  websocketFactory = createDefaultWebSocket
}: BinanceKlineStreamProviderOptions): StreamingProvider => {
  const connections = new Map<string, StreamConnection>();
  const subscriptionKeys = new Map<string, string>();

  const buildStreamKey = ({ instrument, interval }: StreamingOHLCVParams) => {
    const streamInterval = toExchangeTimeframe(instrument.exchange, instrument.marketType, interval);

    return `${instrument.exchange}:${instrument.marketType}:${instrument.symbol}:${streamInterval}`;
  };

  const buildStreamUrl = (instrument: Instrument, interval: string) => {
    const streamInterval = toExchangeTimeframe(instrument.exchange, instrument.marketType, interval);

    return `${endpoint}/${normalizeStreamSymbol(instrument)}@kline_${streamInterval}`;
  };

  const createConnection = (params: StreamingOHLCVParams) => {
    const key = buildStreamKey(params);
    const connection: StreamConnection = {
      key,
      socket: websocketFactory(buildStreamUrl(params.instrument, params.interval)),
      callbacks: new Map(),
      lastCandleTime: null
    };

    connection.socket.onmessage = (event) => {
      const candle = parseKlineMessage(event.data);

      if (!candle) {
        return;
      }

      if (connection.lastCandleTime !== null && candle.time < connection.lastCandleTime) {
        return;
      }

      connection.lastCandleTime = candle.time;
      connection.callbacks.forEach((callback) => callback(candle));
    };
    connections.set(key, connection);

    return connection;
  };

  return {
    id,
    supports(instrument, interval) {
      return (
        instrument.exchange === "binance" &&
        instrument.marketType === marketType &&
        internalIntervals.includes(interval as (typeof internalIntervals)[number])
      );
    },
    async subscribeOHLCV(params, callback): Promise<SubscriptionHandle> {
      if (!this.supports(params.instrument, params.interval)) {
        throw new Error("지원하지 않는 Binance 실시간 상품입니다.");
      }

      const key = buildStreamKey(params);
      const connection = connections.get(key) ?? createConnection(params);
      const subscriptionId = createSubscriptionId(id);

      connection.callbacks.set(subscriptionId, callback);
      subscriptionKeys.set(subscriptionId, key);

      return { id: subscriptionId };
    },
    async unsubscribeOHLCV(subscriptionId) {
      const key = subscriptionKeys.get(subscriptionId);

      if (!key) {
        return;
      }

      const connection = connections.get(key);
      subscriptionKeys.delete(subscriptionId);

      if (!connection) {
        return;
      }

      connection.callbacks.delete(subscriptionId);

      if (connection.callbacks.size === 0) {
        connection.socket.close();
        connections.delete(key);
      }
    }
  };
};
