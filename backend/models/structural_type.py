from pydantic import BaseModel
from typing import Optional


class StructuralTypeAssessment(BaseModel):
    """
    Criteria #2 (Redundancy), #3 (Capacity), #6 (Stability).

    Structure type determines redundancy (fracture-critical or not),
    approximate capacity class, and stability mode.

    LIMITATION: Precise load rating (AASHTO LRFR) requires structural
    drawings with member dimensions. This model provides capacity CLASS
    (light/standard/heavy), NOT rating factors.
    """
    # Structure classification (from vision + OSM)
    structure_type: str = "unknown"              # beam, truss, arch, cable_stayed, suspension, slab, culvert
    structure_type_confidence: str = "low"        # how certain is the classification
    girder_type: Optional[str] = None            # multi_girder, two_girder, box_girder, etc.
    span_count: Optional[int] = None
    estimated_span_length_m: Optional[float] = None
    deck_type: Optional[str] = None              # concrete_slab, steel_deck, timber, composite

    # Criterion #2: Load-path redundancy
    redundancy_class: str = "unknown"            # "HIGH", "MEDIUM", "LOW"
    fracture_critical: bool = False
    nstm_elements: list[str] = []                # identified non-redundant steel tension members
    redundancy_reasoning: str = ""               # why this classification

    # Criterion #3: Capacity vs. demand
    estimated_capacity_class: str = "unknown"    # "light" (<20t), "standard" (20-44t), "heavy" (>44t)
    posted_weight_limit_tons: Optional[float] = None  # from OSM maxweight
    estimated_lane_count: Optional[int] = None
    capacity_vs_demand_flag: str = "unknown"     # "adequate", "marginal", "insufficient", "unknown"
    capacity_reasoning: str = ""

    # Criterion #6: Stability
    stability_concerns: list[str] = []           # "slender piers - buckling risk", "tall abutment - overturning"
    settlement_indicators: list[str] = []        # from vision: differential settlement signs

    # Overall
    requires_load_rating: bool = False           # True if redundancy LOW or capacity marginal
    data_sources: list[str] = []
