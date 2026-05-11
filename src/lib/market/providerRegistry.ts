import type { ExchangeId } from "../types/market.ts";
import type { MarketConnectionStatusItem } from "../connections/connectionTypes.ts";
import type { MarketDataProvider } from "./marketDataProvider.ts";
import { MarketDataRouter } from "./marketDataRouter.ts";

type MarketConnectionExchangeConfig = {
  id: ExchangeId;
  label: string;
  supportedMarketTypes: MarketConnectionStatusItem["supportedMarketTypes"];
};

const historicalOHLCVProviderIds = new Set<ExchangeId>(["binance"]);

const providerNotImplementedMessage = "시세 연결이 아직 구현되지 않았습니다.";
const historicalProviderPendingMessage =
  "과거 캔들 시세 연결이 준비 중입니다. 현재는 종목 검색만 사용할 수 있습니다.";

export class ProviderRegistry {
  private readonly providers = new Map<ExchangeId, MarketDataProvider>();

  constructor(providers: MarketDataProvider[] = []) {
    providers.forEach((provider) => this.registerProvider(provider));
  }

  registerProvider(provider: MarketDataProvider) {
    if (this.providers.has(provider.id)) {
      throw new Error("이미 등록된 거래소 provider입니다.");
    }

    this.providers.set(provider.id, provider);
  }

  hasProvider(exchange: ExchangeId) {
    return this.providers.has(exchange);
  }

  getProvider(exchange: ExchangeId) {
    return this.providers.get(exchange);
  }

  getProviders() {
    return Array.from(this.providers.values());
  }

  createRouter() {
    return new MarketDataRouter(this.getProviders());
  }

  createConnectionStatuses(exchanges: MarketConnectionExchangeConfig[]): MarketConnectionStatusItem[] {
    return exchanges.map((exchange) => {
      const enabled = this.hasProvider(exchange.id);

      if (!enabled) {
        return {
          id: exchange.id,
          name: exchange.label,
          enabled: false,
          supportedMarketTypes: exchange.supportedMarketTypes,
          historicalOHLCV: false,
          realtimeOHLCV: "unsupported",
          message: providerNotImplementedMessage
        };
      }

      if (!historicalOHLCVProviderIds.has(exchange.id)) {
        return {
          id: exchange.id,
          name: exchange.label,
          enabled: true,
          supportedMarketTypes: exchange.supportedMarketTypes,
          historicalOHLCV: false,
          realtimeOHLCV: "unsupported",
          message: historicalProviderPendingMessage
        };
      }

      return {
        id: exchange.id,
        name: exchange.label,
        enabled: true,
        supportedMarketTypes: exchange.supportedMarketTypes,
        historicalOHLCV: true,
        realtimeOHLCV: "websocket",
        message: `${exchange.label} 시세 연결이 준비되었습니다.`
      };
    });
  }
}

export const createProviderRegistry = (providers: MarketDataProvider[] = []) =>
  new ProviderRegistry(providers);
