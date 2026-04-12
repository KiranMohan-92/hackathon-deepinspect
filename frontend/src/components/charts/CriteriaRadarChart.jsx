import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from "recharts";

const SEVERITY_COLORS = {
  1: "#00e676",  // OK
  2: "#00e676",
  3: "#ffab00",  // MEDIUM
  4: "#ff6d00",  // HIGH
  5: "#ff1744",  // CRITICAL
};

function scoreColor(score) {
  if (score == null) return "#9ca3af";
  if (score >= 4) return SEVERITY_COLORS[5];
  if (score >= 3) return SEVERITY_COLORS[4];
  if (score >= 2) return SEVERITY_COLORS[3];
  return SEVERITY_COLORS[1];
}

// Short labels for the radar axes
const SHORT_LABELS = {
  "Scour / Foundations / Channel Stability": "Scour",
  "Load-Path Continuity & Redundancy (NSTM)": "Redundancy",
  "Capacity vs. Demand (Load Rating)": "Capacity",
  "Substructure Integrity (Piers, Abutments, Pile Caps)": "Substructure",
  "Superstructure Primary Elements (Fatigue, Section Loss)": "Superstructure",
  "Overall Stability (Buckling, Overturning, Progressive Collapse)": "Stability",
  "Durability / Time-Dependent Degradation": "Degradation",
  "Bearings, Joints, and Expansion Devices": "Bearings",
  "Deck / Slab / Wearing Surface": "Deck",
  "Stiffness and Serviceability (Deflections, Vibrations)": "Serviceability",
  "Ancillary / Protective Systems (Railings, Drainage, Coatings)": "Ancillary",
};

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="glass-panel px-3 py-2 shadow-glass max-w-60">
      <p className="text-2xs font-mono font-bold text-white mb-1">
        #{d.rank} {d.shortName}
      </p>
      <div className="flex items-center gap-2 mb-1">
        <span
          className="text-xs font-mono font-bold"
          style={{ color: scoreColor(d.score) }}
        >
          {d.score.toFixed(1)}/5.0
        </span>
        <span className="text-2xs font-mono text-dim">
          {d.confidence} confidence
        </span>
      </div>
      {d.requiresField && (
        <p className="text-2xs text-severity-high font-mono">⚠ FIELD INSPECTION NEEDED</p>
      )}
    </div>
  );
}

function CustomAxisTick({ x, y, payload }) {
  const d = payload?.value;
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="central"
      className="text-[9px] font-mono fill-dim"
    >
      {d}
    </text>
  );
}

export default function CriteriaRadarChart({ certificate }) {
  if (!certificate?.criteria_results?.length) return null;

  const allCriteria = certificate.criteria_results;
  const assessedCriteria = allCriteria.filter(
    (c) => c.score != null && c.included_in_overall_risk !== false,
  );
  const excludedCount = allCriteria.length - assessedCriteria.length;

  if (assessedCriteria.length === 0) {
    return (
      <div className="glass-panel p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-label">PHYSICS HEALTH PROFILE</p>
          <span className="text-2xs font-mono text-dim">0 assessed criteria</span>
        </div>
        <p className="text-xs text-dim leading-relaxed">
          No criterion had enough remote evidence to be plotted. The overall score is preliminary and
          based on metadata screening only.
        </p>
      </div>
    );
  }

  const data = assessedCriteria.map((c) => ({
    shortName: SHORT_LABELS[c.criterion_name] || c.criterion_name.split(" ")[0],
    fullName: c.criterion_name,
    rank: c.criterion_rank,
    score: c.score,
    confidence: c.confidence,
    requiresField: c.requires_field_verification,
    // Invert for radar: 5=bad should be LARGE (outer ring)
    riskLevel: c.score,
  }));

  // Determine fill color based on overall tier
  const tierColors = {
    CRITICAL: "rgba(255, 23, 68, 0.25)",
    HIGH: "rgba(255, 109, 0, 0.25)",
    MEDIUM: "rgba(255, 171, 0, 0.25)",
    OK: "rgba(0, 230, 118, 0.25)",
  };
  const tierStrokes = {
    CRITICAL: "#ff1744",
    HIGH: "#ff6d00",
    MEDIUM: "#ffab00",
    OK: "#00e676",
  };

  const fill = tierColors[certificate.overall_risk_tier] || tierColors.MEDIUM;
  const stroke = tierStrokes[certificate.overall_risk_tier] || tierStrokes.MEDIUM;

  return (
    <div className="glass-panel p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-label">PHYSICS HEALTH PROFILE</p>
        <div className="flex items-center gap-2">
          <span className="text-2xs font-mono text-dim">
            {assessedCriteria.length}/{allCriteria.length} assessed
          </span>
          <span
            className="text-xs font-mono font-bold"
            style={{ color: stroke }}
          >
            {certificate.overall_risk_score.toFixed(1)}
          </span>
          <span className="text-2xs font-mono text-dim">
            {certificate.overall_confidence} conf.
          </span>
        </div>
      </div>

      <div style={{ width: "100%", height: 260 }}>
        <ResponsiveContainer>
          <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
            <PolarGrid
              stroke="rgba(255,255,255,0.06)"
              gridType="polygon"
            />
            <PolarAngleAxis
              dataKey="shortName"
              tick={<CustomAxisTick />}
              stroke="rgba(255,255,255,0.1)"
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 5]}
              tick={false}
              axisLine={false}
            />
            <Radar
              name="Risk"
              dataKey="riskLevel"
              stroke={stroke}
              fill={fill}
              strokeWidth={1.5}
              dot={{ r: 3, fill: stroke, strokeWidth: 0 }}
            />
            <Tooltip content={<CustomTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Field inspection count */}
      {certificate.priority_field_inspections?.length > 0 && (
        <div className="mt-2 pt-2 border-t border-glass-border">
          <p className="text-2xs font-mono text-severity-high">
            ⚠ {certificate.priority_field_inspections.length} FIELD INSPECTION(S) RECOMMENDED
          </p>
        </div>
      )}
      {excludedCount > 0 && (
        <div className="mt-2 pt-2 border-t border-glass-border">
          <p className="text-2xs font-mono text-dim">
            {excludedCount} criterion/criteria excluded because remote evidence was insufficient.
          </p>
        </div>
      )}
    </div>
  );
}
