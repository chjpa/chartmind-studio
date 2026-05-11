import type { Candle } from "../types/market.ts";
import type { OHLCVParams, SubscriptionHandle } from "./marketDataProvider.ts";
import type { StreamingOHLCVCallback, StreamingOHLCVParams, StreamingProvider } from "./streamingProvider.ts";
import { nativeStreamingProviders } from "./providers/nativeStreams/index.ts";

type StreamingFetcher = (input: string | URL | Request) => Promise<Response>;

type PollingDataSource = {
  fetchOHLCV(params: OHLCVParams): Promise<Candle[]>;
};

type PollingScheduler = {
  setInterval(callback: () => void, delayMs: number): unknown;
  clearInterval(timer: unknown): void;
};

type StreamingRouterOptions = {
  providers?: StreamingProvider[];
  fetcher?: StreamingFetcher;
  pollingDataSource?: PollingDataSource;
  pollingIntervalMs?: number;
  pollingScheduler?: PollingScheduler;
};

type PollingSubscriber = {
  callback: StreamingOHLCVCallback;
};

type PollingGroup = {
  params: StreamingOHLCVParams;
  subscribers: Map<string, PollingSubscriber>;
  timer: unknown;
  intervalMs: number;
  lastCandleTime: number | null;
  lastCandle: Candle | null;
  isPolling: boolean;
};

const defaultPollingScheduler: PollingScheduler = {
  setInterval(callback, delayMs) {
    return setInterval(callback, delayMs);
  },
  clearInterval(timer) {
    clearInterval(timer as ReturnType<typeof setInterval>);
  }
};

const getFetcher = (fetcher?: StreamingFetcher): StreamingFetcher => {
  if (fetcher) {
    return fetcher;
  }

  return (input) => fetch(input);
};

export const getPollingIntervalMs = (interval: string) => {
  if (interval === "1D" || interval === "1W") {
    return 60_000;
  }

  if (interval === "1") {
    return 5_000;
  }

  return 10_000;
};

const createSubscriptionId = ({ instrument, interval }: StreamingOHLCVParams) =>
  `polling:${instrument.id}:${interval}:${crypto.randomUUID()}`;

const createPollingGroupKey = ({ instrument, interval }: StreamingOHLCVParams) =>
  `${instrument.id}|${interval}`;

const buildPollingUrl = ({ instrument, interval }: StreamingOHLCVParams) => {
  const searchParams = new URLSearchParams({
    instrumentId: instrument.id,
    interval,
    limit: "1"
  });

  return `/api/markets/ohlcv?${searchParams.toString()}`;
};

const getLatestCandle = (candles: Candle[]) =>
  [...candles].sort((left, right) => right.time - left.time)[0] ?? null;

const isRateLimitError = (error: unknown) => {
  if (error instanceof Error && "status" in error) {
    return Number((error as Error & { status?: unknown }).status) === 429;
  }

  return false;
};

const createApiPollingDataSource = (fetcher: StreamingFetcher): PollingDataSource => ({
  async fetchOHLCV(params) {
    const response = await fetcher(buildPollingUrl(params));

    if (!response.ok) {
      const error = new Error("캔들 polling 요청이 실패했습니다.");
      Object.assign(error, { status: response.status });
      throw error;
    }

    return (await response.json()) as Candle[];
  }
});

export class StreamingRouter {
  private readonly providers: StreamingProvider[];
  private readonly pollingDataSource: PollingDataSource;
  private readonly pollingIntervalOverrideMs?: number;
  private readonly pollingScheduler: PollingScheduler;
  private readonly subscriptionToGroupKey = new Map<string, string>();
  private readonly pollingGroups = new Map<string, PollingGroup>();

  constructor({
    providers = nativeStreamingProviders,
    fetcher,
    pollingDataSource,
    pollingIntervalMs,
    pollingScheduler = defaultPollingScheduler
  }: StreamingRouterOptions = {}) {
    this.providers = providers;
    this.pollingDataSource = pollingDataSource ?? createApiPollingDataSource(getFetcher(fetcher));
    this.pollingIntervalOverrideMs = pollingIntervalMs;
    this.pollingScheduler = pollingScheduler;
  }

  async subscribeOHLCV(params: StreamingOHLCVParams, callback: StreamingOHLCVCallback): Promise<SubscriptionHandle> {
    const provider = this.providers.find((candidate) => candidate.supports(params.instrument, params.interval));

    if (provider) {
      return provider.subscribeOHLCV(params, callback);
    }

    return this.subscribePollingOHLCV(params, callback);
  }

  async unsubscribeOHLCV(subscriptionId: string): Promise<void> {
    const groupKey = this.subscriptionToGroupKey.get(subscriptionId);

    if (groupKey) {
      this.unsubscribePollingOHLCV(subscriptionId, groupKey);
      return;
    }

    await Promise.all(this.providers.map((provider) => provider.unsubscribeOHLCV(subscriptionId)));
  }

  private async subscribePollingOHLCV(
    params: StreamingOHLCVParams,
    callback: StreamingOHLCVCallback
  ): Promise<SubscriptionHandle> {
    const subscriptionId = createSubscriptionId(params);
    const groupKey = createPollingGroupKey(params);
    const group = this.pollingGroups.get(groupKey) ?? this.createPollingGroup(params, groupKey);

    group.subscribers.set(subscriptionId, { callback });
    this.subscriptionToGroupKey.set(subscriptionId, groupKey);

    if (group.lastCandle) {
      callback(group.lastCandle);
    }

    if (group.lastCandleTime === null && !group.isPolling) {
      await this.poll(groupKey);
    }

    return { id: subscriptionId };
  }

  private createPollingGroup(params: StreamingOHLCVParams, groupKey: string) {
    const intervalMs = this.pollingIntervalOverrideMs ?? getPollingIntervalMs(params.interval);
    const group: PollingGroup = {
      params,
      subscribers: new Map(),
      intervalMs,
      lastCandleTime: null,
      lastCandle: null,
      isPolling: false,
      timer: this.pollingScheduler.setInterval(() => {
        void this.poll(groupKey);
      }, intervalMs)
    };

    this.pollingGroups.set(groupKey, group);

    return group;
  }

  private unsubscribePollingOHLCV(subscriptionId: string, groupKey: string) {
    const group = this.pollingGroups.get(groupKey);

    this.subscriptionToGroupKey.delete(subscriptionId);

    if (!group) {
      return;
    }

    group.subscribers.delete(subscriptionId);

    if (group.subscribers.size === 0) {
      this.pollingScheduler.clearInterval(group.timer);
      this.pollingGroups.delete(groupKey);
    }
  }

  private async poll(groupKey: string) {
    const group = this.pollingGroups.get(groupKey);

    if (!group || group.isPolling) {
      return;
    }

    group.isPolling = true;

    try {
      const candles = await this.pollingDataSource.fetchOHLCV({
        instrument: group.params.instrument,
        interval: group.params.interval,
        from: 0,
        to: Math.floor(Date.now() / 1000),
        limit: 1
      });
      const latestCandle = getLatestCandle(candles);

      if (!latestCandle) {
        return;
      }

      if (group.lastCandleTime !== null && latestCandle.time < group.lastCandleTime) {
        return;
      }

      group.lastCandleTime = latestCandle.time;
      group.lastCandle = latestCandle;

      for (const subscriber of group.subscribers.values()) {
        subscriber.callback(latestCandle);
      }
    } catch (error) {
      if (isRateLimitError(error)) {
        this.reschedulePollingGroup(groupKey, group.intervalMs * 2);
      }
    } finally {
      group.isPolling = false;
    }
  }

  private reschedulePollingGroup(groupKey: string, nextIntervalMs: number) {
    const group = this.pollingGroups.get(groupKey);

    if (!group) {
      return;
    }

    const maxIntervalMs = Math.max(group.intervalMs, 60_000);
    const boundedIntervalMs = Math.min(nextIntervalMs, maxIntervalMs);

    if (boundedIntervalMs === group.intervalMs) {
      return;
    }

    this.pollingScheduler.clearInterval(group.timer);
    group.intervalMs = boundedIntervalMs;
    group.timer = this.pollingScheduler.setInterval(() => {
      void this.poll(groupKey);
    }, boundedIntervalMs);
  }
}

export const createStreamingRouter = (options: StreamingRouterOptions = {}) => new StreamingRouter(options);

export const streamingRouter = createStreamingRouter();
