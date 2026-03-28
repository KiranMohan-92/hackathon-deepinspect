import { useEffect, useRef, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const HEADINGS = [
  { value: 0,   label: "N" },
  { value: 90,  label: "E" },
  { value: 270, label: "W" },
];

// Color per defect type
const DEFECT_COLORS = {
  cracking:              "#EF4444", // red
  spalling:              "#F97316", // orange
  corrosion:             "#92400E", // brown
  surface_degradation:   "#EAB308", // yellow
  drainage:              "#3B82F6", // blue
  structural_deformation:"#8B5CF6", // purple
};

const DEFECT_KEYS = Object.keys(DEFECT_COLORS);

export default function BridgeImageViewer({ bridge }) {
  const [headingIdx, setHeadingIdx] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const imgRef = useRef(null);
  const canvasRef = useRef(null);

  const va = bridge?.visual_assessment;
  const osm_id = bridge?.bridge_id;
  const heading = HEADINGS[headingIdx].value;
  const imageUrl = `${API_BASE}/api/images/${osm_id}/${heading}`;

  // Reset when bridge changes
  useEffect(() => {
    setHeadingIdx(0);
    setImageLoaded(false);
    setImageError(false);
  }, [osm_id]);

  // Reset image state when heading changes
  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
  }, [headingIdx]);

  // Draw defect bounding boxes on canvas whenever image loads or defects change
  useEffect(() => {
    if (!imageLoaded || !canvasRef.current || !imgRef.current || !va) return;

    const img = imgRef.current;
    const canvas = canvasRef.current;
    const w = img.offsetWidth;
    const h = img.offsetHeight;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, w, h);

    DEFECT_KEYS.forEach((key) => {
      const defect = va[key];
      if (!defect || defect.score < 2 || !defect.regions?.length) return;
      const color = DEFECT_COLORS[key];

      defect.regions.forEach((r) => {
        const x = r.x1 * w;
        const y = r.y1 * h;
        const bw = (r.x2 - r.x1) * w;
        const bh = (r.y2 - r.y1) * h;
        if (bw <= 0 || bh <= 0) return;

        // Semi-transparent fill
        ctx.fillStyle = color + "30";
        ctx.fillRect(x, y, bw, bh);

        // Solid border
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, bw, bh);

        // Label background + text
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

  // Active defects (score >= 2) sorted by score desc
  const activeDefects = DEFECT_KEYS
    .map((key) => ({ key, ...(va?.[key] || {}) }))
    .filter((d) => d.score >= 2)
    .sort((a, b) => b.score - a.score);

  return (
    <div className="flex flex-col">
      {/* Image area */}
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
            {/* Canvas overlay for defect boxes */}
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

        {/* Heading selector */}
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

        {/* Score badge on image */}
        {va && (
          <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded font-medium">
            Visual score: {va.overall_visual_score?.toFixed(1)}/5
          </div>
        )}
      </div>

      {/* No vision data */}
      {!va && (
        <div className="px-4 py-3 text-xs text-gray-400 italic">
          No Street View imagery was available for this bridge — visual scoring used default estimate.
        </div>
      )}

      {/* Defect legend chips */}
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

      {/* Per-defect analysis & causes */}
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

      {/* No active defects */}
      {va && activeDefects.length === 0 && (
        <div className="px-4 py-3 text-xs text-green-600">
          No significant defects detected in available imagery.
        </div>
      )}
    </div>
  );
}
