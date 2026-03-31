import { motion } from "framer-motion";
import { ChevronDown, AlertTriangle, CheckCircle, HelpCircle, Crosshair } from "lucide-react";
import { useState } from "react";

const CONFIDENCE_COLORS = {
  high: "text-severity-ok",
  medium: "text-severity-medium",
  low: "text-dim",
};

const SCORE_COLORS = {
  critical: { bg: "bg-severity-critical/10", border: "border-severity-critical/30", text: "text-severity-critical" },
  high: { bg: "bg-severity-high/10", border: "border-severity-high/30", text: "text-severity-high" },
  moderate: { bg: "bg-severity-medium/10", border: "border-severity-medium/30", text: "text-severity-medium" },
  low: { bg: "bg-severity-ok/10", border: "border-severity-ok/30", text: "text-severity-ok" },
  negligible: { bg: "bg-severity-ok/10", border: "border-severity-ok/30", text: "text-severity-ok" },
  unknown: { bg: "bg-white/5", border: "border-glass-border", text: "text-dim" },
};

function scoreStyle(score) {
  if (score >= 4) return SCORE_COLORS.critical;
  if (score >= 3) return SCORE_COLORS.high;
  if (score >= 2) return SCORE_COLORS.moderate;
  return SCORE_COLORS.low;
}

export default function CriterionCard({ criterion, index }) {
  const [expanded, setExpanded] = useState(false);
  const style = scoreStyle(criterion.score);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.25 }}
      className={`glass-panel border ${style.border} overflow-hidden`}
    >
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2.5 flex items-center gap-3 text-left hover:bg-white/[0.02] transition-colors"
      >
        {/* Rank badge */}
        <span className={`text-2xs font-mono font-bold w-5 h-5 rounded flex items-center justify-center ${style.bg} ${style.text}`}>
          {criterion.criterion_rank}
        </span>

        {/* Name */}
        <span className="text-xs font-medium text-white flex-1 truncate">
          {criterion.criterion_name.split(" (")[0]}
        </span>

        {/* Score */}
        <span className={`text-xs font-mono font-bold ${style.text}`}>
          {criterion.score.toFixed(1)}
        </span>

        {/* Confidence dot */}
        <span className={`text-2xs font-mono ${CONFIDENCE_COLORS[criterion.confidence]}`}>
          {criterion.confidence[0].toUpperCase()}
        </span>

        {/* Field inspection flag */}
        {criterion.requires_field_verification && (
          <Crosshair className="w-3 h-3 text-severity-high flex-shrink-0" />
        )}

        {/* Expand chevron */}
        <ChevronDown
          className={`w-3 h-3 text-dim transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {/* Expanded content */}
      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="px-3 pb-3 border-t border-glass-border"
        >
          {/* Findings */}
          {criterion.key_findings?.length > 0 && (
            <div className="mt-2.5">
              <p className="text-label mb-1.5">FINDINGS</p>
              <ul className="space-y-1">
                {criterion.key_findings.map((f, i) => (
                  <li key={i} className="text-2xs text-muted leading-relaxed flex gap-1.5">
                    <span className="text-dim mt-0.5">•</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Failure probability */}
          <div className="mt-2.5 flex items-center gap-3">
            <div>
              <p className="text-label mb-0.5">FAILURE PROBABILITY</p>
              <p className={`text-2xs font-mono font-bold uppercase ${SCORE_COLORS[criterion.failure_mode_probability]?.text || "text-dim"}`}>
                {criterion.failure_mode_probability}
              </p>
            </div>
            <div>
              <p className="text-label mb-0.5">CONFIDENCE</p>
              <p className={`text-2xs font-mono font-bold ${CONFIDENCE_COLORS[criterion.confidence]}`}>
                {criterion.confidence.toUpperCase()}
              </p>
            </div>
          </div>

          {/* Data sources */}
          {criterion.data_sources_used?.length > 0 && (
            <div className="mt-2.5">
              <p className="text-label mb-1">DATA SOURCES</p>
              <div className="flex flex-wrap gap-1">
                {criterion.data_sources_used.map((src, i) => (
                  <span key={i} className="text-2xs font-mono text-dim bg-white/5 px-1.5 py-0.5 rounded">
                    {src}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Field inspection scope */}
          {criterion.requires_field_verification && criterion.field_verification_scope && (
            <div className="mt-2.5 p-2 rounded-lg bg-severity-high/5 border border-severity-high/20">
              <div className="flex items-center gap-1.5 mb-1">
                <AlertTriangle className="w-3 h-3 text-severity-high" />
                <p className="text-2xs font-mono font-bold text-severity-high">FIELD INSPECTION REQUIRED</p>
              </div>
              <p className="text-2xs text-muted leading-relaxed">
                {criterion.field_verification_scope}
              </p>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
