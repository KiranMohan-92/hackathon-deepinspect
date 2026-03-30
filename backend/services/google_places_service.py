"""
Google Places API fallback for bridge discovery.

Used only when all Overpass/OSM mirrors are unavailable.
Limitations vs OSM:
  - Returns only named, notable bridges (not all infrastructure)
  - No road_class, material, construction_year, or maxweight data
  - Max ~60 results per bbox (3 pages × 20)
"""
import asyncio
import math
import httpx

PLACES_NEARBY_URL = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
# Places API enforces a maximum radius of 50 km
MAX_RADIUS_M = 50_000
# Seconds to wait between paginated requests (Places API requirement)
PAGE_DELAY_S = 2.0


def _bbox_to_circle(
    sw_lat: float, sw_lon: float, ne_lat: float, ne_lon: float
) -> tuple[float, float, int]:
    """Return (center_lat, center_lon, radius_metres) enclosing the bbox."""
    center_lat = (sw_lat + ne_lat) / 2
    center_lon = (sw_lon + ne_lon) / 2
    # Haversine half-diagonal
    dlat = math.radians(ne_lat - sw_lat)
    dlon = math.radians(ne_lon - sw_lon)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(sw_lat))
        * math.cos(math.radians(ne_lat))
        * math.sin(dlon / 2) ** 2
    )
    half_diag_m = int(6_371_000 * math.asin(math.sqrt(a)))
    radius_m = min(half_diag_m, MAX_RADIUS_M)
    return center_lat, center_lon, radius_m


def _parse_place(place: dict) -> dict:
    loc = place["geometry"]["location"]
    return {
        "osm_id": f"gpl_{place['place_id']}",   # prefix avoids ID collisions with OSM
        "lat": loc["lat"],
        "lon": loc["lng"],
        "name": place.get("name"),
        "start_date": None,
        "material": None,
        "maxweight": None,
        "road_class": None,          # not available from Places API
    }


async def find_bridges_google(
    sw_lat: float, sw_lon: float, ne_lat: float, ne_lon: float, api_key: str,
    on_progress=None,
) -> list[dict]:
    """
    Search Google Places for bridges inside the bbox.
    Fetches up to 3 pages (60 results).
    """
    async def emit(status: str, message: str):
        print(f"[GooglePlaces] {message}")
        if on_progress:
            await on_progress({"step": "google", "status": status, "message": message})

    center_lat, center_lon, radius_m = _bbox_to_circle(sw_lat, sw_lon, ne_lat, ne_lon)
    await emit("trying", f"Searching near {center_lat:.4f},{center_lon:.4f} radius={radius_m}m…")

    results: list[dict] = []
    params = {
        "location": f"{center_lat},{center_lon}",
        "radius": radius_m,
        "keyword": "bridge",
        "key": api_key,
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        for page in range(3):
            resp = await client.get(PLACES_NEARBY_URL, params=params)
            resp.raise_for_status()
            data = resp.json()

            status = data.get("status")
            if status not in ("OK", "ZERO_RESULTS"):
                print(f"[GooglePlaces] Unexpected status: {status}")
                break

            for place in data.get("results", []):
                parsed = _parse_place(place)
                # Keep only places whose centre falls inside the original bbox
                if sw_lat <= parsed["lat"] <= ne_lat and sw_lon <= parsed["lon"] <= ne_lon:
                    results.append(parsed)

            next_token = data.get("next_page_token")
            if not next_token:
                break
            # Must wait before using next_page_token (Google requirement)
            await asyncio.sleep(PAGE_DELAY_S)
            params = {"pagetoken": next_token, "key": api_key}

    await emit("ok", f"Google Places — {len(results)} bridges found (limited metadata)")
    return results
