import useAppStore from "./store/useAppStore";
import SearchBar from "./components/SearchBar";
import MapView from "./components/MapView";
import BridgePanel from "./components/BridgePanel";
import ImageAnalysisModal from "./components/ImageAnalysisModal";
import { RISK_COLORS } from "./utils/riskColors";

const TIERS = ["CRITICAL", "HIGH", "MEDIUM", "OK"];

export default function App() {
  const bridges         = useAppStore((s) => s.bridges);
  const analyzedBridges = useAppStore((s) => s.analyzedBridges);
  const isLoading       = useAppStore((s) => s.isLoading);
  const error           = useAppStore((s) => s.error);

  const analysedReports = Object.values(analyzedBridges);
  const counts = TIERS.reduce((acc, t) => {
    acc[t] = analysedReports.filter((r) => r.risk_tier === t).length;
    return acc;
  }, {});

  return (
    <div className="h-screen flex flex-col bg-gray-100 overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="flex items-center gap-4 px-5 py-2.5 bg-white border-b border-gray-200 shadow-sm flex-shrink-0 z-10">
        {/* Brand */}
        <div className="flex items-baseline gap-2 mr-2">
          <span className="text-base font-bold text-gray-900 tracking-tight">DeepInspect</span>
          <span className="text-xs text-gray-400 hidden md:block">Bridge Risk · Poland</span>
        </div>

        {/* Risk summary chips — only shown once bridges are loaded */}
        {bridges.length > 0 && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-xs text-gray-400">
              {bridges.length} bridges · {analysedReports.length} analysed
            </span>
            {TIERS.filter((t) => counts[t] > 0).map((tier) => {
              const c = RISK_COLORS[tier];
              return (
                <span
                  key={tier}
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: c.bg, color: c.text }}
                >
                  {counts[tier]} {tier}
                </span>
              );
            })}
          </div>
        )}

        <div className="flex-1" />

        {/* Search + scan controls */}
        <SearchBar />
      </header>

      {/* Loading bar */}
      {isLoading && (
        <div className="h-0.5 bg-gray-200 flex-shrink-0">
          <div className="h-full bg-blue-500 animate-[pulse_1s_ease-in-out_infinite] w-3/4" />
        </div>
      )}

      {/* Error banner */}
      {error && !isLoading && (
        <div className="px-5 py-2 bg-red-50 border-b border-red-200 text-xs text-red-700 flex-shrink-0">
          <span className="font-semibold">Error: </span>{error}
        </div>
      )}

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Map fills remaining width */}
        <MapView />

        {/* Side panel — fixed width, shows list → detail → empty */}
        <BridgePanel />
      </div>

      {/* Image analysis modal — rendered above everything */}
      <ImageAnalysisModal />
    </div>
  );
}
