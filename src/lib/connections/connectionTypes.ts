import type { MarketType, RealtimeOHLCVCapability } from "../types/market.ts";

export type ConnectionStatus = "ready" | "needs_configuration" | "unavailable" | "error";

export type CloudLlmProviderId = "openai" | "gemini";

export type LocalLlmProviderId = "ollama" | "openai_compatible";

export type LlmProviderId = CloudLlmProviderId | LocalLlmProviderId;

export type AiProviderId = "mock" | LlmProviderId;

export type SecretSource = "none" | "server_env" | "local_memory";

export type AiConnectionStatus = {
  provider: AiProviderId;
  status: ConnectionStatus;
  message: string;
  secretSource: SecretSource;
};

export type LlmProviderConnectionStatus = {
  configured: boolean;
  label: string;
  model: string;
  message: string;
};

export type LocalLlmProviderConnectionStatus = LlmProviderConnectionStatus & {
  baseUrlConfigured: boolean;
};

export type ActiveLlmConnectionStatus = {
  provider: LlmProviderId | "sample" | "none";
  label: string;
  message: string;
};

export type LlmConnectionStatus = {
  cloud: Record<CloudLlmProviderId, LlmProviderConnectionStatus>;
  local: Record<LocalLlmProviderId, LocalLlmProviderConnectionStatus>;
  active: ActiveLlmConnectionStatus;
};

export type MarketConnectionStatusItem = {
  id: string;
  name: string;
  enabled: boolean;
  supportedMarketTypes: Exclude<MarketType, "index" | "mark">[];
  historicalOHLCV: boolean;
  realtimeOHLCV: RealtimeOHLCVCapability;
  message: string;
};
