#!/usr/bin/env python3
"""
fetch_bridges.py — Download Norwegian bridge data from NVDB REST API v3.

Usage:
    python fetch_bridges.py [--output-dir DIR] [--max-pages N] [--metadata-only]

Requirements:
    Python 3.11+, requests (pip install requests)

Data source:
    Statens vegvesen NVDB API v3
    https://nvdbapiles-v3.atlas.vegvesen.no/
    Licence: Norwegian Licence for Open Government Data (NLOD) 2.0
"""

import argparse
import csv
import json
import sys
import time
from pathlib import Path
from typing import Any, Optional

try:
    import requests
except ImportError:
    sys.exit("requests is not installed. Run: pip install requests")

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

BASE_URL = "https://nvdbapiles-v3.atlas.vegvesen.no"
BRIDGE_OBJECT_TYPE = 60  # Bru (Bridge) — verified against data catalogue below

FETCH_PARAMS = {
    "inkluder": "egenskaper,geometri,lokasjon",
    "segmentering": "true",
    "antall": 1000,
}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 DeepInspect/3.0 (bridge-research; https://github.com/KiranMohan-92/hackathon-deepinspect)",
    "Accept": "application/vnd.vegvesen.nvdb-v3-rev1+json",
}

# NVDB property IDs for bridge attributes
PROP_NAME = 1078          # Navn på brua
PROP_YEAR = 10277         # Byggeår
PROP_MATERIAL = 10278     # Materiale
PROP_SPAN_COUNT = 10282   # Antall spenn
PROP_LENGTH = 1081        # Lengde (m)
PROP_CONDITION = 10362    # Tilstandsgrad

MAX_RETRIES = 3
BACKOFF_BASE = 2.0  # seconds


# ---------------------------------------------------------------------------
# HTTP helpers
# ---------------------------------------------------------------------------

def get_json(url: str, params: Optional[dict] = None) -> Any:
    """GET a URL and return parsed JSON. Retries with exponential backoff."""
    for attempt in range(MAX_RETRIES):
        try:
            response = requests.get(url, params=params, headers=HEADERS, timeout=30)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.HTTPError as exc:
            status = exc.response.status_code if exc.response else "?"
            if attempt < MAX_RETRIES - 1:
                wait = BACKOFF_BASE ** attempt
                print(f"  HTTP {status} on attempt {attempt + 1}/{MAX_RETRIES}. "
                      f"Retrying in {wait:.0f}s...", file=sys.stderr)
                time.sleep(wait)
            else:
                raise RuntimeError(f"HTTP {status} after {MAX_RETRIES} attempts: {url}") from exc
        except requests.exceptions.ConnectionError as exc:
            if attempt < MAX_RETRIES - 1:
                wait = BACKOFF_BASE ** attempt
                print(f"  Connection error on attempt {attempt + 1}/{MAX_RETRIES}. "
                      f"Retrying in {wait:.0f}s...", file=sys.stderr)
                time.sleep(wait)
            else:
                raise RuntimeError(f"Connection failed after {MAX_RETRIES} attempts: {url}") from exc
        except requests.exceptions.Timeout:
            if attempt < MAX_RETRIES - 1:
                wait = BACKOFF_BASE ** attempt
                print(f"  Timeout on attempt {attempt + 1}/{MAX_RETRIES}. "
                      f"Retrying in {wait:.0f}s...", file=sys.stderr)
                time.sleep(wait)
            else:
                raise RuntimeError(f"Timeout after {MAX_RETRIES} attempts: {url}")
    return None  # unreachable


# ---------------------------------------------------------------------------
# Object type verification
# ---------------------------------------------------------------------------

def verify_object_type(object_type_id: int) -> str:
    """
    Query the NVDB data catalogue to confirm object type name.
    Returns the Norwegian name of the object type.
    Exits with a warning if verification fails.
    """
    url = f"{BASE_URL}/vegobjekttyper/{object_type_id}"
    print(f"Verifying object type {object_type_id} via data catalogue...")
    try:
        data = get_json(url)
        name = data.get("navn", "unknown")
        print(f"  Object type {object_type_id} = '{name}'")
        if "bru" not in name.lower():
            print(
                f"\nWARNING: Object type {object_type_id} is '{name}', not 'Bru' (Bridge).\n"
                "The NVDB object type ID may have changed. Verify at:\n"
                "  https://datakatalogen.vegdata.no/\n",
                file=sys.stderr,
            )
            answer = input("Continue anyway? [y/N] ").strip().lower()
            if answer != "y":
                sys.exit("Aborted by user.")
        else:
            print(f"  Confirmed: object type {object_type_id} = Bridge (Bru).")
        return name
    except Exception as exc:
        print(
            f"WARNING: Could not verify object type ({exc}). Proceeding with type {object_type_id}.",
            file=sys.stderr,
        )
        return "unknown"


# ---------------------------------------------------------------------------
# Property extraction helpers
# ---------------------------------------------------------------------------

def get_property_value(properties: list[dict], prop_id: int) -> Any:
    """Extract a property value from an NVDB egenskaper list by property type ID."""
    for prop in properties:
        if prop.get("id") == prop_id:
            return prop.get("verdi")
    return None


def extract_coordinates(obj: dict) -> Optional[list[float]]:
    """
    Extract [lon, lat] from the object's geometry.
    NVDB geometry is provided as WKT (Well-Known Text) or GeoJSON.
    Handles POINT, LINESTRING, and MULTILINESTRING.
    """
    geom = obj.get("geometri", {})

    # Try GeoJSON coordinates first
    if "koordinater" in geom:
        coords = geom["koordinater"]
        if isinstance(coords, list) and len(coords) >= 2:
            return [coords[0], coords[1]]

    # Try WKT
    wkt = geom.get("wkt", "")
    if not wkt:
        return None

    try:
        # Strip geometry type prefix and extract first coordinate pair
        # WKT examples:
        #   POINT (10.1234 59.7654)
        #   LINESTRING (10.1234 59.7654, 10.1235 59.7655)
        #   MULTILINESTRING ((10.1234 59.7654, ...))
        inner = wkt.split("(", 1)[-1].replace("(", "").replace(")", "").strip()
        first_pair = inner.split(",")[0].strip()
        parts = first_pair.split()
        if len(parts) >= 2:
            return [float(parts[0]), float(parts[1])]
    except (ValueError, IndexError):
        pass

    return None


def extract_road_reference(obj: dict) -> Optional[str]:
    """Extract the primary road network reference string."""
    lokasjon = obj.get("lokasjon", {})
    refs = lokasjon.get("vegsystemreferanser", [])
    if refs:
        # Return the kortform (short form) of the first reference
        first = refs[0]
        return first.get("kortform") or first.get("vegsystemreferanse", {}).get("kortform")
    return None


def parse_bridge(obj: dict) -> dict:
    """Transform a raw NVDB bridge object into a flat DeepInspect record."""
    props = obj.get("egenskaper", [])
    return {
        "id": obj.get("id"),
        "name": get_property_value(props, PROP_NAME),
        "coordinates": extract_coordinates(obj),
        "road_reference": extract_road_reference(obj),
        "construction_year": get_property_value(props, PROP_YEAR),
        "material": get_property_value(props, PROP_MATERIAL),
        "span_count": get_property_value(props, PROP_SPAN_COUNT),
        "length": get_property_value(props, PROP_LENGTH),
        "condition_rating": get_property_value(props, PROP_CONDITION),
    }


# ---------------------------------------------------------------------------
# Pagination
# ---------------------------------------------------------------------------

def fetch_all_bridges(max_pages: Optional[int] = None) -> list[dict]:
    """
    Fetch all bridge records from NVDB using pagination.
    Follows the 'neste' link in metadata until exhausted or max_pages reached.
    """
    url = f"{BASE_URL}/vegobjekter/{BRIDGE_OBJECT_TYPE}"
    params = dict(FETCH_PARAMS)

    bridges: list[dict] = []
    page = 0

    while True:
        page += 1
        print(f"Fetching page {page}...", end=" ", flush=True)

        data = get_json(url, params=params if page == 1 else None)

        objects = data.get("objekter", [])
        metadata = data.get("metadata", {})

        for obj in objects:
            bridges.append(parse_bridge(obj))

        returned = metadata.get("returnert", len(objects))
        total = metadata.get("totalt_antall", "?")
        print(f"{returned} records fetched (cumulative: {len(bridges)} / {total})")

        # Check for next page
        neste = metadata.get("neste")
        if not neste:
            print("No more pages. Download complete.")
            break

        next_href = neste.get("href")
        if not next_href:
            print("No next href found. Stopping.")
            break

        if max_pages is not None and page >= max_pages:
            print(f"Reached --max-pages limit ({max_pages}). Stopping.")
            break

        # Update URL and clear params (next URL includes all params)
        url = next_href
        params = None

        # Rate limiting: 1 request per second
        time.sleep(1.0)

    return bridges


# ---------------------------------------------------------------------------
# Output writers
# ---------------------------------------------------------------------------

CSV_FIELDS = [
    "id", "name", "lon", "lat", "road_reference",
    "construction_year", "material", "span_count", "length", "condition_rating",
]


def write_json(bridges: list[dict], output_dir: Path) -> Path:
    """Write bridges to JSON file."""
    path = output_dir / "bridges.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(bridges, f, ensure_ascii=False, indent=2)
    return path


def write_csv(bridges: list[dict], output_dir: Path) -> Path:
    """Write bridges to CSV file with flattened coordinates."""
    path = output_dir / "bridges.csv"
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDS, extrasaction="ignore")
        writer.writeheader()
        for bridge in bridges:
            row = dict(bridge)
            coords = row.pop("coordinates", None)
            row["lon"] = coords[0] if coords else None
            row["lat"] = coords[1] if coords else None
            writer.writerow(row)
    return path


# ---------------------------------------------------------------------------
# Metadata-only mode
# ---------------------------------------------------------------------------

def fetch_metadata_only() -> None:
    """Fetch only the first page and print summary statistics."""
    print("Fetching first page for metadata...")
    url = f"{BASE_URL}/vegobjekter/{BRIDGE_OBJECT_TYPE}"
    data = get_json(url, params=FETCH_PARAMS)

    metadata = data.get("metadata", {})
    objects = data.get("objekter", [])

    print("\n=== NVDB Bridge Metadata ===")
    print(f"  Total bridges in NVDB:  {metadata.get('totalt_antall', 'unknown')}")
    print(f"  Records on first page:  {metadata.get('returnert', len(objects))}")
    print(f"  Page size:              {metadata.get('antall', 'unknown')}")
    neste = metadata.get("neste")
    print(f"  More pages available:   {'yes' if neste else 'no'}")

    if objects:
        sample = parse_bridge(objects[0])
        print(f"\nSample record:")
        print(json.dumps(sample, ensure_ascii=False, indent=2))


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Fetch Norwegian bridge data from NVDB REST API v3.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python fetch_bridges.py --metadata-only
  python fetch_bridges.py --max-pages 5 --output-dir ./data
  python fetch_bridges.py --output-dir ./data
        """,
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path(__file__).parent,
        help="Directory to write bridges.json and bridges.csv (default: script directory)",
    )
    parser.add_argument(
        "--max-pages",
        type=int,
        default=None,
        metavar="N",
        help="Maximum number of pages to fetch (default: unlimited)",
    )
    parser.add_argument(
        "--metadata-only",
        action="store_true",
        help="Fetch only first page statistics, do not download all bridges",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    print("=== DeepInspect NVDB Bridge Fetcher ===")
    print(f"API: {BASE_URL}")
    print(f"Object type: {BRIDGE_OBJECT_TYPE} (Bru / Bridge)")
    print()

    if args.metadata_only:
        verify_object_type(BRIDGE_OBJECT_TYPE)
        fetch_metadata_only()
        return

    # Verify object type before bulk download
    verify_object_type(BRIDGE_OBJECT_TYPE)
    print()

    # Ensure output directory exists
    args.output_dir.mkdir(parents=True, exist_ok=True)

    # Fetch all bridges
    bridges = fetch_all_bridges(max_pages=args.max_pages)

    if not bridges:
        print("No bridges fetched. Exiting without writing files.", file=sys.stderr)
        sys.exit(1)

    # Write outputs
    json_path = write_json(bridges, args.output_dir)
    csv_path = write_csv(bridges, args.output_dir)

    print(f"\nWrote {len(bridges)} bridges:")
    print(f"  JSON: {json_path}")
    print(f"  CSV:  {csv_path}")

    # Summary stats
    with_coords = sum(1 for b in bridges if b["coordinates"])
    with_year = sum(1 for b in bridges if b["construction_year"])
    with_condition = sum(1 for b in bridges if b["condition_rating"] is not None)

    print(f"\nData coverage:")
    print(f"  With coordinates:     {with_coords}/{len(bridges)} ({100*with_coords//len(bridges)}%)")
    print(f"  With build year:      {with_year}/{len(bridges)} ({100*with_year//len(bridges)}%)")
    print(f"  With condition rating:{with_condition}/{len(bridges)} ({100*with_condition//len(bridges)}%)")


if __name__ == "__main__":
    main()
