export type LiquidationLevel = {
  price: number;
  size: number;
  side: "long" | "short";
};

export type DerivativesContext = {
  fundingRate?: number;
  nextFundingTime?: number;
  openInterest?: number;
  openInterestChange24h?: number;
  longShortRatio?: number;
  liquidationLevels?: LiquidationLevel[];
};

export const derivativesContextFields = [
  "fundingRate",
  "nextFundingTime",
  "openInterest",
  "openInterestChange24h",
  "longShortRatio",
  "liquidationLevels"
] as const;

export type DerivativesContextField = (typeof derivativesContextFields)[number];

export type DerivativesContextAvailability = {
  status: "available" | "unavailable";
  data: DerivativesContext | null;
  availableFields: DerivativesContextField[];
  unavailableFields: DerivativesContextField[];
  reason?: string;
};
