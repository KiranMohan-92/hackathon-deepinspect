import asyncio
import httpx
from config import settings
from services.google_places_service import find_bridges_google

# Public Overpass API mirrors — tried in order until one succeeds.
# openstreetmap.fr and maps.mail.ru require a proper User-Agent (return 403 otherwise).
OVERPASS_ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
    "https://overpass.openstreetmap.fr/api/interpreter",
    "https://overpass.openstreetmap.ru/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
]

# Many Overpass mirrors block requests that don't identify themselves.
REQUEST_HEADERS = {
    "User-Agent": "DeepInspect/1.0 (bridge risk assessment; research tool)",
    "Accept": "application/json",
}

MOTOR_HIGHWAY_TYPES = (
    "motorway|motorway_link|trunk|trunk_link|primary|primary_link"
    "|secondary|secondary_link|tertiary|tertiary_link|unclassified|residential"
)


def _build_query(sw_lat: float, sw_lon: float, ne_lat: float, ne_lon: float) -> str:
    bbox = f"{sw_lat},{sw_lon},{ne_lat},{ne_lon}"
    return f"""
[out:json][timeout:30];
(
  way["bridge"="yes"]["highway"~"^({MOTOR_HIGHWAY_TYPES})$"]({bbox});
);
out center tags;
"""


def _mirror_label(url: str) -> str:
    """Short hostname label for display."""
    return url.split("/")[2]


async def _try_endpoint(client: httpx.AsyncClient, url: str, query: str) -> list[dict]:
    resp = await client.post(url, data={"data": query}, timeout=25.0)
    resp.raise_for_status()
    elements = resp.json().get("elements", [])
    results = []
    for el in elements:
        if "center" not in el:
            continue
        tags = el.get("tags", {})
        results.append({
            "osm_id": str(el["id"]),
            "lat": el["center"]["lat"],
            "lon": el["center"]["lon"],
            "name": tags.get("name"),
            "start_date": tags.get("start_date"),
            "material": tags.get("material"),
            "bridge_structure": tags.get("bridge:structure"),
            "maxweight": tags.get("maxweight"),
            "road_class": tags.get("highway"),
        })
    return results


async def get_bridges_in_bbox(
    sw_lat: float, sw_lon: float, ne_lat: float, ne_lon: float,
    on_progress=None,
) -> list[dict]:
    async def emit(status: str, message: str):
        print(f"[Overpass] {message}")
        if on_progress:
            await on_progress({"step": "overpass", "status": status, "message": message})

    query = _build_query(sw_lat, sw_lon, ne_lat, ne_lon)
    last_error = None

    async with httpx.AsyncClient(headers=REQUEST_HEADERS) as client:
        for url in OVERPASS_ENDPOINTS:
            label = _mirror_label(url)
            await emit("trying", f"Trying {label}…")
            try:
                results = await _try_endpoint(client, url, query)
                await emit("ok", f"{label} — {len(results)} raw records")
                return results
            except Exception as e:
                short = str(e).split("\n")[0][:80]
                await emit("failed", f"{label}: {short}")
                last_error = e
                await asyncio.sleep(1)

    # ── All OSM mirrors failed — try Google Places as last resort ────────────
    await emit("trying", "All OSM mirrors failed — trying Google Places fallback…")
    if settings.GOOGLE_MAPS_API_KEY:
        try:
            results = await find_bridges_google(
                sw_lat, sw_lon, ne_lat, ne_lon, settings.GOOGLE_MAPS_API_KEY,
                on_progress=on_progress,
            )
            if results:
                return results
            await emit("failed", "Google Places returned no results.")
        except Exception as e:
            await emit("failed", f"Google Places: {str(e)[:80]}")

    raise RuntimeError(
        f"All Overpass mirrors and Google Places fallback failed. Last error: {last_error}"
    )
