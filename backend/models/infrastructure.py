from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone
from enum import Enum


class EnvironmentCategory(str, Enum):
    TERRESTRIAL_CIVIL = "terrestrial_civil"
    TERRESTRIAL_INDUSTRIAL = "terrestrial_industrial"
    ORBITAL = "orbital"
    SUBSEA = "subsea"
    ARCTIC = "arctic"


class StructureType(str, Enum):
    BRIDGE = "bridge"
    BUILDING = "building"
    SATELLITE = "satellite"
    SOLAR_PANEL = "solar_panel"
    CABLE = "cable"
    TURBINE = "turbine"
    PIPELINE = "pipeline"
    DAM = "dam"
    TOWER = "tower"
    ANTENNA = "antenna"
    HULL = "hull"
    FOUNDATION = "foundation"
    RETAINING_WALL = "retaining_wall"
    OTHER = "other"


class ValidationResult(BaseModel):
    valid: bool
    rejection_reason: Optional[str] = None
    structure_type: Optional[str] = None
    structure_subtype: Optional[str] = None
    environment_category: Optional[str] = None
    user_context: Optional[dict] = None


class DamageItem(BaseModel):
    id: int
    type: str
    description: str
    bounding_box: list[int]  # [y_min, x_min, y_max, x_max] normalized 0-1000
    label: str
    severity: str  # MINOR | MODERATE | SEVERE | CRITICAL
    confidence: float  # 0.0-1.0
    uncertain: bool = False


class DamagesAssessment(BaseModel):
    damages: list[DamageItem] = []
    overall_pattern: str = ""
    overall_severity: str = "MINOR"
    overall_confidence: float = 0.0
    healthy_areas_noted: str = ""


class EnvironmentStressor(BaseModel):
    name: str
    severity: str  # LOW | MEDIUM | HIGH
    measured_value: str = ""
    description: str = ""
    source: str = ""


class EnvironmentAnalysis(BaseModel):
    environment_type: str = ""
    location_context: str = ""
    stressors: list[EnvironmentStressor] = []
    accelerating_factors: list[str] = []
    mitigating_factors: list[str] = []
    data_sources: list[str] = []


class HistoricalPrecedent(BaseModel):
    event: str
    location: str = ""
    year: str = ""
    outcome: str = ""
    relevance: str = ""
    source: str = ""


class FailureModeAnalysis(BaseModel):
    failure_mode: str = ""
    mechanism: str = ""
    root_cause_chain: list[str] = []
    progression_rate: str = "MODERATE"  # SLOW | MODERATE | RAPID
    time_to_critical: str = ""
    time_to_failure: str = ""
    historical_precedents: list[HistoricalPrecedent] = []


class RiskMatrixDimension(BaseModel):
    score: int  # 1-5
    reasoning: str = ""


class RiskMatrix(BaseModel):
    severity: RiskMatrixDimension
    probability: RiskMatrixDimension
    consequence: RiskMatrixDimension
    composite: int  # 1-125


class ConsistencyCheck(BaseModel):
    passed: bool = True
    anomalies: list[str] = []
    confidence_adjustment: str = ""


class RecommendedAction(BaseModel):
    action: str
    timeline: str = ""
    priority: str = "SCHEDULED"  # IMMEDIATE | URGENT | SCHEDULED | MONITOR


class PriorityReport(BaseModel):
    consistency_check: ConsistencyCheck
    risk_matrix: RiskMatrix
    risk_tier: str  # LOW | MEDIUM | MEDIUM-HIGH | HIGH | CRITICAL
    recommended_actions: list[RecommendedAction] = []
    worst_case_scenario: str = ""
    summary: str = ""


class InfrastructureTarget(BaseModel):
    """Generalized target — superset of BridgeTarget."""
    id: str
    name: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None
    structure_type: str = "other"
    environment_category: str = "terrestrial_civil"
    age_years: Optional[int] = None
    location: Optional[str] = None
    last_inspection: Optional[str] = None
    known_issues: Optional[str] = None


class InfrastructureReport(BaseModel):
    """Full analysis report for any infrastructure type."""
    target: InfrastructureTarget
    validation: ValidationResult
    vision: Optional[DamagesAssessment] = None
    environment: Optional[EnvironmentAnalysis] = None
    failure_mode: Optional[FailureModeAnalysis] = None
    priority: Optional[PriorityReport] = None
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
