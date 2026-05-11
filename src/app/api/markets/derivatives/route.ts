import {
  findInstrument,
  getExchangeMarketTypes,
  getExchangeOption,
  isExchangeProviderEnabled,
  marketDataRouter,
  providerNotImplementedMessage
} from "../../../../lib/market/exchangeRegistry.ts";
import type { MarketType } from "../../../../lib/types/market.ts";

type SupportedMarketType = Exclude<MarketType, "index" | "mark">;

const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status
  });

export const GET = async (request: Request) => {
  const searchParams = new URL(request.url).searchParams;
  const instrumentId = searchParams.get("instrumentId");

  if (!instrumentId) {
    return json({ error: "instrumentId가 필요합니다." }, 400);
  }

  const instrument = findInstrument(instrumentId);

  if (!instrument) {
    return json({ error: "지원하지 않는 instrumentId입니다." }, 400);
  }

  if (!getExchangeOption(instrument.exchange)) {
    return json({ error: "지원하지 않는 거래소입니다." }, 400);
  }

  if (!getExchangeMarketTypes(instrument.exchange).includes(instrument.marketType as SupportedMarketType)) {
    return json({ error: "해당 거래소에서 지원하지 않는 시장 유형입니다." }, 400);
  }

  if (!isExchangeProviderEnabled(instrument.exchange)) {
    return json({ error: providerNotImplementedMessage }, 400);
  }

  const derivativesContext = await marketDataRouter.fetchDerivativesContext(instrument);

  return json(derivativesContext);
};
