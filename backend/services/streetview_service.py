import httpx
import os
from pathlib import Path
from config import settings

STREETVIEW_BASE = "https://maps.googleapis.com/maps/api/streetview"
METADATA_BASE = "https://maps.googleapis.com/maps/api/streetview/metadata"
HEADINGS = [0, 90, 270]  # North, East, West


async def check_streetview_coverage(lat: float, lon: float, api_key: str) -> bool:
    """Free metadata check — no billing unless status is OK."""
    params = {"location": f"{lat},{lon}", "key": api_key}
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(METADATA_BASE, params=params)
    return resp.json().get("status") == "OK"


async def fetch_bridge_images(lat: float, lon: float, api_key: str, osm_id: str = "unknown") -> list[bytes]:
    """Fetch Street View images at 3 headings. Uses disk cache to avoid re-billing."""
    cache_dir = Path(settings.STREETVIEW_CACHE_DIR)
    cache_dir.mkdir(parents=True, exist_ok=True)

    images = []
    async with httpx.AsyncClient(timeout=15.0) as client:
        for heading in HEADINGS:
            cache_file = cache_dir / f"{osm_id}_{heading}.jpg"

            # Return from disk cache if available
            if cache_file.exists():
                images.append(cache_file.read_bytes())
                continue

            params = {
                "size": "640x480",
                "location": f"{lat},{lon}",
                "heading": heading,
                "pitch": "-10",
                "fov": "90",
                "key": api_key,
                "return_error_code": "true",
            }
            resp = await client.get(STREETVIEW_BASE, params=params)
            if resp.status_code == 200:
                data = resp.content
                cache_file.write_bytes(data)
                images.append(data)

    return images
