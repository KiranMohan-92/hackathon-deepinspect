from datetime import datetime
from typing import Optional
from models.vision import VisualAssessment
from models.context import BridgeContext
from models.scour import ScourAssessment
from models.structural_type import StructuralTypeAssessment
from models.degradation import DegradationAssessment
from models.criteria import CriterionResult

# ── Physics-derived criterion weights ───────────────────────────────────
# Derived from global bridge collapse statistics:
#   - Hydraulic/scour: 52-55% of collapses
#   - Collision/overload: 12-20%
#   - Deterioration: 6-9%
# Weights are attenuated from raw collapse % to account for remote
# assessment confidence (we can't measure scour depth remotely, so
# weight is 0.25 not 0.55).
CRITERION_WEIGHTS = {
    "scour_foundations":       0.25,
    "redundancy_load_path":    0.15,
    "capacity_vs_demand":      0.12,
    "substructure":            0.10,
    "superstructure":          0.10,
    "stability":               0.05,
    "degradation":             0.08,
    "bearings_joints":         0.05,
    "deck_slab":               0.04,
    "serviceability":          0.03,
    "ancillary":               0.03,
}

# Rank-keyed weights: immune to dict/list reordering.
# Each key is the criterion_rank (1-11) carried by CriterionResult.
RANK_TO_WEIGHT = {
    1: 0.25,   # scour_foundations
    2: 0.15,   # redundancy_load_path
    3: 0.12,   # capacity_vs_demand
    4: 0.10,   # substructure
    5: 0.10,   # superstructure
    6: 0.05,   # stability
    7: 0.08,   # degradation
    8: 0.05,   # bearings_joints
    9: 0.04,   # deck_slab
    10: 0.03,  # serviceability
    11: 0.03,  # ancillary
}

CONFIDENCE_FACTORS = {
    "high": 1.0,
    "medium": 0.7,
    "low": 0.4,
}


def _build_criterion_result(
    *,
    criterion_rank: int,
    criterion_name: str,
    score: Optional[float],
    confidence: str,
    key_findings: list[str],
    requires_field_verification: bool = False,
    field_verification_scope: Optional[str] = None,
    data_sources_used: Optional[list[str]] = None,
    assessment_status: str = "assessed",
    included_in_overall_risk: Optional[bool] = None,
) -> CriterionResult:
    if included_in_overall_risk is None:
        included_in_overall_risk = score is not None and assessment_status != "not_assessed"

    return CriterionResult(
        criterion_rank=criterion_rank,
        criterion_name=criterion_name,
        score=score,
        assessment_status=assessment_status,
        included_in_overall_risk=included_in_overall_risk,
        confidence=confidence,
        key_findings=key_findings,
        requires_field_verification=requires_field_verification,
        field_verification_scope=field_verification_scope,
        failure_mode_probability=_score_to_probability(score),
        data_sources_used=data_sources_used or [],
    )


def score_to_tier(score: float) -> str:
    if score >= 4.0:
        return "CRITICAL"
    elif score >= 3.0:
        return "HIGH"
    elif score >= 2.0:
        return "MEDIUM"
    else:
        return "OK"


# ── Legacy scoring (backward compatible) ────────────────────────────────
def compute_base_risk_score(
    visual: VisualAssessment | None,
    context: BridgeContext,
) -> float:
    """
    Original 4-factor weighted risk formula.
    Kept for backward compatibility with existing pipeline.
    Returns score 1.0 (best) to 5.0 (worst).
    """
    current_year = datetime.now().year

    # Visual score — 40% weight
    if visual:
        visual_component = visual.overall_visual_score * 0.40
    else:
        visual_component = 3.0 * 0.40

    # Age score — 25% weight
    age = context.age_years or 40
    if age >= 60:
        age_score = 5.0
    elif age >= 45:
        age_score = 4.0
    elif age >= 30:
        age_score = 3.0
    elif age >= 15:
        age_score = 2.0
    else:
        age_score = 1.0
    age_component = age_score * 0.25

    # Incident history — 20% weight
    incidents = len(context.past_incidents)
    incident_score = min(5.0, 1.0 + incidents * 1.2)
    incident_component = incident_score * 0.20

    # Inspection staleness — 15% weight
    if context.last_known_inspection:
        years_since = current_year - context.last_known_inspection
        stale_score = min(5.0, 1.0 + years_since * 0.3)
    else:
        stale_score = 4.5
    stale_component = stale_score * 0.15

    return visual_component + age_component + incident_component + stale_component


# ── Multi-criteria scoring (Physics Health Certificate) ─────────────────
def compute_criterion_scores(
    visual: VisualAssessment | None,
    context: BridgeContext,
    scour: ScourAssessment | None = None,
    structural: StructuralTypeAssessment | None = None,
    degradation: DegradationAssessment | None = None,
) -> list[CriterionResult]:
    """
    Compute per-criterion scores for all 11 ranked inspection criteria.
    Returns list of CriterionResult ordered by impact rank (1-11).
    """
    results = []

    # ── Criterion 1: Scour / Foundations ─────────────────────────────
    if scour:
        c1_score = scour.scour_risk_score
        c1_conf = scour.confidence
        c1_findings = scour.visual_scour_indicators[:]
        if scour.flood_zone:
            c1_findings.append(f"Located in {scour.flood_zone} flood zone")
        if scour.crosses_water:
            c1_findings.append(f"Crosses {scour.waterway_type or 'water'}")
        c1_field = scour.requires_field_inspection
        c1_scope = scour.field_inspection_scope
        c1_sources = scour.data_sources
    else:
        c1_score = None
        c1_conf = "low"
        c1_findings = ["No hydrological assessment performed"]
        c1_field = True
        c1_scope = "Full scour assessment required"
        c1_sources = []

    c1_status = "assessed"
    if not scour or scour.assessment_status == "not_assessed" or c1_score is None:
        c1_score = None
        c1_conf = "low"
        c1_findings = ["Hydrological assessment could not be completed from the available remote data"]
        c1_field = True
        c1_scope = "Hydrological and foundation assessment required before scoring this criterion"
        c1_sources = []
        c1_status = "not_assessed"
    elif scour.assessment_status == "estimated":
        c1_status = "estimated"

    results.append(_build_criterion_result(
        criterion_rank=1,
        criterion_name="Scour / Foundations / Channel Stability",
        score=c1_score,
        confidence=c1_conf,
        key_findings=c1_findings,
        requires_field_verification=c1_field,
        field_verification_scope=c1_scope,
        data_sources_used=c1_sources,
        assessment_status=c1_status,
    ))

    # ── Criterion 2: Load-Path Redundancy ────────────────────────────
    if structural:
        # Fracture-critical bridges get automatic HIGH score
        c2_score = None if structural.redundancy_class == "unknown" else (
            5.0 if structural.fracture_critical else (
                4.0 if structural.redundancy_class == "LOW" else
                2.5 if structural.redundancy_class == "MEDIUM" else
                1.5
            )
        )
        c2_conf = structural.structure_type_confidence
        c2_findings = []
        if structural.fracture_critical:
            c2_findings.append(f"FRACTURE-CRITICAL: {', '.join(structural.nstm_elements) or 'non-redundant members identified'}")
        c2_findings.append(f"Structure type: {structural.structure_type}, redundancy: {structural.redundancy_class}")
        c2_sources = structural.data_sources
    else:
        c2_score = None
        c2_conf = "low"
        c2_findings = ["Structural type could not be classified from the available evidence"]
        c2_sources = []

    results.append(_build_criterion_result(
        criterion_rank=2,
        criterion_name="Load-Path Continuity & Redundancy (NSTM)",
        score=c2_score,
        confidence=c2_conf,
        key_findings=c2_findings,
        requires_field_verification=structural.requires_load_rating if structural else True,
        field_verification_scope=(
            "Hands-on NSTM inspection required"
            if (structural and structural.fracture_critical)
            else "Structural system and redundancy must be verified in the field"
            if c2_score is None
            else None
        ),
        data_sources_used=c2_sources,
        assessment_status="estimated" if c2_score is not None else "not_assessed",
    ))

    # ── Criterion 3: Capacity vs. Demand ─────────────────────────────
    if structural:
        c3_map = {"adequate": 1.5, "marginal": 3.5, "insufficient": 5.0}
        c3_score = c3_map.get(structural.capacity_vs_demand_flag)
        c3_conf = "low"  # capacity estimation without drawings is always low confidence
        c3_findings = [f"Estimated capacity class: {structural.estimated_capacity_class}"]
        if structural.posted_weight_limit_tons:
            c3_findings.append(f"Posted weight limit: {structural.posted_weight_limit_tons}t")
        c3_findings.append(f"Capacity vs demand: {structural.capacity_vs_demand_flag}")
        c3_sources = structural.data_sources
    else:
        c3_score = None
        c3_conf = "low"
        c3_findings = ["No capacity assessment performed"]
        c3_sources = []

    results.append(_build_criterion_result(
        criterion_rank=3,
        criterion_name="Capacity vs. Demand (Load Rating)",
        score=c3_score,
        confidence=c3_conf,
        key_findings=c3_findings,
        requires_field_verification=True,  # always — we don't have drawings
        field_verification_scope="Engineering load rating with structural drawings required for posting decisions",
        data_sources_used=c3_sources,
        assessment_status="estimated" if c3_score is not None else "not_assessed",
    ))

    # ── Criterion 4: Substructure Integrity ──────────────────────────
    if visual:
        sub_scores = []
        c4_findings = []
        if visual.pier_condition:
            sub_scores.append(visual.pier_condition.score)
            if visual.pier_condition.score >= 3:
                c4_findings.append(f"Pier condition: {visual.pier_condition.key_observations}")
        if visual.abutment_condition:
            sub_scores.append(visual.abutment_condition.score)
            if visual.abutment_condition.score >= 3:
                c4_findings.append(f"Abutment: {visual.abutment_condition.key_observations}")
        # Fall back to structural_deformation for substructure proxy
        sub_scores.append(visual.structural_deformation.score)
        c4_score = max(sub_scores) if sub_scores else 3.0
        c4_conf = "medium" if (visual.pier_condition or visual.abutment_condition) else "low"
        if not c4_findings:
            c4_findings = [f"Structural deformation score: {visual.structural_deformation.score}/5"]
    else:
        c4_score = None
        c4_conf = "low"
        c4_findings = ["No visual assessment of substructure"]

    results.append(_build_criterion_result(
        criterion_rank=4,
        criterion_name="Substructure Integrity (Piers, Abutments, Pile Caps)",
        score=c4_score,
        confidence=c4_conf,
        key_findings=c4_findings,
        requires_field_verification=(c4_score is None) or c4_score >= 3.0,
        field_verification_scope=(
            "Close-range substructure inspection for crack mapping and settlement survey"
            if c4_score is None or c4_score >= 3.0
            else None
        ),
        data_sources_used=["Street View vision analysis"] if visual else [],
        assessment_status="assessed" if c4_score is not None else "not_assessed",
    ))

    # ── Criterion 5: Superstructure Primary Elements ─────────────────
    if visual:
        sup_scores = [visual.cracking.score, visual.corrosion.score]
        c5_findings = []
        if visual.fatigue_cracking:
            sup_scores.append(visual.fatigue_cracking.score)
            if visual.fatigue_cracking.score >= 3:
                c5_findings.append(f"Fatigue cracking: {visual.fatigue_cracking.key_observations}")
        if visual.section_loss:
            sup_scores.append(visual.section_loss.score)
            if visual.section_loss.score >= 3:
                c5_findings.append(f"Section loss: {visual.section_loss.key_observations}")
        c5_score = max(sup_scores)
        c5_conf = "medium"
        if not c5_findings:
            c5_findings = [f"Cracking: {visual.cracking.score}/5, Corrosion: {visual.corrosion.score}/5"]
    else:
        c5_score = None
        c5_conf = "low"
        c5_findings = ["No visual assessment of superstructure"]

    results.append(_build_criterion_result(
        criterion_rank=5,
        criterion_name="Superstructure Primary Elements (Fatigue, Section Loss)",
        score=c5_score,
        confidence=c5_conf,
        key_findings=c5_findings,
        requires_field_verification=(c5_score is None) or c5_score >= 3.5,
        field_verification_scope="NDT inspection for fatigue crack characterization" if (c5_score is None) or c5_score >= 3.5 else None,
        data_sources_used=["Street View vision analysis"] if visual else [],
        assessment_status="assessed" if c5_score is not None else "not_assessed",
    ))

    # ── Criterion 6: Overall Stability ───────────────────────────────
    c6_scores = []
    c6_findings = []
    if visual:
        c6_scores.append(visual.structural_deformation.score)
    if structural and structural.stability_concerns:
        c6_findings = structural.stability_concerns
        c6_scores.append(min(5.0, 2.0 + len(structural.stability_concerns)))
    c6_score = max(c6_scores) if c6_scores else None
    if not c6_findings:
        c6_findings = (
            ["No specific stability concerns identified from remote assessment"]
            if c6_score is not None
            else ["Overall stability could not be assessed without visual or structural evidence"]
        )

    results.append(_build_criterion_result(
        criterion_rank=6,
        criterion_name="Overall Stability (Buckling, Overturning, Progressive Collapse)",
        score=c6_score,
        confidence="low",
        key_findings=c6_findings,
        requires_field_verification=(c6_score is None) or c6_score >= 3.0,
        field_verification_scope="Stability review requires close-range inspection and structural verification" if c6_score is None else None,
        data_sources_used=(["Street View vision"] if visual else []) + (["Structural type classification"] if structural else []),
        assessment_status="estimated" if c6_score is not None else "not_assessed",
    ))

    # ── Criterion 7: Durability / Degradation ────────────────────────
    if degradation:
        c7_score = degradation.degradation_risk_score
        c7_conf = degradation.confidence
        c7_findings = degradation.active_degradation_mechanisms[:]
        if degradation.estimated_remaining_service_life_years is not None:
            c7_findings.append(f"Estimated remaining service life: {degradation.estimated_remaining_service_life_years} years")
        c7_sources = degradation.data_sources
    elif visual:
        # Fallback: use visual corrosion + spalling as degradation proxy
        c7_score = max(visual.corrosion.score, visual.spalling.score)
        c7_conf = "low"
        c7_findings = [f"Visual corrosion: {visual.corrosion.score}/5, Spalling: {visual.spalling.score}/5"]
        c7_sources = ["Street View vision analysis"]
    else:
        c7_score = None
        c7_conf = "low"
        c7_findings = ["No degradation assessment performed"]
        c7_sources = []

    results.append(_build_criterion_result(
        criterion_rank=7,
        criterion_name="Durability / Time-Dependent Degradation",
        score=c7_score,
        confidence=c7_conf,
        key_findings=c7_findings,
        data_sources_used=c7_sources,
        assessment_status=(
            "assessed" if degradation and c7_score is not None
            else "estimated" if visual and c7_score is not None
            else "not_assessed"
        ),
    ))

    # ── Criterion 8: Bearings, Joints, Expansion Devices ─────────────
    if visual:
        c8_scores = [visual.surface_degradation.score]
        c8_findings = []
        if visual.bearing_condition:
            c8_scores.append(visual.bearing_condition.score)
            if visual.bearing_condition.score >= 3:
                c8_findings.append(f"Bearing: {visual.bearing_condition.key_observations}")
        if visual.joint_condition:
            c8_scores.append(visual.joint_condition.score)
            if visual.joint_condition.score >= 3:
                c8_findings.append(f"Joint: {visual.joint_condition.key_observations}")
        c8_score = max(c8_scores)
        c8_conf = "medium" if (visual.bearing_condition or visual.joint_condition) else "low"
        if not c8_findings:
            c8_findings = [f"Surface degradation (joint proxy): {visual.surface_degradation.score}/5"]
    else:
        c8_score = None
        c8_conf = "low"
        c8_findings = ["No visual assessment of bearings/joints"]

    results.append(_build_criterion_result(
        criterion_rank=8,
        criterion_name="Bearings, Joints, and Expansion Devices",
        score=c8_score,
        confidence=c8_conf,
        key_findings=c8_findings,
        data_sources_used=["Street View vision analysis"] if visual else [],
        assessment_status="assessed" if c8_score is not None else "not_assessed",
    ))

    # ── Criterion 9: Deck / Slab / Wearing Surface ──────────────────
    if visual:
        c9_score = max(visual.cracking.score, visual.spalling.score,
                       visual.drainage.score, visual.surface_degradation.score)
        c9_conf = "medium"  # deck is most visible from Street View
        c9_findings = [
            f"Cracking: {visual.cracking.score}/5",
            f"Spalling: {visual.spalling.score}/5",
            f"Drainage: {visual.drainage.score}/5",
        ]
    else:
        c9_score = None
        c9_conf = "low"
        c9_findings = ["No visual assessment of deck"]

    results.append(_build_criterion_result(
        criterion_rank=9,
        criterion_name="Deck / Slab / Wearing Surface",
        score=c9_score,
        confidence=c9_conf,
        key_findings=c9_findings,
        data_sources_used=["Street View vision analysis"] if visual else [],
        assessment_status="assessed" if c9_score is not None else "not_assessed",
    ))

    # ── Criterion 10: Stiffness / Serviceability ─────────────────────
    # Limited remote capability — proxy-based only
    # Per plan: missing data must NOT default to "OK" — use 3.0 (unknown) with low confidence
    c10_score = None
    c10_conf = "low"
    c10_findings = ["No direct stiffness/deflection measurement is available from remote imagery"]
    if visual and visual.structural_deformation.score >= 3:
        c10_score = float(visual.structural_deformation.score)
        c10_findings.append(f"Deformation detected (proxy): {visual.structural_deformation.score}/5")

    results.append(_build_criterion_result(
        criterion_rank=10,
        criterion_name="Stiffness and Serviceability (Deflections, Vibrations)",
        score=c10_score,
        confidence=c10_conf,
        key_findings=c10_findings,
        requires_field_verification=True,
        field_verification_scope="SHM sensors or surveying needed for actual deflection/frequency measurement",
        data_sources_used=["Street View vision (deformation proxy)"] if visual and c10_score is not None else [],
        assessment_status="estimated" if c10_score is not None else "not_assessed",
    ))

    # ── Criterion 11: Ancillary / Protective Systems ─────────────────
    if visual:
        c11_scores = [visual.drainage.score]
        c11_findings = [f"Drainage: {visual.drainage.score}/5"]
        if visual.railing_condition:
            c11_scores.append(visual.railing_condition.score)
            c11_findings.append(f"Railings: {visual.railing_condition.score}/5")
        if visual.protective_systems:
            c11_scores.append(visual.protective_systems.score)
            c11_findings.append(f"Protective systems: {visual.protective_systems.score}/5")
        c11_score = max(c11_scores)
        c11_conf = "medium"
    else:
        c11_score = None
        c11_conf = "low"
        c11_findings = ["No visual assessment of ancillary systems"]

    results.append(_build_criterion_result(
        criterion_rank=11,
        criterion_name="Ancillary / Protective Systems (Railings, Drainage, Coatings)",
        score=c11_score,
        confidence=c11_conf,
        key_findings=c11_findings,
        data_sources_used=["Street View vision analysis"] if visual else [],
        assessment_status="assessed" if c11_score is not None else "not_assessed",
    ))

    return results


def compute_weighted_risk_score(criteria: list[CriterionResult]) -> tuple[float, str]:
    """
    Compute confidence-weighted overall risk score from criterion results.
    Returns (score, overall_confidence).
    """
    total_score = 0.0
    total_weight = 0.0
    confidence_sum = 0.0

    for criterion in criteria:
        if criterion.score is None or not criterion.included_in_overall_risk:
            continue
        weight = RANK_TO_WEIGHT.get(criterion.criterion_rank, 0.03)

        conf_factor = CONFIDENCE_FACTORS.get(criterion.confidence, 0.4)

        # Confidence-adjusted scoring: low confidence on a high-impact criterion
        # should INCREASE the effective score (pessimistic bias) — because we
        # can't verify it's safe, so assume it might be worse than measured.
        # Formula: adjusted = score + (5.0 - score) * (1.0 - conf_factor) * pessimism_weight
        # This nudges low-confidence scores toward the dangerous end (5.0).
        pessimism_weight = 0.3  # how aggressively to penalize low confidence
        adjusted_score = criterion.score + (5.0 - criterion.score) * (1.0 - conf_factor) * pessimism_weight
        adjusted_score = min(5.0, adjusted_score)

        total_score += adjusted_score * weight
        total_weight += weight
        confidence_sum += conf_factor * weight

    overall_score = total_score / total_weight if total_weight > 0 else 3.0
    avg_confidence = confidence_sum / total_weight if total_weight > 0 else 0.4

    if avg_confidence >= 0.8:
        overall_confidence = "high"
    elif avg_confidence >= 0.55:
        overall_confidence = "medium"
    else:
        overall_confidence = "low"

    return overall_score, overall_confidence


def _score_to_probability(score: Optional[float]) -> str:
    """Map 1-5 score to qualitative failure-mode probability."""
    if score is None:
        return "unknown"
    if score >= 4.5:
        return "critical"
    elif score >= 3.5:
        return "high"
    elif score >= 2.5:
        return "moderate"
    elif score >= 1.5:
        return "low"
    else:
        return "negligible"
