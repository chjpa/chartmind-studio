import type { StreamingProvider } from "../../streamingProvider.ts";

export type NativeStreamingAdapter = StreamingProvider;

export const createNativeStreamingProvider = (adapter: NativeStreamingAdapter): StreamingProvider => adapter;
