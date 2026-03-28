import { RISK_COLORS } from "../utils/riskColors";
import type { RiskTier } from "../types";

interface RiskBadgeProps {
  tier: RiskTier;
  score?: number | null;
}

export default function RiskBadge({ tier, score }: RiskBadgeProps) {
  const c = RISK_COLORS[tier] || RISK_COLORS.OK;
  return (
    <div className="flex items-center gap-2">
      <span
        className="text-xs font-semibold px-3 py-1 rounded-full"
        style={{ backgroundColor: c.bg, color: c.text }}
      >
        {tier}
      </span>
      {score != null && (
        <span className="text-sm text-gray-500">{score.toFixed(1)} / 5.0</span>
      )}
    </div>
  );
}
