import useAppStore from "../store/useAppStore";
import { RISK_COLORS } from "../utils/riskColors";

const TIERS = ["CRITICAL", "HIGH", "MEDIUM", "OK"];

export default function StatsPanel() {
  const bridges = useAppStore((s) => s.bridges);

  const counts = TIERS.reduce((acc, t) => {
    acc[t] = bridges.filter((b) => b.risk_tier === t).length;
    return acc;
  }, {});

  return (
    <div className="w-48 border-r border-gray-200 p-4 flex flex-col gap-3 overflow-y-auto">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Risk Summary</p>
      {TIERS.map((tier) => {
        const c = RISK_COLORS[tier];
        return (
          <div key={tier} className="rounded-lg p-3" style={{ backgroundColor: c.bg }}>
            <p className="text-xs font-medium" style={{ color: c.text }}>{tier}</p>
            <p className="text-2xl font-semibold" style={{ color: c.hex }}>{counts[tier]}</p>
          </div>
        );
      })}
      <div className="mt-2 pt-2 border-t border-gray-200">
        <p className="text-xs text-gray-400">Total scanned</p>
        <p className="text-xl font-medium text-gray-700">{bridges.length}</p>
      </div>
    </div>
  );
}
