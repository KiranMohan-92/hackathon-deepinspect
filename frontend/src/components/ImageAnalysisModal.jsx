import { useEffect, useRef, useState } from "react";
import useAppStore from "../store/useAppStore";

const DEFECT_KEYS = [
  "cracking",
  "spalling",
  "corrosion",
  "surface_degradation",
  "drainage",
  "structural_deformation",
];

const DEFECT_META = {
  cracking:              { color: "#EF4444", label: "Cracking" },
  spalling:              { color: "#F97316", label: "Spalling" },
  corrosion:             { color: "#92400E", label: "Corrosion" },
  surface_degradation:   { color: "#EAB308", label: "Surface Damage" },
  drainage:              { color: "#3B82F6", label: "Drainage" },
  structural_deformation:{ color: "#8B5CF6", label: "Deformation" },
};

function scoreLabel(score) {
  if (score >= 5) return { text: "CRITICAL", cls: "text-red-700 bg-red-100" };
  if (score >= 4) return { text: "SEVERE",   cls: "text-red-600 bg-red-50" };
  if (score >= 3) return { text: "HIGH",     cls: "text-orange-600 bg-orange-50" };
  if (score >= 2) return { text: "MODERATE", cls: "text-amber-600 bg-amber-50" };
  return           { text: "OK",         cls: "text-green-700 bg-green-50" };
}

// Draws defect bounding boxes on the canvas over the image
function useDefectCanvas(imgRef, canvasRef, analysis, imageLoaded) {
  useEffect(() => {
    if (!imageLoaded || !canvasRef.current || !imgRef.current || !analysis) return;
    const img = imgRef.current;
    const canvas = canvasRef.current;
    const w = img.offsetWidth;
    const h = img.offsetHeight;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, w, h);

    DEFECT_KEYS.forEach((key) => {
      const defect = analysis[key];
      if (!defect || defect.score < 2 || !defect.regions?.length) return;
      const { color } = DEFECT_META[key];

      defect.regions.forEach((r) => {
        const x  = r.x1 * w;
        const y  = r.y1 * h;
        const bw = (r.x2 - r.x1) * w;
        const bh = (r.y2 - r.y1) * h;
        if (bw <= 0 || bh <= 0) return;

        // Semi-transparent fill
        ctx.fillStyle = color + "28";
        ctx.fillRect(x, y, bw, bh);

        // Border
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([]);
        ctx.strokeRect(x, y, bw, bh);

        // Label pill
        const label = DEFECT_META[key].label;
        ctx.font = "bold 11px system-ui, sans-serif";
        const tw = ctx.measureText(label).width + 10;
        const th = 18;
        const lx = x;
        const ly = y > th + 2 ? y - th - 2 : y + 2;

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect?.(lx, ly, tw, th, 4) ?? ctx.fillRect(lx, ly, tw, th);
        ctx.fill();

        ctx.fillStyle = "#fff";
        ctx.fillText(label, lx + 5, ly + 13);
      });
    });
  }, [imageLoaded, analysis]);
}

export default function ImageAnalysisModal() {
  const analysis = useAppStore((s) => s.imageAnalysis);
  const fileUrl   = useAppStore((s) => s.imageFileUrl);
  const clear     = useAppStore((s) => s.clearImageAnalysis);

  const [imageLoaded, setImageLoaded] = useState(false);
  const imgRef    = useRef(null);
  const canvasRef = useRef(null);

  useDefectCanvas(imgRef, canvasRef, analysis, imageLoaded);

  // Reset when modal opens with new image
  useEffect(() => { setImageLoaded(false); }, [fileUrl]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") clear(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [clear]);

  if (!analysis || !fileUrl) return null;

  const activeDefects = DEFECT_KEYS
    .map((key) => ({ key, ...(analysis[key] || {}) }))
    .filter((d) => d.score >= 2)
    .sort((a, b) => b.score - a.score);

  const overallScore = analysis.overall_visual_score ?? 0;
  const overallLabel = scoreLabel(Math.round(overallScore));

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) clear(); }}
    >
      {/* Modal card */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900">Bridge Image Analysis</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              AI-detected structural defects are highlighted directly on the image
            </p>
          </div>
          <button
            onClick={clear}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors text-lg"
          >
            ×
          </button>
        </div>

        {/* Body — split: image left, analysis right */}
        <div className="flex flex-1 overflow-hidden min-h-0">

          {/* LEFT — Image with canvas overlay */}
          <div className="flex-1 bg-gray-950 flex items-center justify-center relative overflow-hidden">
            <img
              ref={imgRef}
              src={fileUrl}
              alt="Uploaded bridge"
              className="max-w-full max-h-full object-contain block"
              style={{ maxHeight: "calc(92vh - 72px)" }}
              onLoad={() => setImageLoaded(true)}
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 pointer-events-none"
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />

            {/* Score overlay badge */}
            <div className="absolute top-3 left-3 bg-black/70 text-white text-xs px-3 py-1.5 rounded-full font-semibold">
              Visual score: {overallScore.toFixed(1)} / 5.0
            </div>

            {/* Attention badge */}
            {analysis.requires_immediate_attention && (
              <div className="absolute top-3 right-3 bg-red-600 text-white text-xs px-3 py-1.5 rounded-full font-bold animate-pulse">
                ⚠ Immediate attention required
              </div>
            )}

            {/* Legend */}
            {activeDefects.length > 0 && (
              <div className="absolute bottom-3 left-3 bg-black/70 rounded-lg p-2 flex flex-col gap-1">
                {activeDefects.map((d) => (
                  <div key={d.key} className="flex items-center gap-1.5">
                    <div
                      className="w-3 h-3 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: DEFECT_META[d.key].color }}
                    />
                    <span className="text-white text-xs">{DEFECT_META[d.key].label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT — Analysis panel */}
          <div className="w-80 flex-shrink-0 flex flex-col border-l border-gray-100 overflow-y-auto">

            {/* Overall score */}
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Overall Risk
                </p>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${overallLabel.cls}`}>
                  {overallLabel.text}
                </span>
              </div>
              {/* Score bar */}
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(overallScore / 5) * 100}%`,
                    backgroundColor:
                      overallScore >= 4 ? "#EF4444"
                      : overallScore >= 3 ? "#F97316"
                      : overallScore >= 2 ? "#F59E0B"
                      : "#22C55E",
                  }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">{overallScore.toFixed(1)} / 5.0</p>
            </div>

            {/* Summary */}
            {analysis.visible_defects_summary && (
              <div className="px-5 py-4 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Summary
                </p>
                <p className="text-xs text-gray-700 leading-relaxed">
                  {analysis.visible_defects_summary}
                </p>
              </div>
            )}

            {/* No defects */}
            {activeDefects.length === 0 && (
              <div className="px-5 py-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-green-700">No significant defects detected</p>
                  <p className="text-xs text-green-600 mt-0.5">
                    The bridge appears to be in good condition based on this image.
                  </p>
                </div>
              </div>
            )}

            {/* Per-defect breakdown */}
            {activeDefects.length > 0 && (
              <div className="px-5 py-4 space-y-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Defect Analysis
                </p>
                {activeDefects.map((d) => {
                  const meta  = DEFECT_META[d.key];
                  const label = scoreLabel(d.score);
                  return (
                    <div
                      key={d.key}
                      className="rounded-xl border p-3"
                      style={{ borderColor: meta.color + "40", backgroundColor: meta.color + "08" }}
                    >
                      {/* Defect name + severity */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: meta.color }}
                          />
                          <span className="text-xs font-bold text-gray-800">{meta.label}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${label.cls}`}>
                            {label.text}
                          </span>
                          <span className="text-xs text-gray-400">{d.score}/5</span>
                        </div>
                      </div>

                      {/* What Gemini sees */}
                      {d.key_observations && (
                        <div className="mb-2">
                          <p className="text-xs font-medium text-gray-500 mb-0.5">Observation</p>
                          <p className="text-xs text-gray-700 leading-relaxed">{d.key_observations}</p>
                        </div>
                      )}

                      {/* Engineering cause */}
                      {d.potential_cause && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-0.5">Likely Cause</p>
                          <p className="text-xs text-gray-500 leading-relaxed italic">
                            {d.potential_cause}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
