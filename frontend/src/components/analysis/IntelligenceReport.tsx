import AgentFeed from "./AgentFeed";
import RiskReport from "./RiskReport";
import type { UseAnalysisReturn } from "../../hooks/useAnalysisState";
import type { PriorityReport } from "../../types";

interface IntelligenceReportProps {
  analysis: UseAnalysisReturn;
}

export default function IntelligenceReport({ analysis }: IntelligenceReportProps) {
  const { state, AGENT_ORDER } = analysis;
  const priorityPayload = state.agents.priority.payload as PriorityReport | null;
  const isComplete = state.analysisStatus === "complete" && priorityPayload;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 flex-shrink-0" style={{ borderBottom: "1px solid var(--bg-panel-border)" }}>
        <p className="label-mono" style={{ color: "var(--text-secondary)" }}>
          INTELLIGENCE
        </p>
      </div>

      {/* Content — scrollable */}
      <div className="flex-1 overflow-y-auto dark-scrollbar px-4 py-3 space-y-4">
        {/* Agent Feed — always visible during analysis */}
        {state.analysisStatus !== "idle" && (
          <AgentFeed agents={state.agents} agentOrder={AGENT_ORDER} />
        )}

        {/* Divider between feed and report */}
        {isComplete && (
          <div
            className="my-3"
            style={{ borderTop: "1px solid var(--bg-panel-border)" }}
          />
        )}

        {/* Risk Report — appears after priority agent completes */}
        {isComplete && priorityPayload && (
          <RiskReport report={priorityPayload} />
        )}

        {/* Idle state */}
        {state.analysisStatus === "idle" && (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-12">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ border: "1.5px solid var(--text-tertiary)" }}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                style={{ color: "var(--text-tertiary)" }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <p className="text-xs text-center" style={{ color: "var(--text-tertiary)" }}>
              Upload an infrastructure image to begin analysis
            </p>
          </div>
        )}

        {/* Error state */}
        {state.analysisStatus === "error" && (
          <div
            className="rounded-lg p-3 mx-1"
            style={{
              background: "rgba(255, 23, 68, 0.08)",
              border: "1px solid rgba(255, 23, 68, 0.2)",
            }}
          >
            <p className="label-mono mb-1" style={{ color: "var(--severity-critical)" }}>
              ANALYSIS FAILED
            </p>
            <p className="text-xs" style={{ color: "var(--text-primary)" }}>
              {state.errorMessage || "An unexpected error occurred. Please try again."}
            </p>
          </div>
        )}

        {/* Elapsed time */}
        {state.analysisStatus === "analyzing" && (
          <div className="text-center pt-2">
            <span className="label-mono" style={{ color: "var(--accent-scan)" }}>
              {state.elapsedTime}s ELAPSED
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
