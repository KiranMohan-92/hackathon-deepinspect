// ─── Vision Models ──────────────────────────────────────────────────────────

export interface DefectRegion {
  x1: number; // normalized 0.0–1.0 (left edge)
  y1: number; // normalized 0.0–1.0 (top edge)
  x2: number; // normalized 0.0–1.0 (right edge)
  y2: number; // normalized 0.0–1.0 (bottom edge)
}

export interface DefectScore {
  score: number; // 1–5
  confidence: "low" | "medium" | "high";
  key_observations: string;
  regions: DefectRegion[];
  potential_cause: string;
}

export interface VisualAssessment {
  cracking: DefectScore;
  spalling: DefectScore;
  corrosion: DefectScore;
  surface_degradation: DefectScore;
  drainage: DefectScore;
  structural_deformation: DefectScore;
  overall_visual_score: number; // 1.0–5.0
  requires_immediate_attention: boolean;
  visible_defects_summary: string;
  images_analyzed: number;
  street_view_coverage: "full" | "partial" | "none";
}

// ─── Context Models ─────────────────────────────────────────────────────────

export interface BridgeContext {
  construction_year: number | null;
  construction_era: string;
  material: string;
  designer_or_builder: string | null;
  past_incidents: string[];
  last_known_inspection: number | null;
  daily_traffic_volume: number | null;
  structural_significance: "critical" | "major" | "minor";
  age_years: number | null;
  sources: string[];
}

// ─── Bridge Models ──────────────────────────────────────────────────────────

export type RiskTier = "CRITICAL" | "HIGH" | "MEDIUM" | "OK";

export interface BridgeRiskReport {
  bridge_id: string;
  bridge_name: string | null;
  lat: number;
  lon: number;
  risk_tier: RiskTier;
  risk_score: number; // 1.0–5.0
  condition_summary: string;
  key_risk_factors: string[];
  recommended_action: string;
  maintenance_notes: string[];
  confidence_caveat: string;
  visual_assessment: VisualAssessment | null;
  context: BridgeContext | null;
  generated_at: string;
}

export interface BboxRequest {
  sw_lat: number;
  sw_lon: number;
  ne_lat: number;
  ne_lon: number;
}

export interface ScanRequest {
  query: string;
  query_type: "city_scan" | "bridge_lookup" | "coordinate_query" | "bbox";
  max_bridges: number;
  bbox: BboxRequest | null;
}

// ─── SSE Event Models (for Phase 6 integration) ────────────────────────────

export type AgentName =
  | "orchestrator"
  | "vision"
  | "environment"
  | "failure_mode"
  | "priority"
  | "discovery";

export type AgentStatusType = "queued" | "thinking" | "complete" | "error";

export interface SSEEvent {
  agent: AgentName;
  status: AgentStatusType;
  payload: Record<string, unknown>;
  timestamp: number; // unix ms
}

export interface AgentState {
  status: AgentStatusType;
  message: string;
  payload: Record<string, unknown> | null;
  timestamp: number | null;
}

export type AnalysisStatus = "idle" | "analyzing" | "complete" | "error";

export interface AnalysisState {
  image: File | null;
  imagePreviewUrl: string | null;
  analysisStatus: AnalysisStatus;
  agents: Record<AgentName, AgentState>;
  showAnnotations: boolean;
  elapsedTime: number;
}

// ─── Infrastructure Models (generalized, for Phase 3) ──────────────────────

export type EnvironmentCategory =
  | "terrestrial_civil"
  | "terrestrial_industrial"
  | "orbital"
  | "subsea"
  | "arctic";

export type DamageSeverity = "MINOR" | "MODERATE" | "SEVERE" | "CRITICAL";

export interface DamageItem {
  id: number;
  type: string;
  description: string;
  bounding_box: [number, number, number, number]; // [y_min, x_min, y_max, x_max] 0-1000
  label: string;
  severity: DamageSeverity;
  confidence: number; // 0.0–1.0
  uncertain: boolean;
}

export interface DamagesAssessment {
  damages: DamageItem[];
  overall_pattern: string;
  overall_severity: DamageSeverity;
  overall_confidence: number;
  healthy_areas_noted: string;
}

export interface RiskMatrixDimension {
  score: number; // 1–5
  reasoning: string;
}

export interface RiskMatrix {
  severity: RiskMatrixDimension;
  probability: RiskMatrixDimension;
  consequence: RiskMatrixDimension;
  composite: number; // 1–125
}

export interface ConsistencyCheck {
  passed: boolean;
  anomalies: string[];
  confidence_adjustment: string;
}

export interface RecommendedAction {
  action: string;
  timeline: string;
  priority: "IMMEDIATE" | "URGENT" | "SCHEDULED" | "MONITOR";
}

export interface HistoricalPrecedent {
  event: string;
  location: string;
  year: string;
  outcome: string;
  relevance: string;
  source: string;
}

export interface PriorityReport {
  consistency_check: ConsistencyCheck;
  risk_matrix: RiskMatrix;
  risk_tier: string;
  recommended_actions: RecommendedAction[];
  worst_case_scenario: string;
  summary: string;
}
