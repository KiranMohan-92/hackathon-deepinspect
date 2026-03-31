import { motion } from "framer-motion";
import { Shield, AlertTriangle, FileCheck, ChevronDown } from "lucide-react";
import { useState } from "react";
import CriteriaRadarChart from "./charts/CriteriaRadarChart";
import CriterionCard from "./CriterionCard";

const TIER_STYLES = {
  CRITICAL: { bg: "bg-severity-critical/10", border: "border-severity-critical/30", text: "text-severity-critical", glow: "shadow-glow-red" },
  HIGH: { bg: "bg-severity-high/10", border: "border-severity-high/30", text: "text-severity-high" },
  MEDIUM: { bg: "bg-severity-medium/10", border: "border-severity-medium/30", text: "text-severity-medium" },
  OK: { bg: "bg-severity-ok/10", border: "border-severity-ok/30", text: "text-severity-ok" },
};

export default function PhysicsCertificateView({ certificate }) {
  const [showLimitations, setShowLimitations] = useState(false);
  if (!certificate) return null;

  const tier = TIER_STYLES[certificate.overall_risk_tier] || TIER_STYLES.MEDIUM;
  const fieldCount = certificate.criteria_results?.filter((c) => c.requires_field_verification).length || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-3"
    >
      {/* Certificate Header */}
      <div className={`glass-panel p-4 border ${tier.border} ${tier.glow || ""}`}>
        <div className="flex items-center gap-2 mb-3">
          <FileCheck className={`w-4 h-4 ${tier.text}`} />
          <p className="text-label">PHYSICS HEALTH CERTIFICATE</p>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className={`text-2xl font-mono font-bold ${tier.text}`}>
              {certificate.overall_risk_score.toFixed(1)}
              <span className="text-sm text-dim ml-1">/5.0</span>
            </p>
            <p className={`text-xs font-mono font-bold mt-0.5 ${tier.text}`}>
              {certificate.overall_risk_tier}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xs font-mono text-dim">CONFIDENCE</p>
            <p className="text-sm font-mono font-bold text-white uppercase">
              {certificate.overall_confidence}
            </p>
            {fieldCount > 0 && (
              <p className="text-2xs font-mono text-severity-high mt-1">
                {fieldCount} criteria need field verification
              </p>
            )}
          </div>
        </div>

        {/* Recommended action */}
        {certificate.recommended_action && (
          <div className="mt-3 pt-3 border-t border-glass-border">
            <p className="text-label mb-1">RECOMMENDED ACTION</p>
            <p className="text-xs text-muted leading-relaxed">{certificate.recommended_action}</p>
          </div>
        )}

        {/* Remaining service life */}
        {certificate.estimated_remaining_service_life_years != null && (
          <div className="mt-2">
            <p className="text-label mb-0.5">EST. REMAINING SERVICE LIFE</p>
            <p className="text-sm font-mono font-bold text-white">
              {certificate.estimated_remaining_service_life_years} years
            </p>
          </div>
        )}
      </div>

      {/* Radar Chart */}
      <CriteriaRadarChart certificate={certificate} />

      {/* Per-Criterion Breakdown */}
      <div>
        <p className="text-label mb-2 px-1">11-CRITERION BREAKDOWN</p>
        <div className="space-y-1.5">
          {certificate.criteria_results?.map((c, i) => (
            <CriterionCard key={c.criterion_rank} criterion={c} index={i} />
          ))}
        </div>
      </div>

      {/* Field Inspections Needed */}
      {certificate.priority_field_inspections?.length > 0 && (
        <div className="glass-panel p-3 border border-severity-high/20">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-3.5 h-3.5 text-severity-high" />
            <p className="text-label text-severity-high">PRIORITY FIELD INSPECTIONS</p>
          </div>
          <ol className="space-y-1.5 pl-4 list-decimal">
            {certificate.priority_field_inspections.map((item, i) => (
              <li key={i} className="text-2xs text-muted leading-relaxed">{item}</li>
            ))}
          </ol>
        </div>
      )}

      {/* Assessment Limitations (collapsible) */}
      {certificate.assessment_limitations?.length > 0 && (
        <div className="glass-panel p-3">
          <button
            onClick={() => setShowLimitations(!showLimitations)}
            className="w-full flex items-center justify-between"
          >
            <p className="text-label">ASSESSMENT LIMITATIONS</p>
            <ChevronDown className={`w-3 h-3 text-dim transition-transform ${showLimitations ? "rotate-180" : ""}`} />
          </button>
          {showLimitations && (
            <motion.ul
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              className="mt-2 space-y-1"
            >
              {certificate.assessment_limitations.map((lim, i) => (
                <li key={i} className="text-2xs text-dim leading-relaxed flex gap-1.5">
                  <span className="text-dim/50">•</span>
                  <span>{lim}</span>
                </li>
              ))}
            </motion.ul>
          )}
        </div>
      )}

      {/* Traceability footer */}
      <div className="px-1 py-2 flex items-center justify-between">
        <span className="text-2xs font-mono text-dim">
          v{certificate.model_version} · {certificate.data_sources_summary?.length || 0} sources
        </span>
        <span className="text-2xs font-mono text-dim">
          {new Date(certificate.generated_at).toLocaleString()}
        </span>
      </div>
    </motion.div>
  );
}
