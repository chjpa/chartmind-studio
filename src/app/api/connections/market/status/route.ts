import {
  exchangeConfigs,
  providerRegistry
} from "../../../../../lib/market/exchangeRegistry.ts";

export const GET = async () =>
  Response.json({
    exchanges: providerRegistry.createConnectionStatuses(exchangeConfigs)
  });
