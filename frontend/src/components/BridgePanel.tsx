import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Map, ChevronRight, Loader2, CheckCircle, XCircle, Circle, Brain, Eye, BookOpen, Shield } from "lucide-react";
import useAppStore from "../store/useAppStore";
import { useBridgeAnalyze } from "../hooks/useBridgeAnalyze";
import { RISK_COLORS } from "../utils/riskColors";
import RiskBadge from "./RiskBadge";
import ReportExport from "./ReportExport";
import BridgeImageViewer from "./BridgeImageViewer";
import BridgeList from "./BridgeList";
import { BridgeSummary, BridgeRiskReport } from "../types";

const ROAD_LABELS: Record<string, string> = {
  motorway: "Motorway", motorway_link: "Motorway Link",
  trunk: "Trunk Road", trunk_link: "Trunk Link",
  primary: "Primary Road", primary_link: "Primary Link",
  secondary: "Secondary Road", tertiary: "Tertiary Road",
  unclassified: "Local Road", residential: "Residential",
};

import { Variants } from "framer-motion";

const slidePanel: Variants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit: { opacity: 0, x: 20, transition: { duration: 0.2 } },
};

function MetaItem({ label, value }: { label: string; value: any }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-label mb-0.5">{label}</p>
      <p className="text-sm font-medium text-white capitalize">{String(value).replace(/_/g, " ")}</p>
    </div>
  );
}

const STAGE_META: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  vision: { icon: Eye, label: "VISION", color: "text-accent" },
  context: { icon: BookOpen, label: "CONTEXT", color: "intel-accent" },
  risk: { icon: Shield, label: "RISK", color: "text-severity-critical" },
};

function ThinkingFeed({ osm_id }: { osm_id: string }) {
  const blocks = useAppStore((s) => s.analysisThinking[osm_id]) || [];
  if (blocks.length === 0) return null;

  return (
    <div className="px-4 py-3 border-b border-glass-border" aria-live="polite">
      <div className="flex items-center gap-2 mb-2.5">
        <Brain className="w-3.5 h-3.5 text-accent" />
        <p className="text-label">AI REASONING</p>
      </div>
      <div className="space-y-2.5">
        {blocks.map((block, bi) => {
          const meta = STAGE_META[block.stage] || STAGE_META.vision;
          const Icon = meta.icon;
          return (
            <motion.div
              key={bi}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className={`w-3 h-3 ${meta.color}`} />
                <span className={`text-2xs font-mono font-bold tracking-wider ${meta.color}`}>
                  {meta.label}
                  {block.heading ? ` · H${block.heading}°` : ""}
                </span>
              </div>
              <div className="pl-4 space-y-1">
                {block.steps.map((step, si) => (
                  <motion.p
                    key={si}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: si * 0.05, duration: 0.2 }}
                    className="text-2xs text-muted leading-relaxed"
                  >
                    {step}
                  </motion.p>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function BridgePreAnalysis({ bridge }: { bridge: BridgeSummary }) {
  const { analyzeOneBridge } = useBridgeAnalyze();
  const analyzingBridgeIds = useAppStore((s) => s.analyzingBridgeIds);
  const setSelectedBridgeId = useAppStore((s) => s.setSelectedBridgeId);
  const isAnalyzing = !!analyzingBridgeIds[bridge.osm_id];

  return (
    <motion.div {...slidePanel} className="flex flex-col h-full">
      <div className="flex items-start justify-between px-4 py-3 border-b border-glass-border flex-shrink-0">
        <div className="flex-1 mr-2">
          <p className="font-medium text-sm text-white leading-snug">
            {bridge.name || `Bridge ${bridge.osm_id}`}
          </p>
          <p className="text-2xs font-mono text-dim mt-0.5">
            {bridge.lat.toFixed(5)}, {bridge.lon.toFixed(5)}
          </p>
        </div>
        <button
          onClick={() => setSelectedBridgeId(null)}
          className="text-dim hover:text-white transition-colors p-1 rounded hover:bg-surface-2"
          title="Back to list"
          aria-label="Close bridge details"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-4 border-b border-glass-border grid grid-cols-2 gap-x-6 gap-y-3">
          <MetaItem label="ROAD CLASS" value={ROAD_LABELS[(bridge as any).road_class] || (bridge as any).road_class} />
          <MetaItem label="PRIORITY" value={`${(bridge as any).priority_score || 0} / 6.5`} />
          <MetaItem label="BUILT" value={(bridge as any).construction_year} />
          {(bridge as any).material && (bridge as any).material !== "unknown" && (
            <MetaItem label="MATERIAL" value={(bridge as any).material} />
          )}
          {(bridge as any).max_weight_tons && (
            <MetaItem label="MAX WEIGHT" value={`${(bridge as any).max_weight_tons} t`} />
          )}
        </div>

        <div className="px-4 py-4 border-b border-glass-border">
          <p className="text-label mb-2.5">DEEP ANALYSIS INCLUDES</p>
          <ul className="space-y-2">
            {[
              "Street View imagery at 3 angles (N/E/W)",
              "AI defect detection with bounding boxes",
              "Historical context & construction era",
              "Risk score + engineering report",
            ].map((item) => (
              <li key={item} className="text-xs text-muted flex gap-2">
                <ChevronRight className="w-3 h-3 text-accent flex-shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="px-4 py-5">
          <button
            onClick={() => analyzeOneBridge(bridge)}
            disabled={isAnalyzing}
            className={`w-full py-3 px-4 rounded-lg font-mono font-bold text-xs tracking-wider transition-all ${
              isAnalyzing
                ? "bg-surface-2 text-dim cursor-not-allowed"
                : "glass-button-accent hover:shadow-glow-cyan"
            }`}
            aria-label="Run deep analysis"
          >
            {isAnalyzing ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                ANALYZING
              </span>
            ) : (
              "RUN DEEP ANALYSIS"
            )}
          </button>
          <p className="text-2xs text-dim text-center mt-2 font-mono">
            STREET VIEW + GEMINI AI ~ 15-30s
          </p>
        </div>

        <AnimatePresence>
          {isAnalyzing && <ThinkingFeed osm_id={bridge.osm_id} />}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function BridgeReport({ bridge, report }: { bridge: BridgeSummary; report: BridgeRiskReport }) {
  const setSelectedBridgeId = useAppStore((s) => s.setSelectedBridgeId);

  const tierColor = RISK_COLORS[report.risk_tier] || RISK_COLORS.OK;

  return (
    <motion.div {...slidePanel} className="flex flex-col h-full">
      <div className="flex items-start justify-between px-4 py-3 border-b border-glass-border flex-shrink-0">
        <div className="flex-1 mr-2">
          <p className="font-medium text-sm text-white leading-snug">
            {bridge.name || `Bridge ${bridge.osm_id}`}
          </p>
          <p className="text-2xs font-mono text-dim mt-0.5">
            {bridge.lat.toFixed(5)}, {bridge.lon.toFixed(5)}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <RiskBadge tier={report.risk_tier} score={(report as any).risk_score} />
          <button
            onClick={() => setSelectedBridgeId(null)}
            className="text-dim hover:text-white transition-colors p-1 rounded hover:bg-surface-2"
            aria-label="Close report"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="border-b border-glass-border">
          <BridgeImageViewer bridge={{ ...report, bridge_id: bridge.osm_id }} />
        </div>

        {(report as any).context && (
          <div className="px-4 py-3 border-b border-glass-border grid grid-cols-2 gap-x-6 gap-y-2">
            <MetaItem label="BUILT" value={(report as any).context.construction_year} />
            {(report as any).context.material !== "unknown" && (
              <MetaItem label="MATERIAL" value={(report as any).context.material} />
            )}
            {(report as any).context.construction_era !== "Unknown" && (
              <MetaItem label="ERA" value={(report as any).context.construction_era} />
            )}
            <MetaItem label="AGE" value={(report as any).context.age_years ? `${(report as any).context.age_years} years` : null} />
            <MetaItem label="SIGNIFICANCE" value={(report as any).context.structural_significance} />
          </div>
        )}

        {(report as any).condition_summary && (
          <div className="px-4 py-3 border-b border-glass-border">
            <p className="text-label mb-1.5">CONDITION SUMMARY</p>
            <p className="text-xs text-muted leading-relaxed">{(report as any).condition_summary}</p>
          </div>
        )}

        {(report as any).key_risk_factors?.length > 0 && (
          <div className="px-4 py-3 border-b border-glass-border">
            <p className="text-label mb-1.5">KEY RISK FACTORS</p>
            <ul className="space-y-1.5">
              {(report as any).key_risk_factors.map((f: string, i: number) => (
                <li key={i} className="text-xs text-muted flex gap-1.5">
                  <ChevronRight className="w-3 h-3 text-severity-critical flex-shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )}

        {(report as any).recommended_action && (
          <div
            className="px-4 py-3 border-b border-glass-border"
            style={{ backgroundColor: tierColor.bg }}
          >
            <p className="text-label mb-1">RECOMMENDED ACTION</p>
            <p className="text-xs font-semibold" style={{ color: tierColor.text }}>
              {(report as any).recommended_action}
            </p>
          </div>
        )}

        {(report as any).maintenance_notes?.length > 0 && (
          <div className="px-4 py-3 border-b border-glass-border">
            <p className="text-label mb-1.5">MAINTENANCE TASKS</p>
            <ul className="space-y-1.5">
              {(report as any).maintenance_notes.map((n: string, i: number) => (
                <li key={i} className="text-xs text-muted flex gap-1.5">
                  <span className="text-dim flex-shrink-0">-</span>
                  {n}
                </li>
              ))}
            </ul>
          </div>
        )}

        {(report as any).confidence_caveat && (
          <div className="px-4 py-3 border-b border-glass-border">
            <p className="text-2xs text-dim italic leading-relaxed">
              {(report as any).confidence_caveat}
            </p>
          </div>
        )}

        <div className="px-4 py-4">
          <ReportExport bridge={report} />
        </div>
      </div>
    </motion.div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6 gap-4">
      <div className="w-14 h-14 rounded-full bg-surface-2 flex items-center justify-center">
        <Map className="w-6 h-6 text-accent/50" />
      </div>
      <div>
        <p className="text-sm font-medium text-white mb-1">No bridges loaded</p>
        <p className="text-xs text-dim leading-relaxed">
          Enter a city (e.g. Warsaw) and click Scan, or zoom the map and use "Scan Area".
        </p>
      </div>
      <p className="text-2xs font-mono text-dim tracking-wider">
        OR UPLOAD A BRIDGE PHOTO
      </p>
    </div>
  );
}

function StepIcon({ status }: { status: string }) {
  if (status === "ok") return <CheckCircle className="w-3.5 h-3.5 text-severity-ok flex-shrink-0" />;
  if (status === "failed") return <XCircle className="w-3.5 h-3.5 text-severity-critical flex-shrink-0" />;
  if (status === "trying") return <Loader2 className="w-3.5 h-3.5 text-accent animate-spin flex-shrink-0" />;
  return <Circle className="w-3 h-3 text-dim flex-shrink-0" />;
}

function messageColor(status: string) {
  if (status === "ok") return "text-severity-ok";
  if (status === "failed") return "text-severity-critical";
  if (status === "trying") return "text-accent";
  return "text-dim";
}

function LoadingState() {
  const scanProgress = useAppStore((s) => s.scanProgress);

  return (
    <div className="flex flex-col h-full" aria-live="polite">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-glass-border flex-shrink-0">
        <Loader2 className="w-5 h-5 text-accent animate-spin flex-shrink-0" />
        <p className="text-sm font-mono font-bold text-accent tracking-wider">DISCOVERING</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
        {scanProgress.length === 0 && (
          <p className="text-2xs font-mono text-dim animate-breathe">INITIALIZING SCAN...</p>
        )}
        {scanProgress.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-start gap-2"
          >
            <StepIcon status={item.status} />
            <p className={`text-xs leading-relaxed font-mono ${messageColor(item.status)}`}>
              {item.message}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default function BridgePanel() {
  const selectedBridgeId = useAppStore((s) => s.selectedBridgeId);
  const bridges = useAppStore((s) => s.bridges);
  const analyzedBridges = useAppStore((s) => s.analyzedBridges);
  const isLoading = useAppStore((s) => s.isLoading);

  const selectedBridge = bridges.find((b) => b.osm_id === selectedBridgeId) || null;
  const report = selectedBridgeId ? analyzedBridges[selectedBridgeId] : null;

  return (
    <div className="w-96 flex-shrink-0 border-l border-glass-border bg-glass-heavy flex flex-col overflow-hidden">
      <AnimatePresence mode="wait">
        {selectedBridge ? (
          report ? (
            <BridgeReport key="report" bridge={selectedBridge} report={report} />
          ) : (
            <BridgePreAnalysis key="pre" bridge={selectedBridge} />
          )
        ) : isLoading ? (
          <LoadingState key="loading" />
        ) : bridges.length > 0 ? (
          <BridgeList key="list" />
        ) : (
          <EmptyState key="empty" />
        )}
      </AnimatePresence>
    </div>
  );
}
