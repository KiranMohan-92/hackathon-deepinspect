import React, { useEffect, useRef, useState } from "react";
import { DEFECT_COLORS } from "../utils/riskColors";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const HEADINGS = [
  { value: 0, label: "N" },
  { value: 60, label: "NE" },
  { value: 120, label: "SE" },
  { value: 180, label: "S" },
  { value: 240, label: "SW" },
  { value: 300, label: "NW" },
];

const DEFECT_KEYS = Object.keys(DEFECT_COLORS);

function drawDefects(canvas: HTMLCanvasElement, img: HTMLImageElement, va: any) {
  const w = img.offsetWidth;
  const h = img.offsetHeight;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, w, h);
  if (!va) return;

  DEFECT_KEYS.forEach((key) => {
    const defect = va[key];
    if (!defect || defect.score < 2 || !defect.regions?.length) return;
    const color = DEFECT_COLORS[key];

    defect.regions.forEach((r: any) => {
      const x = r.x1 * w;
      const y = r.y1 * h;
      const bw = (r.x2 - r.x1) * w;
      const bh = (r.y2 - r.y1) * h;
      if (bw <= 0 || bh <= 0) return;

      ctx.fillStyle = color + "25";
      ctx.fillRect(x, y, bw, bh);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, bw, bh);

      const label = key.replace(/_/g, " ");
      ctx.font = "bold 9px 'JetBrains Mono', monospace";
      const textW = ctx.measureText(label).width + 6;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, textW, 14);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(label, x + 3, y + 10);
    });
  });
}

interface BridgeImageViewerProps {
  bridge: any;
}

const BridgeImageViewer = React.memo(({ bridge }: BridgeImageViewerProps) => {
  const [headingIdx, setHeadingIdx] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const osm_id = bridge?.bridge_id || bridge?.osm_id;
  const heading = HEADINGS[headingIdx].value;
  const imageUrl = `${API_BASE}/api/v1/images/${osm_id}/${heading}`;

  const perHeading = bridge?.per_heading_assessments || {};
  const va = perHeading[String(heading)] ?? bridge?.visual_assessment ?? null;

  useEffect(() => {
    setHeadingIdx(0);
    setImageLoaded(false);
    setImageError(false);
  }, [osm_id]);

  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
  }, [headingIdx]);

  useEffect(() => {
    if (!imageLoaded || !canvasRef.current || !imgRef.current) return;
    drawDefects(canvasRef.current, imgRef.current, va);
  }, [imageLoaded, va]);

  const activeDefects = DEFECT_KEYS
    .map((key) => ({ key, ...(va?.[key] || {}) }))
    .filter((d) => d.score >= 2)
    .sort((a, b) => b.score - a.score);

  return (
    <div className="flex flex-col">
      {/* Image area */}
      <div className="relative bg-void overflow-hidden" style={{ minHeight: 160 }}>
        {!imageError ? (
          <>
            <img
              ref={imgRef}
              src={imageUrl}
              alt={`Street view — ${HEADINGS[headingIdx].label}`}
              className="w-full object-cover block opacity-90"
              style={{ maxHeight: 220 }}
              onLoad={() => { setImageLoaded(true); setImageError(false); }}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (target.src.includes('/api/v1/')) {
                  target.src = target.src.replace('/api/v1/', '/api/');
                } else {
                  setImageError(true);
                  setImageLoaded(false);
                }
              }}
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 pointer-events-none"
              style={{ width: "100%", height: "100%" }}
            />
          </>
        ) : (
          <div className="flex items-center justify-center h-40">
            <span className="text-2xs font-mono text-dim">NO IMAGE FOR THIS ANGLE</span>
          </div>
        )}

        {/* Heading selector */}
        <div className="absolute bottom-2 right-2 flex gap-1 flex-wrap justify-end">
          {HEADINGS.map((h, i) => (
            <button
              key={h.value}
              onClick={() => setHeadingIdx(i)}
              className={`w-7 h-7 text-2xs font-mono font-bold rounded transition-all ${
                i === headingIdx
                  ? "bg-accent text-void"
                  : "bg-void/70 text-dim hover:text-accent hover:bg-void/90 border border-glass-border"
              }`}
              aria-label={`View ${h.label} angle`}
              aria-pressed={i === headingIdx}
            >
              {h.label}
            </button>
          ))}
        </div>

        {/* Score badge */}
        {va && (
          <div
            className="absolute top-2 left-2 glass-panel px-2.5 py-1 text-2xs font-mono"
          >
            <span className="text-dim">VISUAL </span>
            <span className="text-accent font-bold">{va.overall_visual_score?.toFixed(1)}</span>
            <span className="text-dim">/5</span>
          </div>
        )}
      </div>

      {!va && (
        <div className="px-4 py-3">
          <p className="text-2xs font-mono text-dim italic">
            No Street View imagery available — visual scoring used default estimate.
          </p>
        </div>
      )}

      {/* Defect legend chips */}
      {activeDefects.length > 0 && (
        <div className="px-4 pt-3 pb-2">
          <p className="text-label mb-2">
            DETECTED DEFECTS — {HEADINGS[headingIdx].label} VIEW
          </p>
          <div className="flex flex-wrap gap-1.5">
            {activeDefects.map((d) => (
              <span
                key={d.key}
                className="text-2xs font-mono font-bold px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: DEFECT_COLORS[d.key] + "18",
                  color: DEFECT_COLORS[d.key],
                  border: `1px solid ${DEFECT_COLORS[d.key]}40`,
                }}
              >
                {d.key.replace(/_/g, " ").toUpperCase()} {d.score}/5
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Per-defect analysis */}
      {activeDefects.length > 0 && (
        <div className="px-4 pb-3 space-y-3">
          <p className="text-label">ANALYSIS & CAUSES</p>
          {activeDefects.map((d) => (
            <div
              key={d.key}
              className="border-l-2 pl-3"
              style={{ borderColor: DEFECT_COLORS[d.key] }}
            >
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-medium text-white capitalize">
                  {d.key.replace(/_/g, " ")}
                </span>
                <span
                  className="text-2xs font-mono font-bold px-1.5 rounded"
                  style={{
                    backgroundColor: DEFECT_COLORS[d.key] + "18",
                    color: DEFECT_COLORS[d.key],
                  }}
                >
                  {d.score >= 4 ? "CRITICAL" : d.score >= 3 ? "HIGH" : "MODERATE"}
                </span>
              </div>
              {d.key_observations && (
                <p className="text-xs text-muted leading-relaxed mb-1">{d.key_observations}</p>
              )}
              {d.potential_cause && (
                <p className="text-xs text-dim leading-relaxed">
                  <span className="font-medium text-muted">Cause: </span>
                  {d.potential_cause}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {va && activeDefects.length === 0 && (
        <div className="px-4 py-3">
          <span className="text-xs text-severity-ok font-mono">NO SIGNIFICANT DEFECTS DETECTED</span>
        </div>
      )}
    </div>
  );
});

BridgeImageViewer.displayName = "BridgeImageViewer";

export default BridgeImageViewer;
