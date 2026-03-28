import useAppStore from "../store/useAppStore";
import { useBridgeAnalyze } from "../hooks/useBridgeAnalyze";
import { RISK_COLORS } from "../utils/riskColors";

const ROAD_CLASS_COLORS = {
  motorway: { bg: "#fee2e2", text: "#991b1b", label: "Motorway" },
  motorway_link: { bg: "#fee2e2", text: "#991b1b", label: "Motorway" },
  trunk: { bg: "#ffedd5", text: "#9a3412", label: "Trunk" },
  trunk_link: { bg: "#ffedd5", text: "#9a3412", label: "Trunk" },
  primary: { bg: "#fef3c7", text: "#92400e", label: "Primary" },
  primary_link: { bg: "#fef3c7", text: "#92400e", label: "Primary" },
  secondary: { bg: "#ecfccb", text: "#365314", label: "Secondary" },
  secondary_link: { bg: "#ecfccb", text: "#365314", label: "Secondary" },
  tertiary: { bg: "#e0f2fe", text: "#0c4a6e", label: "Tertiary" },
  tertiary_link: { bg: "#e0f2fe", text: "#0c4a6e", label: "Tertiary" },
  unclassified: { bg: "#f3f4f6", text: "#4b5563", label: "Local" },
  residential: { bg: "#f3f4f6", text: "#4b5563", label: "Residential" },
};

function roadClassBadge(rc) {
  const c = ROAD_CLASS_COLORS[rc] || { bg: "#f3f4f6", text: "#6b7280", label: rc || "Road" };
  return (
    <span
      className="text-xs font-medium px-1.5 py-0.5 rounded flex-shrink-0"
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      {c.label}
    </span>
  );
}

export default function BridgeList() {
  const bridges = useAppStore((s) => s.bridges);
  const analyzedBridges = useAppStore((s) => s.analyzedBridges);
  const analyzingBridgeIds = useAppStore((s) => s.analyzingBridgeIds);
  const checkedBridgeIds = useAppStore((s) => s.checkedBridgeIds);
  const setSelectedBridgeId = useAppStore((s) => s.setSelectedBridgeId);
  const toggleCheckedBridge = useAppStore((s) => s.toggleCheckedBridge);
  const setCheckedBridges = useAppStore((s) => s.setCheckedBridges);
  const clearCheckedBridges = useAppStore((s) => s.clearCheckedBridges);

  const { analyzeMultipleBridges } = useBridgeAnalyze();

  // Analyzed bridges float to the top sorted by risk score; unanalyzed sorted by priority
  const sorted = [...bridges].sort((a, b) => {
    const ra = analyzedBridges[a.osm_id];
    const rb = analyzedBridges[b.osm_id];
    if (ra && rb) return rb.risk_score - ra.risk_score;
    if (ra) return -1;
    if (rb) return 1;
    return b.priority_score - a.priority_score;
  });

  const analyzedCount = Object.keys(analyzedBridges).length;
  const checkedCount = Object.keys(checkedBridgeIds).length;
  const isAnyAnalyzing = Object.keys(analyzingBridgeIds).length > 0;
  const allChecked = bridges.length > 0 && bridges.every((b) => checkedBridgeIds[b.osm_id]);
  const someChecked = checkedCount > 0 && !allChecked;

  const handleSelectAll = () => {
    if (allChecked) {
      clearCheckedBridges();
    } else {
      setCheckedBridges(bridges.map((b) => b.osm_id));
    }
  };

  const handleAnalyzeSelected = () => {
    const selected = sorted.filter((b) => checkedBridgeIds[b.osm_id]);
    analyzeMultipleBridges(selected);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center justify-between gap-2">
          <label className="flex items-center gap-2 cursor-pointer min-w-0">
            <input
              type="checkbox"
              checked={allChecked}
              ref={(el) => { if (el) el.indeterminate = someChecked; }}
              onChange={handleSelectAll}
              className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 cursor-pointer flex-shrink-0"
            />
            <span className="text-xs font-semibold text-gray-700 truncate">
              {bridges.length} bridges found
            </span>
          </label>

          {checkedCount > 0 && (
            <button
              onClick={handleAnalyzeSelected}
              disabled={isAnyAnalyzing}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-blue-600 text-white rounded-lg
                         hover:bg-blue-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
                         transition-all flex-shrink-0"
            >
              {isAnyAnalyzing ? (
                <>
                  <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Analysing…
                </>
              ) : (
                <>Analyse {checkedCount}</>
              )}
            </button>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-0.5 pl-5">
          Sorted by road importance · {analyzedCount} analysed
          {checkedCount > 0 && ` · ${checkedCount} selected`}
        </p>
      </div>

      {/* Bridge rows */}
      <div className="flex-1 overflow-y-auto">
        {sorted.map((bridge) => {
          const report = analyzedBridges[bridge.osm_id];
          const isAnalyzing = !!analyzingBridgeIds[bridge.osm_id];
          const isChecked = !!checkedBridgeIds[bridge.osm_id];
          const riskColor = report ? (RISK_COLORS[report.risk_tier] || RISK_COLORS.OK) : null;

          return (
            <div
              key={bridge.osm_id}
              className={`w-full border-b border-gray-100 flex items-start gap-2 px-3 py-3 transition-colors ${
                isChecked ? "bg-blue-50" : "hover:bg-gray-50"
              }`}
            >
              {/* Checkbox */}
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => toggleCheckedBridge(bridge.osm_id)}
                className="mt-1 w-3.5 h-3.5 rounded border-gray-300 text-blue-600 cursor-pointer flex-shrink-0"
              />

              {/* Clickable row → opens detail */}
              <button
                onClick={() => setSelectedBridgeId(bridge.osm_id)}
                className="flex-1 min-w-0 flex items-start gap-2 text-left"
              >
                {/* Left colour bar */}
                <div
                  className="w-1 rounded-full flex-shrink-0 mt-0.5"
                  style={{
                    backgroundColor: riskColor ? riskColor.hex : "#d1d5db",
                    minHeight: 36,
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {bridge.name || `Bridge ${bridge.osm_id}`}
                    </p>
                    {isAnalyzing ? (
                      <span className="w-3.5 h-3.5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin flex-shrink-0" />
                    ) : report ? (
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: riskColor.bg, color: riskColor.text }}
                      >
                        {report.risk_tier}
                      </span>
                    ) : (
                      roadClassBadge(bridge.road_class)
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    Priority {bridge.priority_score}
                    {bridge.construction_year ? ` · Built ${bridge.construction_year}` : ""}
                    {bridge.material && bridge.material !== "unknown"
                      ? ` · ${bridge.material.replace(/_/g, " ")}` : ""}
                  </p>
                  {report?.recommended_action && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">{report.recommended_action}</p>
                  )}
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
