import asyncio
import httpx

# Public Overpass API mirrors — tried in order until one succeeds
OVERPASS_ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.openstreetmap.ru/api/interpreter",
]


def _build_query(sw_lat: float, sw_lon: float, ne_lat: float, ne_lon: float) -> str:
    bbox = f"{sw_lat},{sw_lon},{ne_lat},{ne_lon}"
    return f"""
[out:json][timeout:25];
(
  way["bridge"="yes"]({bbox});
  way["man_made"="bridge"]({bbox});
);
out center tags;
"""


async def _try_endpoint(client: httpx.AsyncClient, url: str, query: str) -> list[dict]:
    resp = await client.post(url, data={"data": query}, timeout=40.0)
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
            "material": tags.get("bridge:structure") or tags.get("material"),
            "maxweight": tags.get("maxweight"),
            "road_class": tags.get("highway"),
        })
    return results


async def get_bridges_in_bbox(
    sw_lat: float, sw_lon: float, ne_lat: float, ne_lon: float
) -> list[dict]:
    query = _build_query(sw_lat, sw_lon, ne_lat, ne_lon)
    last_error = None

    async with httpx.AsyncClient() as client:
        for url in OVERPASS_ENDPOINTS:
            try:
                print(f"[Overpass] Trying {url} ...")
                results = await _try_endpoint(client, url, query)
                print(f"[Overpass] OK — {len(results)} bridges from {url}")
                return results
            except Exception as e:
                print(f"[Overpass] Failed {url}: {e}")
                last_error = e
                await asyncio.sleep(1)  # brief pause before next mirror

    raise RuntimeError(
        f"All Overpass API mirrors failed. Last error: {last_error}\n"
        "Try again in a few minutes — the OSM servers may be under load."
    )
