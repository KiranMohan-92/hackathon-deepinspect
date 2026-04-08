"""
hydrological_agent.py — Criterion #1: Scour / Foundations / Channel Stability.

Scour is the single largest cause of bridge collapse (52-55% of all failures).
This agent assesses scour risk using:
  - OSM Overpass: waterway tags within 500 m
  - Gemini Vision: scour indicators in Street View imagery
  - Flood zone classification from waterway characteristics
"""
import asyncio
import base64
import json
from pathlib import Path

from services.gemini_service import vision_model, text_model, json_config
from services.streetview_service import fetch_bridge_images
from services.flood_service import check_waterway_proximity, classify_flood_risk
from models.bridge import BridgeTarget
from models.scour import ScourAssessment
from config import settings

SCOUR_VISION_PROMPT = Path("prompts/scour_vision_prompt.txt").read_text()


async def assess_scour(
    bridge: BridgeTarget,
    progress_callback=None,
    prefetched_images: dict | None = None,
) -> ScourAssessment:
    """
    Run full scour / foundation / channel-stability assessment for a bridge.

    Combines:
      1. OSM waterway proximity (Overpass)
      2. Flood zone classification
      3. Gemini Vision analysis of Street View imagery for scour indicators

    If prefetched_images is provided, use it instead of calling fetch_bridge_images()
    (avoids duplicate API calls when the orchestrator pre-fetches for all agents).
    """

    async def emit(step: str):
        print(f"[HydrologicalAgent] {step}")
        if progress_callback:
            await progress_callback({
                "type": "thinking_step",
                "stage": "scour",
                "step": step,
            })

    data_sources: list[str] = []

    # ── 1. Query OSM for nearby waterways ────────────────────────────────────
    await emit("Querying OSM Overpass for waterways within 100 m…")
    waterways: list[dict] = []
    try:
        waterways = await check_waterway_proximity(bridge.lat, bridge.lon, radius_m=100)
        if waterways:
            data_sources.append("OpenStreetMap Overpass (waterway tags)")
            await emit(f"Found {len(waterways)} waterway element(s) near bridge.")
        else:
            await emit("No waterways found within 100 m via OSM.")
    except Exception as e:
        await emit(f"OSM waterway query failed: {str(e)[:80]}")

    # Determine primary waterway (first river > stream > other)
    primary_waterway: dict | None = None
    for preferred_type in ("river", "tidal_channel", "wadi", "stream", "canal", "drain", "ditch"):
        for w in waterways:
            if (w.get("waterway_type") or "").lower() == preferred_type:
                primary_waterway = w
                break
        if primary_waterway:
            break
    if primary_waterway is None and waterways:
        primary_waterway = waterways[0]

    crosses_water   = len(waterways) > 0
    waterway_type   = primary_waterway.get("waterway_type") if primary_waterway else None
    waterway_name   = primary_waterway.get("name") if primary_waterway else None
    waterway_width  = primary_waterway.get("width_m") if primary_waterway else None

    # ── 2. Flood zone classification ─────────────────────────────────────────
    await emit("Classifying flood zone from waterway characteristics…")
    flood_zone = classify_flood_risk(waterways)
    flood_zone_source: str | None = None
    if waterways:
        flood_zone_source = "OpenStreetMap waterway classification (DeepInspect estimate)"

    # ── 3. Gemini Vision — scour indicators in Street View imagery ───────────
    vision_result: dict = {}
    if bridge.street_view_available:
        if prefetched_images is not None:
            images_by_heading = prefetched_images
        else:
            await emit("Fetching Street View imagery for scour visual analysis…")
            try:
                images_by_heading = await fetch_bridge_images(
                    bridge.lat, bridge.lon, settings.GOOGLE_MAPS_API_KEY, bridge.osm_id
                )
            except Exception as e:
                await emit(f"Street View fetch failed: {str(e)[:80]}")
                images_by_heading = {}

        if images_by_heading:
            await emit(f"Analysing {len(images_by_heading)} image(s) for scour indicators…")

            # Merge results across all headings — take worst-case scour score
            best_result: dict = {}
            for heading in sorted(images_by_heading):
                img_bytes = images_by_heading[heading]
                parts = [
                    {"text": SCOUR_VISION_PROMPT},
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

                    # Emit thinking steps
                    steps = data.get("thinking_steps", [])
                    if steps:
                        print(f"\n[HydrologicalAgent] Thinking — heading {heading} for {bridge.osm_id}:")
                        for i, step in enumerate(steps, 1):
                            print(f"  [{i}] {step}")
                        if progress_callback:
                            for step in steps:
                                await progress_callback({
                                    "type": "thinking_step",
                                    "stage": "scour",
                                    "heading": str(heading),
                                    "step": step,
                                })
                    data.pop("thinking_steps", None)

                    # Keep the result with the highest scour risk score
                    if not best_result or data.get("scour_risk_score", 1.0) > best_result.get("scour_risk_score", 1.0):
                        best_result = data

                except Exception as e:
                    await emit(f"Vision analysis failed for heading {heading}: {str(e)[:80]}")

            if best_result:
                vision_result = best_result
                data_sources.append("Google Street View + Gemini Vision")
        else:
            await emit("No Street View images available for scour visual analysis.")
    else:
        await emit("Street View not available — skipping visual scour analysis.")

    # ── 4. Assemble ScourAssessment ───────────────────────────────────────────
    await emit("Assembling scour risk assessment…")

    # Merge vision fields with OSM-derived fields
    visual_indicators: list[str] = vision_result.get("visual_scour_indicators", [])
    countermeasures:   list[str] = vision_result.get("scour_countermeasures", [])

    # Derive risk score: start from vision score, bump up if HIGH flood zone
    vision_score: float = vision_result.get("scour_risk_score", 1.0)
    if flood_zone == "HIGH" and vision_score < 3.0:
        # Waterway proximity alone warrants at least a moderate score
        vision_score = max(vision_score, 2.5)
    elif flood_zone == "MEDIUM" and vision_score < 2.0:
        vision_score = max(vision_score, 2.0)
    elif not crosses_water:
        # No waterway nearby — scour risk is minimal
        vision_score = min(vision_score, 1.5)

    # Confidence: high if vision ran + waterway found, medium if only one, low if neither
    if vision_result and crosses_water:
        confidence = vision_result.get("confidence", "medium")
    elif vision_result or crosses_water:
        confidence = "medium"
    else:
        confidence = "low"

    # Field inspection scope
    if crosses_water:
        field_scope = (
            vision_result.get("field_inspection_scope")
            or "Underwater sonar survey for pier scour depth; geotechnical probe for foundation exposure"
        )
    else:
        field_scope = "Verify no hidden drainage culverts below structure; check abutment drainage."

    assessment = ScourAssessment(
        crosses_water=crosses_water,
        waterway_type=waterway_type,
        waterway_name=waterway_name,
        waterway_width_m=waterway_width,
        flood_zone=flood_zone if waterways else None,
        flood_zone_source=flood_zone_source,
        historical_flood_events=[],
        channel_gradient=None,
        estimated_flow_velocity_class=_estimate_velocity_class(waterway_type),
        upstream_catchment_km2=None,
        visual_scour_indicators=visual_indicators,
        foundation_visible=vision_result.get("foundation_visible", False),
        debris_accumulation=vision_result.get("debris_accumulation", False),
        erosion_signs=vision_result.get("erosion_signs", False),
        waterline_marks=vision_result.get("waterline_marks", False),
        scour_countermeasures=countermeasures,
        countermeasure_condition=vision_result.get("countermeasure_condition"),
        scour_risk_score=round(vision_score, 2),
        confidence=confidence,
        requires_field_inspection=crosses_water,
        field_inspection_scope=field_scope,
        data_sources=data_sources,
    )

    await emit(
        f"Scour assessment complete — risk score {assessment.scour_risk_score:.1f}/5.0 "
        f"(flood zone: {assessment.flood_zone or 'unknown'}, confidence: {assessment.confidence})"
    )
    return assessment


def _estimate_velocity_class(waterway_type: str | None) -> str | None:
    """
    Rough flow velocity class based on waterway type alone.
    Actual velocity requires DEM slope data; this is a conservative default.
    """
    mapping = {
        "river":         "moderate",
        "tidal_channel": "moderate",
        "wadi":          "torrential",   # flash-flood prone
        "stream":        "moderate",
        "brook":         "low",
        "millstream":    "moderate",
        "canal":         "low",
        "drain":         "low",
        "ditch":         "low",
    }
    if waterway_type is None:
        return None
    return mapping.get(waterway_type.lower())
