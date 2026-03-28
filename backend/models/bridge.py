from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from .vision import VisualAssessment
from .context import BridgeContext


class BridgeTarget(BaseModel):
    osm_id: str
    name: Optional[str] = None
    lat: float
    lon: float
    construction_year: Optional[int] = None
    material: Optional[str] = None
    road_class: Optional[str] = None
    max_weight_tons: Optional[float] = None
    street_view_available: bool = False


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
    context: Optional[BridgeContext] = None
    generated_at: datetime


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
