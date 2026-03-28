import useAppStore from "../store/useAppStore";
import { useBridgeAnalyze } from "../hooks/useBridgeAnalyze";
import { RISK_COLORS } from "../utils/riskColors";
import RiskBadge from "./RiskBadge";
import ReportExport from "./ReportExport";
import BridgeImageViewer from "./BridgeImageViewer";
import BridgeList from "./BridgeList";

const ROAD_LABELS = {
  motorway: "Motorway", motorway_link: "Motorway Link",
  trunk: "Trunk Road", trunk_link: "Trunk Link",
  primary: "Primary Road", primary_link: "Primary Link",
  secondary: "Secondary Road", tertiary: "Tertiary Road",
  unclassified: "Local Road", residential: "Residential",
};

// ─── Pre-analysis view (just metadata + Analyse button) ───────────────────────
function BridgePreAnalysis({ bridge }) {
  const { analyzeOneBridge } = useBridgeAnalyze();
  const analyzingBridgeIds = useAppStore((s) => s.analyzingBridgeIds);
  const setSelectedBridgeId = useAppStore((s) => s.setSelectedBridgeId);
  const isAnalyzing = !!analyzingBridgeIds[bridge.osm_id];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between px-4 py-3 border-b border-gray-200 bg-white flex-shrink-0">
        <div className="flex-1 mr-2">
          <p className="font-semibold text-sm text-gray-900 leading-snug">
            {bridge.name || `Bridge ${bridge.osm_id}`}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {bridge.lat.toFixed(5)}, {bridge.lon.toFixed(5)}
          </p>
        </div>
        <button
          onClick={() => setSelectedBridgeId(null)}
          className="text-gray-300 hover:text-gray-600 text-xl leading-none"
          title="Back to list"
        >
          ×
        </button>
      </div>

      {/* Metadata */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-4 border-b border-gray-100 grid grid-cols-2 gap-x-6 gap-y-3">
          {bridge.road_class && (
            <div>
              <p className="text-xs text-gray-400">Road class</p>
              <p className="text-sm font-medium">
                {ROAD_LABELS[bridge.road_class] || bridge.road_class}
              </p>
            </div>
          )}
          <div>
            <p className="text-xs text-gray-400">Priority score</p>
            <p className="text-sm font-medium">{bridge.priority_score} / 6.5</p>
          </div>
          {bridge.construction_year && (
            <div>
              <p className="text-xs text-gray-400">Built</p>
              <p className="text-sm font-medium">{bridge.construction_year}</p>
            </div>
          )}
          {bridge.material && bridge.material !== "unknown" && (
            <div>
              <p className="text-xs text-gray-400">Material</p>
              <p className="text-sm font-medium capitalize">
                {bridge.material.replace(/_/g, " ")}
              </p>
            </div>
          )}
          {bridge.max_weight_tons && (
            <div>
              <p className="text-xs text-gray-400">Max weight</p>
              <p className="text-sm font-medium">{bridge.max_weight_tons} t</p>
            </div>
          )}
        </div>

        {/* What analysis will do */}
        <div className="px-4 py-4 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Deep Analysis includes
          </p>
          <ul className="space-y-1.5">
            {[
              "Street View imagery at 3 angles (N/E/W)",
              "AI defect detection with bounding boxes",
              "Historical context & construction era",
              "Risk score + engineering report",
            ].map((item) => (
              <li key={item} className="text-xs text-gray-600 flex gap-2">
                <span className="text-blue-400 flex-shrink-0">▸</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Analyse button */}
        <div className="px-4 py-5">
          <button
            onClick={() => analyzeOneBridge(bridge)}
            disabled={isAnalyzing}
            className={`w-full py-3 px-4 rounded-lg font-semibold text-sm transition-colors ${
              isAnalyzing
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            {isAnalyzing ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-gray-300 border-t-white rounded-full animate-spin" />
                Analysing…
              </span>
            ) : (
              "Run Deep Analysis"
            )}
          </button>
          <p className="text-xs text-gray-400 text-center mt-2">
            Uses Street View + Gemini AI · ~15–30 seconds
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Post-analysis view (full risk report + images) ───────────────────────────
function BridgeReport({ bridge, report }) {
  const setSelectedBridgeId = useAppStore((s) => s.setSelectedBridgeId);
  const { ctx } = report;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between px-4 py-3 border-b border-gray-200 bg-white flex-shrink-0">
        <div className="flex-1 mr-2">
          <p className="font-semibold text-sm text-gray-900 leading-snug">
            {bridge.name || `Bridge ${bridge.osm_id}`}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {bridge.lat.toFixed(5)}, {bridge.lon.toFixed(5)}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <RiskBadge tier={report.risk_tier} score={report.risk_score} />
          <button
            onClick={() => setSelectedBridgeId(null)}
            className="text-gray-300 hover:text-gray-600 text-xl leading-none ml-1"
            title="Back to list"
          >
            ×
          </button>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        {/* Street View + defect overlays */}
        <div className="border-b border-gray-100">
          <BridgeImageViewer bridge={{ ...report, bridge_id: bridge.osm_id }} />
        </div>

        {/* Context metadata */}
        {report.context && (
          <div className="px-4 py-3 border-b border-gray-100 grid grid-cols-2 gap-x-6 gap-y-2">
            {report.context.construction_year && (
              <div>
                <p className="text-xs text-gray-400">Built</p>
                <p className="text-sm font-medium">{report.context.construction_year}</p>
              </div>
            )}
            {report.context.material && report.context.material !== "unknown" && (
              <div>
                <p className="text-xs text-gray-400">Material</p>
                <p className="text-sm font-medium capitalize">
                  {report.context.material.replace(/_/g, " ")}
                </p>
              </div>
            )}
            {report.context.construction_era && report.context.construction_era !== "Unknown" && (
              <div>
                <p className="text-xs text-gray-400">Era</p>
                <p className="text-sm font-medium">{report.context.construction_era}</p>
              </div>
            )}
            {report.context.age_years && (
              <div>
                <p className="text-xs text-gray-400">Age</p>
                <p className="text-sm font-medium">{report.context.age_years} years</p>
              </div>
            )}
            {report.context.structural_significance && (
              <div>
                <p className="text-xs text-gray-400">Significance</p>
                <p className="text-sm font-medium capitalize">
                  {report.context.structural_significance}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Condition summary */}
        {report.condition_summary && (
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Condition Summary
            </p>
            <p className="text-xs text-gray-700 leading-relaxed">{report.condition_summary}</p>
          </div>
        )}

        {/* Key risk factors */}
        {report.key_risk_factors?.length > 0 && (
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Key Risk Factors
            </p>
            <ul className="space-y-1">
              {report.key_risk_factors.map((f, i) => (
                <li key={i} className="text-xs text-gray-700 flex gap-1.5">
                  <span className="text-red-400 flex-shrink-0 mt-0.5">▸</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommended action */}
        {report.recommended_action && (
          <div
            className={`px-4 py-3 border-b border-gray-100 ${
              report.risk_tier === "CRITICAL" ? "bg-red-50" : "bg-gray-50"
            }`}
          >
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Recommended Action
            </p>
            <p
              className={`text-xs font-semibold ${
                report.risk_tier === "CRITICAL"
                  ? "text-red-700"
                  : report.risk_tier === "HIGH"
                  ? "text-orange-700"
                  : "text-gray-700"
              }`}
            >
              {report.recommended_action}
            </p>
          </div>
        )}

        {/* Maintenance notes */}
        {report.maintenance_notes?.length > 0 && (
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Maintenance Tasks
            </p>
            <ul className="space-y-1">
              {report.maintenance_notes.map((n, i) => (
                <li key={i} className="text-xs text-gray-700 flex gap-1.5">
                  <span className="text-gray-400 flex-shrink-0">•</span>
                  {n}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Confidence caveat */}
        {report.confidence_caveat && (
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs text-gray-400 italic leading-relaxed">
              {report.confidence_caveat}
            </p>
          </div>
        )}

        {/* PDF export */}
        <div className="px-4 py-4">
          <ReportExport bridge={report} />
        </div>
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6 gap-4">
      <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
        <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-700 mb-1">No bridges loaded yet</p>
        <p className="text-xs text-gray-400 leading-relaxed">
          Enter a city (e.g. Warsaw, Kraków) and click Scan — or zoom the map and use "Scan this area".
        </p>
      </div>
      <p className="text-xs text-gray-400">
        Or upload a bridge photo to analyse it directly.
      </p>
    </div>
  );
}

// ─── Step icon ───────────────────────────────────────────────────────────────
function StepIcon({ status }) {
  if (status === "ok")
    return <span className="text-green-500 font-bold flex-shrink-0">✓</span>;
  if (status === "failed")
    return <span className="text-red-400 font-bold flex-shrink-0">✗</span>;
  if (status === "trying")
    return (
      <span className="w-3 h-3 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin flex-shrink-0 mt-0.5" />
    );
  return <span className="text-gray-400 flex-shrink-0">·</span>;
}

function messageColor(status) {
  if (status === "ok")     return "text-green-700";
  if (status === "failed") return "text-red-500";
  if (status === "trying") return "text-blue-600";
  return "text-gray-500";
}

// ─── Loading state ────────────────────────────────────────────────────────────
function LoadingState() {
  const scanProgress = useAppStore((s) => s.scanProgress);

  return (
    <div className="flex flex-col h-full">
      {/* Header spinner */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100 flex-shrink-0">
        <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin flex-shrink-0" />
        <p className="text-sm font-medium text-gray-700">Discovering bridges…</p>
      </div>

      {/* Live progress log */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {scanProgress.length === 0 && (
          <p className="text-xs text-gray-400 italic">Starting…</p>
        )}
        {scanProgress.map((item, i) => (
          <div key={i} className="flex items-start gap-2">
            <StepIcon status={item.status} />
            <p className={`text-xs leading-relaxed ${messageColor(item.status)}`}>
              {item.message}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main side panel ──────────────────────────────────────────────────────────
export default function BridgePanel() {
  const selectedBridgeId = useAppStore((s) => s.selectedBridgeId);
  const bridges = useAppStore((s) => s.bridges);
  const analyzedBridges = useAppStore((s) => s.analyzedBridges);
  const isLoading = useAppStore((s) => s.isLoading);

  const selectedBridge = bridges.find((b) => b.osm_id === selectedBridgeId) || null;
  const report = selectedBridgeId ? analyzedBridges[selectedBridgeId] : null;

  return (
    <div className="w-96 flex-shrink-0 border-l border-gray-200 bg-white flex flex-col overflow-hidden">
      {selectedBridge ? (
        report ? (
          <BridgeReport bridge={selectedBridge} report={report} />
        ) : (
          <BridgePreAnalysis bridge={selectedBridge} />
        )
      ) : isLoading ? (
        <LoadingState />
      ) : bridges.length > 0 ? (
        <BridgeList />
      ) : (
        <EmptyState />
      )}
    </div>
  );
}
