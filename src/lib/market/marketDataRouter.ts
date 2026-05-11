import type { Candle, ExchangeId, Instrument, MarketType } from "../types/market.ts";
import {
  createDerivativesContextAvailability,
  createUnavailableDerivativesContext,
  isDerivativeMarketType,
  type DerivativesDataProvider
} from "./derivativesDataProvider.ts";
import type { MarketDataProvider, OHLCVCallback, OHLCVParams, SubscriptionHandle } from "./marketDataProvider.ts";

type SearchOptions = {
  exchange?: ExchangeId;
  marketType?: MarketType;
};

export class MarketDataRouter {
  private readonly providers = new Map<ExchangeId, MarketDataProvider>();
  private readonly derivativesProviders: DerivativesDataProvider[];
  private readonly ohlcvCache = new Map<string, Candle[]>();

  constructor(providers: MarketDataProvider[], derivativesProviders: DerivativesDataProvider[] = []) {
    for (const provider of providers) {
      this.providers.set(provider.id, provider);
    }

    this.derivativesProviders = derivativesProviders;
  }

  getProviders() {
    return Array.from(this.providers.values());
  }

  async loadInstruments(options: SearchOptions = {}): Promise<Instrument[]> {
    const providers = this.getMatchingProviders(options.exchange);
    const instruments = await Promise.all(
      providers.map((provider) => provider.loadInstruments(options.marketType))
    );

    return instruments.flat().filter((instrument) => this.matchesOptions(instrument, options));
  }

  async searchInstruments(query: string, options: SearchOptions = {}): Promise<Instrument[]> {
    const providers = this.getMatchingProviders(options.exchange);
    const instruments = await Promise.all(
      providers.map((provider) => provider.searchInstruments(query, options))
    );

    return instruments.flat().filter((instrument) => this.matchesOptions(instrument, options));
  }

  async resolveInstrument(tradingViewTicker: string): Promise<Instrument> {
    const instruments = await this.searchInstruments(tradingViewTicker);
    const instrument = instruments.find((item) => item.tradingViewTicker === tradingViewTicker);

    if (!instrument) {
      throw new Error("지원하지 않는 상품입니다.");
    }

    return instrument;
  }

  async fetchOHLCV(params: OHLCVParams): Promise<Candle[]> {
    const cacheKey = this.createOHLCVCacheKey(params);
    const cachedCandles = this.ohlcvCache.get(cacheKey);

    if (cachedCandles) {
      return cachedCandles;
    }

    try {
      const candles = await this.getProvider(params.instrument.exchange).fetchOHLCV(params);
      this.ohlcvCache.set(cacheKey, candles);

      return candles;
    } catch (error) {
      if (error instanceof Error && error.message.endsWith("데이터를 불러오지 못했습니다.")) {
        throw error;
      }

      throw new Error("캔들 데이터를 불러오지 못했습니다.");
    }
  }

  async subscribeOHLCV(params: OHLCVParams, callback: OHLCVCallback): Promise<SubscriptionHandle> {
    const provider = this.getProvider(params.instrument.exchange);

    if (!provider.subscribeOHLCV) {
      throw new Error("실시간 구독을 지원하지 않는 거래소입니다.");
    }

    return provider.subscribeOHLCV(params, callback);
  }

  async unsubscribeOHLCV(exchange: ExchangeId, subscriptionId: string): Promise<void> {
    const provider = this.getProvider(exchange);

    if (!provider.unsubscribeOHLCV) {
      return;
    }

    await provider.unsubscribeOHLCV(subscriptionId);
  }

  async fetchDerivativesContext(instrument: Instrument) {
    if (!isDerivativeMarketType(instrument.marketType)) {
      return createUnavailableDerivativesContext("현물 시장에는 파생상품 컨텍스트가 없습니다.");
    }

    const provider = this.derivativesProviders.find((item) => item.supports(instrument));

    if (!provider) {
      return createUnavailableDerivativesContext("해당 상품의 파생상품 데이터 연결이 아직 구현되지 않았습니다.");
    }

    try {
      const context = await provider.fetchDerivativesContext({ instrument });

      return createDerivativesContextAvailability(context);
    } catch {
      return createUnavailableDerivativesContext("파생상품 데이터를 불러오지 못했습니다.");
    }
  }

  private getProvider(exchange: ExchangeId): MarketDataProvider {
    const provider = this.providers.get(exchange);

    if (!provider) {
      throw new Error("등록되지 않은 거래소입니다.");
    }

    return provider;
  }

  private getMatchingProviders(exchange?: ExchangeId): MarketDataProvider[] {
    if (!exchange) {
      return this.getProviders();
    }

    return [this.getProvider(exchange)];
  }

  private matchesOptions(instrument: Instrument, options: SearchOptions) {
    if (options.exchange && instrument.exchange !== options.exchange) {
      return false;
    }

    if (options.marketType && instrument.marketType !== options.marketType) {
      return false;
    }

    return true;
  }

  private createOHLCVCacheKey(params: OHLCVParams) {
    return [
      params.instrument.id,
      params.interval,
      params.from,
      params.to,
      params.limit ?? ""
    ].join("|");
  }
}
