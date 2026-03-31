from pydantic import BaseModel
from typing import Optional


class DegradationAssessment(BaseModel):
    """
    Criterion #7: Durability / Time-Dependent Degradation.

    Models corrosion, freeze-thaw, and chemical attack using simplified
    physics equations (Fick's 2nd law for chloride ingress, ISO 9223/9224
    for atmospheric corrosion rates).

    LIMITATION: Material properties are inferred from era/type, not tested.
    Actual degradation rates depend on in-situ conditions.
    """
    # Environmental classification
    environment_class: str = "unknown"           # "marine", "urban_deicing", "rural", "industrial"
    environment_reasoning: str = ""
    distance_to_coast_km: Optional[float] = None
    de_icing_salt_exposure: bool = False          # true for bridges on salted roads

    # Corrosion modeling
    corrosion_rate_mm_per_year: Optional[float] = None  # ISO 9223/9224 estimate
    estimated_section_loss_percent: Optional[float] = None  # based on age × rate
    corrosion_category: Optional[str] = None     # C1-CX per ISO 9223

    # Concrete deterioration
    estimated_chloride_penetration_mm: Optional[float] = None  # Fick's 2nd law
    estimated_carbonation_depth_mm: Optional[float] = None
    freeze_thaw_cycles_per_year: Optional[int] = None
    freeze_thaw_damage_class: Optional[str] = None  # "negligible", "moderate", "severe"

    # Protective systems (from vision)
    protective_system_type: Optional[str] = None  # "paint", "galvanized", "cathodic_protection", "none"
    protective_system_effectiveness: str = "unknown"  # "good", "degraded", "failed", "unknown"

    # Active degradation mechanisms detected
    active_degradation_mechanisms: list[str] = []  # e.g., ["chloride-induced corrosion", "freeze-thaw"]

    # Service life
    estimated_remaining_service_life_years: Optional[int] = None
    service_life_reasoning: str = ""

    # Scoring
    degradation_risk_score: float = 1.0          # 1.0-5.0
    confidence: str = "low"
    data_sources: list[str] = []
