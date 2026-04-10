from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class CriterionResult(BaseModel):
    """Assessment result for a single ranked inspection criterion."""
    criterion_rank: int                    # 1-11 (impact order)
    criterion_name: str                    # e.g., "Scour / Foundations / Channel Stability"
    score: float                           # 1.0-5.0
    confidence: str = "low"                # "low" | "medium" | "high"
    data_sources_used: list[str] = []      # e.g., ["OSM waterway tags", "IMGW flood map", "Street View vision"]
    key_findings: list[str] = []           # concise evidence statements
    requires_field_verification: bool = False
    field_verification_scope: Optional[str] = None  # e.g., "Underwater sonar for pier scour depth"
    failure_mode_probability: str = "unknown"  # "negligible" | "low" | "moderate" | "high" | "critical"
    thinking_steps: list[str] = []         # agent reasoning chain


class PhysicsHealthCertificate(BaseModel):
    """
    Complete physics-informed bridge health assessment.

    This is the final output of the multi-criteria agentic swarm.
    Every score traces back to data sources and physics-based reasoning.
    Confidence bounds are mandatory — the system never claims certainty
    where physics demands measurement.
    """
    bridge_id: str
    bridge_name: Optional[str] = None
    lat: float
    lon: float

    # Overall risk assessment
    overall_risk_score: float              # 1.0-5.0 (confidence-weighted)
    overall_risk_tier: str                 # "CRITICAL" | "HIGH" | "MEDIUM" | "OK"
    overall_confidence: str                # "low" | "medium" | "high"

    # Per-criterion breakdown (11 items, ranked by impact)
    criteria_results: list[CriterionResult] = []

    # Actionable output
    recommended_action: str = ""
    priority_field_inspections: list[str] = []  # specific field work needed, ordered by urgency
    estimated_remaining_service_life_years: Optional[int] = None

    # Traceability
    data_sources_summary: list[str] = []
    assessment_limitations: list[str] = []
    generated_at: datetime = None

    def __init__(self, **data):
        if data.get("generated_at") is None:
            data["generated_at"] = datetime.utcnow()
        super().__init__(**data)
    model_version: str = "3.0.0"
    thinking_steps: list[str] = []

    # European rating equivalents (Phase 3)
    european_ratings: dict = {}
    estimated_repair_cost: Optional[dict] = None
    decision: Optional[dict] = None
    consistency_statement: str = "This assessment is deterministic: identical inputs produce identical scores. Methodology: FHWA-RD-01-020 adapted for remote sensing."

    # Legacy compatibility — overall condition narrative
    condition_summary: str = ""
    key_risk_factors: list[str] = []
    maintenance_notes: list[str] = []
    confidence_caveat: str = ""
