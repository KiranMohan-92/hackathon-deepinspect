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
from utils.scoring import compute_base_risk_score, score_to_tier, compute_criterion_scores, compute_weighted_risk_score

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
    base_score = compute_base_risk_score(visual, ctx)
    legacy_tier = score_to_tier(base_score)

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
            base_score=round(base_score, 1),
            tier=legacy_tier,
        )
        response = text_model.generate_content(prompt, generation_config=narrative_config)
        narrative = json.loads(response.text)
        # Print thinking steps to terminal and emit via callback
        steps = narrative.get("thinking_steps", [])
        if steps:
            print(f"\n[RiskAgent] Thinking — {bridge.name or bridge.osm_id} (score={round(base_score,1)}, tier={legacy_tier}):")
            for i, step in enumerate(steps, 1):
                print(f"  [{i}] {step}")
            if progress_callback:
                for step in steps:
                    await progress_callback({
                        "type": "thinking_step",
                        "stage": "risk",
                        "step": step,
                    })
    except Exception as e:
        print(f"[RiskAgent] Error for bridge {bridge.osm_id}: {e}")

    per_heading = per_heading_assessments or {}
    # Remove thinking_steps from narrative dict before splatting — pass it explicitly
    report_thinking = narrative.pop("thinking_steps", [])

    # Build Physics Health Certificate using multi-criteria scoring
    cert = None
    try:
        criteria = compute_criterion_scores(visual, ctx, scour, structural, degradation)
        overall_score, overall_conf = compute_weighted_risk_score(criteria)

        # Collect priority field inspections from criteria that require it
        priority_field = [
            c.field_verification_scope
            for c in criteria
            if c.requires_field_verification and c.field_verification_scope
        ]

        # Collect data sources across all criteria
        all_sources: list[str] = []
        for c in criteria:
            for src in c.data_sources_used:
                if src not in all_sources:
                    all_sources.append(src)

        # Collect assessment limitations for criteria with low confidence
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
            overall_risk_score=round(overall_score, 2),
            overall_risk_tier=score_to_tier(overall_score),
            overall_confidence=overall_conf,
            criteria_results=criteria,
            recommended_action=narrative.get("recommended_action", "Manual inspection required"),
            priority_field_inspections=priority_field,
            estimated_remaining_service_life_years=(
                degradation.estimated_remaining_service_life_years if degradation else None
            ),
            data_sources_summary=all_sources,
            assessment_limitations=limitations,
            generated_at=datetime.utcnow(),
            condition_summary=narrative.get("condition_summary", ""),
            key_risk_factors=narrative.get("key_risk_factors", []),
            maintenance_notes=narrative.get("maintenance_notes", []),
            confidence_caveat=narrative.get("confidence_caveat", ""),
        )
    except Exception as e:
        import traceback
        print(f"[RiskAgent] CERTIFICATE BUILD FAILED for bridge {bridge.osm_id}: {e}")
        traceback.print_exc()

    # Use certificate score as authoritative when available; fall back to legacy
    if cert:
        authoritative_score = cert.overall_risk_score
        authoritative_tier = cert.overall_risk_tier
    else:
        authoritative_score = round(base_score, 1)
        authoritative_tier = legacy_tier

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
        print(f"[RiskAgent] Report construction error for bridge {bridge.osm_id}: {e}")
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
