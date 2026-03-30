import React from "react";
import { AlertTriangle, AlertCircle, Info, CheckCircle } from "lucide-react";
import { RISK_COLORS } from "../utils/riskColors";
import { RiskTier } from "../types";

const TIER_ICONS: Record<string, React.ElementType> = {
  CRITICAL: AlertTriangle,
  HIGH: AlertCircle,
  MEDIUM: Info,
  OK: CheckCircle,
};

interface RiskBadgeProps {
  tier: RiskTier | string;
  score?: number;
}

const RiskBadge = React.memo(({ tier, score }: RiskBadgeProps) => {
  const c = RISK_COLORS[tier] || RISK_COLORS.OK;
  const Icon = TIER_ICONS[tier] || Info;
  const isCritical = tier === "CRITICAL";

  return (
    <div className="flex items-center gap-2">
      <span
        className={`flex items-center gap-1.5 text-2xs font-mono font-bold px-2.5 py-1 rounded-full transition-all duration-300 ${
          isCritical ? "animate-risk-glow scale-105" : ""
        }`}
        style={{
          backgroundColor: c.bg,
          color: c.text,
          border: `1px solid ${c.border}`,
          boxShadow: isCritical ? c.glow : "none",
        }}
      >
        <Icon className="w-3 h-3" />
        {tier}
      </span>
      {score != null && (
        <span className="text-xs font-mono text-dim">{score.toFixed(1)}</span>
      )}
    </div>
  );
});

RiskBadge.displayName = "RiskBadge";

export default RiskBadge;
