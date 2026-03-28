import useAppStore from "../store/useAppStore";
import { RISK_COLORS } from "../utils/riskColors";
import RiskBadge from "./RiskBadge";
import ReportExport from "./ReportExport";
import BridgeImageViewer from "./BridgeImageViewer";
import BridgeList from "./BridgeList";

// ─── Detail view when a bridge is selected ────────────────────────────────────
function BridgeDetail({ bridge }) {
  const setSelectedBridge = useAppStore((s) => s.setSelectedBridge);
  const { context: ctx } = bridge;

  return (
    <div className="flex flex-col h-full">
      {/* Sticky header */}
      <div className="flex items-start justify-between px-4 py-3 border-b border-gray-200 bg-white flex-shrink-0">
        <div className="flex-1 mr-2">
          <p className="font-semibold text-sm text-gray-900 leading-snug">
            {bridge.bridge_name || `Bridge ${bridge.bridge_id}`}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {bridge.lat.toFixed(5)}, {bridge.lon.toFixed(5)}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <RiskBadge tier={bridge.risk_tier} score={bridge.risk_score} />
          <button
            onClick={() => setSelectedBridge(null)}
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
          <BridgeImageViewer bridge={bridge} />
        </div>

        {/* Context metadata */}
        {ctx && (
          <div className="px-4 py-3 border-b border-gray-100 grid grid-cols-2 gap-x-6 gap-y-2">
            {ctx.construction_year && (
              <div>
                <p className="text-xs text-gray-400">Built</p>
                <p className="text-sm font-medium">{ctx.construction_year}</p>
              </div>
            )}
            {ctx.material && ctx.material !== "unknown" && (
              <div>
                <p className="text-xs text-gray-400">Material</p>
                <p className="text-sm font-medium capitalize">{ctx.material.replace(/_/g, " ")}</p>
              </div>
            )}
            {ctx.construction_era && ctx.construction_era !== "Unknown" && (
              <div>
                <p className="text-xs text-gray-400">Era</p>
                <p className="text-sm font-medium">{ctx.construction_era}</p>
              </div>
            )}
            {ctx.age_years && (
              <div>
                <p className="text-xs text-gray-400">Age</p>
                <p className="text-sm font-medium">{ctx.age_years} years</p>
              </div>
            )}
            {ctx.structural_significance && (
              <div>
                <p className="text-xs text-gray-400">Significance</p>
                <p className="text-sm font-medium capitalize">{ctx.structural_significance}</p>
              </div>
            )}
          </div>
        )}

        {/* Condition summary */}
        {bridge.condition_summary && (
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Condition Summary
            </p>
            <p className="text-xs text-gray-700 leading-relaxed">{bridge.condition_summary}</p>
          </div>
        )}

        {/* Key risk factors */}
        {bridge.key_risk_factors?.length > 0 && (
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Key Risk Factors
            </p>
            <ul className="space-y-1">
              {bridge.key_risk_factors.map((f, i) => (
                <li key={i} className="text-xs text-gray-700 flex gap-1.5">
                  <span className="text-red-400 flex-shrink-0 mt-0.5">▸</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommended action */}
        {bridge.recommended_action && (
          <div
            className={`px-4 py-3 border-b border-gray-100 ${
              bridge.risk_tier === "CRITICAL" ? "bg-red-50" : "bg-gray-50"
            }`}
          >
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Recommended Action
            </p>
            <p
              className={`text-xs font-semibold ${
                bridge.risk_tier === "CRITICAL"
                  ? "text-red-700"
                  : bridge.risk_tier === "HIGH"
                  ? "text-orange-700"
                  : "text-gray-700"
              }`}
            >
              {bridge.recommended_action}
            </p>
          </div>
        )}

        {/* Maintenance notes */}
        {bridge.maintenance_notes?.length > 0 && (
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Maintenance Tasks
            </p>
            <ul className="space-y-1">
              {bridge.maintenance_notes.map((n, i) => (
                <li key={i} className="text-xs text-gray-700 flex gap-1.5">
                  <span className="text-gray-400 flex-shrink-0">•</span>
                  {n}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Confidence caveat */}
        {bridge.confidence_caveat && (
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs text-gray-400 italic leading-relaxed">
              {bridge.confidence_caveat}
            </p>
          </div>
        )}

        {/* PDF export */}
        <div className="px-4 py-4">
          <ReportExport bridge={bridge} />
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
        <p className="text-sm font-medium text-gray-700 mb-1">No bridges scanned yet</p>
        <p className="text-xs text-gray-400 leading-relaxed">
          Enter a city name (e.g. Warsaw, Kraków) and click Scan, or try the Demo button for Wrocław.
        </p>
      </div>
      <p className="text-xs text-gray-400">
        Or upload a bridge photo to analyse it directly.
      </p>
    </div>
  );
}

// ─── Loading state ────────────────────────────────────────────────────────────
function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3">
      <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
      <p className="text-xs text-gray-500">
        Scanning bridges — analysing Street View imagery…
      </p>
    </div>
  );
}

// ─── Main side panel (orchestrates all states) ────────────────────────────────
export default function BridgePanel() {
  const bridge = useAppStore((s) => s.selectedBridge);
  const bridges = useAppStore((s) => s.bridges);
  const isLoading = useAppStore((s) => s.isLoading);

  return (
    <div className="w-96 flex-shrink-0 border-l border-gray-200 bg-white flex flex-col overflow-hidden">
      {bridge ? (
        <BridgeDetail bridge={bridge} />
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
