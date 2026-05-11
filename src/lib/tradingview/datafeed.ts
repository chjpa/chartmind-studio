import { exchangeOptions } from "../market/exchangeRegistry.ts";
import {
  getSupportedIntervals,
  getUnsupportedIntervalMessage,
  isIntervalSupported
} from "../market/exchangeCapabilities.ts";
import { streamingRouter as defaultStreamingRouter } from "../market/streamingRouter.ts";
import type { StreamingRouter } from "../market/streamingRouter.ts";
import { defaultInstrument, type Candle, type Instrument, type MarketType } from "../types/market.ts";
import {
  instrumentToSearchResult,
  instrumentToSymbolInfo,
  parseTradingViewTicker,
  tradingViewSymbolToInstrumentId
} from "./symbolMapper.ts";
import type { TradingViewDatafeed, TradingViewResolutionString } from "./types.ts";

type DatafeedFetcher = (input: string | URL | Request) => Promise<Response>;

type CreateTradingViewDatafeedOptions = {
  fetcher?: DatafeedFetcher;
  selectedMarketType?: MarketType;
  selectedInstrument?: Instrument;
  streamingRouter?: Pick<StreamingRouter, "subscribeOHLCV" | "unsubscribeOHLCV">;
};

const symbolInfoCache = new Map<string, Instrument>();

const getFetcher = (fetcher?: DatafeedFetcher): DatafeedFetcher => {
  if (fetcher) {
    return fetcher;
  }

  return (input) => fetch(input);
};

const toPreferredMarketType = (symbolType: string, selectedMarketType?: MarketType): MarketType | undefined => {
  if (selectedMarketType) {
    return selectedMarketType;
  }

  if (symbolType === "spot") {
    return "spot";
  }

  if (symbolType === "futures") {
    return "linear_perp";
  }

  return undefined;
};

const requestJson = async <T>(fetcher: DatafeedFetcher, url: string): Promise<T> => {
  const response = await fetcher(url);

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: "시장 데이터 API 요청에 실패했습니다." }));
    throw new Error(typeof body.error === "string" ? body.error : "시장 데이터 API 요청에 실패했습니다.");
  }

  return response.json() as Promise<T>;
};

const buildInstrumentsUrl = (params: {
  query?: string;
  exchange?: string;
  marketType?: MarketType;
}) => {
  const searchParams = new URLSearchParams();

  if (params.query) {
    searchParams.set("query", params.query);
  }

  if (params.exchange) {
    searchParams.set("exchange", params.exchange);
  }

  if (params.marketType) {
    searchParams.set("marketType", params.marketType);
  }

  const queryString = searchParams.toString();

  return `/api/markets/instruments${queryString ? `?${queryString}` : ""}`;
};

const buildOHLCVUrl = (params: {
  instrumentId: string;
  interval: TradingViewResolutionString;
  from?: number;
  to?: number;
  limit?: number;
}) => {
  const searchParams = new URLSearchParams({
    instrumentId: params.instrumentId,
    interval: params.interval
  });

  if (typeof params.from === "number") {
    searchParams.set("from", String(params.from));
  }

  if (typeof params.to === "number") {
    searchParams.set("to", String(params.to));
  }

  if (typeof params.limit === "number") {
    searchParams.set("limit", String(params.limit));
  }

  return `/api/markets/ohlcv?${searchParams.toString()}`;
};

const findInstrumentForTicker = async (fetcher: DatafeedFetcher, ticker: string) => {
  const parsedTicker = parseTradingViewTicker(ticker);
  const instrumentId = tradingViewSymbolToInstrumentId(ticker);
  const instruments = await requestJson<Instrument[]>(
    fetcher,
    buildInstrumentsUrl({
      query: `${parsedTicker.base}/${parsedTicker.quote}`,
      exchange: parsedTicker.exchange,
      marketType: parsedTicker.marketType
    })
  );
  const instrument = instruments.find((item) => item.id === instrumentId);

  if (!instrument) {
    throw new Error("상품 정보를 찾을 수 없습니다.");
  }

  return instrument;
};

const toBars = (candles: Candle[]) =>
  [...candles].sort((left, right) => left.time - right.time).map((candle) => ({
    time: candle.time,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    volume: candle.volume
  }));

export const createTradingViewDatafeed = (
  options: CreateTradingViewDatafeedOptions = {}
): TradingViewDatafeed => {
  const fetcher = getFetcher(options.fetcher);
  const realtimeRouter = options.streamingRouter ?? defaultStreamingRouter;
  const realtimeSubscriptions = new Map<string, string>();

  return {
    onReady(callback) {
      setTimeout(
        () =>
          callback({
            supported_resolutions: [...getSupportedIntervals(
              options.selectedInstrument?.exchange ?? defaultInstrument.exchange,
              options.selectedInstrument?.marketType ?? defaultInstrument.marketType
            )],
            exchanges: exchangeOptions
              .filter((exchange) => exchange.isProviderEnabled)
              .map((exchange) => ({
                value: exchange.id,
                name: exchange.label,
                desc: exchange.label
              })),
            symbols_types: [
              {
                name: "암호화폐",
                value: "crypto"
              },
              {
                name: "현물",
                value: "spot"
              },
              {
                name: "선물",
                value: "futures"
              }
            ]
          }),
        0
      );
    },

    async searchSymbols(userInput, exchange, symbolType, onResultReadyCallback) {
      if (symbolType && !["crypto", "spot", "futures"].includes(symbolType)) {
        onResultReadyCallback([]);
        return;
      }

      const instruments = await requestJson<Instrument[]>(
        fetcher,
        buildInstrumentsUrl({
          query: userInput,
          exchange: exchange || undefined,
          marketType: toPreferredMarketType(symbolType, options.selectedMarketType)
        })
      );

      onResultReadyCallback(instruments.map((instrument) => instrumentToSearchResult(instrument)));
    },

    async resolveSymbol(symbolName, onSymbolResolvedCallback, onResolveErrorCallback) {
      try {
        const instrument = await findInstrumentForTicker(fetcher, symbolName);
        symbolInfoCache.set(symbolName, instrument);
        onSymbolResolvedCallback(instrumentToSymbolInfo(instrument));
      } catch (error) {
        onResolveErrorCallback(error instanceof Error ? error.message : "상품 정보를 찾을 수 없습니다.");
      }
    },

    async getBars(symbolInfo, resolution, periodParams, onHistoryCallback, onErrorCallback) {
      try {
        const instrumentId = tradingViewSymbolToInstrumentId(symbolInfo.ticker);
        const instrument =
          symbolInfoCache.get(symbolInfo.ticker) ?? (await findInstrumentForTicker(fetcher, symbolInfo.ticker));

        if (!isIntervalSupported(instrument, resolution)) {
          throw new Error(getUnsupportedIntervalMessage(instrument, resolution));
        }

        const candles = await requestJson<Candle[]>(
          fetcher,
          buildOHLCVUrl({
            instrumentId,
            interval: resolution,
            from: periodParams.from,
            to: periodParams.to,
            limit: periodParams.countBack
          })
        );
        const bars = toBars(candles);

        onHistoryCallback(bars, { noData: bars.length === 0 });
      } catch (error) {
        onErrorCallback(error instanceof Error ? error.message : "캔들 데이터를 불러오지 못했습니다.");
      }
    },

    subscribeBars(symbolInfo, resolution, onRealtimeCallback, subscriberUid, onResetCacheNeededCallback) {
      void (async () => {
        try {
          const instrument =
            symbolInfoCache.get(symbolInfo.ticker) ?? (await findInstrumentForTicker(fetcher, symbolInfo.ticker));

          if (!isIntervalSupported(instrument, resolution)) {
            throw new Error(getUnsupportedIntervalMessage(instrument, resolution));
          }

          const handle = await realtimeRouter.subscribeOHLCV(
            { instrument, interval: resolution },
            (candle) => onRealtimeCallback(toBars([candle])[0])
          );

          realtimeSubscriptions.set(subscriberUid, handle.id);
        } catch {
          onResetCacheNeededCallback();
        }
      })();
    },

    unsubscribeBars(subscriberUid) {
      const subscriptionId = realtimeSubscriptions.get(subscriberUid);

      if (!subscriptionId) {
        return;
      }

      realtimeSubscriptions.delete(subscriberUid);
      void realtimeRouter.unsubscribeOHLCV(subscriptionId);
    }
  };
};

export const datafeed = createTradingViewDatafeed();
