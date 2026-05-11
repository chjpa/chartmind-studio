import type {
  DerivativesContext,
  DerivativesContextAvailability,
  DerivativesContextField
} from "../types/derivatives.ts";
import { derivativesContextFields } from "../types/derivatives.ts";
import type { Instrument, MarketType } from "../types/market.ts";

export type DerivativesDataParams = {
  instrument: Instrument;
};

export interface DerivativesDataProvider {
  id: string;
  supports(instrument: Instrument): boolean;
  fetchDerivativesContext(params: DerivativesDataParams): Promise<DerivativesContext>;
}

export const isDerivativeMarketType = (marketType: MarketType) =>
  marketType === "linear_perp" || marketType === "inverse_perp" || marketType === "dated_future";

export const createUnavailableDerivativesContext = (reason: string): DerivativesContextAvailability => ({
  status: "unavailable",
  data: null,
  availableFields: [],
  unavailableFields: [...derivativesContextFields],
  reason
});

export const createDerivativesContextAvailability = (
  data: DerivativesContext
): DerivativesContextAvailability => {
  const availableFields = derivativesContextFields.filter((field) =>
    data[field] !== undefined
  ) as DerivativesContextField[];
  const unavailableFields = derivativesContextFields.filter((field) =>
    data[field] === undefined
  ) as DerivativesContextField[];

  return {
    status: availableFields.length > 0 ? "available" : "unavailable",
    data: availableFields.length > 0 ? data : null,
    availableFields,
    unavailableFields,
    reason: availableFields.length > 0 ? undefined : "시세 연결이 제공한 파생상품 데이터가 없습니다."
  };
};
