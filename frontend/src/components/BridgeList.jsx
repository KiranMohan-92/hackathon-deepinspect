import useAppStore from "../store/useAppStore";
import { RISK_COLORS } from "../utils/riskColors";

export default function BridgeList() {
  const bridges = useAppStore((s) => s.bridges);
  const setSelectedBridge = useAppStore((s) => s.setSelectedBridge);

  const sorted = [...bridges].sort((a, b) => b.risk_score - a.risk_score);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {bridges.length} bridges scanned — click to inspect
        </p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {sorted.map((bridge) => {
          const c = RISK_COLORS[bridge.risk_tier] || RISK_COLORS.OK;
          return (
            <button
              key={bridge.bridge_id}
              onClick={() => setSelectedBridge(bridge)}
              className="w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors flex items-start gap-3"
            >
              {/* Risk colour bar */}
              <div
                className="w-1 rounded-full flex-shrink-0 mt-0.5"
                style={{ backgroundColor: c.hex, minHeight: 36 }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {bridge.bridge_name || `Bridge ${bridge.bridge_id}`}
                  </p>
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: c.bg, color: c.text }}
                  >
                    {bridge.risk_tier}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-1">
                  Score {bridge.risk_score}/5
                  {bridge.context?.construction_year && ` · ${bridge.context.construction_year}`}
                  {bridge.context?.material && bridge.context.material !== "unknown"
                    ? ` · ${bridge.context.material.replace(/_/g, " ")}`
                    : ""}
                </p>
                {bridge.recommended_action && (
                  <p className="text-xs text-gray-400 truncate">{bridge.recommended_action}</p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
