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
    cracking: DefectScore
    spalling: DefectScore
    corrosion: DefectScore
    surface_degradation: DefectScore
    drainage: DefectScore
    structural_deformation: DefectScore
    overall_visual_score: float       # 1.0–5.0
    requires_immediate_attention: bool
    visible_defects_summary: str
    images_analyzed: int
    street_view_coverage: str         # "full" | "partial" | "none"
    thinking_steps: list[str] = []    # AI chain-of-thought for this image analysis
