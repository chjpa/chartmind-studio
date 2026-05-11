import { drawingRepository } from "../../../lib/drawings/drawingRepository.ts";
import { findInstrument } from "../../../lib/market/exchangeRegistry.ts";
import type { ChartDrawing } from "../../../lib/types/drawings.ts";

const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status
  });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const validateDrawing = (value: unknown): value is ChartDrawing => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.instrumentId === "string" &&
    typeof value.exchange === "string" &&
    typeof value.marketType === "string" &&
    typeof value.symbol === "string" &&
    typeof value.interval === "string" &&
    typeof value.source === "string" &&
    typeof value.type === "string" &&
    Array.isArray(value.points) &&
    isRecord(value.properties) &&
    typeof value.role === "string" &&
    typeof value.userModified === "boolean" &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
};

export const GET = async (request: Request) => {
  const searchParams = new URL(request.url).searchParams;
  const instrumentId = searchParams.get("instrumentId");
  const interval = searchParams.get("interval");

  if (!instrumentId || !interval) {
    return json({ error: "instrumentId와 interval이 필요합니다." }, 400);
  }

  return json(drawingRepository.list(instrumentId, interval));
};

export const POST = async (request: Request) => {
  const body = await request.json().catch(() => null);

  if (!validateDrawing(body)) {
    return json({ error: "드로잉 데이터 형식이 올바르지 않습니다." }, 400);
  }

  const instrument = findInstrument(body.instrumentId);

  if (!instrument) {
    return json({ error: "지원하지 않는 instrumentId입니다." }, 400);
  }

  if (body.exchange !== instrument.exchange || body.marketType !== instrument.marketType) {
    return json({ error: "instrumentId와 드로잉 metadata가 일치하지 않습니다." }, 400);
  }

  return json(drawingRepository.save(body), 201);
};

export const DELETE = async (request: Request) => {
  const id = new URL(request.url).searchParams.get("id");

  if (!id) {
    return json({ error: "id가 필요합니다." }, 400);
  }

  return json({ deleted: drawingRepository.delete(id) });
};
