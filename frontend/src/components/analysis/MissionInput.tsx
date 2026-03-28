import { useRef, useState, type DragEvent, type ChangeEvent } from "react";
import type { UseAnalysisReturn } from "../../hooks/useAnalysisState";

interface MissionInputProps {
  analysis: UseAnalysisReturn;
  onAnalyze: () => void;
}

const DEMO_SCENARIOS = [
  { id: "satellite", label: "SATELLITE SOLAR PANEL", icon: "S" },
  { id: "bridge", label: "BRIDGE CRACK ANALYSIS", icon: "B" },
  { id: "subsea", label: "SUBSEA CABLE DAMAGE", icon: "U" },
] as const;

export default function MissionInput({ analysis, onAnalyze }: MissionInputProps) {
  const { state, setImage, reset } = analysis;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [context, setContext] = useState({
    age: "",
    location: "",
    last_inspection: "",
    known_issues: "",
  });

  const hasImage = !!state.image;
  const isAnalyzing = state.analysisStatus === "analyzing";

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setImage(file);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const handleAnalyze = () => {
    if (!hasImage) return;
    onAnalyze();
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 flex-shrink-0" style={{ borderBottom: "1px solid var(--bg-panel-border)" }}>
        <p className="label-mono" style={{ color: "var(--text-secondary)" }}>
          MISSION INPUT
        </p>
      </div>

      <div className="flex-1 overflow-y-auto dark-scrollbar px-4 py-3 space-y-4">
        {/* Upload Zone */}
        {!hasImage ? (
          <div
            className={`rounded-xl p-6 flex flex-col items-center gap-3 cursor-pointer transition-all ${
              isDragOver ? "scale-[1.02]" : ""
            }`}
            style={{
              border: `2px dashed ${isDragOver ? "var(--accent-scan)" : "var(--bg-panel-border)"}`,
              background: isDragOver ? "var(--accent-scan-dim)" : "transparent",
            }}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
          >
            <svg
              className="w-8 h-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              style={{ color: isDragOver ? "var(--accent-scan)" : "var(--text-tertiary)" }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 4v16m8-8H4" />
            </svg>
            <p className="text-xs text-center" style={{ color: "var(--text-secondary)" }}>
              Drop infrastructure image or click to browse
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInput}
              className="hidden"
            />
          </div>
        ) : (
          /* Image Preview */
          <div className="rounded-xl overflow-hidden relative" style={{ border: "1px solid var(--bg-panel-border)" }}>
            <img
              src={state.imagePreviewUrl!}
              alt="Upload preview"
              className="w-full h-32 object-cover"
            />
            <div
              className="absolute bottom-0 left-0 right-0 px-3 py-2 flex items-center justify-between"
              style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.8))" }}
            >
              <p className="text-xs truncate" style={{ color: "var(--text-primary)" }}>
                {state.image!.name}
              </p>
              <button
                onClick={reset}
                className="text-xs px-2 py-0.5 rounded transition-colors"
                style={{
                  color: "var(--text-secondary)",
                  background: "rgba(255,255,255,0.1)",
                }}
                disabled={isAnalyzing}
              >
                Remove
              </button>
            </div>
          </div>
        )}

        {/* Context Fields */}
        <div>
          <button
            onClick={() => setContextOpen(!contextOpen)}
            className="flex items-center gap-2 w-full text-left"
          >
            <svg
              className={`w-3 h-3 transition-transform ${contextOpen ? "rotate-90" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              style={{ color: "var(--text-tertiary)" }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="label-mono" style={{ color: "var(--text-secondary)" }}>
              SUPPLEMENTARY CONTEXT
            </span>
          </button>

          {contextOpen && (
            <div className="mt-3 space-y-2.5">
              {[
                { key: "age" as const, label: "Structure Age", placeholder: "e.g. 45 years" },
                { key: "location" as const, label: "Location", placeholder: "e.g. Warsaw, Poland" },
                { key: "last_inspection" as const, label: "Last Inspection", placeholder: "e.g. 2022" },
                { key: "known_issues" as const, label: "Known Issues", placeholder: "e.g. Previous crack repairs" },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label
                    className="text-xs block mb-1"
                    style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-sans)" }}
                  >
                    {label}
                  </label>
                  <input
                    type="text"
                    value={context[key]}
                    onChange={(e) => setContext({ ...context, [key]: e.target.value })}
                    placeholder={placeholder}
                    className="w-full px-3 py-2 rounded-lg text-xs outline-none transition-colors"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid var(--bg-panel-border)",
                      color: "var(--text-primary)",
                      fontFamily: "var(--font-sans)",
                    }}
                    disabled={isAnalyzing}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Demo Buttons */}
        <div className="space-y-1.5">
          <p className="label-mono mb-2" style={{ color: "var(--text-secondary)" }}>
            QUICK DEMO
          </p>
          {DEMO_SCENARIOS.map((s) => (
            <button
              key={s.id}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all glass-panel-hover"
              style={{
                background: "transparent",
                border: "1px solid var(--bg-panel-border)",
              }}
              disabled={isAnalyzing}
            >
              <span
                className="w-6 h-6 rounded flex items-center justify-center font-mono-display text-xs flex-shrink-0"
                style={{
                  background: "var(--accent-scan-dim)",
                  color: "var(--accent-scan)",
                  border: "1px solid rgba(0, 229, 255, 0.2)",
                }}
              >
                {s.icon}
              </span>
              <span className="font-mono-display text-xs tracking-wider" style={{ color: "var(--text-primary)" }}>
                {s.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Analyze Button */}
      <div className="px-4 py-3 flex-shrink-0" style={{ borderTop: "1px solid var(--bg-panel-border)" }}>
        <button
          onClick={handleAnalyze}
          disabled={!hasImage || isAnalyzing}
          className="w-full py-3 rounded-lg font-mono-display text-sm tracking-[0.15em] transition-all"
          style={{
            background: hasImage && !isAnalyzing ? "var(--accent-scan)" : "rgba(255,255,255,0.04)",
            color: hasImage && !isAnalyzing ? "#06060a" : "var(--text-tertiary)",
            opacity: !hasImage ? 0.3 : 1,
            cursor: !hasImage || isAnalyzing ? "not-allowed" : "pointer",
          }}
        >
          {isAnalyzing ? "ANALYZING..." : "ANALYZE"}
        </button>
      </div>
    </div>
  );
}
