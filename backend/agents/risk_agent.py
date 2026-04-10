import json
from pathlib import Path
from datetime import datetime
from models.bridge import BridgeTarget, BridgeRiskReport
from models.vision import VisualAssessment
from models.context import BridgeContext
from models.criteria import PhysicsHealthCertificate, CriterionResult
from models.scour import ScourAssessment
from models.structural_type import StructuralTypeAssessment
from models.degradation import DegradationAssessment
from services.gemini_service import text_model, narrative_config
from services.logging_service import get_logger
from utils.scoring import compute_base_risk_score, score_to_tier, compute_criterion_scores, compute_weighted_risk_score
from utils.rating_conversion import convert_all
from utils.cost_estimation import estimate_repair_cost
from services.decision_service import compute_decision

log = get_logger(__name__)

REPORT_PROMPT_TEMPLATE = Path("prompts/risk_report_prompt.txt").read_text()


async def generate_report(
    bridge: BridgeTarget,
    visual: VisualAssessment | None,
    context: BridgeContext | None,
    per_heading_assessments: dict | None = None,
    scour: ScourAssessment | None = None,
    structural: StructuralTypeAssessment | None = None,
    degradation: DegradationAssessment | None = None,
    progress_callback=None,
) -> BridgeRiskReport:
    ctx = context or BridgeContext()
    per_heading = per_heading_assessments or {}

    # ── Step 1: Compute certificate FIRST so narrative uses authoritative score ──
    cert = None
    authoritative_score = None
    authoritative_tier = None
    try:
        criteria = compute_criterion_scores(visual, ctx, scour, structural, degradation)
        overall_score, overall_conf = compute_weighted_risk_score(criteria)
        authoritative_score = round(overall_score, 2)
        authoritative_tier = score_to_tier(overall_score)

        priority_field = [
            c.field_verification_scope
            for c in criteria
            if c.requires_field_verification and c.field_verification_scope
        ]

        all_sources: list[str] = []
        for c in criteria:
            for src in c.data_sources_used:
                if src not in all_sources:
                    all_sources.append(src)

        limitations = [
            f"Criterion '{c.criterion_name}' assessed at low confidence — field verification required"
            for c in criteria
            if c.confidence == "low" and c.requires_field_verification
        ]

        cert = PhysicsHealthCertificate(
            bridge_id=bridge.osm_id,
            bridge_name=bridge.name,
            lat=bridge.lat,
            lon=bridge.lon,
            overall_risk_score=authoritative_score,
            overall_risk_tier=authoritative_tier,
            overall_confidence=overall_conf,
            criteria_results=criteria,
            priority_field_inspections=priority_field,
            estimated_remaining_service_life_years=(
                degradation.estimated_remaining_service_life_years if degradation else None
            ),
            data_sources_summary=all_sources,
            assessment_limitations=limitations,
            generated_at=datetime.utcnow(),
        )

        # Phase 3: EU ratings, cost estimation, decision policy
        max_criterion_score = max((c.score for c in criteria), default=overall_score)
        # IQOA S suffix: only for criterion rank 11 (railing/safety) with user-safety finding
        has_safety_finding = any(
            c.score >= 4.0 and c.criterion_rank == 11
            for c in criteria
        )
        cert.european_ratings = convert_all(
            overall_score, max_criterion_score, has_safety_finding
        )

        # Cost estimation: extract defect tokens from criterion names for bracket matching
        defect_tokens = []
        for c in criteria:
            if c.score >= 3.5:
                name_token = c.criterion_name.lower().replace(" ", "_").replace("/", "_")
                defect_tokens.append(name_token)
        span_count = structural.span_count if structural else None
        cert.estimated_repair_cost = estimate_repair_cost(
            authoritative_tier,
            primary_defects=defect_tokens,
            span_count=span_count,
        )

        # Decision policy: pass structural and trend context
        is_fracture_critical = structural.fracture_critical if structural else False
        capacity_flag = structural.capacity_vs_demand_flag if structural else None
        cert.decision = compute_decision(
            risk_tier=authoritative_tier,
            confidence=overall_conf,
            criteria_results=[c.model_dump() for c in criteria],
            fracture_critical=is_fracture_critical,
            capacity_vs_demand=capacity_flag,
        )
    except Exception as e:
        log.error("certificate_build_failed", bridge_id=bridge.osm_id, error=str(e), exc_info=True)

    # Fall back to legacy scoring if certificate failed
    if authoritative_score is None:
        base_score = compute_base_risk_score(visual, ctx)
        authoritative_score = round(base_score, 1)
        authoritative_tier = score_to_tier(base_score)

    # ── Step 2: Generate narrative using the AUTHORITATIVE score/tier ────────────
    narrative = {
        "condition_summary": "Automated assessment unavailable. Manual review required.",
        "key_risk_factors": ["Assessment failed — manual review required"],
        "recommended_action": "Manual inspection required",
        "maintenance_notes": [],
        "confidence_caveat": "Analysis error — results are based on age/metadata heuristics only.",
    }

    try:
        prompt = REPORT_PROMPT_TEMPLATE.format(
            bridge_name=bridge.name or f"Bridge {bridge.osm_id}",
            lat=bridge.lat,
            lon=bridge.lon,
            visual_assessment_json=visual.model_dump_json() if visual else "{}",
            context_json=ctx.model_dump_json(),
            base_score=authoritative_score,
            tier=authoritative_tier,
        )
        response = text_model.generate_content(prompt, generation_config=narrative_config)
        narrative = json.loads(response.text)
        steps = narrative.get("thinking_steps", [])
        if steps:
            log.info(
                "thinking_steps",
                bridge_id=bridge.osm_id,
                bridge_name=bridge.name,
                score=authoritative_score,
                tier=authoritative_tier,
                step_count=len(steps),
            )
            for i, step in enumerate(steps, 1):
                log.info(
                    "thinking_step",
                    bridge_id=bridge.osm_id,
                    bridge_name=bridge.name,
                    score=authoritative_score,
                    tier=authoritative_tier,
                    step_index=i,
                    step=step,
                )
            if progress_callback:
                for step in steps:
                    await progress_callback({
                        "type": "thinking_step",
                        "stage": "risk",
                        "step": step,
                    })
    except Exception as e:
        log.error("narrative_generation_failed", bridge_id=bridge.osm_id, error=str(e), exc_info=True)

    report_thinking = narrative.pop("thinking_steps", [])

    # ── Step 3: Update certificate with narrative fields ─────────────────────────
    if cert:
        cert = cert.model_copy(update={
            "recommended_action": narrative.get("recommended_action", cert.recommended_action),
            "condition_summary": narrative.get("condition_summary", ""),
            "key_risk_factors": narrative.get("key_risk_factors", []),
            "maintenance_notes": narrative.get("maintenance_notes", []),
            "confidence_caveat": narrative.get("confidence_caveat", ""),
        })

    # ── Step 4: Assemble report ─────────────────────────────────────────────────
    try:
        return BridgeRiskReport(
            bridge_id=bridge.osm_id,
            bridge_name=bridge.name,
            lat=bridge.lat,
            lon=bridge.lon,
            risk_tier=authoritative_tier,
            risk_score=authoritative_score,
            visual_assessment=visual,
            per_heading_assessments=per_heading,
            context=ctx,
            generated_at=datetime.utcnow(),
            thinking_steps=report_thinking,
            certificate=cert,
            scour_assessment=scour,
            structural_type_assessment=structural,
            degradation_assessment=degradation,
            **narrative,
        )
    except Exception as e:
        log.error("report_construction_error", bridge_id=bridge.osm_id, error=str(e), exc_info=True)
        return BridgeRiskReport(
            bridge_id=bridge.osm_id,
            bridge_name=bridge.name,
            lat=bridge.lat,
            lon=bridge.lon,
            risk_tier=authoritative_tier,
            risk_score=authoritative_score,
            visual_assessment=visual,
            per_heading_assessments=per_heading,
            context=ctx,
            generated_at=datetime.utcnow(),
            certificate=cert,
            scour_assessment=scour,
            structural_type_assessment=structural,
            degradation_assessment=degradation,
            condition_summary="Assessment unavailable. Manual review required.",
            key_risk_factors=["Assessment failed — manual review required"],
            recommended_action="Manual inspection required",
            maintenance_notes=[],
            confidence_caveat="Analysis error — results are based on age/metadata heuristics only.",
        )
