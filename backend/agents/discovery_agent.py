import asyncio
from services.overpass_service import get_bridges_in_bbox
from services.maps_service import bbox_from_city
from services.streetview_service import check_streetview_coverage
from models.bridge import BridgeTarget, BboxRequest
from config import settings
from typing import Optional


async def run_discovery(
    query: str,
    query_type: str,
    bbox: Optional[BboxRequest] = None,
) -> list[BridgeTarget]:
    raw = []

    if query_type == "bbox" and bbox:
        # Direct viewport scan — skip geocoding entirely
        print(f"[Discovery] Viewport scan: {bbox.sw_lat:.4f},{bbox.sw_lon:.4f} → {bbox.ne_lat:.4f},{bbox.ne_lon:.4f}")
        raw = await get_bridges_in_bbox(bbox.sw_lat, bbox.sw_lon, bbox.ne_lat, bbox.ne_lon)

    elif query_type == "city_scan":
        bounds = await bbox_from_city(query, settings.GOOGLE_MAPS_API_KEY)
        sw = bounds["southwest"]
        ne = bounds["northeast"]
        print(f"[Discovery] City scan '{query}': bbox {sw} → {ne}")
        raw = await get_bridges_in_bbox(sw["lat"], sw["lng"], ne["lat"], ne["lng"])

    elif query_type == "coordinate_query":
        lat, lon = map(float, query.strip().split(","))
        delta = 0.02
        raw = await get_bridges_in_bbox(lat - delta, lon - delta, lat + delta, lon + delta)

    elif query_type == "bridge_lookup":
        bounds = await bbox_from_city(query, settings.GOOGLE_MAPS_API_KEY)
        sw = bounds["southwest"]
        ne = bounds["northeast"]
        raw = await get_bridges_in_bbox(sw["lat"], sw["lng"], ne["lat"], ne["lng"])
        named = [b for b in raw if b.get("name") and query.lower() in b["name"].lower()]
        raw = named if named else raw[:1]

    print(f"[Discovery] Overpass returned {len(raw)} raw bridges")

    targets = []
    for b in raw:
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

        targets.append(BridgeTarget(
            osm_id=b["osm_id"],
            name=b.get("name"),
            lat=b["lat"],
            lon=b["lon"],
            construction_year=year,
            material=b.get("material"),
            road_class=b.get("road_class"),
            max_weight_tons=weight,
        ))

    # Check Street View coverage concurrently (metadata only — free, no billing)
    sem = asyncio.Semaphore(10)

    async def check_one(t: BridgeTarget) -> BridgeTarget:
        async with sem:
            t.street_view_available = await check_streetview_coverage(
                t.lat, t.lon, settings.GOOGLE_MAPS_API_KEY
            )
        return t

    targets = list(await asyncio.gather(*[check_one(t) for t in targets]))
    print(f"[Discovery] {sum(t.street_view_available for t in targets)}/{len(targets)} bridges have Street View")
    return targets
