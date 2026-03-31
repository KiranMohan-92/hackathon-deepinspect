from pydantic import BaseModel
from typing import Optional


class ScourAssessment(BaseModel):
    """
    Criterion #1: Foundations / Scour / Channel Stability.

    Scour is the #1 cause of bridge collapse (52-55% of failures globally).
    This assessment combines remote data sources to estimate scour risk.

    LIMITATION: Actual scour depth below waterline requires bathymetric survey.
    This model estimates RISK, not depth.
    """
    # Water crossing identification
    crosses_water: bool = False
    waterway_type: Optional[str] = None          # "river", "canal", "stream", "drain", None
    waterway_name: Optional[str] = None
    waterway_width_m: Optional[float] = None     # estimated from OSM/imagery

    # Flood risk (from IMGW-PIB / Copernicus)
    flood_zone: Optional[str] = None             # "100-year", "500-year", "none", None (unknown)
    flood_zone_source: Optional[str] = None      # "IMGW-PIB Hydroportal", "Copernicus EMS", etc.
    historical_flood_events: list[str] = []       # known flood events at/near location

    # Channel characteristics (from DEM / OSM)
    channel_gradient: Optional[float] = None     # estimated slope (m/m)
    estimated_flow_velocity_class: Optional[str] = None  # "low", "moderate", "high", "torrential"
    upstream_catchment_km2: Optional[float] = None

    # Visual scour indicators (from Gemini Vision)
    visual_scour_indicators: list[str] = []      # e.g., "exposed pile cap", "undermined abutment"
    foundation_visible: bool = False              # can we see foundations at all?
    debris_accumulation: bool = False
    erosion_signs: bool = False
    waterline_marks: bool = False

    # Scour countermeasures observed
    scour_countermeasures: list[str] = []         # "riprap", "sheet piling", "gabions", etc.
    countermeasure_condition: Optional[str] = None  # "good", "degraded", "failed", None

    # Scoring
    scour_risk_score: float = 1.0                # 1.0-5.0
    confidence: str = "low"                       # "low" | "medium" | "high"
    requires_field_inspection: bool = True         # almost always True for water crossings
    field_inspection_scope: Optional[str] = None   # e.g., "Underwater sonar survey for pier scour depth"
    data_sources: list[str] = []
