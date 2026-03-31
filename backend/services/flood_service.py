"""
flood_service.py — Waterway proximity queries and flood zone classification.

Uses OSM Overpass to find waterways near a bridge and classifies flood risk
based on waterway type, width, and proximity.
"""
import asyncio
import httpx

OVERPASS_ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
    "https://overpass.openstreetmap.fr/api/interpreter",
    "https://overpass.openstreetmap.ru/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
]

REQUEST_HEADERS = {
    "User-Agent": "DeepInspect/1.0 (bridge risk assessment; research tool)",
    "Accept": "application/json",
}

# Waterway types mapped to base flood risk level.
# Key: OSM waterway tag value, Value: (base_risk, typical_width_m)
_WATERWAY_RISK = {
    "river":        ("HIGH",   50.0),
    "stream":       ("MEDIUM", 5.0),
    "canal":        ("LOW",    15.0),
    "drain":        ("LOW",    2.0),
    "ditch":        ("LOW",    1.0),
    "tidal_channel":("HIGH",   30.0),
    "wadi":         ("HIGH",   20.0),
    "millstream":   ("MEDIUM", 4.0),
    "brook":        ("MEDIUM", 3.0),
}

# Distance thresholds (metres) that upgrade risk level for "river" / "stream"
_PROXIMITY_UPGRADE_RIVER_M  = 100   # within 100 m → HIGH (already HIGH, no change)
_PROXIMITY_UPGRADE_STREAM_M = 250   # within 250 m → MEDIUM → HIGH upgrade


def _waterway_query(lat: float, lon: float, radius_m: int) -> str:
    return f"""[out:json][timeout:15];
(
  way["waterway"](around:{radius_m},{lat},{lon});
  relation["waterway"](around:{radius_m},{lat},{lon});
);
out body;
"""


async def check_waterway_proximity(
    lat: float,
    lon: float,
    radius_m: int = 500,
) -> list[dict]:
    """
    Query OSM Overpass for waterways within *radius_m* metres of (lat, lon).

    Returns a list of dicts, each containing:
      - osm_id (str)
      - waterway_type (str | None)
      - name (str | None)
      - width_m (float | None)   — from OSM width tag if present
      - distance_m (float | None) — not available from Overpass, set to None
    """
    query = _waterway_query(lat, lon, radius_m)

    async with httpx.AsyncClient(headers=REQUEST_HEADERS) as client:
        for url in OVERPASS_ENDPOINTS:
            try:
                resp = await client.post(url, data={"data": query}, timeout=20.0)
                resp.raise_for_status()
                elements = resp.json().get("elements", [])
                results = []
                for el in elements:
                    tags = el.get("tags", {})
                    wtype = tags.get("waterway")
                    name  = tags.get("name") or tags.get("name:en")
                    # OSM width tag is a string like "12" or "12 m"
                    raw_width = tags.get("width") or tags.get("est_width")
                    width_m: float | None = None
                    if raw_width:
                        try:
                            width_m = float(str(raw_width).split()[0])
                        except (ValueError, IndexError):
                            pass
                    results.append({
                        "osm_id":        str(el["id"]),
                        "waterway_type": wtype,
                        "name":          name,
                        "width_m":       width_m,
                        "distance_m":    None,  # Overpass around: gives proximity but not exact distance
                    })
                return results
            except Exception as e:
                short = str(e).split("\n")[0][:80]
                print(f"[FloodService] Overpass {url.split('/')[2]}: {short}")
                await asyncio.sleep(0.5)

    # All mirrors failed — return empty list rather than raising, so the
    # HydrologicalAgent can degrade gracefully.
    print("[FloodService] All Overpass mirrors failed for waterway query.")
    return []


def classify_flood_risk(
    waterways: list[dict],
    bridge_elevation: float | None = None,
) -> str:
    """
    Classify flood zone risk from a list of nearby waterways.

    Returns one of: "HIGH", "MEDIUM", "LOW", "UNKNOWN".

    Logic:
      - Any river within 100 m → HIGH
      - Any river within 500 m → HIGH
      - Any stream within 250 m → HIGH (upgraded from MEDIUM due to proximity)
      - Any stream beyond 250 m → MEDIUM
      - canal / drain / ditch → LOW
      - No waterways found → UNKNOWN
    """
    if not waterways:
        return "UNKNOWN"

    highest = "LOW"

    for w in waterways:
        wtype = (w.get("waterway_type") or "").lower()
        distance = w.get("distance_m")  # may be None

        base_risk, _ = _WATERWAY_RISK.get(wtype, ("LOW", 2.0))

        # Proximity upgrade for streams: if we can't determine exact distance
        # we treat proximity conservatively (Overpass already filtered to radius).
        if wtype == "stream":
            # distance_m is None because Overpass doesn't return it; assume within
            # radius which is <= 500 m, so apply MEDIUM → HIGH if within 250 m
            # We can't distinguish, so conservatively upgrade stream → HIGH
            effective_risk = "HIGH"
        elif wtype in ("river", "tidal_channel", "wadi"):
            effective_risk = "HIGH"
        else:
            effective_risk = base_risk

        # Merge upward
        if effective_risk == "HIGH":
            highest = "HIGH"
            break  # can't go higher
        elif effective_risk == "MEDIUM" and highest == "LOW":
            highest = "MEDIUM"

    return highest
