import json
from pathlib import Path
from datetime import datetime
from services.gemini_service import text_model, json_config
from models.bridge import BridgeTarget
from models.context import BridgeContext

CONTEXT_PROMPT_TEMPLATE = Path("prompts/context_prompt.txt").read_text()
CURRENT_YEAR = datetime.now().year


async def get_bridge_context(bridge: BridgeTarget) -> BridgeContext:
    osm_metadata = {
        "name": bridge.name,
        "construction_year": bridge.construction_year,
        "material": bridge.material,
        "road_class": bridge.road_class,
        "max_weight_tons": bridge.max_weight_tons,
    }

    prompt = CONTEXT_PROMPT_TEMPLATE.format(
        bridge_name=bridge.name or f"Bridge at {bridge.lat:.4f},{bridge.lon:.4f}",
        lat=bridge.lat,
        lon=bridge.lon,
        osm_metadata=json.dumps(osm_metadata),
    )

    try:
        response = text_model.generate_content(prompt, generation_config=json_config)
        data = json.loads(response.text)
        ctx = BridgeContext(**data)
        # Compute age_years from whichever year source is available
        year = ctx.construction_year or bridge.construction_year
        if year:
            ctx.age_years = CURRENT_YEAR - year
        return ctx
    except Exception as e:
        print(f"[ContextAgent] Error for bridge {bridge.osm_id}: {e}")
        # Minimal fallback using OSM data
        return BridgeContext(
            construction_year=bridge.construction_year,
            age_years=(CURRENT_YEAR - bridge.construction_year) if bridge.construction_year else None,
            material=bridge.material or "unknown",
        )
