import asyncio
import base64
import json
from pathlib import Path
from services.streetview_service import fetch_bridge_images, HEADINGS
from services.gemini_service import vision_model, json_config
from models.bridge import BridgeTarget
from models.vision import VisualAssessment
from config import settings

VISION_PROMPT = Path("prompts/vision_prompt.txt").read_text()

# heading (int) → VisualAssessment
PerHeadingMap = dict[str, VisualAssessment]


async def analyze_bridge(
    bridge: BridgeTarget,
) -> tuple[VisualAssessment | None, PerHeadingMap]:
    """
    Analyze each heading image separately so defect bounding boxes are
    image-specific. Returns (overall_assessment, {str(heading): assessment}).
    """
    if not bridge.street_view_available:
        return None, {}

    images_by_heading = await fetch_bridge_images(
        bridge.lat, bridge.lon, settings.GOOGLE_MAPS_API_KEY, bridge.osm_id
    )
    if not images_by_heading:
        return None, {}

    per_heading: PerHeadingMap = {}
    for heading in sorted(images_by_heading):
        img_bytes = images_by_heading[heading]
        parts = [
            {"text": VISION_PROMPT},
            {
                "inline_data": {
                    "mime_type": "image/jpeg",
                    "data": base64.b64encode(img_bytes).decode("utf-8"),
                }
            },
        ]
        try:
            response = vision_model.generate_content(parts, generation_config=json_config)
            data = json.loads(response.text)
            data["images_analyzed"] = 1
            data["street_view_coverage"] = "partial"
            per_heading[str(heading)] = VisualAssessment(**data)
        except Exception as e:
            print(f"[VisionAgent] Error analysing heading {heading} for {bridge.osm_id}: {e}")

    if not per_heading:
        return None, {}

    # Overall = the assessment with the worst defect findings (highest visual score)
    overall = max(per_heading.values(), key=lambda v: v.overall_visual_score)
    overall = overall.model_copy(update={
        "images_analyzed": len(per_heading),
        "street_view_coverage": "full" if len(per_heading) == len(HEADINGS) else "partial",
    })
    return overall, per_heading


async def run_vision_batch(
    bridges: list[BridgeTarget],
) -> dict[str, tuple[VisualAssessment | None, PerHeadingMap]]:
    # Lower semaphore than before: each bridge now issues N per-heading calls
    sem = asyncio.Semaphore(3)

    async def analyze_one(b: BridgeTarget):
        async with sem:
            result = await analyze_bridge(b)
        return b.osm_id, result

    pairs = await asyncio.gather(*[analyze_one(b) for b in bridges])
    return dict(pairs)
