import httpx

from services.logging_service import get_logger

log = get_logger(__name__)


async def bbox_from_city(city: str, api_key: str) -> dict:
    """
    Geocode a city name to a bounding box.
    Tries Google Maps Geocoding API first; falls back to Nominatim (OSM, free, no key needed).
    Returns: {"northeast": {"lat": ..., "lng": ...}, "southwest": {"lat": ..., "lng": ...}}
    """
    # 1. Try Google Maps Geocoding API
    if api_key:
        try:
            bounds = await _google_geocode(city, api_key)
            if bounds:
                return bounds
        except Exception as e:
            log.warning("google_geocoding_failed", city=city, error=str(e))

    # 2. Fallback: Nominatim (OpenStreetMap) — free, no key required
    return await _nominatim_geocode(city)


async def _google_geocode(city: str, api_key: str) -> dict | None:
    url = "https://maps.googleapis.com/maps/api/geocode/json"
    params = {"address": f"{city}, Poland", "key": api_key}
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url, params=params)
        resp.raise_for_status()
    data = resp.json()
    if not data.get("results"):
        return None
    bounds = data["results"][0]["geometry"]["bounds"]
    return bounds  # already in {"northeast": {...}, "southwest": {...}} format


async def _nominatim_geocode(city: str) -> dict:
    """
    Nominatim returns boundingbox as [south_lat, north_lat, west_lon, east_lon].
    We reshape it to match the Google format.
    """
    url = "https://nominatim.openstreetmap.org/search"
    params = {
        "q": f"{city}, Poland",
        "format": "json",
        "limit": 1,
    }
    # Nominatim requires a User-Agent header
    headers = {"User-Agent": "DeepInspect/1.0 (hackathon infrastructure assessment)"}
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url, params=params, headers=headers)
        resp.raise_for_status()
    data = resp.json()
    if not data:
        raise ValueError(f"Could not geocode city: '{city}'. Check the spelling or try a different city.")
    bb = data[0]["boundingbox"]  # [south, north, west, east]
    return {
        "southwest": {"lat": float(bb[0]), "lng": float(bb[2])},
        "northeast": {"lat": float(bb[1]), "lng": float(bb[3])},
    }
