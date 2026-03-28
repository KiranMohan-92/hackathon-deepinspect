import type { RiskTier } from "../types";

export interface RiskColor {
  hex: string;
  bg: string;
  text: string;
}

export const RISK_COLORS: Record<RiskTier, RiskColor> = {
  CRITICAL: { hex: "#DC2626", bg: "#FEE2E2", text: "#991B1B" },
  HIGH:     { hex: "#F97316", bg: "#FFEDD5", text: "#9A3412" },
  MEDIUM:   { hex: "#F59E0B", bg: "#FEF3C7", text: "#92400E" },
  OK:       { hex: "#22C55E", bg: "#DCFCE7", text: "#15803D" },
};

export const RISK_MARKER_SIZE: Record<RiskTier, number> = {
  CRITICAL: 14,
  HIGH:     10,
  MEDIUM:   8,
  OK:       6,
};
