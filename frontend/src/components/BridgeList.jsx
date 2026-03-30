import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import useAppStore from "../store/useAppStore";
import { useBridgeAnalyze } from "../hooks/useBridgeAnalyze";
import { RISK_COLORS, ROAD_COLORS } from "../utils/riskColors";
import { staggerContainer, staggerItem } from "../utils/motionVariants";

const ROAD_TABS = ["ALL", "MOTORWAY", "PRIMARY", "SECONDARY", "LOCAL"];
function roadTabMatch(tab, roadClass) {
  if (tab === "ALL") return true;
  if (tab === "MOTORWAY") return roadClass === "motorway" || roadClass === "motorway_link" || roadClass === "trunk" || roadClass === "trunk_link";
  if (tab === "PRIMARY") return roadClass === "primary" || roadClass === "primary_link";
  if (tab === "SECONDARY") return roadClass === "secondary" || roadClass === "secondary_link" || roadClass === "tertiary" || roadClass === "tertiary_link";
  if (tab === "LOCAL") return roadClass === "unclassified" || roadClass === "residential" || !roadClass;
  return true;
}

function roadClassBadge(rc) {
  const c = ROAD_COLORS[rc] || ROAD_COLORS.residential;
  const label = {
    motorway: "Motorway", motorway_link: "Motorway", trunk: "Trunk", trunk_link: "Trunk",
    primary: "Primary", primary_link: "Primary", secondary: "Secondary", secondary_link: "Secondary",
    tertiary: "Tertiary", tertiary_link: "Tertiary", unclassified: "Local", residential: "Residential",
  }[rc] || rc || "Road";

  return (
    <span
      className="text-2xs font-mono font-bold px-1.5 py-0.5 rounded flex-shrink-0 tracking-wider"
      style={{ backgroundColor: c.bg, color: c.text, border: `1px solid ${c.border}` }}
    >
      {label.toUpperCase()}
    </span>
  );
}

export default function BridgeList() {
  const [roadTab, setRoadTab] = useState("ALL");
  const bridges = useAppStore((s) => s.bridges);
  const analyzedBridges = useAppStore((s) => s.analyzedBridges);
  const analyzingBridgeIds = useAppStore((s) => s.analyzingBridgeIds);
  const checkedBridgeIds = useAppStore((s) => s.checkedBridgeIds);
  const setSelectedBridgeId = useAppStore((s) => s.setSelectedBridgeId);
  const toggleCheckedBridge = useAppStore((s) => s.toggleCheckedBridge);
  const setCheckedBridges = useAppStore((s) => s.setCheckedBridges);
  const clearCheckedBridges = useAppStore((s) => s.clearCheckedBridges);
  const { analyzeMultipleBridges } = useBridgeAnalyze();

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
    if (allChecked) clearCheckedBridges();
    else setCheckedBridges(bridges.map((b) => b.osm_id));
  };

  const handleAnalyzeSelected = () => {
    const selected = sorted.filter((b) => checkedBridgeIds[b.osm_id]);
    analyzeMultipleBridges(selected);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-glass-border flex-shrink-0">
        <div className="flex items-center justify-between gap-2">
          <label className="flex items-center gap-2 cursor-pointer min-w-0">
            <input
              type="checkbox"
              checked={allChecked}
              ref={(el) => { if (el) el.indeterminate = someChecked; }}
              onChange={handleSelectAll}
              className="w-3.5 h-3.5 rounded border-glass-border-hover bg-surface-2 text-accent cursor-pointer flex-shrink-0 accent-accent"
            />
            <span className="text-label">
              {bridges.length} BRIDGES FOUND
            </span>
          </label>

          {checkedCount > 0 && (
            <button
              onClick={handleAnalyzeSelected}
              disabled={isAnyAnalyzing}
              className="glass-button-accent flex items-center gap-1.5 px-2.5 py-1 text-2xs font-mono font-bold tracking-wider
                         disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
            >
              {isAnyAnalyzing ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  ANALYZING
                </>
              ) : (
                <>ANALYZE {checkedCount}</>
              )}
            </button>
          )}
        </div>
        <p className="text-2xs font-mono text-dim mt-1 pl-5 tracking-wider">
          SORTED BY PRIORITY ~ {analyzedCount} ANALYZED
          {checkedCount > 0 && ` ~ ${checkedCount} SELECTED`}
        </p>

        {/* Road class tabs */}
        <div className="flex gap-1 mt-2 pl-5 overflow-x-auto">
          {ROAD_TABS.map((tab) => {
            const count = tab === "ALL" ? bridges.length : bridges.filter((b) => roadTabMatch(tab, b.road_class)).length;
            if (count === 0 && tab !== "ALL") return null;
            return (
              <button
                key={tab}
                onClick={() => setRoadTab(tab)}
                className={`px-2 py-0.5 text-2xs font-mono font-medium rounded transition-all flex-shrink-0 ${
                  roadTab === tab
                    ? "bg-accent/12 text-accent border border-accent/25"
                    : "text-dim hover:text-muted border border-transparent"
                }`}
              >
                {tab} {count}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bridge rows */}
      <motion.div
        className="flex-1 overflow-y-auto"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {sorted.filter((b) => roadTabMatch(roadTab, b.road_class)).map((bridge) => {
          const report = analyzedBridges[bridge.osm_id];
          const isAnalyzing = !!analyzingBridgeIds[bridge.osm_id];
          const isChecked = !!checkedBridgeIds[bridge.osm_id];
          const riskColor = report ? (RISK_COLORS[report.risk_tier] || RISK_COLORS.OK) : null;

          return (
            <motion.div
              key={bridge.osm_id}
              variants={staggerItem}
              className={`w-full border-b border-glass-border flex items-start gap-2 px-3 py-3 transition-colors ${
                isChecked ? "bg-accent/5" : "hover:bg-surface-1"
              }`}
            >
              {/* Checkbox */}
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => toggleCheckedBridge(bridge.osm_id)}
                className="mt-1 w-3.5 h-3.5 rounded border-glass-border-hover bg-surface-2 text-accent cursor-pointer flex-shrink-0 accent-accent"
              />

              {/* Clickable row */}
              <button
                onClick={() => setSelectedBridgeId(bridge.osm_id)}
                className="flex-1 min-w-0 flex items-start gap-2 text-left"
              >
                {/* Left color bar */}
                <div
                  className="w-1 rounded-full flex-shrink-0 mt-0.5 transition-all"
                  style={{
                    backgroundColor: riskColor ? riskColor.hex : "rgba(0, 229, 255, 0.2)",
                    boxShadow: riskColor ? `0 0 6px ${riskColor.ring}` : "none",
                    minHeight: 36,
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <p className="text-sm font-medium text-white truncate">
                      {bridge.name || `Bridge ${bridge.osm_id}`}
                    </p>
                    {isAnalyzing ? (
                      <Loader2 className="w-3.5 h-3.5 text-accent animate-spin flex-shrink-0" />
                    ) : report ? (
                      <span
                        className="text-2xs font-mono font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor: riskColor.bg,
                          color: riskColor.text,
                          border: `1px solid ${riskColor.border}`,
                        }}
                      >
                        {report.risk_tier}
                      </span>
                    ) : (
                      roadClassBadge(bridge.road_class)
                    )}
                  </div>
                  <p className="text-2xs font-mono text-dim tracking-wider">
                    P{bridge.priority_score}
                    {bridge.construction_year ? ` ~ ${bridge.construction_year}` : ""}
                    {bridge.material && bridge.material !== "unknown"
                      ? ` ~ ${bridge.material.replace(/_/g, " ").toUpperCase()}`
                      : ""}
                  </p>
                  {report?.recommended_action && (
                    <p className="text-xs text-muted/60 truncate mt-0.5">{report.recommended_action}</p>
                  )}
                </div>
              </button>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
