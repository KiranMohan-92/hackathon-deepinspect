import { useState } from "react";
import useAppStore from "./store/useAppStore";
import SearchBar from "./components/SearchBar";
import MapView from "./components/MapView";
import BridgePanel from "./components/BridgePanel";
import ImageAnalysisModal from "./components/ImageAnalysisModal";
import AnalysisMode from "./components/analysis/AnalysisMode";
import { RISK_COLORS } from "./utils/riskColors";
import type { RiskTier } from "./types";

type AppMode = "ANALYSIS" | "MAP";

const TIERS: RiskTier[] = ["CRITICAL", "HIGH", "MEDIUM", "OK"];

export default function App() {
  const [mode, setMode] = useState<AppMode>("ANALYSIS");

  const bridges  = useAppStore((s) => s.bridges);
  const isLoading = useAppStore((s) => s.isLoading);
  const error    = useAppStore((s) => s.error);

  const counts = TIERS.reduce<Record<string, number>>((acc, t) => {
    acc[t] = bridges.filter((b) => b.risk_tier === t).length;
    return acc;
  }, {});

  // Analysis Mode — full viewport, own header/footer
  if (mode === "ANALYSIS") {
    return (
      <div className="h-screen flex flex-col overflow-hidden">
        {/* Minimal header with mode toggle */}
        <header
          className="flex items-center gap-4 px-5 py-2 flex-shrink-0 z-10"
          style={{
            background: "rgba(6, 6, 10, 0.95)",
            borderBottom: "1px solid var(--bg-panel-border)",
          }}
        >
          <span
            className="font-mono-display text-sm tracking-wider"
            style={{ color: "var(--text-primary)" }}
          >
            DEEPINSPECT
          </span>
          <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            Infrastructure Intelligence
          </span>

          <div className="flex-1" />

          {/* Mode Toggle */}
          <ModeToggle mode={mode} onToggle={setMode} />
        </header>

        <div className="flex-1 overflow-hidden">
          <AnalysisMode />
        </div>
      </div>
    );
  }

  // Map Mode — original UI preserved exactly
  return (
    <div className="h-screen flex flex-col bg-gray-100 overflow-hidden">
      <header className="flex items-center gap-4 px-5 py-2.5 bg-white border-b border-gray-200 shadow-sm flex-shrink-0 z-10">
        <div className="flex items-baseline gap-2 mr-2">
          <span className="text-base font-bold text-gray-900 tracking-tight">DeepInspect</span>
          <span className="text-xs text-gray-400 hidden md:block">Bridge Risk · Poland</span>
        </div>

        {bridges.length > 0 && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-xs text-gray-400">{bridges.length} bridges</span>
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

        {/* Mode Toggle */}
        <ModeToggle mode={mode} onToggle={setMode} />
        <SearchBar />
      </header>

      {isLoading && (
        <div className="h-0.5 bg-gray-200 flex-shrink-0">
          <div className="h-full bg-blue-500 animate-[pulse_1s_ease-in-out_infinite] w-3/4" />
        </div>
      )}

      {error && !isLoading && (
        <div className="px-5 py-2 bg-red-50 border-b border-red-200 text-xs text-red-700 flex-shrink-0">
          <span className="font-semibold">Error: </span>{error}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden min-h-0">
        <MapView />
        <BridgePanel />
      </div>

      <ImageAnalysisModal />
    </div>
  );
}

// ── Mode Toggle Component ───────────────────────────────────────────────────

function ModeToggle({ mode, onToggle }: { mode: AppMode; onToggle: (m: AppMode) => void }) {
  const isAnalysis = mode === "ANALYSIS";

  return (
    <div
      className="flex rounded-lg overflow-hidden"
      style={{
        border: isAnalysis ? "1px solid var(--bg-panel-border)" : "1px solid #d1d5db",
      }}
    >
      <button
        onClick={() => onToggle("ANALYSIS")}
        className="px-3 py-1 text-xs font-semibold transition-all"
        style={
          isAnalysis
            ? { background: "var(--accent-scan)", color: "#06060a" }
            : { background: "transparent", color: "#6b7280" }
        }
      >
        ANALYSIS
      </button>
      <button
        onClick={() => onToggle("MAP")}
        className="px-3 py-1 text-xs font-semibold transition-all"
        style={
          !isAnalysis
            ? { background: "#111827", color: "#ffffff" }
            : {
                background: isAnalysis ? "rgba(255,255,255,0.04)" : "transparent",
                color: isAnalysis ? "var(--text-tertiary)" : "#6b7280",
              }
        }
      >
        MAP
      </button>
    </div>
  );
}
