import React, { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { RISK_COLORS } from "../../utils/riskColors";

const TIERS = ["CRITICAL", "HIGH", "MEDIUM", "OK"];

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.[0]) return null;
  const { name, value } = payload[0];
  const c = RISK_COLORS[name] || RISK_COLORS.OK;
  return (
    <div className="glass-panel px-3 py-2 shadow-glass">
      <span className="text-2xs font-mono font-bold" style={{ color: c.text }}>
        {name}
      </span>
      <span className="text-2xs font-mono text-dim ml-2">{value} bridges</span>
    </div>
  );
}

interface RiskDistributionChartProps {
  analyzedBridges: Record<string, any>;
}

export default function RiskDistributionChart({ analyzedBridges }: RiskDistributionChartProps) {
  const reports = useMemo(() => Object.values(analyzedBridges), [analyzedBridges]);
  
  const data = useMemo(() => {
    if (reports.length === 0) return [];
    return TIERS
      .map((tier) => ({
        name: tier,
        value: reports.filter((r) => r.risk_tier === tier).length,
      }))
      .filter((d) => d.value > 0);
  }, [reports]);

  if (reports.length === 0) return null;

  return (
    <div className="glass-panel p-4">
      <p className="text-label mb-3">RISK DISTRIBUTION</p>
      <div className="flex items-center gap-4">
        <div style={{ width: 100, height: 100 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={28}
                outerRadius={45}
                paddingAngle={3}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={RISK_COLORS[entry.name]?.hex || "#666"}
                    style={{ filter: `drop-shadow(0 0 4px ${RISK_COLORS[entry.name]?.ring || "transparent"})` }}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-col gap-1.5">
          {data.map((d) => {
            const c = RISK_COLORS[d.name];
            return (
              <div key={d.name} className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: c.hex, boxShadow: `0 0 4px ${c.ring}` }}
                />
                <span className="text-2xs font-mono text-muted">{d.value}</span>
                <span className="text-2xs font-mono text-dim">{d.name}</span>
              </div>
            );
          })}
          <div className="mt-1 pt-1 border-t border-glass-border">
            <span className="text-2xs font-mono text-dim">{reports.length} TOTAL</span>
          </div>
        </div>
      </div>
    </div>
  );
}
