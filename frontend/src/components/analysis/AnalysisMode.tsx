import { useAnalysisState } from "../../hooks/useAnalysisState";
import { useSSE } from "../../hooks/useSSE";
import MissionInput from "./MissionInput";
import VisualAnalysis from "./VisualAnalysis";
import IntelligenceReport from "./IntelligenceReport";

export default function AnalysisMode() {
  const analysis = useAnalysisState();
  const { state } = analysis;
  const { analyzeImage, analyzeDemo, cancel } = useSSE(analysis);

  return (
    <div className="h-full flex flex-col analysis-bg overflow-hidden">
      {/* 3-Panel Layout */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Panel A: Mission Input (280px) */}
        <div
          className="w-[280px] flex-shrink-0 flex flex-col glass-panel overflow-hidden"
          style={{ borderRight: "1px solid var(--bg-panel-border)" }}
        >
          <MissionInput
            analysis={analysis}
            onAnalyze={analyzeImage}
            onDemo={analyzeDemo}
          />
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
            <>
              <button
                onClick={cancel}
                className="text-xs px-2 py-0.5 rounded transition-colors"
                style={{
                  color: "var(--severity-critical)",
                  border: "1px solid rgba(255,23,68,0.3)",
                  background: "rgba(255,23,68,0.08)",
                }}
              >
                CANCEL
              </button>
              <span
                className="font-mono-display text-xs"
                style={{ color: "var(--accent-scan)" }}
              >
                {state.elapsedTime}s
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
