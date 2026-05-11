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

const defaultLimit = 500;
const maxLimit = 1000;

const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status
  });

const parseNumberParam = (value: string | null, fallback: number) => {
  if (!value) {
    return fallback;
  }

  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : fallback;
};

const parseLimit = (value: string | null) => {
  const parsedLimit = parseNumberParam(value, defaultLimit);

  return Math.max(1, Math.min(parsedLimit, maxLimit));
};

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

  try {
    const candles = await marketDataRouter.fetchOHLCV({
      instrument,
      interval: searchParams.get("interval") ?? "60",
      from: parseNumberParam(searchParams.get("from"), 0),
      to: parseNumberParam(searchParams.get("to"), Math.floor(Date.now() / 1000)),
      limit: parseLimit(searchParams.get("limit"))
    });

    return json(candles);
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : "캔들 데이터를 불러오지 못했습니다." },
      500
    );
  }
};
