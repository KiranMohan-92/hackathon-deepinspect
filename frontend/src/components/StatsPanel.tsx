import React, { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BarChart3, TrendingUp, Calendar, Layers } from "lucide-react";
import useAppStore from "../store/useAppStore";
import { RISK_COLORS } from "../utils/riskColors";
import RiskDistributionChart from "./charts/RiskDistributionChart";
import DefectFrequencyChart from "./charts/DefectFrequencyChart";

const TIERS = ["CRITICAL", "HIGH", "MEDIUM", "OK"];

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  accent?: boolean;
}

function StatCard({ icon: Icon, label, value, accent = false }: StatCardProps) {
  return (
    <div className="glass-panel p-3 flex items-center gap-3">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent ? "bg-accent/10" : "bg-surface-2"}`}>
        <Icon className={`w-4 h-4 ${accent ? "text-accent" : "text-dim"}`} />
      </div>
      <div>
        <p className="text-label">{label}</p>
        <p className="text-lg font-mono font-bold text-white">{value}</p>
      </div>
    </div>
  );
}

interface StatsPanelProps {
  isOpen: boolean;
}

export default function StatsPanel({ isOpen }: StatsPanelProps) {
  const bridges = useAppStore((s) => s.bridges);
  const analyzedBridges = useAppStore((s) => s.analyzedBridges);

  const reports = useMemo(() => Object.values(analyzedBridges), [analyzedBridges]);
  
  const avgScore = useMemo(() => {
    return reports.length > 0
      ? (reports.reduce((sum, r) => sum + ((r as any).risk_score || 0), 0) / reports.length).toFixed(1)
      : "—";
  }, [reports]);

  const oldestBridge = useMemo(() => {
    return bridges.reduce((oldest: number | null, b: any) => {
      if (!b.construction_year) return oldest;
      return (!oldest || b.construction_year < oldest) ? b.construction_year : oldest;
    }, null);
  }, [bridges]);

  const topMaterial = useMemo(() => {
    const materialCounts: Record<string, number> = {};
    bridges.forEach((b: any) => {
      if (b.material && b.material !== "unknown") {
        const m = b.material.replace(/_/g, " ");
        materialCounts[m] = (materialCounts[m] || 0) + 1;
      }
    });
    return Object.entries(materialCounts).sort((a, b) => b[1] - a[1])[0];
  }, [bridges]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 260, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="flex-shrink-0 border-r border-glass-border bg-glass-heavy overflow-hidden"
          role="complementary"
          aria-label="Statistics Panel"
        >
          <div className="w-[260px] h-full overflow-y-auto p-3 flex flex-col gap-3">
            <p className="text-label px-1 pt-1">INTELLIGENCE OVERVIEW</p>

            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-2">
              <StatCard icon={Layers} label="TOTAL" value={bridges.length} accent />
              <StatCard icon={TrendingUp} label="AVG RISK" value={avgScore} />
              <StatCard icon={Calendar} label="OLDEST" value={oldestBridge || "—"} />
              <StatCard icon={BarChart3} label="TOP MAT." value={topMaterial ? topMaterial[0] : "—"} />
            </div>

            {/* Risk distribution */}
            <RiskDistributionChart analyzedBridges={analyzedBridges} />

            {/* Defect frequency */}
            <DefectFrequencyChart analyzedBridges={analyzedBridges} />

            {/* Quick risk summary */}
            {reports.length > 0 && (
              <div className="glass-panel p-3 flex flex-col gap-2">
                <p className="text-label">TIER BREAKDOWN</p>
                {TIERS.map((tier) => {
                  const count = reports.filter((r) => r.risk_tier === tier).length;
                  if (count === 0) return null;
                  const c = RISK_COLORS[tier];
                  const pct = Math.round((count / reports.length) * 100);
                  return (
                    <div key={tier} className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: c.hex, boxShadow: `0 0 4px ${c.ring}` }}
                        aria-hidden="true"
                      />
                      <span className="text-2xs font-mono text-muted flex-1">{tier}</span>
                      <div className="w-16 h-1.5 bg-surface-2 rounded-full overflow-hidden" aria-hidden="true">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, backgroundColor: c.hex }}
                        />
                      </div>
                      <span className="text-2xs font-mono text-dim w-6 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
