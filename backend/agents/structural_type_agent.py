import base64
import json
from datetime import datetime
from pathlib import Path

from services.gemini_service import vision_model, text_model, json_config
from services.streetview_service import fetch_bridge_images
from models.bridge import BridgeTarget
from models.vision import VisualAssessment
from models.context import BridgeContext
from models.structural_type import StructuralTypeAssessment
from config import settings

STRUCTURAL_TYPE_PROMPT = Path("prompts/structural_type_prompt.txt").read_text()
CURRENT_YEAR = datetime.now().year

# ---------------------------------------------------------------------------
# Redundancy lookup: structure_key -> (redundancy_class, fracture_critical)
# Based on AASHTO / FHWA fracture-critical and redundancy guidance.
# ---------------------------------------------------------------------------
REDUNDANCY_TABLE: dict[str, tuple[str, bool]] = {
    "multi_girder":  ("HIGH",   False),   # >=4 girders — load redistribution available
    "two_girder":    ("LOW",    True),    # NSTM — failure of one girder = collapse
    "single_box":    ("LOW",    True),    # NSTM — single load path
    "box_girder":    ("MEDIUM", False),   # twin boxes provide some redundancy
    "slab":          ("HIGH",   False),   # highly statically indeterminate
    "arch_deck":     ("HIGH",   False),   # arch + deck act together
    "arch_through":  ("MEDIUM", False),   # hangers can redistribute to some extent
    "truss":         ("MEDIUM", True),    # floor beams often NSTM
    "cable_stayed":  ("MEDIUM", False),   # depends on cable count; multi-cable = redundant
    "suspension":    ("LOW",    True),    # main cables are NSTM
    "culvert":       ("HIGH",   False),   # buried structure — inherently redundant
    "unknown":       ("MEDIUM", False),  # unknown = assume MEDIUM, not HIGH (avoid false reassurance)
}

# Map vision-model girder_config → REDUNDANCY_TABLE key
GIRDER_TO_REDUNDANCY_KEY: dict[str, str] = {
    "multi_girder":  "multi_girder",
    "two_girder":    "two_girder",
    "box_girder":    "box_girder",
    "slab_on_beam":  "multi_girder",  # closely spaced beams → high redundancy
    "unknown":       "unknown",       # unknown = unknown, not assumed safe
}

# Map vision structure_system → REDUNDANCY_TABLE key (fallback when no girder info)
SYSTEM_TO_REDUNDANCY_KEY: dict[str, str] = {
    "beam":          "multi_girder",  # assume multi until proven otherwise
    "truss":         "truss",
    "arch":          "arch_deck",
    "cable_stayed":  "cable_stayed",
    "suspension":    "suspension",
    "slab":          "slab",
    "culvert":       "culvert",
    "unknown":       "unknown",       # unknown = unknown, not assumed safe
}


def _derive_redundancy_key(structure_system: str, girder_config: str | None) -> str:
    """Resolve the best REDUNDANCY_TABLE key from structure + girder info."""
    if structure_system == "beam" and girder_config and girder_config != "unknown":
        return GIRDER_TO_REDUNDANCY_KEY.get(girder_config, "unknown")
    return SYSTEM_TO_REDUNDANCY_KEY.get(structure_system, "unknown")


def _nstm_elements_for(structure_system: str, girder_config: str | None) -> list[str]:
    """Return a list of named non-redundant steel tension members if applicable."""
    elements = []
    if structure_system == "suspension":
        elements.append("main suspension cables")
    if structure_system == "truss":
        elements.append("primary truss tension chords")
        elements.append("floor beams (if steel)")
    if girder_config == "two_girder":
        elements.append("primary plate girders (2-girder — NSTM)")
    if girder_config == "box_girder" and structure_system == "beam":
        elements.append("single box girder flanges and webs")
    return elements


def _estimate_capacity_class(
    bridge: BridgeTarget,
    structure_system: str,
    material: str,
    span_count: int | None,
) -> tuple[str, str]:
    """
    Estimate capacity class as 'light', 'standard', or 'heavy' from heuristics.

    Returns (capacity_class, reasoning).

    LIMITATION: This is a CLASS estimate only, NOT a load rating factor.
    Precise load rating (AASHTO LRFR) requires structural drawings.
    """
    # If OSM has a posted weight limit, use it as the primary signal.
    if bridge.max_weight_tons:
        wt = bridge.max_weight_tons
        if wt > 44:
            return "heavy", f"OSM maxweight={wt}t exceeds 44t threshold."
        if wt >= 20:
            return "standard", f"OSM maxweight={wt}t within standard 20-44t band."
        return "light", f"OSM maxweight={wt}t below 20t — posted light limit."

    year = bridge.construction_year
    road_class = (bridge.road_class or "").lower()
    mat = material.lower()

    # Road class signals
    is_motorway = any(k in road_class for k in ("motorway", "trunk", "primary"))
    is_minor = any(k in road_class for k in ("track", "path", "service", "footway", "cycleway"))

    # Material signals
    is_timber = "timber" in mat
    is_masonry = "masonry" in mat

    # Age signals
    is_old = year is not None and year < 1960
    is_modern = year is not None and year >= 1990

    # Light: timber, very old, minor roads, narrow masonry
    if is_timber:
        return "light", "Timber construction — estimated light capacity (<20t)."
    if is_minor:
        return "light", f"Minor road class ({road_class}) — estimated light capacity (<20t)."
    if is_old and is_masonry:
        return "light", "Old masonry bridge (pre-1960) — estimated light capacity (<20t)."

    # Heavy: motorway, modern concrete/steel, multi-span
    if is_motorway and is_modern and not is_masonry:
        return "heavy", (
            f"Motorway/trunk road, modern ({year}), "
            f"material={material} — estimated heavy capacity (>44t)."
        )
    if is_motorway and not is_masonry:
        return "heavy", f"Motorway/trunk road ({road_class}) — estimated heavy capacity (>44t)."

    # Standard: everything else
    reason_parts = []
    if road_class:
        reason_parts.append(f"road_class={road_class}")
    if year:
        reason_parts.append(f"year={year}")
    if material:
        reason_parts.append(f"material={material}")
    reason = ", ".join(reason_parts) if reason_parts else "insufficient data for finer estimate"
    return "standard", f"Standard capacity estimate (20-44t) based on: {reason}."


def _capacity_vs_demand(
    capacity_class: str,
    bridge: BridgeTarget,
) -> tuple[str, str]:
    """
    Flag capacity vs. demand using road class as a proxy for traffic loading.
    Returns (flag, reasoning).
    """
    road_class = (bridge.road_class or "").lower()
    is_heavy_demand = any(k in road_class for k in ("motorway", "trunk", "primary"))
    is_light_demand = any(k in road_class for k in ("track", "path", "service", "footway", "cycleway", "residential"))

    if capacity_class == "heavy":
        return "adequate", "Heavy capacity bridge on high-demand road — capacity adequate."
    if capacity_class == "light" and is_heavy_demand:
        return "insufficient", (
            "Light capacity bridge on high-traffic road — likely insufficient for current demand."
        )
    if capacity_class == "standard" and is_heavy_demand:
        return "marginal", "Standard capacity bridge on high-demand road — may be marginal under HGV loading."
    if capacity_class == "light" and is_light_demand:
        return "adequate", "Light capacity bridge on low-demand road — adequate for expected use."
    return "adequate", "Capacity appears adequate for the estimated road class demand."


async def assess_structural_type(
    bridge: BridgeTarget,
    visual_assessment: VisualAssessment | None = None,
    context: BridgeContext | None = None,
    progress_callback=None,
) -> StructuralTypeAssessment:
    """
    Classify structural type from Street View imagery + OSM metadata, then
    derive redundancy class, capacity class, and stability concerns.

    Covers criteria #2 (Redundancy), #3 (Capacity), #6 (Stability).
    """

    async def _emit(step: str) -> None:
        if progress_callback:
            await progress_callback({
                "type": "thinking_step",
                "stage": "structural",
                "step": step,
            })

    # -----------------------------------------------------------------------
    # 1. Vision classification (Street View images)
    # -----------------------------------------------------------------------
    vision_data: dict = {}
    data_sources: list[str] = []

    if bridge.street_view_available:
        images_by_heading = await fetch_bridge_images(
            bridge.lat, bridge.lon, settings.GOOGLE_MAPS_API_KEY, bridge.osm_id
        )
        if images_by_heading:
            # Use the first available heading for structure classification.
            # Multiple headings mostly duplicate the structural information.
            heading = sorted(images_by_heading.keys())[0]
            img_bytes = images_by_heading[heading]
            parts = [
                {"text": STRUCTURAL_TYPE_PROMPT},
                {
                    "inline_data": {
                        "mime_type": "image/jpeg",
                        "data": base64.b64encode(img_bytes).decode("utf-8"),
                    }
                },
            ]
            try:
                response = vision_model.generate_content(parts, generation_config=json_config)
                vision_data = json.loads(response.text)
                data_sources.append("street_view_vision")

                steps = vision_data.get("thinking_steps", [])
                if steps:
                    print(f"\n[StructuralTypeAgent] Thinking — {bridge.osm_id}:")
                    for i, step in enumerate(steps, 1):
                        print(f"  [{i}] {step}")
                    for step in steps:
                        await _emit(step)
                vision_data.pop("thinking_steps", None)
            except Exception as exc:
                print(f"[StructuralTypeAgent] Vision error for {bridge.osm_id}: {exc}")

    # -----------------------------------------------------------------------
    # 2. OSM metadata as secondary evidence
    # -----------------------------------------------------------------------
    osm_structure = None
    osm_material = bridge.material
    if bridge.waterway_tags:
        osm_structure = bridge.waterway_tags.get("bridge:structure")

    if osm_structure:
        data_sources.append("osm_bridge_structure_tag")
    if osm_material:
        data_sources.append("osm_material_tag")

    # -----------------------------------------------------------------------
    # 3. Resolve final structure classification (vision wins; OSM fills gaps)
    # -----------------------------------------------------------------------
    structure_system: str = vision_data.get("structure_system") or "unknown"
    girder_config: str | None = vision_data.get("girder_config")
    material: str = vision_data.get("material") or osm_material or "unknown"
    span_arrangement: str = vision_data.get("span_arrangement") or "unknown"
    span_count: int | None = vision_data.get("span_count")
    estimated_span_length_m: float | None = vision_data.get("estimated_span_length_m")
    deck_type: str | None = vision_data.get("deck_type")
    confidence: str = vision_data.get("structure_system_confidence") or "low"
    stability_concerns: list[str] = vision_data.get("stability_concerns") or []
    settlement_indicators: list[str] = vision_data.get("settlement_indicators") or []

    # Override structure_system with OSM tag when vision is uncertain
    if structure_system == "unknown" and osm_structure:
        osm_map = {
            "beam": "beam",
            "girder": "beam",
            "box_girder": "beam",
            "truss": "truss",
            "arch": "arch",
            "suspension": "suspension",
            "cable_stayed": "cable_stayed",
            "slab": "slab",
            "culvert": "culvert",
        }
        structure_system = osm_map.get(osm_structure.lower(), "unknown")
        if structure_system != "unknown":
            confidence = "low"  # OSM tags are often incomplete

    # -----------------------------------------------------------------------
    # 4. Redundancy classification
    # -----------------------------------------------------------------------
    redundancy_key = _derive_redundancy_key(structure_system, girder_config)
    redundancy_class, fracture_critical = REDUNDANCY_TABLE.get(
        redundancy_key, ("unknown", False)
    )
    nstm_elements = _nstm_elements_for(structure_system, girder_config)

    redundancy_reasoning = (
        f"Structure classified as '{structure_system}' "
        f"(girder_config='{girder_config or 'N/A'}', redundancy_key='{redundancy_key}'). "
        f"Redundancy table: {redundancy_class}. "
        f"{'Fracture-critical members present.' if fracture_critical else 'No fracture-critical members identified.'}"
    )

    # -----------------------------------------------------------------------
    # 5. Capacity class estimation
    # -----------------------------------------------------------------------
    capacity_class, capacity_reasoning = _estimate_capacity_class(
        bridge, structure_system, material, span_count
    )
    capacity_demand_flag, demand_reasoning = _capacity_vs_demand(capacity_class, bridge)
    full_capacity_reasoning = f"{capacity_reasoning} {demand_reasoning}"

    # -----------------------------------------------------------------------
    # 6. Requires load rating flag
    # -----------------------------------------------------------------------
    requires_load_rating = (
        redundancy_class == "LOW"
        or capacity_demand_flag in ("marginal", "insufficient")
        or fracture_critical
    )

    # -----------------------------------------------------------------------
    # 7. Populate sub-assessment from visual_assessment (if provided)
    # -----------------------------------------------------------------------
    # Pull stability concerns from the VisualAssessment structural_deformation
    # score to add richer stability signals.
    if visual_assessment and visual_assessment.structural_deformation:
        deform = visual_assessment.structural_deformation
        if deform.score >= 3 and "structural_deformation" not in stability_concerns:
            stability_concerns.append(
                f"structural_deformation_score_{deform.score} — {deform.key_observations}"
            )

    if not data_sources:
        data_sources.append("osm_metadata_only")

    return StructuralTypeAssessment(
        structure_type=structure_system,
        structure_type_confidence=confidence,
        girder_type=girder_config,
        span_count=span_count,
        estimated_span_length_m=estimated_span_length_m,
        deck_type=deck_type,
        redundancy_class=redundancy_class,
        fracture_critical=fracture_critical,
        nstm_elements=nstm_elements,
        redundancy_reasoning=redundancy_reasoning,
        estimated_capacity_class=capacity_class,
        posted_weight_limit_tons=bridge.max_weight_tons,
        estimated_lane_count=None,
        capacity_vs_demand_flag=capacity_demand_flag,
        capacity_reasoning=full_capacity_reasoning,
        stability_concerns=stability_concerns,
        settlement_indicators=settlement_indicators,
        requires_load_rating=requires_load_rating,
        data_sources=data_sources,
    )
