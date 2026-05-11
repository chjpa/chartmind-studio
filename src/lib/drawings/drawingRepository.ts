import type { ChartDrawing } from "../types/drawings.ts";

export type DrawingRepository = {
  list(instrumentId: string, interval: string): ChartDrawing[];
  save(drawing: ChartDrawing): ChartDrawing;
  replaceEngineDrawings(instrumentId: string, interval: string, drawings: ChartDrawing[]): ChartDrawing[];
  delete(id: string): boolean;
  clear(): void;
};

const createDrawingScopeKey = (instrumentId: string, interval: string) => `${instrumentId}|${interval}`;

export const createDrawingRepository = (): DrawingRepository => {
  const drawingsByScope = new Map<string, Map<string, ChartDrawing>>();
  const scopeByDrawingId = new Map<string, string>();

  const saveDrawing = (drawing: ChartDrawing): ChartDrawing => {
    const scopeKey = createDrawingScopeKey(drawing.instrumentId, drawing.interval);
    const previousScopeKey = scopeByDrawingId.get(drawing.id);
    const previousDrawing = previousScopeKey ? drawingsByScope.get(previousScopeKey)?.get(drawing.id) : undefined;
    const normalizedDrawing: ChartDrawing =
      previousDrawing?.source === "engine" && drawing.userModified
        ? { ...drawing, source: "engine_modified_by_user" }
        : drawing;

    if (previousScopeKey && previousScopeKey !== scopeKey) {
      drawingsByScope.get(previousScopeKey)?.delete(drawing.id);
    }

    const scopedDrawings = drawingsByScope.get(scopeKey) ?? new Map<string, ChartDrawing>();
    scopedDrawings.set(normalizedDrawing.id, normalizedDrawing);
    drawingsByScope.set(scopeKey, scopedDrawings);
    scopeByDrawingId.set(normalizedDrawing.id, scopeKey);

    return normalizedDrawing;
  };

  return {
    list(instrumentId, interval) {
      return Array.from(drawingsByScope.get(createDrawingScopeKey(instrumentId, interval))?.values() ?? []);
    },
    save(drawing) {
      return saveDrawing(drawing);
    },
    replaceEngineDrawings(instrumentId, interval, drawings) {
      const scopeKey = createDrawingScopeKey(instrumentId, interval);
      const scopedDrawings = drawingsByScope.get(scopeKey) ?? new Map<string, ChartDrawing>();

      for (const drawing of scopedDrawings.values()) {
        if (drawing.source === "engine") {
          scopedDrawings.delete(drawing.id);
          scopeByDrawingId.delete(drawing.id);
        }
      }

      drawingsByScope.set(scopeKey, scopedDrawings);

      return drawings
        .filter((drawing) => drawing.instrumentId === instrumentId && drawing.interval === interval)
        .filter((drawing) => !scopedDrawings.has(drawing.id))
        .map((drawing) => saveDrawing({ ...drawing, source: "engine", userModified: false }));
    },
    delete(id) {
      const scopeKey = scopeByDrawingId.get(id);

      if (!scopeKey) {
        return false;
      }

      const scopedDrawings = drawingsByScope.get(scopeKey);
      const deleted = scopedDrawings?.delete(id) ?? false;
      scopeByDrawingId.delete(id);

      return deleted;
    },
    clear() {
      drawingsByScope.clear();
      scopeByDrawingId.clear();
    }
  };
};

export const drawingRepository = createDrawingRepository();
