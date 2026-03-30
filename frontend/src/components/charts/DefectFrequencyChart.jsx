import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { DEFECT_COLORS } from "../../utils/riskColors";

const DEFECT_KEYS = Object.keys(DEFECT_COLORS);

const LABELS = {
  cracking: "Cracking",
  spalling: "Spalling",
  corrosion: "Corrosion",
  surface_degradation: "Surface",
  drainage: "Drainage",
  structural_deformation: "Deform.",
};

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.[0]) return null;
  const { defectKey, value } = payload[0].payload;
  return (
    <div className="glass-panel px-3 py-2 shadow-glass">
      <span className="text-2xs font-mono text-white capitalize">
        {defectKey.replace(/_/g, " ")}
      </span>
      <span className="text-2xs font-mono text-dim ml-2">avg {value.toFixed(1)}/5</span>
    </div>
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
      <div style={{ width: "100%", height: 140 }}>
        <ResponsiveContainer>
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
            <XAxis type="number" domain={[0, 5]} tick={false} axisLine={false} />
            <YAxis
              type="category"
              dataKey="label"
              width={55}
              tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 9, fontFamily: "JetBrains Mono" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={false} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={10}>
              {data.map((entry) => (
                <Cell
                  key={entry.defectKey}
                  fill={entry.color}
                  style={{ filter: `drop-shadow(0 0 3px ${entry.color}60)` }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
