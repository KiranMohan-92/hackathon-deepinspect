export type RiskTier = 'Low' | 'Medium' | 'High' | 'Critical' | 'ALL';

export interface BridgeSummary {
  osm_id: string;
  name: string;
  type: string;
  lat: number;
  lon: number;
  tags: Record<string, string>;
  road_class?: string;
  priority_score?: number;
  construction_year?: number;
  material?: string;
  max_weight_tons?: number;
  bridge_id?: string;
  bridge_name?: string;
}

export interface VisualAssessment {
  defectType: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  confidence: number;
  location: string;
  description: string;
  boundingBox?: [number, number, number, number];
  score?: number;
  regions?: { x1: number; y1: number; x2: number; y2: number }[];
  key_observations?: string;
  potential_cause?: string;
}

export interface BridgeContext {
  construction_year?: number;
  material?: string;
  construction_era?: string;
  age_years?: number;
  structural_significance?: string;
}

export interface BridgeRiskReport {
  osm_id: string;
  risk_tier: RiskTier;
  risk_score?: number;
  structural_integrity: number;
  material_degradation: number;
  environmental_stress: number;
  visualAssessments?: VisualAssessment[];
  recommendations: string[];
  nextInspectionDue?: string;
  summary: string;
  factors: string[];
  context?: BridgeContext;
  condition_summary?: string;
  key_risk_factors?: string[];
  recommended_action?: string;
  maintenance_notes?: string[];
  confidence_caveat?: string;
  visual_assessment?: Record<string, VisualAssessment>;
  per_heading_assessments?: Record<string, Record<string, VisualAssessment>>;
  generated_at?: string;
}

export interface ScanProgressItem {
  step: string;
  status: 'pending' | 'active' | 'complete' | 'error';
  message: string;
}

export interface AnalysisThinkingStep {
  stage: string;
  heading: string | null;
  steps: string[];
}

export interface ImageAnalysisResult {
  defects: VisualAssessment[];
  overall_risk: RiskTier;
  summary: string;
  overall_visual_score?: number;
  requires_immediate_attention?: boolean;
  visible_defects_summary?: string;
  [key: string]: any;
}

export interface AppState {
  bridges: BridgeSummary[];
  analyzedBridges: Record<string, BridgeRiskReport>;
  selectedBridgeId: string | null;
  analyzingBridgeIds: Record<string, boolean>;
  analysisThinking: Record<string, AnalysisThinkingStep[]>;
  checkedBridgeIds: Record<string, boolean>;
  
  isLoading: boolean;
  error: string | null;
  activeFilter: RiskTier;
  scanProgress: ScanProgressItem[];
  
  imageAnalysis: ImageAnalysisResult | null;
  imageFileUrl: string | null;
  
  setBridges: (bridges: BridgeSummary[]) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setActiveFilter: (activeFilter: RiskTier) => void;
  addScanProgress: (item: ScanProgressItem) => void;
  clearScanProgress: () => void;
  
  setSelectedBridgeId: (id: string | null) => void;
  selectedBridge: () => BridgeSummary | null;
  
  addAnalyzingBridgeId: (id: string) => void;
  removeAnalyzingBridgeId: (id: string) => void;
  setAnalyzedBridge: (osm_id: string, report: BridgeRiskReport) => void;
  appendAnalysisThinkingStep: (osm_id: string, step: { stage: string; heading?: string; step: string }) => void;
  getAnalysis: (osm_id: string) => BridgeRiskReport | null;
  
  toggleCheckedBridge: (id: string) => void;
  setCheckedBridges: (ids: string[]) => void;
  clearCheckedBridges: () => void;
  
  setImageAnalysis: (analysis: ImageAnalysisResult | null, fileUrl: string | null) => void;
  clearImageAnalysis: () => void;
  
  filteredBridges: () => BridgeSummary[];
}
