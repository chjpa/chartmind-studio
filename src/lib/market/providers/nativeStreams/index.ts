import type { StreamingProvider } from "../../streamingProvider.ts";
import { binanceLinearPerpStreamProvider } from "./binanceLinearPerpStream.ts";
import { binanceSpotStreamProvider } from "./binanceSpotStream.ts";

export const nativeStreamingProviders: StreamingProvider[] = [
  binanceSpotStreamProvider,
  binanceLinearPerpStreamProvider
];
