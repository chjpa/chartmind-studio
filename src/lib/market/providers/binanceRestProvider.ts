import type { Candle, Instrument, MarketType } from "../../types/market.ts";
import type { MarketDataProvider, OHLCVParams } from "../marketDataProvider.ts";
import { toExchangeTimeframe, toSinceTimestamp } from "../timeframeMapper.ts";
import { createNativeProvider } from "./nativeProvider.ts";

type BinanceRestProviderOptions = {
  instruments: Instrument[];
  fetcher?: typeof fetch;
};

type BinanceKline = [
  number,
  string,
  string,
  string,
  string,
  string,
  ...unknown[]
];

const supportedMarketTypes: MarketType[] = ["spot", "linear_perp"];

const endpointByMarketType: Partial<Record<MarketType, string>> = {
  spot: "https://api.binance.com/api/v3/klines",
  linear_perp: "https://fapi.binance.com/fapi/v1/klines"
};

const filterInstruments = (instruments: Instrument[], marketType?: MarketType) =>
  instruments.filter((instrument) =>
    instrument.exchange === "binance" &&
    supportedMarketTypes.includes(instrument.marketType) &&
    (!marketType || instrument.marketType === marketType)
  );

const isBinanceKlineArray = (value: unknown): value is BinanceKline[] =>
  Array.isArray(value) &&
  value.every((item) =>
    Array.isArray(item) &&
    typeof item[0] === "number" &&
    typeof item[1] === "string" &&
    typeof item[2] === "string" &&
    typeof item[3] === "string" &&
    typeof item[4] === "string" &&
    typeof item[5] === "string"
  );

const toCandle = (kline: BinanceKline): Candle => ({
  time: kline[0],
  open: Number(kline[1]),
  high: Number(kline[2]),
  low: Number(kline[3]),
  close: Number(kline[4]),
  volume: Number(kline[5])
});

const createBinanceKlineUrl = ({ instrument, interval, from, to, limit }: OHLCVParams) => {
  const endpoint = endpointByMarketType[instrument.marketType];

  if (!endpoint) {
    throw new Error("Binance에서 아직 지원하지 않는 시장 유형입니다.");
  }

  const searchParams = new URLSearchParams({
    symbol: instrument.symbol,
    interval: toExchangeTimeframe(instrument.exchange, instrument.marketType, interval),
    startTime: String(toSinceTimestamp(from)),
    endTime: String(toSinceTimestamp(to)),
    limit: String(limit ?? 500)
  });

  return `${endpoint}?${searchParams.toString()}`;
};

export const createBinanceRestProvider = ({
  instruments,
  fetcher
}: BinanceRestProviderOptions): MarketDataProvider =>
  createNativeProvider({
    id: "binance",
    name: "Binance",
    supportedMarketTypes,
    async loadInstruments(marketType) {
      return filterInstruments(instruments, marketType);
    },
    async fetchOHLCV(params) {
      try {
        const response = await (fetcher ?? fetch)(createBinanceKlineUrl(params));

        if (!response.ok) {
          throw new Error("Binance REST 응답이 성공 상태가 아닙니다.");
        }

        const body: unknown = await response.json();

        if (!isBinanceKlineArray(body)) {
          throw new Error("Binance 캔들 응답 형식이 올바르지 않습니다.");
        }

        return body.map(toCandle).sort((a, b) => a.time - b.time);
      } catch (error) {
        if (error instanceof Error && error.message.startsWith("Binance에서")) {
          throw error;
        }

        throw new Error("Binance 캔들 데이터를 불러오지 못했습니다.");
      }
    }
  });
