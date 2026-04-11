import json
from pathlib import Path
from datetime import datetime
from config import settings
from services.gemini_service import client, json_config
from services.logging_service import get_logger
from models.bridge import BridgeTarget
from models.context import BridgeContext

log = get_logger(__name__)

CONTEXT_PROMPT_TEMPLATE = Path("prompts/context_prompt.txt").read_text()
CURRENT_YEAR = datetime.now().year


async def get_bridge_context(bridge: BridgeTarget, progress_callback=None) -> BridgeContext:
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
        response = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=prompt,
            config=json_config,
        )
        data = json.loads(response.text)
        # Log thinking steps and emit via callback
        steps = data.get("thinking_steps", [])
        if steps:
            log.info(
                "thinking_steps",
                bridge_id=bridge.osm_id,
                bridge_name=bridge.name,
                step_count=len(steps),
            )
            for i, step in enumerate(steps, 1):
                log.info(
                    "thinking_step",
                    bridge_id=bridge.osm_id,
                    bridge_name=bridge.name,
                    step_index=i,
                    step=step,
                )
            if progress_callback:
                for step in steps:
                    await progress_callback({
                        "type": "thinking_step",
                        "stage": "context",
                        "step": step,
                    })
        data.pop("thinking_steps", None)  # strip before Pydantic model
        ctx = BridgeContext(**data)
        # Compute age_years from whichever year source is available
        year = ctx.construction_year or bridge.construction_year
        if year:
            ctx.age_years = CURRENT_YEAR - year
        return ctx
    except Exception as e:
        log.error("context_error", bridge_id=bridge.osm_id, error=str(e), exc_info=True)
        # Minimal fallback using OSM data
        return BridgeContext(
            construction_year=bridge.construction_year,
            age_years=(CURRENT_YEAR - bridge.construction_year) if bridge.construction_year else None,
            material=bridge.material or "unknown",
        )
