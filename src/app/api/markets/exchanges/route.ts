import { exchangeOptions } from "../../../../lib/market/exchangeRegistry.ts";

const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status
  });

export const GET = async () =>
  json(
    exchangeOptions.map((exchange) => ({
      id: exchange.id,
      name: exchange.label,
      supportedMarketTypes: exchange.supportedMarketTypes,
      enabled: exchange.isProviderEnabled
    }))
  );
