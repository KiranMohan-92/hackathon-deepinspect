import { useAnalysisState } from "../../hooks/useAnalysisState";
import MissionInput from "./MissionInput";
import VisualAnalysis from "./VisualAnalysis";
import IntelligenceReport from "./IntelligenceReport";

export default function AnalysisMode() {
  const analysis = useAnalysisState();
  const { state } = analysis;

  const handleAnalyze = () => {
    if (!state.image) return;
    analysis.startAnalysis();

    // TODO: Phase 6 will wire this to the SSE streaming endpoint
    // For now, the UI renders with the state management + mock capability
  };

  return (
    <div className="h-full flex flex-col analysis-bg overflow-hidden">
      {/* 3-Panel Layout */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Panel A: Mission Input (280px) */}
        <div
          className="w-[280px] flex-shrink-0 flex flex-col glass-panel overflow-hidden"
          style={{ borderRight: "1px solid var(--bg-panel-border)" }}
        >
          <MissionInput analysis={analysis} onAnalyze={handleAnalyze} />
        </div>

        {/* Panel B: Visual Analysis (flex-1) */}
        <VisualAnalysis analysis={analysis} />

        {/* Panel C: Intelligence Report (340px) */}
        <div
          className="w-[340px] flex-shrink-0 flex flex-col glass-panel overflow-hidden"
          style={{ borderLeft: "1px solid var(--bg-panel-border)" }}
        >
          <IntelligenceReport analysis={analysis} />
        </div>
      </div>

      {/* Footer */}
      <div
        className="h-10 flex-shrink-0 flex items-center justify-between px-4"
        style={{
          background: "rgba(6, 6, 10, 0.95)",
          borderTop: "1px solid var(--bg-panel-border)",
        }}
      >
        <span
          className="font-mono-display text-xs tracking-wider"
          style={{ color: "var(--text-tertiary)" }}
        >
          DEEPINSPECT v1.0
        </span>

        <div className="flex items-center gap-4">
          <span className="text-xs" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-sans)" }}>
            Google ADK · Gemini Vision · 5 Agents
          </span>
          {state.analysisStatus === "analyzing" && (
            <span
              className="font-mono-display text-xs"
              style={{ color: "var(--accent-scan)" }}
            >
              {state.elapsedTime}s
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
