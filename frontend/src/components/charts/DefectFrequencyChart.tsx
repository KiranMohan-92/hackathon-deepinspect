import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, LabelList } from "recharts";
import { DEFECT_COLORS } from "../../utils/riskColors";

const DEFECT_KEYS = Object.keys(DEFECT_COLORS);

const LABELS = {
  cracking: "Cracking",
  spalling: "Spalling",
  corrosion: "Corrosion",
  surface_degradation: "Surface Deg.",
  drainage: "Drainage",
  structural_deformation: "Deformation",
};

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.[0]) return null;
  const { defectKey, value } = payload[0].payload;
  return (
    <div className="glass-panel px-3 py-2 shadow-glass">
      <span className="text-xs font-mono text-white capitalize">
        {defectKey.replace(/_/g, " ")}
      </span>
      <span className="text-xs font-mono text-dim ml-2">avg {value.toFixed(1)}/5</span>
    </div>
  );
}

function renderBarLabel({ x, y, width, height, value }) {
  if (value === 0) return null;
  return (
    <text
      x={x + width + 4}
      y={y + height / 2}
      dy={4}
      fill="rgba(255,255,255,0.7)"
      fontSize={11}
      fontFamily="JetBrains Mono, monospace"
      fontWeight={600}
    >
      {value.toFixed(1)}
    </text>
  );
}

export default function DefectFrequencyChart({ analyzedBridges }) {
  const reports = Object.values(analyzedBridges).filter((r) => r.visual_assessment);
  if (reports.length === 0) return null;

  const data = DEFECT_KEYS.map((key) => {
    const scores = reports
      .map((r) => r.visual_assessment?.[key]?.score)
      .filter((s) => s != null);
    const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    return {
      defectKey: key,
      label: LABELS[key] || key,
      value: Math.round(avg * 10) / 10,
      color: DEFECT_COLORS[key],
    };
  }).sort((a, b) => b.value - a.value);

  return (
    <div className="glass-panel p-4">
      <p className="text-label mb-3">AVG DEFECT SCORES</p>
      <div style={{ width: "100%", height: 180 }}>
        <ResponsiveContainer>
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 32, bottom: 0, left: 4 }}>
            <XAxis type="number" domain={[0, 5]} tick={false} axisLine={false} />
            <YAxis
              type="category"
              dataKey="label"
              width={80}
              tick={{
                fill: "rgba(255,255,255,0.6)",
                fontSize: 11,
                fontFamily: "JetBrains Mono, monospace",
                fontWeight: 500,
              }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={false} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={14}>
              {data.map((entry) => (
                <Cell
                  key={entry.defectKey}
                  fill={entry.color}
                  style={{ filter: `drop-shadow(0 0 4px ${entry.color}60)` }}
                />
              ))}
              <LabelList content={renderBarLabel} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
