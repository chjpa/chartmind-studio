import { createSystemStatus } from "../../../../lib/security/accessPolicy.ts";

export const GET = async (request: Request) => {
  const status = createSystemStatus({
    host: request.headers.get("host"),
    nodeEnv: process.env.NODE_ENV ?? "unknown",
    hasAiApiKey: Boolean(process.env.OPENAI_API_KEY)
  });

  return Response.json(status);
};
