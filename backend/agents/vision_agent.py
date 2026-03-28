import asyncio
import base64
import json
from pathlib import Path
from services.streetview_service import fetch_bridge_images
from services.gemini_service import vision_model, json_config
from models.bridge import BridgeTarget
from models.vision import VisualAssessment
from config import settings

VISION_PROMPT = Path("prompts/vision_prompt.txt").read_text()


async def analyze_bridge(bridge: BridgeTarget) -> VisualAssessment | None:
    if not bridge.street_view_available:
        return None

    images = await fetch_bridge_images(
        bridge.lat, bridge.lon, settings.GOOGLE_MAPS_API_KEY, bridge.osm_id
    )
    if not images:
        return None

    parts = [{"text": VISION_PROMPT}]
    for img_bytes in images:
        parts.append({
            "inline_data": {
                "mime_type": "image/jpeg",
                "data": base64.b64encode(img_bytes).decode("utf-8"),
            }
        })

    try:
        response = vision_model.generate_content(parts, generation_config=json_config)
        data = json.loads(response.text)
        data["images_analyzed"] = len(images)
        if "street_view_coverage" not in data:
            data["street_view_coverage"] = "full" if len(images) == 3 else "partial"
        return VisualAssessment(**data)
    except Exception as e:
        print(f"[VisionAgent] Error for bridge {bridge.osm_id}: {e}")
        return None


async def run_vision_batch(bridges: list[BridgeTarget]) -> dict[str, VisualAssessment | None]:
    sem = asyncio.Semaphore(5)

    async def analyze_one(b: BridgeTarget):
        async with sem:
            result = await analyze_bridge(b)
        return b.osm_id, result

    pairs = await asyncio.gather(*[analyze_one(b) for b in bridges])
    return dict(pairs)
