#!/usr/bin/env python3
"""
fetch_structures.py — Fetch UK National Highways bridge structure datasets.

Queries the National Highways Open Data portal (CKAN API) for bridge and
structure datasets, including BCI (Bridge Condition Index) scores.

Usage:
    python fetch_structures.py [--output-dir DIR] [--query TEXT]

Requirements:
    Python 3.11+, requests (pip install requests)

Data source:
    National Highways Open Data Portal
    https://opendata.nationalhighways.co.uk/
    Licence: Open Government Licence v3.0

Note:
    TRIS (Transport Research Information System) was retired in early 2025.
    Data is now available via the new National Highways Open Data portal.
"""

import argparse
import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

try:
    import requests
except ImportError:
    sys.exit("requests is not installed. Run: pip install requests")

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

PORTAL_BASE = "https://opendata.nationalhighways.co.uk"
CKAN_API_BASE = f"{PORTAL_BASE}/api/3/action"

HEADERS = {
    "User-Agent": "DeepInspect/3.0 (bridge-research)",
    "Accept": "application/json",
}

MAX_RETRIES = 3
BACKOFF_BASE = 2.0

# Search queries to run (in order of specificity)
DEFAULT_SEARCH_QUERIES = [
    "bridge structure",
    "bridge condition",
    "BCI",
    "highway structure",
    "structures inventory",
]

# Formats we consider downloadable/useful for analysis
USEFUL_FORMATS = {"csv", "json", "xlsx", "xls", "geojson", "shapefile", "zip"}


# ---------------------------------------------------------------------------
# HTTP helpers
# ---------------------------------------------------------------------------

def get_json(url: str, params: Optional[dict] = None) -> Any:
    """GET a URL and return parsed JSON with retry/backoff."""
    for attempt in range(MAX_RETRIES):
        try:
            response = requests.get(url, params=params, headers=HEADERS, timeout=30)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.HTTPError as exc:
            status = exc.response.status_code if exc.response else "?"
            if attempt < MAX_RETRIES - 1:
                wait = BACKOFF_BASE ** attempt
                print(f"  HTTP {status} — retrying in {wait:.0f}s...", file=sys.stderr)
                time.sleep(wait)
            else:
                # Don't fatal — portal may have changed
                print(
                    f"  WARNING: HTTP {status} after {MAX_RETRIES} attempts for {url}",
                    file=sys.stderr,
                )
                return None
        except (requests.exceptions.ConnectionError, requests.exceptions.Timeout) as exc:
            if attempt < MAX_RETRIES - 1:
                wait = BACKOFF_BASE ** attempt
                print(f"  {type(exc).__name__} — retrying in {wait:.0f}s...", file=sys.stderr)
                time.sleep(wait)
            else:
                print(
                    f"  WARNING: Connection failed after {MAX_RETRIES} attempts for {url}",
                    file=sys.stderr,
                )
                return None
    return None


# ---------------------------------------------------------------------------
# CKAN API calls
# ---------------------------------------------------------------------------

def package_search(query: str, rows: int = 100, start: int = 0) -> Optional[dict]:
    """Search for datasets using the CKAN package_search endpoint."""
    url = f"{CKAN_API_BASE}/package_search"
    params = {
        "q": query,
        "rows": rows,
        "start": start,
        "sort": "score desc",
    }
    data = get_json(url, params=params)
    if data and data.get("success"):
        return data.get("result", {})
    return None


def package_show(dataset_id: str) -> Optional[dict]:
    """Fetch full metadata for a single dataset."""
    url = f"{CKAN_API_BASE}/package_show"
    params = {"id": dataset_id}
    data = get_json(url, params=params)
    if data and data.get("success"):
        return data.get("result", {})
    return None


# ---------------------------------------------------------------------------
# Data processing
# ---------------------------------------------------------------------------

def extract_resource_info(resource: dict) -> dict:
    """Extract relevant fields from a CKAN resource object."""
    fmt = (resource.get("format") or "").lower().strip(".")
    return {
        "id": resource.get("id"),
        "name": resource.get("name") or resource.get("description", ""),
        "format": resource.get("format"),
        "url": resource.get("url"),
        "size": resource.get("size"),
        "created": resource.get("created"),
        "last_modified": resource.get("last_modified"),
        "is_downloadable": fmt in USEFUL_FORMATS,
    }


def extract_dataset_info(pkg: dict) -> dict:
    """Extract relevant fields from a CKAN package object."""
    resources = [extract_resource_info(r) for r in pkg.get("resources", [])]
    downloadable = [r for r in resources if r["is_downloadable"]]

    # Score relevance to bridge condition data
    title = (pkg.get("title") or "").lower()
    notes = (pkg.get("notes") or "").lower()
    tags = [t.get("name", "").lower() for t in pkg.get("tags", [])]
    full_text = f"{title} {notes} {' '.join(tags)}"

    bci_relevant = any(kw in full_text for kw in [
        "bci", "bridge condition", "condition index", "inspection",
        "structural condition", "health index"
    ])

    return {
        "id": pkg.get("id"),
        "name": pkg.get("name"),
        "title": pkg.get("title"),
        "description": (pkg.get("notes") or "")[:500],
        "organisation": (pkg.get("organization") or {}).get("title"),
        "licence_id": pkg.get("license_id"),
        "licence_title": pkg.get("license_title"),
        "licence_url": pkg.get("license_url"),
        "metadata_created": pkg.get("metadata_created"),
        "metadata_modified": pkg.get("metadata_modified"),
        "tags": [t.get("name") for t in pkg.get("tags", [])],
        "resources": resources,
        "downloadable_resources": downloadable,
        "has_downloadable": len(downloadable) > 0,
        "bci_relevant": bci_relevant,
        "portal_url": f"{PORTAL_BASE}/dataset/{pkg.get('name')}",
    }


def deduplicate(datasets: list[dict]) -> list[dict]:
    """Remove duplicate datasets by ID."""
    seen: set[str] = set()
    unique: list[dict] = []
    for ds in datasets:
        if ds["id"] not in seen:
            seen.add(ds["id"])
            unique.append(ds)
    return unique


# ---------------------------------------------------------------------------
# Main fetch logic
# ---------------------------------------------------------------------------

def fetch_all_structure_datasets(queries: list[str]) -> list[dict]:
    """
    Run multiple search queries and aggregate unique datasets.
    Returns a list of processed dataset dicts.
    """
    all_datasets: list[dict] = []

    for query in queries:
        print(f"  Searching: '{query}'...", end=" ", flush=True)
        result = package_search(query, rows=100)

        if result is None:
            print("no results (API error).")
            time.sleep(1)
            continue

        count = result.get("count", 0)
        packages = result.get("results", [])
        print(f"{count} datasets found, {len(packages)} returned.")

        for pkg in packages:
            all_datasets.append(extract_dataset_info(pkg))

        time.sleep(0.5)

    return deduplicate(all_datasets)


# ---------------------------------------------------------------------------
# Output
# ---------------------------------------------------------------------------

def write_metadata(datasets: list[dict], output_dir: Path, queries: list[str]) -> Path:
    """Write the full structures metadata JSON."""
    bci_datasets = [d for d in datasets if d["bci_relevant"]]
    downloadable_datasets = [d for d in datasets if d["has_downloadable"]]

    output = {
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "portal": PORTAL_BASE,
        "search_queries": queries,
        "total_datasets": len(datasets),
        "bci_relevant_count": len(bci_datasets),
        "downloadable_count": len(downloadable_datasets),
        "note": (
            "TRIS (Transport Research Information System) was retired in early 2025. "
            "Bridge data is now available via the National Highways Open Data portal."
        ),
        "bci_scale": {
            "range": "0–100 (higher = better condition)",
            "good": "BCI >= 85",
            "fair": "60 <= BCI < 85",
            "poor": "40 <= BCI < 60",
            "critical": "BCI < 40",
            "deepinspect_conversion": "DeepInspect_score = (BCI / 100) * 10",
        },
        "datasets": datasets,
    }

    path = output_dir / "structures_metadata.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    return path


def print_summary(datasets: list[dict]) -> None:
    """Print a human-readable summary of found datasets."""
    bci_relevant = [d for d in datasets if d["bci_relevant"]]
    downloadable = [d for d in datasets if d["has_downloadable"]]

    print(f"\n=== Results Summary ===")
    print(f"  Total unique datasets: {len(datasets)}")
    print(f"  BCI-relevant:          {len(bci_relevant)}")
    print(f"  Has downloadable data: {len(downloadable)}")

    if datasets:
        print(f"\nAll datasets:")
        for ds in datasets:
            bci_flag = " [BCI]" if ds["bci_relevant"] else ""
            dl_flag = f" [{len(ds['downloadable_resources'])} files]" if ds["has_downloadable"] else ""
            print(f"  - {ds['title']}{bci_flag}{dl_flag}")

    if bci_relevant:
        print(f"\nBCI-relevant datasets (priority for DeepInspect calibration):")
        for ds in bci_relevant:
            print(f"  Title:   {ds['title']}")
            print(f"  URL:     {ds['portal_url']}")
            if ds["downloadable_resources"]:
                for r in ds["downloadable_resources"][:3]:
                    print(f"    File: {r['name']} ({r['format']}) — {r['url']}")
            print()


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Fetch UK National Highways structure dataset metadata.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python fetch_structures.py
  python fetch_structures.py --output-dir ./data
  python fetch_structures.py --query "bridge condition BCI"
        """,
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path(__file__).parent,
        help="Directory to save structures_metadata.json (default: script directory)",
    )
    parser.add_argument(
        "--query",
        type=str,
        default=None,
        help="Custom search query (default: runs multiple predefined queries)",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    print("=== DeepInspect UK National Highways Structures Fetcher ===")
    print(f"Portal: {PORTAL_BASE}")
    print(f"API:    {CKAN_API_BASE}")
    print()

    args.output_dir.mkdir(parents=True, exist_ok=True)

    queries = [args.query] if args.query else DEFAULT_SEARCH_QUERIES

    print(f"Running {len(queries)} search queries...")
    datasets = fetch_all_structure_datasets(queries)

    if not datasets:
        print(
            "\nNo datasets found. The portal may be temporarily unavailable or "
            "the API endpoint may have changed.\n"
            f"Check manually: {PORTAL_BASE}",
            file=sys.stderr,
        )
        # Still write an empty result file so the pipeline doesn't break
        datasets = []

    path = write_metadata(datasets, args.output_dir, queries)
    print(f"\nMetadata saved to: {path}")

    print_summary(datasets)


if __name__ == "__main__":
    main()
