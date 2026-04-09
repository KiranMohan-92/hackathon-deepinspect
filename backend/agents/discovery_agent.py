import math

from services.overpass_service import get_bridges_in_bbox
from services.maps_service import bbox_from_city
from services.logging_service import get_logger
from models.bridge import BridgeSummary, BridgeTarget, BboxRequest
from config import settings
from typing import Optional
from datetime import datetime

log = get_logger(__name__)

# Two bridges closer than this (metres) are treated as the same physical structure.
# 75 m covers dual-carriageway motorway bridges whose way-centres sit 40–70 m apart.
PROXIMITY_THRESHOLD_M = 75

CURRENT_YEAR = datetime.now().year

# Road importance weights (higher = inspect sooner)
ROAD_PRIORITY = {
    "motorway": 5.0,
    "motorway_link": 4.5,
    "trunk": 4.5,
    "trunk_link": 4.0,
    "primary": 4.0,
    "primary_link": 3.5,
    "secondary": 3.0,
    "secondary_link": 2.5,
    "tertiary": 2.0,
    "tertiary_link": 1.5,
    "unclassified": 1.0,
    "residential": 0.8,
}


def _compute_priority(road_class: Optional[str], name: Optional[str], year: Optional[int]) -> float:
    score = ROAD_PRIORITY.get(road_class or "", 1.0)
    if name:
        score += 0.5  # named bridges tend to be significant infrastructure
    if year:
        age = CURRENT_YEAR - year
        if age > 60:
            score += 1.0
        elif age > 40:
            score += 0.5
    return round(score, 2)


def _parse_raw(raw: list[dict]) -> list[BridgeSummary]:
    seen_ids = set()
    summaries = []
    for b in raw:
        oid = b["osm_id"]
        if oid in seen_ids:
            continue
        seen_ids.add(oid)

        year = None
        if b.get("start_date"):
            try:
                year = int(str(b["start_date"])[:4])
            except (ValueError, TypeError):
                pass

        weight = None
        if b.get("maxweight"):
            try:
                weight = float(str(b["maxweight"]).replace("t", "").strip())
            except (ValueError, TypeError):
                pass

        road_class = b.get("road_class")
        name = b.get("name")

        summaries.append(BridgeSummary(
            osm_id=oid,
            name=name,
            lat=b["lat"],
            lon=b["lon"],
            road_class=road_class,
            construction_year=year,
            material=b.get("material"),
            max_weight_tons=weight,
            priority_score=_compute_priority(road_class, name, year),
        ))

    # Sort by priority descending so we always keep the highest-priority representative
    summaries.sort(key=lambda s: s.priority_score, reverse=True)

    # Pass 1 — proximity dedup first: catches parallel spans / dual carriageways.
    # Doing this before name dedup prevents distinct bridges sharing a common name
    # (e.g. "Railway Bridge") from being silently merged when they are far apart.
    proximity_deduped: list[BridgeSummary] = []
    for candidate in summaries:
        too_close = False
        for kept in proximity_deduped:
            dlat = math.radians(candidate.lat - kept.lat)
            dlon = math.radians(candidate.lon - kept.lon)
            a = (math.sin(dlat / 2) ** 2
                 + math.cos(math.radians(kept.lat))
                 * math.cos(math.radians(candidate.lat))
                 * math.sin(dlon / 2) ** 2)
            dist_m = 6_371_000 * 2 * math.asin(math.sqrt(a))
            if dist_m < PROXIMITY_THRESHOLD_M:
                too_close = True
                break
        if not too_close:
            proximity_deduped.append(candidate)

    # Pass 2 — name dedup only within tight proximity (< 200 m).
    # Same-named bridges that survived the spatial pass are only merged if they
    # are genuinely close — this handles OSM ways that model the same structure
    # from different directions without removing distant same-named bridges.
    NAME_PROXIMITY_M = 200
    seen_names: set[str] = set()
    deduped: list[BridgeSummary] = []
    for candidate in proximity_deduped:
        key = candidate.name.strip().lower() if candidate.name else None
        if key and key in seen_names:
            # Only skip if there is already a kept bridge with the same name
            # within NAME_PROXIMITY_M — otherwise allow it through.
            close_namesake = False
            for kept in deduped:
                if (kept.name or "").strip().lower() != key:
                    continue
                dlat = math.radians(candidate.lat - kept.lat)
                dlon = math.radians(candidate.lon - kept.lon)
                a = (math.sin(dlat / 2) ** 2
                     + math.cos(math.radians(kept.lat))
                     * math.cos(math.radians(candidate.lat))
                     * math.sin(dlon / 2) ** 2)
                dist_m = 6_371_000 * 2 * math.asin(math.sqrt(a))
                if dist_m < NAME_PROXIMITY_M:
                    close_namesake = True
                    break
            if close_namesake:
                continue
        if key:
            seen_names.add(key)
        deduped.append(candidate)

    return deduped


async def run_discovery(
    query: str,
    query_type: str,
    bbox: Optional[BboxRequest] = None,
    on_progress=None,
) -> list[BridgeSummary]:
    async def emit(step: str, status: str, message: str):
        log.info("discovery", step=step, status=status, message=message)
        if on_progress:
            await on_progress({"step": step, "status": status, "message": message})

    raw = []

    if query_type == "bbox" and bbox:
        await emit("info", "info", f"Viewport scan: {bbox.sw_lat:.4f},{bbox.sw_lon:.4f} → {bbox.ne_lat:.4f},{bbox.ne_lon:.4f}")
        raw = await get_bridges_in_bbox(bbox.sw_lat, bbox.sw_lon, bbox.ne_lat, bbox.ne_lon, on_progress=on_progress)

    elif query_type == "city_scan":
        await emit("geocoding", "trying", f"Geocoding '{query}'…")
        bounds = await bbox_from_city(query, settings.GOOGLE_MAPS_API_KEY)
        sw = bounds["southwest"]
        ne = bounds["northeast"]
        await emit("geocoding", "ok", f"Bounds: {sw['lat']:.3f}°N {sw['lng']:.3f}°E → {ne['lat']:.3f}°N {ne['lng']:.3f}°E")
        raw = await get_bridges_in_bbox(sw["lat"], sw["lng"], ne["lat"], ne["lng"], on_progress=on_progress)

    elif query_type == "coordinate_query":
        lat, lon = map(float, query.strip().split(","))
        delta = 0.02
        await emit("info", "info", f"Scanning ±0.02° around {lat:.4f},{lon:.4f}")
        raw = await get_bridges_in_bbox(lat - delta, lon - delta, lat + delta, lon + delta, on_progress=on_progress)

    elif query_type == "bridge_lookup":
        await emit("geocoding", "trying", f"Geocoding '{query}'…")
        bounds = await bbox_from_city(query, settings.GOOGLE_MAPS_API_KEY)
        sw = bounds["southwest"]
        ne = bounds["northeast"]
        raw = await get_bridges_in_bbox(sw["lat"], sw["lng"], ne["lat"], ne["lng"], on_progress=on_progress)
        named = [b for b in raw if b.get("name") and query.lower() in b["name"].lower()]
        raw = named if named else raw[:5]

    raw_count = len(raw)
    summaries = _parse_raw(raw)
    await emit("dedup", "ok", f"Deduplication: {raw_count} raw → {len(summaries)} unique bridges")
    return summaries


def summary_to_target(summary: BridgeSummary) -> BridgeTarget:
    """Convert a BridgeSummary back to a BridgeTarget for the analysis pipeline."""
    return BridgeTarget(
        osm_id=summary.osm_id,
        name=summary.name,
        lat=summary.lat,
        lon=summary.lon,
        construction_year=summary.construction_year,
        material=summary.material,
        road_class=summary.road_class,
        max_weight_tons=summary.max_weight_tons,
        street_view_available=True,
    )
