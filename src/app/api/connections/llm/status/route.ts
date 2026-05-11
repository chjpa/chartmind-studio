import { createLlmConnectionStatus } from "../../../../../lib/ai/providers/llmConnectionStatus.ts";

export const GET = async () => Response.json(createLlmConnectionStatus());
