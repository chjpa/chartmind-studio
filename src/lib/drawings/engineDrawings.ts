import type { AnalysisResult } from "../types/analysis.ts";
import type { ChartDrawing } from "../types/drawings.ts";

const createBaseDrawing = (analysis: AnalysisResult) => ({
  instrumentId: analysis.instrumentId,
  exchange: analysis.exchange,
  marketType: analysis.marketType,
  symbol: analysis.displaySymbol,
  interval: analysis.interval,
  source: "engine" as const,
  properties: {},
  role: "analysis" as const,
  userModified: false,
  createdAt: analysis.generatedAt,
  updatedAt: analysis.generatedAt
});

export const buildEngineDrawingsFromAnalysis = (analysis: AnalysisResult): ChartDrawing[] => {
  const baseDrawing = createBaseDrawing(analysis);
  const levelDrawings: ChartDrawing[] = analysis.levels.map((level) => ({
    ...baseDrawing,
    id: `engine:${analysis.instrumentId}:${analysis.interval}:level:${level.id}`,
    type: "horizontalLine",
    points: [
      { time: 0, price: level.price },
      { time: 0, price: level.price }
    ],
    label: level.type === "support" ? "자동 지지선" : "자동 저항선",
    properties: {
      levelType: level.type,
      touches: level.touches
    }
  }));
  const trendlineDrawings: ChartDrawing[] = analysis.trendlines.map((trendline) => ({
    ...baseDrawing,
    id: `engine:${analysis.instrumentId}:${analysis.interval}:trendline:${trendline.id}`,
    type: "trendline",
    points: trendline.points,
    label: trendline.type === "support" ? "자동 상승 추세선" : "자동 하락 추세선",
    properties: {
      trendlineType: trendline.type,
      slope: trendline.slope
    }
  }));

  return [...levelDrawings, ...trendlineDrawings];
};
