from pydantic import BaseModel
from typing import Optional


class DefectRegion(BaseModel):
    x1: float   # normalized 0.0–1.0 (left edge)
    y1: float   # normalized 0.0–1.0 (top edge)
    x2: float   # normalized 0.0–1.0 (right edge)
    y2: float   # normalized 0.0–1.0 (bottom edge)


class DefectScore(BaseModel):
    score: int                        # 1–5
    confidence: str                   # "low" | "medium" | "high"
    key_observations: str
    regions: list[DefectRegion] = []  # bounding boxes of visible defects in image
    potential_cause: str = ""         # likely engineering cause of this defect


class VisualAssessment(BaseModel):
    # ── Original 6 categories (deck/surface-level) ──────────────────────
    cracking: DefectScore
    spalling: DefectScore
    corrosion: DefectScore
    surface_degradation: DefectScore
    drainage: DefectScore
    structural_deformation: DefectScore

    # ── Extended categories (component-specific) ────────────────────────
    # Substructure (criterion #4)
    pier_condition: Optional[DefectScore] = None        # cracks, tilting, collision damage on piers
    abutment_condition: Optional[DefectScore] = None    # settlement, rotation, backwall damage

    # Superstructure (criterion #5)
    fatigue_cracking: Optional[DefectScore] = None      # fatigue-pattern cracks (transverse at welds, longitudinal)
    section_loss: Optional[DefectScore] = None          # visible thinning, holes, deep corrosion

    # Bearings/Joints (criterion #8)
    bearing_condition: Optional[DefectScore] = None     # seized, displaced, corroded bearings
    joint_condition: Optional[DefectScore] = None       # leaking, missing, damaged expansion joints

    # Ancillary (criterion #11)
    railing_condition: Optional[DefectScore] = None     # damaged, missing, non-compliant railings
    protective_systems: Optional[DefectScore] = None    # paint peeling, coating failure

    # ── Overall ─────────────────────────────────────────────────────────
    overall_visual_score: float       # 1.0–5.0
    requires_immediate_attention: bool
    visible_defects_summary: str
    images_analyzed: int
    street_view_coverage: str         # "full" | "partial" | "none"

    # ── Component-level summaries (NEW) ─────────────────────────────────
    substructure_score: Optional[float] = None    # worst of pier + abutment
    superstructure_score: Optional[float] = None  # worst of fatigue + section_loss + original corrosion/cracking
    deck_score: Optional[float] = None            # worst of cracking + spalling + drainage + surface_degradation
    ancillary_score: Optional[float] = None       # worst of railing + protective_systems + drainage
