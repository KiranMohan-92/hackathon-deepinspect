import { useRef } from "react";
import BoundingBoxOverlay from "./BoundingBoxOverlay";
import type { UseAnalysisReturn } from "../../hooks/useAnalysisState";
import type { DamageItem, DamagesAssessment } from "../../types";

interface VisualAnalysisProps {
  analysis: UseAnalysisReturn;
}

export default function VisualAnalysis({ analysis }: VisualAnalysisProps) {
  const { state, toggleAnnotations } = analysis;
  const imgRef = useRef<HTMLImageElement>(null);

  const isIdle = state.analysisStatus === "idle";
  const isAnalyzing = state.analysisStatus === "analyzing";
  const hasImage = !!state.imagePreviewUrl;

  // Extract damages from vision agent payload
  const visionPayload = state.agents.vision.payload as DamagesAssessment | null;
  const damages: DamageItem[] = visionPayload?.damages || [];

  return (
    <div
      className="flex-1 relative flex items-center justify-center overflow-hidden"
      style={{ background: "#030308" }}
    >
      {/* Radial vignette overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, transparent 40%, rgba(6,6,10,0.7) 100%)",
          zIndex: 2,
        }}
      />

      {/* Awaiting target state */}
      {!hasImage && (
        <div className="flex flex-col items-center gap-4 z-10">
          <svg
            className="w-16 h-16 breathe"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            style={{ color: "var(--text-tertiary)" }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={0.8}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={0.8}
              d="M2 12h4M18 12h4M12 2v4M12 18v4"
            />
          </svg>
          <p
            className="font-mono-display text-lg tracking-[0.2em] breathe"
            style={{ color: "var(--text-tertiary)" }}
          >
            AWAITING TARGET
          </p>
        </div>
      )}

      {/* Image display */}
      {hasImage && (
        <div className="relative max-w-full max-h-full flex items-center justify-center">
          <img
            ref={imgRef}
            src={state.imagePreviewUrl!}
            alt="Infrastructure target"
            className="max-w-full max-h-full object-contain relative"
            style={{ zIndex: 1 }}
          />

          {/* Bounding box overlay */}
          {damages.length > 0 && (
            <BoundingBoxOverlay
              damages={damages}
              imageRef={imgRef}
              visible={state.showAnnotations}
            />
          )}
        </div>
      )}

      {/* Scanning line animation */}
      {isAnalyzing && hasImage && <div className="scan-line" />}

      {/* Floating toolbar */}
      {hasImage && !isIdle && (
        <div
          className="absolute top-3 right-3 flex gap-1.5 z-20"
        >
          {damages.length > 0 && (
            <button
              onClick={toggleAnnotations}
              className="px-3 py-1.5 rounded-lg text-xs font-mono-display tracking-wider transition-all"
              style={{
                background: state.showAnnotations
                  ? "rgba(0, 229, 255, 0.15)"
                  : "rgba(255,255,255,0.06)",
                border: `1px solid ${
                  state.showAnnotations
                    ? "rgba(0, 229, 255, 0.3)"
                    : "var(--bg-panel-border)"
                }`,
                color: state.showAnnotations
                  ? "var(--accent-scan)"
                  : "var(--text-tertiary)",
              }}
            >
              {state.showAnnotations ? "HIDE ANNOTATIONS" : "SHOW ANNOTATIONS"}
            </button>
          )}
        </div>
      )}

      {/* Overall severity badge */}
      {visionPayload && (
        <div
          className="absolute top-3 left-3 px-3 py-1.5 rounded-full font-mono-display text-xs z-20"
          style={{
            background: "rgba(0,0,0,0.7)",
            color: "var(--text-primary)",
            backdropFilter: "blur(8px)",
          }}
        >
          {visionPayload.overall_severity} — {Math.round(visionPayload.overall_confidence * 100)}% confidence
        </div>
      )}

      {/* Damage count badge */}
      {damages.length > 0 && (
        <div
          className="absolute bottom-3 left-3 px-3 py-1.5 rounded-lg z-20"
          style={{
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(8px)",
          }}
        >
          <p className="font-mono-display text-xs" style={{ color: "var(--accent-scan)" }}>
            {damages.length} DAMAGE{damages.length !== 1 ? "S" : ""} DETECTED
          </p>
        </div>
      )}
    </div>
  );
}
