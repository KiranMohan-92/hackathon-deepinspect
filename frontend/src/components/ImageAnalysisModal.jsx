import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertTriangle } from "lucide-react";
import useAppStore from "../store/useAppStore";
import { DEFECT_COLORS } from "../utils/riskColors";
import { scaleIn } from "../utils/motionVariants";

const DEFECT_KEYS = [
  "cracking", "spalling", "corrosion",
  "surface_degradation", "drainage", "structural_deformation",
];

const DEFECT_META = {
  cracking: { color: DEFECT_COLORS.cracking, label: "Cracking" },
  spalling: { color: DEFECT_COLORS.spalling, label: "Spalling" },
  corrosion: { color: DEFECT_COLORS.corrosion, label: "Corrosion" },
  surface_degradation: { color: DEFECT_COLORS.surface_degradation, label: "Surface Damage" },
  drainage: { color: DEFECT_COLORS.drainage, label: "Drainage" },
  structural_deformation: { color: DEFECT_COLORS.structural_deformation, label: "Deformation" },
};

function severityLabel(score) {
  if (score >= 5) return { text: "CRITICAL", color: "#ff1744" };
  if (score >= 4) return { text: "SEVERE", color: "#ff1744" };
  if (score >= 3) return { text: "HIGH", color: "#ff6d00" };
  if (score >= 2) return { text: "MODERATE", color: "#ffab00" };
  return { text: "OK", color: "#00e676" };
}

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
        const x = r.x1 * w;
        const y = r.y1 * h;
        const bw = (r.x2 - r.x1) * w;
        const bh = (r.y2 - r.y1) * h;
        if (bw <= 0 || bh <= 0) return;

        ctx.fillStyle = color + "20";
        ctx.fillRect(x, y, bw, bh);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, bw, bh);

        const label = DEFECT_META[key].label;
        ctx.font = "bold 10px 'JetBrains Mono', monospace";
        const tw = ctx.measureText(label).width + 8;
        const th = 16;
        const lx = x;
        const ly = y > th + 2 ? y - th - 2 : y + 2;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect?.(lx, ly, tw, th, 3) ?? ctx.fillRect(lx, ly, tw, th);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.fillText(label, lx + 4, ly + 12);
      });
    });
  }, [imageLoaded, analysis]);
}

export default function ImageAnalysisModal() {
  const analysis = useAppStore((s) => s.imageAnalysis);
  const fileUrl = useAppStore((s) => s.imageFileUrl);
  const clear = useAppStore((s) => s.clearImageAnalysis);

  const [imageLoaded, setImageLoaded] = useState(false);
  const imgRef = useRef(null);
  const canvasRef = useRef(null);

  useDefectCanvas(imgRef, canvasRef, analysis, imageLoaded);

  useEffect(() => { setImageLoaded(false); }, [fileUrl]);

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
  const overallSev = severityLabel(Math.round(overallScore));

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[2000] flex items-center justify-center p-4"
        style={{ background: "rgba(6, 6, 10, 0.8)", backdropFilter: "blur(8px)" }}
        onClick={(e) => { if (e.target === e.currentTarget) clear(); }}
      >
        {/* Modal */}
        <motion.div
          {...scaleIn}
          className="glass-panel w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden shadow-glass"
          style={{ border: "1px solid rgba(255,255,255,0.08)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-glass-border flex-shrink-0">
            <div>
              <h2 className="text-sm font-mono font-bold text-white tracking-wider">
                IMAGE ANALYSIS
              </h2>
              <p className="text-2xs text-dim mt-0.5 font-mono">
                AI-DETECTED STRUCTURAL DEFECTS
              </p>
            </div>
            <button
              onClick={clear}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-dim hover:text-white hover:bg-surface-2 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex flex-1 overflow-hidden min-h-0">
            {/* LEFT — Image */}
            <div className="flex-1 bg-void flex items-center justify-center relative overflow-hidden">
              <img
                ref={imgRef}
                src={fileUrl}
                alt="Uploaded bridge"
                className="max-w-full max-h-full object-contain block opacity-90"
                style={{ maxHeight: "calc(92vh - 72px)" }}
                onLoad={() => setImageLoaded(true)}
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 pointer-events-none"
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />

              {/* Score badge */}
              <div className="absolute top-3 left-3 glass-panel px-3 py-1.5 text-xs font-mono">
                <span className="text-dim">VISUAL </span>
                <span className="text-accent font-bold">{overallScore.toFixed(1)}</span>
                <span className="text-dim"> / 5.0</span>
              </div>

              {/* Attention badge */}
              {analysis.requires_immediate_attention && (
                <div
                  className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-2xs font-mono font-bold animate-risk-glow"
                  style={{
                    backgroundColor: "rgba(255, 23, 68, 0.15)",
                    color: "#ff1744",
                    border: "1px solid rgba(255, 23, 68, 0.3)",
                  }}
                >
                  <AlertTriangle className="w-3 h-3" />
                  IMMEDIATE ATTENTION
                </div>
              )}

              {/* Legend */}
              {activeDefects.length > 0 && (
                <div className="absolute bottom-3 left-3 glass-panel p-2 flex flex-col gap-1">
                  {activeDefects.map((d) => (
                    <div key={d.key} className="flex items-center gap-1.5">
                      <div
                        className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: DEFECT_META[d.key].color }}
                      />
                      <span className="text-2xs font-mono text-muted">
                        {DEFECT_META[d.key].label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* RIGHT — Analysis */}
            <div className="w-80 flex-shrink-0 flex flex-col border-l border-glass-border overflow-y-auto">
              {/* Overall score */}
              <div className="px-5 py-4 border-b border-glass-border">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-label">OVERALL RISK</p>
                  <span
                    className="text-2xs font-mono font-bold px-2.5 py-1 rounded-full"
                    style={{
                      backgroundColor: overallSev.color + "18",
                      color: overallSev.color,
                      border: `1px solid ${overallSev.color}40`,
                    }}
                  >
                    {overallSev.text}
                  </span>
                </div>
                {/* Score bar */}
                <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(overallScore / 5) * 100}%`,
                      backgroundColor: overallSev.color,
                      boxShadow: `0 0 8px ${overallSev.color}60`,
                    }}
                  />
                </div>
                <p className="text-2xs font-mono text-dim mt-1.5">
                  {overallScore.toFixed(1)} / 5.0
                </p>
              </div>

              {/* Summary */}
              {analysis.visible_defects_summary && (
                <div className="px-5 py-4 border-b border-glass-border">
                  <p className="text-label mb-1.5">SUMMARY</p>
                  <p className="text-xs text-muted leading-relaxed">
                    {analysis.visible_defects_summary}
                  </p>
                </div>
              )}

              {/* No defects */}
              {activeDefects.length === 0 && (
                <div className="px-5 py-4">
                  <div className="rounded-lg p-3" style={{ backgroundColor: "rgba(0,230,118,0.08)", border: "1px solid rgba(0,230,118,0.2)" }}>
                    <p className="text-xs font-mono font-bold text-severity-ok">NO SIGNIFICANT DEFECTS</p>
                    <p className="text-2xs text-severity-ok/70 mt-0.5">
                      Bridge appears in good condition based on this image.
                    </p>
                  </div>
                </div>
              )}

              {/* Per-defect breakdown */}
              {activeDefects.length > 0 && (
                <div className="px-5 py-4 space-y-3">
                  <p className="text-label">DEFECT ANALYSIS</p>
                  {activeDefects.map((d) => {
                    const meta = DEFECT_META[d.key];
                    const sev = severityLabel(d.score);
                    return (
                      <div
                        key={d.key}
                        className="rounded-lg p-3"
                        style={{
                          backgroundColor: meta.color + "0a",
                          border: `1px solid ${meta.color}25`,
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: meta.color, boxShadow: `0 0 6px ${meta.color}60` }}
                            />
                            <span className="text-xs font-medium text-white">{meta.label}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span
                              className="text-2xs font-mono font-bold px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: sev.color + "18", color: sev.color }}
                            >
                              {sev.text}
                            </span>
                            <span className="text-2xs font-mono text-dim">{d.score}/5</span>
                          </div>
                        </div>
                        {d.key_observations && (
                          <p className="text-xs text-muted leading-relaxed mb-1">{d.key_observations}</p>
                        )}
                        {d.potential_cause && (
                          <p className="text-xs text-dim leading-relaxed italic">
                            {d.potential_cause}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
