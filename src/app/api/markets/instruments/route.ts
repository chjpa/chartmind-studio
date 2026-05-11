import {
  getExchangeMarketTypes,
  getExchangeOption,
  getInstruments,
  isExchangeProviderEnabled,
  marketTypeOptions,
  providerNotImplementedMessage
} from "../../../../lib/market/exchangeRegistry.ts";
import type { MarketType } from "../../../../lib/types/market.ts";

type SupportedMarketType = Exclude<MarketType, "index" | "mark">;

const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status
  });

const validMarketTypes = new Set<string>(marketTypeOptions.map((option) => option.id));

const validateMarketType = (marketType: string | null): marketType is SupportedMarketType => {
  if (!marketType) {
    return true;
  }

  return validMarketTypes.has(marketType);
};

export const GET = async (request: Request) => {
  const searchParams = new URL(request.url).searchParams;
  const exchange = searchParams.get("exchange") ?? undefined;
  const marketType = searchParams.get("marketType");
  const query = searchParams.get("query") ?? "";

  if (!validateMarketType(marketType)) {
    return json({ error: "지원하지 않는 시장 유형입니다." }, 400);
  }

  if (exchange && !getExchangeOption(exchange)) {
    return json({ error: "지원하지 않는 거래소입니다." }, 400);
  }

  if (exchange && marketType && !getExchangeMarketTypes(exchange).includes(marketType)) {
    return json({ error: "해당 거래소에서 지원하지 않는 시장 유형입니다." }, 400);
  }

  if (exchange && !isExchangeProviderEnabled(exchange)) {
    return json({ error: providerNotImplementedMessage }, 400);
  }

  return json(
    getInstruments({
      exchange,
      marketType: marketType ?? undefined,
      query
    })
  );
};
