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
    progress_callback=None,
    prefetched_images: dict | None = None,
) -> tuple[VisualAssessment | None, PerHeadingMap]:
    """
    Analyze each heading image separately so defect bounding boxes are
    image-specific. Returns (overall_assessment, {str(heading): assessment}).

    If prefetched_images is provided, use it instead of calling fetch_bridge_images()
    (avoids duplicate API calls when the orchestrator pre-fetches for all agents).
    """
    if not bridge.street_view_available:
        return None, {}

    if prefetched_images is not None:
        images_by_heading = prefetched_images
    else:
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
            # Print thinking steps to terminal and emit via callback
            steps = data.get("thinking_steps", [])
            if steps:
                print(f"\n[VisionAgent] 🧠 Thinking — heading {heading} for {bridge.osm_id}:")
                for i, step in enumerate(steps, 1):
                    print(f"  [{i}] {step}")
                if progress_callback:
                    for step in steps:
                        await progress_callback({
                            "type": "thinking_step",
                            "stage": "vision",
                            "heading": str(heading),
                            "step": step,
                        })
            data.pop("thinking_steps", None)  # strip before Pydantic model
            per_heading[str(heading)] = VisualAssessment(**data)
        except Exception as e:
            print(f"[VisionAgent] Error analysing heading {heading} for {bridge.osm_id}: {e}")

    if not per_heading:
        return None, {}

    # Fuse per-category worst scores across ALL headings (not just the single worst heading).
    # This ensures corrosion seen from the east and cracking from the west both survive.
    assessments = list(per_heading.values())
    base = assessments[0]

    def worst_defect(field_name):
        """Pick the DefectScore with the highest score across all headings."""
        scores = [(getattr(a, field_name), getattr(a, field_name).score)
                  for a in assessments if getattr(a, field_name, None) is not None]
        if not scores:
            return getattr(base, field_name, None)
        return max(scores, key=lambda x: x[1])[0]

    # Required fields — always present
    fused = {
        "cracking": worst_defect("cracking"),
        "spalling": worst_defect("spalling"),
        "corrosion": worst_defect("corrosion"),
        "surface_degradation": worst_defect("surface_degradation"),
        "drainage": worst_defect("drainage"),
        "structural_deformation": worst_defect("structural_deformation"),
    }

    # Optional extended fields — take worst across headings if any heading has them
    for opt_field in ("pier_condition", "abutment_condition", "fatigue_cracking",
                      "section_loss", "bearing_condition", "joint_condition",
                      "railing_condition", "protective_systems"):
        candidates = [(getattr(a, opt_field), getattr(a, opt_field).score)
                      for a in assessments
                      if getattr(a, opt_field, None) is not None]
        if candidates:
            fused[opt_field] = max(candidates, key=lambda x: x[1])[0]

    # Compute overall from fused required scores
    fused_scores = [fused[k].score for k in ("cracking", "spalling", "corrosion",
                    "surface_degradation", "drainage", "structural_deformation")]
    fused_overall = max(fused_scores)

    # Compute component summaries
    sub_scores = [fused[k].score for k in ("pier_condition", "abutment_condition")
                  if k in fused]
    sup_scores = [fused[k].score for k in ("fatigue_cracking", "section_loss")
                  if k in fused] + [fused["cracking"].score, fused["corrosion"].score]
    deck_scores = [fused["cracking"].score, fused["spalling"].score,
                   fused["drainage"].score, fused["surface_degradation"].score]
    anc_scores = [fused[k].score for k in ("railing_condition", "protective_systems")
                  if k in fused] + [fused["drainage"].score]

    fused["overall_visual_score"] = fused_overall
    fused["requires_immediate_attention"] = fused_overall >= 4.0
    fused["visible_defects_summary"] = f"Fused worst-case from {len(per_heading)} headings"
    fused["images_analyzed"] = len(per_heading)
    fused["street_view_coverage"] = "full" if len(per_heading) == len(HEADINGS) else "partial"
    fused["substructure_score"] = max(sub_scores) if sub_scores else None
    fused["superstructure_score"] = max(sup_scores) if sup_scores else None
    fused["deck_score"] = max(deck_scores)
    fused["ancillary_score"] = max(anc_scores) if anc_scores else None

    overall = VisualAssessment(**fused)
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
