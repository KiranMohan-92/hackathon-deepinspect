from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from .vision import VisualAssessment
from .context import BridgeContext
from .criteria import PhysicsHealthCertificate
from .scour import ScourAssessment
from .structural_type import StructuralTypeAssessment
from .degradation import DegradationAssessment


class BridgeTarget(BaseModel):
    osm_id: str
    name: Optional[str] = None
    lat: float
    lon: float
    construction_year: Optional[int] = None
    material: Optional[str] = None
    road_class: Optional[str] = None
    max_weight_tons: Optional[float] = None
    street_view_available: bool = True  # optimistic; discovered at analysis time
    # Hydrological metadata (populated by discovery/hydrological agents)
    crosses_water: Optional[bool] = None
    waterway_tags: Optional[dict] = None  # raw OSM waterway tags near bridge


class BridgeSummary(BaseModel):
    """Lightweight record returned by /api/scan — no Gemini, no images."""
    osm_id: str
    name: Optional[str] = None
    lat: float
    lon: float
    road_class: Optional[str] = None
    construction_year: Optional[int] = None
    material: Optional[str] = None
    max_weight_tons: Optional[float] = None
    priority_score: float = 1.0  # higher = more important to inspect first
    crosses_water: Optional[bool] = None  # flagged during discovery


class BridgeRiskReport(BaseModel):
    bridge_id: str
    bridge_name: Optional[str] = None
    lat: float
    lon: float
    risk_tier: str              # "CRITICAL" | "HIGH" | "MEDIUM" | "OK"
    risk_score: float           # 1.0–5.0
    condition_summary: str
    key_risk_factors: list[str]
    recommended_action: str
    maintenance_notes: list[str]
    confidence_caveat: str
    visual_assessment: Optional[VisualAssessment] = None
    per_heading_assessments: dict[str, VisualAssessment] = {}  # str(heading) → assessment
    context: Optional[BridgeContext] = None
    generated_at: datetime
    thinking_steps: list[str] = []    # AI chain-of-thought for final risk report generation

    # ── Physics Health Certificate (NEW — multi-criteria assessment) ────
    certificate: Optional[PhysicsHealthCertificate] = None

    # ── Per-criterion sub-assessments (for traceability) ────────────────
    scour_assessment: Optional[ScourAssessment] = None
    structural_type_assessment: Optional[StructuralTypeAssessment] = None
    degradation_assessment: Optional[DegradationAssessment] = None


class BboxRequest(BaseModel):
    sw_lat: float
    sw_lon: float
    ne_lat: float
    ne_lon: float


class ScanRequest(BaseModel):
    query: str = ""
    query_type: str = "city_scan"   # "city_scan" | "bridge_lookup" | "coordinate_query" | "bbox"
    max_bridges: int = 30
    bbox: Optional[BboxRequest] = None  # used when query_type == "bbox"
