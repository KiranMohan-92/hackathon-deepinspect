import { useEffect, useRef, useState } from "react";
import type { BridgeRiskReport, DefectScore, VisualAssessment } from "../types";

type DefectKey = "cracking" | "spalling" | "corrosion" | "surface_degradation" | "drainage" | "structural_deformation";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const HEADINGS = [
  { value: 0,   label: "N" },
  { value: 90,  label: "E" },
  { value: 270, label: "W" },
] as const;

const DEFECT_COLORS: Record<string, string> = {
  cracking:              "#EF4444",
  spalling:              "#F97316",
  corrosion:             "#92400E",
  surface_degradation:   "#EAB308",
  drainage:              "#3B82F6",
  structural_deformation:"#8B5CF6",
};

const DEFECT_KEYS: DefectKey[] = Object.keys(DEFECT_COLORS) as DefectKey[];

interface BridgeImageViewerProps {
  bridge: BridgeRiskReport;
}

interface ActiveDefect extends DefectScore {
  key: string;
}

export default function BridgeImageViewer({ bridge }: BridgeImageViewerProps) {
  const [headingIdx, setHeadingIdx] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const va = bridge?.visual_assessment;
  const osm_id = bridge?.bridge_id;
  const heading = HEADINGS[headingIdx].value;
  const imageUrl = `${API_BASE}/api/images/${osm_id}/${heading}`;

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
    if (!imageLoaded || !canvasRef.current || !imgRef.current || !va) return;

    const img = imgRef.current;
    const canvas = canvasRef.current;
    const w = img.offsetWidth;
    const h = img.offsetHeight;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);

    DEFECT_KEYS.forEach((key) => {
      const d: DefectScore = va[key];
      if (d.score < 2 || !d.regions?.length) return;
      const color = DEFECT_COLORS[key];

      d.regions.forEach((r) => {
        const x = r.x1 * w;
        const y = r.y1 * h;
        const bw = (r.x2 - r.x1) * w;
        const bh = (r.y2 - r.y1) * h;
        if (bw <= 0 || bh <= 0) return;

        ctx.fillStyle = color + "30";
        ctx.fillRect(x, y, bw, bh);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, bw, bh);

        const label = key.replace(/_/g, " ");
        ctx.font = "bold 10px sans-serif";
        const textW = ctx.measureText(label).width + 6;
        ctx.fillStyle = color;
        ctx.fillRect(x, y, textW, 16);
        ctx.fillStyle = "#ffffff";
        ctx.fillText(label, x + 3, y + 11);
      });
    });
  }, [imageLoaded, va, headingIdx]);

  const activeDefects: ActiveDefect[] = DEFECT_KEYS
    .map((key) => ({ key, ...va![key] }))
    .filter((d): d is ActiveDefect => d.score >= 2)
    .sort((a, b) => b.score - a.score);

  return (
    <div className="flex flex-col">
      <div className="relative bg-gray-900 overflow-hidden" style={{ minHeight: 160 }}>
        {!imageError ? (
          <>
            <img
              ref={imgRef}
              src={imageUrl}
              alt={`Bridge street view — ${HEADINGS[headingIdx].label}`}
              className="w-full object-cover block"
              style={{ maxHeight: 220 }}
              onLoad={() => { setImageLoaded(true); setImageError(false); }}
              onError={() => { setImageError(true); setImageLoaded(false); }}
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 pointer-events-none"
              style={{ width: "100%", height: "100%" }}
            />
          </>
        ) : (
          <div className="flex items-center justify-center h-40 text-xs text-gray-500">
            No Street View image cached for this angle.<br/>
            Run the scan again to fetch imagery.
          </div>
        )}

        <div className="absolute bottom-2 right-2 flex gap-1">
          {HEADINGS.map((h, i) => (
            <button
              key={h.value}
              onClick={() => setHeadingIdx(i)}
              className={`w-7 h-7 text-xs font-bold rounded transition-colors ${
                i === headingIdx
                  ? "bg-white text-gray-900"
                  : "bg-black/50 text-white hover:bg-black/70"
              }`}
            >
              {h.label}
            </button>
          ))}
        </div>

        {va && (
          <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded font-medium">
            Visual score: {va.overall_visual_score?.toFixed(1)}/5
          </div>
        )}
      </div>

      {!va && (
        <div className="px-4 py-3 text-xs text-gray-400 italic">
          No Street View imagery was available for this bridge — visual scoring used default estimate.
        </div>
      )}

      {activeDefects.length > 0 && (
        <div className="px-4 pt-3 pb-2">
          <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
            Detected defects
          </p>
          <div className="flex flex-wrap gap-1.5">
            {activeDefects.map((d) => (
              <span
                key={d.key}
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{
                  backgroundColor: DEFECT_COLORS[d.key] + "20",
                  color: DEFECT_COLORS[d.key],
                  border: `1px solid ${DEFECT_COLORS[d.key]}60`,
                }}
              >
                {d.key.replace(/_/g, " ")} · {d.score}/5
              </span>
            ))}
          </div>
        </div>
      )}

      {activeDefects.length > 0 && (
        <div className="px-4 pb-3 space-y-3">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Analysis & causes
          </p>
          {activeDefects.map((d) => (
            <div key={d.key} className="border-l-2 pl-3" style={{ borderColor: DEFECT_COLORS[d.key] }}>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-semibold text-gray-800 capitalize">
                  {d.key.replace(/_/g, " ")}
                </span>
                <span
                  className="text-xs px-1.5 rounded font-medium"
                  style={{
                    backgroundColor: DEFECT_COLORS[d.key] + "20",
                    color: DEFECT_COLORS[d.key],
                  }}
                >
                  {d.score >= 4 ? "CRITICAL" : d.score >= 3 ? "HIGH" : "MODERATE"}
                </span>
              </div>
              {d.key_observations && (
                <p className="text-xs text-gray-700 mb-1 leading-relaxed">
                  {d.key_observations}
                </p>
              )}
              {d.potential_cause && (
                <p className="text-xs text-gray-400 leading-relaxed">
                  <span className="font-medium text-gray-500">Cause: </span>
                  {d.potential_cause}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {va && activeDefects.length === 0 && (
        <div className="px-4 py-3 text-xs text-green-600">
          No significant defects detected in available imagery.
        </div>
      )}
    </div>
  );
}
