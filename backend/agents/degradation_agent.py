import json
import math
from pathlib import Path
from datetime import datetime
from services.gemini_service import text_model, json_config
from models.bridge import BridgeTarget
from models.context import BridgeContext
from models.vision import VisualAssessment
from models.degradation import DegradationAssessment

DEGRADATION_PROMPT_TEMPLATE = Path("prompts/degradation_prompt.txt").read_text()
CURRENT_YEAR = datetime.now().year

# ISO 9223/9224 atmospheric corrosion rate categories (mm/year for steel)
CORROSION_RATES = {
    "C1_very_low": 0.0013,   # rural, dry
    "C2_low": 0.025,         # rural, temperate
    "C3_medium": 0.050,      # urban, moderate
    "C4_high": 0.080,        # industrial, coastal
    "C5_very_high": 0.200,   # severe marine/industrial
    "CX_extreme": 0.700,     # offshore, chemical
}

# Apparent chloride diffusion coefficients (mm²/year) by environment class
CHLORIDE_DIFFUSION = {
    "urban_deicing": 15,
    "marine": 25,
    "rural": 5,
    "industrial": 10,
}

# Approximate freeze-thaw cycles per year by Polish region
FREEZE_THAW_CYCLES = {
    "northern": 80,   # Gdańsk, Szczecin
    "central": 100,   # Warszawa, Łódź
    "southern": 120,  # Kraków, mountain regions
    "default": 90,
}

# Baltic coast bounding box (simplified): lat 53.5–54.8, lon 14.0–19.5
_BALTIC_LAT_MIN = 53.5
_BALTIC_LAT_MAX = 54.8
_BALTIC_LON_MIN = 14.0
_BALTIC_LON_MAX = 19.5

# Silesia industrial region bounding box
_SILESIA_LAT_MIN = 50.0
_SILESIA_LAT_MAX = 50.5
_SILESIA_LON_MIN = 18.5
_SILESIA_LON_MAX = 19.5

# Road classes considered heavily de-iced in Poland
_DEICED_ROAD_CLASSES = {"motorway", "trunk", "primary"}


def _classify_environment(bridge: BridgeTarget) -> tuple[str, str, bool]:
    """
    Returns (environment_class, reasoning, de_icing_salt_exposure).

    Priority: marine > industrial > urban_deicing > rural
    """
    lat, lon = bridge.lat, bridge.lon
    reasons = []

    # Check proximity to Baltic coast (within ~50 km, approximated by bbox)
    if _BALTIC_LAT_MIN <= lat <= _BALTIC_LAT_MAX and _BALTIC_LON_MIN <= lon <= _BALTIC_LON_MAX:
        reason = (
            f"Bridge at ({lat:.3f}, {lon:.3f}) is within Baltic coastal zone "
            f"(lat {_BALTIC_LAT_MIN}–{_BALTIC_LAT_MAX}, lon {_BALTIC_LON_MIN}–{_BALTIC_LON_MAX}); "
            "classified as marine environment."
        )
        de_icing = (bridge.road_class or "").lower() in _DEICED_ROAD_CLASSES
        return "marine", reason, de_icing

    # Check Silesia industrial region
    if _SILESIA_LAT_MIN <= lat <= _SILESIA_LAT_MAX and _SILESIA_LON_MIN <= lon <= _SILESIA_LON_MAX:
        reason = (
            f"Bridge at ({lat:.3f}, {lon:.3f}) is located within the Silesia industrial region "
            f"(lat {_SILESIA_LAT_MIN}–{_SILESIA_LAT_MAX}, lon {_SILESIA_LON_MIN}–{_SILESIA_LON_MAX}); "
            "classified as industrial environment."
        )
        de_icing = (bridge.road_class or "").lower() in _DEICED_ROAD_CLASSES
        return "industrial", reason, de_icing

    # Check if on heavily salted road class
    road_class = (bridge.road_class or "").lower()
    if road_class in _DEICED_ROAD_CLASSES:
        reason = (
            f"Bridge carries road class '{road_class}' (motorway/trunk/primary); "
            "these roads receive heavy de-icing salt treatment in Poland — classified as urban_deicing."
        )
        return "urban_deicing", reason, True

    # Default: rural
    reason = (
        f"Bridge at ({lat:.3f}, {lon:.3f}) is not near the Baltic coast, not in Silesia, "
        f"and carries road class '{road_class or 'unknown'}'; classified as rural."
    )
    return "rural", reason, False


def _get_corrosion_category(environment_class: str) -> tuple[str, float]:
    """Map environment class to ISO 9223 corrosion category and rate (mm/year)."""
    mapping = {
        "marine": ("C5_very_high", CORROSION_RATES["C5_very_high"]),
        "industrial": ("C4_high", CORROSION_RATES["C4_high"]),
        "urban_deicing": ("C3_medium", CORROSION_RATES["C3_medium"]),
        "rural": ("C2_low", CORROSION_RATES["C2_low"]),
    }
    return mapping.get(environment_class, ("C2_low", CORROSION_RATES["C2_low"]))


def _estimate_chloride_depth_mm(age_years: int, environment_class: str) -> float:
    """
    Simplified Fick's 2nd Law: x = 2 * sqrt(D_app * t)
    Returns depth (mm) at which chloride concentration reaches ~50% of surface value.
    """
    d_app = CHLORIDE_DIFFUSION.get(environment_class, 10)
    return 2.0 * math.sqrt(d_app * age_years)


def _get_freeze_thaw_region(lat: float, lon: float) -> tuple[str, int]:
    """Return (region_name, cycles_per_year) based on approximate Polish geography."""
    # Southern Poland: lat < 50.5
    if lat < 50.5:
        return "southern", FREEZE_THAW_CYCLES["southern"]
    # Northern Poland: lat > 53.0
    if lat > 53.0:
        return "northern", FREEZE_THAW_CYCLES["northern"]
    # Central Poland
    return "central", FREEZE_THAW_CYCLES["central"]


def _freeze_thaw_damage_class(cycles: int, age_years: int) -> str:
    """Estimate cumulative freeze-thaw damage class."""
    total = cycles * age_years
    if total < 2000:
        return "negligible"
    if total < 6000:
        return "moderate"
    return "severe"


def _estimate_remaining_service_life(
    material: str,
    age_years: int,
    construction_year: int | None,
    environment_class: str,
    corrosion_rate: float,
) -> tuple[int | None, str]:
    """
    Returns (remaining_years, reasoning_text).

    For concrete: compare chloride penetration depth vs cover depth threshold.
    For steel: compare accumulated section loss % vs 20% capacity limit.
    """
    material_lower = (material or "unknown").lower()
    is_masonry = "masonry" in material_lower
    is_concrete = not is_masonry and any(k in material_lower for k in ("concrete", "reinforced", "pre_stressed"))
    is_steel = any(k in material_lower for k in ("steel", "iron", "metal"))

    if is_masonry:
        # Masonry does not have rebar/cover — use empirical weathering estimate
        weathering_rate_years = 150  # masonry arches typically last 100-200 years
        remaining = max(0, weathering_rate_years - age_years) if age_years else None
        reasoning = (
            f"Masonry structure — chloride/rebar corrosion models do not apply. "
            f"Empirical masonry service life ~{weathering_rate_years} years; "
            f"age {age_years} years → ~{remaining or '?'} years remaining (rough estimate)."
        )
        return remaining, reasoning

    if is_concrete:
        # Cover depth depends on construction era
        cover_depth_mm = 40.0 if (construction_year and construction_year < 1990) else 50.0
        chloride_depth = _estimate_chloride_depth_mm(age_years, environment_class)
        if chloride_depth >= cover_depth_mm:
            remaining = 0
            reasoning = (
                f"Chloride penetration ({chloride_depth:.1f} mm) already exceeds estimated cover depth "
                f"({cover_depth_mm:.0f} mm for {'pre-1990' if cover_depth_mm == 40 else 'post-1990'} construction). "
                "Reinforcement corrosion initiation likely already occurred."
            )
        else:
            # Solve for t in: cover_depth = 2 * sqrt(D_app * t) → t = (cover_depth/2)^2 / D_app
            d_app = CHLORIDE_DIFFUSION.get(environment_class, 10)
            t_threshold = (cover_depth_mm / 2.0) ** 2 / d_app
            remaining = max(0, int(t_threshold - age_years))
            reasoning = (
                f"Current chloride penetration: {chloride_depth:.1f} mm vs cover depth {cover_depth_mm:.0f} mm. "
                f"At D_app={d_app} mm²/year, threshold reached at ~{t_threshold:.0f} years — "
                f"approximately {remaining} years remaining."
            )
        return remaining, reasoning

    if is_steel:
        # Assume typical steel member thickness of 10 mm; 20% section loss = 2 mm
        section_loss_mm = corrosion_rate * age_years
        section_loss_pct = (section_loss_mm / 10.0) * 100.0
        threshold_mm = 2.0  # 20% of 10 mm reference thickness
        if section_loss_mm >= threshold_mm:
            remaining = 0
            reasoning = (
                f"Estimated section loss {section_loss_mm:.2f} mm ({section_loss_pct:.1f}%) already at or beyond "
                "20% capacity threshold. Structural intervention required."
            )
        else:
            years_to_threshold = int((threshold_mm - section_loss_mm) / corrosion_rate) if corrosion_rate > 0 else 999
            remaining = years_to_threshold
            reasoning = (
                f"Corrosion rate {corrosion_rate} mm/year × {age_years} years = {section_loss_mm:.2f} mm section loss "
                f"({section_loss_pct:.1f}% of 10 mm reference). At current rate, 20% threshold in ~{remaining} years."
            )
        return remaining, reasoning

    # Unknown material — rough heuristic from age alone
    base_life = 80  # typical design life for Polish bridges
    remaining = max(0, base_life - age_years)
    reasoning = (
        f"Material '{material}' not classified as concrete or steel; "
        f"using design life heuristic: {base_life} years total, {remaining} years remaining."
    )
    return remaining, reasoning


async def assess_degradation(
    bridge: BridgeTarget,
    context: BridgeContext,
    visual: VisualAssessment | None = None,
    progress_callback=None,
) -> DegradationAssessment:
    """
    Criterion #7: Durability / Time-Dependent Degradation.

    Combines physics-based estimates with Gemini reasoning about active
    degradation mechanisms and protective system condition.
    """
    age_years = context.age_years or (
        (CURRENT_YEAR - bridge.construction_year) if bridge.construction_year else None
    )
    material = context.material or bridge.material or "unknown"
    construction_year = context.construction_year or bridge.construction_year

    # --- Physics-based estimates ---
    environment_class, env_reasoning, de_icing = _classify_environment(bridge)
    corrosion_category, corrosion_rate = _get_corrosion_category(environment_class)

    section_loss_pct: float | None = None
    chloride_depth: float | None = None

    if age_years:
        material_lower = material.lower()
        is_steel = any(k in material_lower for k in ("steel", "iron", "metal"))
        is_masonry = "masonry" in material_lower
        is_concrete = not is_masonry and any(k in material_lower for k in ("concrete", "reinforced", "pre_stressed"))

        if is_steel:
            section_loss_pct = round((corrosion_rate * age_years / 10.0) * 100.0, 2)

        if is_concrete:
            chloride_depth = round(_estimate_chloride_depth_mm(age_years, environment_class), 1)

    ft_region, ft_cycles = _get_freeze_thaw_region(bridge.lat, bridge.lon)
    ft_damage = _freeze_thaw_damage_class(ft_cycles, age_years or 0)

    remaining_life, life_reasoning = (None, "Insufficient age data for service life estimate.")
    if age_years:
        remaining_life, life_reasoning = _estimate_remaining_service_life(
            material, age_years, construction_year, environment_class, corrosion_rate
        )

    # --- Gemini reasoning for qualitative aspects ---
    visual_summary = ""
    if visual:
        parts = [f"Overall visual score: {visual.overall_visual_score}/5.0."]
        parts.append(f"Visible defects: {visual.visible_defects_summary}.")
        if visual.corrosion:
            parts.append(
                f"Corrosion score: {visual.corrosion.score}/5 — {visual.corrosion.key_observations}."
            )
        if visual.protective_systems:
            parts.append(
                f"Protective systems score: {visual.protective_systems.score}/5 — "
                f"{visual.protective_systems.key_observations}."
            )
        if visual.section_loss:
            parts.append(
                f"Section loss score: {visual.section_loss.score}/5 — {visual.section_loss.key_observations}."
            )
        visual_summary = " ".join(parts)

    prompt = DEGRADATION_PROMPT_TEMPLATE.format(
        bridge_name=bridge.name or f"Bridge at {bridge.lat:.4f},{bridge.lon:.4f}",
        lat=bridge.lat,
        lon=bridge.lon,
        material=material,
        construction_year=construction_year or "unknown",
        age_years=age_years or "unknown",
        environment_class=environment_class,
        corrosion_category=corrosion_category,
        corrosion_rate_mm_per_year=corrosion_rate,
        estimated_section_loss_percent=section_loss_pct if section_loss_pct is not None else "N/A",
        estimated_chloride_penetration_mm=chloride_depth if chloride_depth is not None else "N/A",
        freeze_thaw_cycles_per_year=ft_cycles,
        freeze_thaw_region=ft_region,
        de_icing_salt_exposure=de_icing,
        visual_summary=visual_summary or "No visual data available.",
        service_life_reasoning=life_reasoning,
    )

    active_mechanisms: list[str] = []
    protective_type: str | None = None
    protective_effectiveness: str = "unknown"
    degradation_risk_score: float = 1.0
    confidence: str = "medium"
    data_sources: list[str] = ["ISO 9223/9224 corrosion categories", "Fick's 2nd Law (chloride ingress)", "Polish regional climate data"]

    try:
        response = text_model.generate_content(prompt, generation_config=json_config)
        data = json.loads(response.text)

        steps = data.get("thinking_steps", [])
        if steps:
            print(f"\n[DegradationAgent] Thinking — {bridge.name or bridge.osm_id}:")
            for i, step in enumerate(steps, 1):
                print(f"  [{i}] {step}")
            if progress_callback:
                for step in steps:
                    await progress_callback({
                        "type": "thinking_step",
                        "stage": "degradation",
                        "step": step,
                    })
        data.pop("thinking_steps", None)

        active_mechanisms = data.get("active_degradation_mechanisms", active_mechanisms)
        protective_type = data.get("protective_system_type", protective_type)
        protective_effectiveness = data.get("protective_system_effectiveness", protective_effectiveness)
        degradation_risk_score = float(data.get("degradation_risk_score", degradation_risk_score))
        confidence = data.get("confidence", confidence)
        extra_sources = data.get("data_sources", [])
        if extra_sources:
            data_sources = list(dict.fromkeys(data_sources + extra_sources))

        # Allow Gemini to override service life reasoning if it has more detail
        if data.get("service_life_reasoning"):
            life_reasoning = data["service_life_reasoning"]
        if data.get("estimated_remaining_service_life_years") is not None:
            remaining_life = int(data["estimated_remaining_service_life_years"])

    except Exception as e:
        print(f"[DegradationAgent] Gemini error for bridge {bridge.osm_id}: {e}")
        # Fall back to physics-only result
        active_mechanisms = _infer_mechanisms_from_physics(
            material, environment_class, de_icing, ft_damage, section_loss_pct, chloride_depth
        )
        confidence = "low"

    return DegradationAssessment(
        environment_class=environment_class,
        environment_reasoning=env_reasoning,
        distance_to_coast_km=None,  # bbox approximation used; exact distance not computed
        de_icing_salt_exposure=de_icing,
        corrosion_rate_mm_per_year=corrosion_rate,
        estimated_section_loss_percent=section_loss_pct,
        corrosion_category=corrosion_category,
        estimated_chloride_penetration_mm=chloride_depth,
        estimated_carbonation_depth_mm=None,  # not modeled in this version
        freeze_thaw_cycles_per_year=ft_cycles,
        freeze_thaw_damage_class=ft_damage,
        protective_system_type=protective_type,
        protective_system_effectiveness=protective_effectiveness,
        active_degradation_mechanisms=active_mechanisms,
        estimated_remaining_service_life_years=remaining_life,
        service_life_reasoning=life_reasoning,
        degradation_risk_score=max(1.0, min(5.0, degradation_risk_score)),
        confidence=confidence,
        data_sources=data_sources,
    )


def _infer_mechanisms_from_physics(
    material: str,
    environment_class: str,
    de_icing: bool,
    ft_damage: str,
    section_loss_pct: float | None,
    chloride_depth: float | None,
) -> list[str]:
    """Fallback: infer active mechanisms from physics results without Gemini."""
    mechanisms = []
    material_lower = (material or "").lower()

    if "steel" in material_lower or "iron" in material_lower:
        if environment_class in ("marine", "industrial"):
            mechanisms.append("atmospheric corrosion (severe)")
        else:
            mechanisms.append("atmospheric corrosion (moderate)")
        if de_icing:
            mechanisms.append("chloride-induced accelerated corrosion")
        if section_loss_pct and section_loss_pct > 10:
            mechanisms.append("significant section loss")

    if any(k in material_lower for k in ("concrete", "reinforced", "pre_stressed")):
        if chloride_depth and chloride_depth > 30:
            mechanisms.append("chloride-induced reinforcement corrosion")
        if de_icing:
            mechanisms.append("de-icing salt chloride ingress")

    if ft_damage in ("moderate", "severe"):
        mechanisms.append(f"freeze-thaw damage ({ft_damage})")

    return mechanisms or ["general aging"]
