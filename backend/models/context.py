from pydantic import BaseModel
from typing import Optional


class BridgeContext(BaseModel):
    construction_year: Optional[int] = None
    construction_era: str = "Unknown"   # "Soviet-era" | "Pre-war" | "Post-war modern" | "Unknown"
    material: str = "unknown"
    designer_or_builder: Optional[str] = None
    past_incidents: list[str] = []
    last_known_inspection: Optional[int] = None
    daily_traffic_volume: Optional[int] = None
    structural_significance: str = "minor"   # "critical" | "major" | "minor"
    age_years: Optional[int] = None
    sources: list[str] = []
    thinking_steps: list[str] = []    # AI chain-of-thought for context research
