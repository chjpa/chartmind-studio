import type { ExchangeId, MarketType } from "../types/market.ts";

export const internalIntervals = ["1", "3", "5", "15", "30", "60", "240", "1D", "1W"] as const;

export type InternalInterval = (typeof internalIntervals)[number];

export const intervalLabels: Record<InternalInterval, string> = {
  "1": "1분",
  "3": "3분",
  "5": "5분",
  "15": "15분",
  "30": "30분",
  "60": "1시간",
  "240": "4시간",
  "1D": "1일",
  "1W": "1주"
};

const legacyIntervalMap = new Map<string, InternalInterval>([
  ["1m", "1"],
  ["3m", "3"],
  ["5m", "5"],
  ["15m", "15"],
  ["30m", "30"],
  ["1h", "60"],
  ["4h", "240"]
]);

const timeframeMap = new Map<InternalInterval, string>([
  ["1", "1m"],
  ["3", "3m"],
  ["5", "5m"],
  ["15", "15m"],
  ["30", "30m"],
  ["60", "1h"],
  ["240", "4h"],
  ["1D", "1d"],
  ["1W", "1w"]
]);

export const normalizeInternalInterval = (interval: string): InternalInterval => {
  const legacyInterval = legacyIntervalMap.get(interval);

  if (legacyInterval) {
    return legacyInterval;
  }

  if (internalIntervals.includes(interval as InternalInterval)) {
    return interval as InternalInterval;
  }

  throw new Error("지원하지 않는 캔들 interval입니다.");
};

export const toCcxtTimeframe = (interval: string) => {
  const timeframe = timeframeMap.get(normalizeInternalInterval(interval));

  if (!timeframe) {
    throw new Error("지원하지 않는 캔들 interval입니다.");
  }

  return timeframe;
};

export const toExchangeTimeframe = (_exchange: ExchangeId, _marketType: MarketType, interval: string) =>
  toCcxtTimeframe(interval);

export const toSinceTimestamp = (from: number) => {
  if (from > 9999999999) {
    return from;
  }

  return from * 1000;
};
