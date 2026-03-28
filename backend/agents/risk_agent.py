import json
from pathlib import Path
from datetime import datetime
from models.bridge import BridgeTarget, BridgeRiskReport
from models.vision import VisualAssessment
from models.context import BridgeContext
from services.gemini_service import text_model, narrative_config
from utils.scoring import compute_base_risk_score, score_to_tier

REPORT_PROMPT_TEMPLATE = Path("prompts/risk_report_prompt.txt").read_text()


async def generate_report(
    bridge: BridgeTarget,
    visual: VisualAssessment | None,
    context: BridgeContext | None,
    per_heading_assessments: dict | None = None,
) -> BridgeRiskReport:
    ctx = context or BridgeContext()
    base_score = compute_base_risk_score(visual, ctx)
    tier = score_to_tier(base_score)

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
            tier=tier,
        )
        response = text_model.generate_content(prompt, generation_config=narrative_config)
        narrative = json.loads(response.text)
    except Exception as e:
        print(f"[RiskAgent] Error for bridge {bridge.osm_id}: {e}")

    per_heading = per_heading_assessments or {}
    try:
        return BridgeRiskReport(
            bridge_id=bridge.osm_id,
            bridge_name=bridge.name,
            lat=bridge.lat,
            lon=bridge.lon,
            risk_tier=tier,
            risk_score=round(base_score, 1),
            visual_assessment=visual,
            per_heading_assessments=per_heading,
            context=ctx,
            generated_at=datetime.utcnow(),
            **narrative,
        )
    except Exception as e:
        print(f"[RiskAgent] Report construction error for bridge {bridge.osm_id}: {e}")
        return BridgeRiskReport(
            bridge_id=bridge.osm_id,
            bridge_name=bridge.name,
            lat=bridge.lat,
            lon=bridge.lon,
            risk_tier=tier,
            risk_score=round(base_score, 1),
            visual_assessment=visual,
            per_heading_assessments=per_heading,
            context=ctx,
            generated_at=datetime.utcnow(),
            condition_summary="Assessment unavailable. Manual review required.",
            key_risk_factors=["Assessment failed — manual review required"],
            recommended_action="Manual inspection required",
            maintenance_notes=[],
            confidence_caveat="Analysis error — results are based on age/metadata heuristics only.",
        )
