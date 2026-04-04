#!/usr/bin/env python3
"""
download.py — Discover bridge infrastructure datasets from the EU Open Data Portal.

Queries the EU Data Portal Hub Search API for bridge and infrastructure datasets
across EU member states. Filters for downloadable CSV/JSON resources and saves
a catalog to bridge_catalog.json.

Usage:
    python download.py [--output-dir DIR] [--query TEXT] [--country CODE] [--limit N]

Requirements:
    Python 3.11+, requests (pip install requests)

Data source:
    EU Open Data Portal
    https://data.europa.eu/
    Portal licence: CC BY 4.0
    Underlying dataset licences vary per dataset.
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

EU_PORTAL_BASE = "https://data.europa.eu"
EU_SEARCH_API = f"{EU_PORTAL_BASE}/api/hub/search/datasets"

HEADERS = {
    "User-Agent": "DeepInspect/3.0 (bridge-research)",
    "Accept": "application/json",
}

MAX_RETRIES = 3
BACKOFF_BASE = 2.0

# Formats considered downloadable and useful for tabular analysis
DOWNLOADABLE_FORMATS = {"csv", "json", "xlsx", "xls", "geojson", "rdf", "xml", "zip"}

# Default queries — ordered from most specific to broadest
DEFAULT_QUERIES = [
    "bridge infrastructure condition",
    "bridge inspection",
    "pont infrastructure",       # French
    "Brücke Infrastruktur",      # German
    "brug inspectie",            # Dutch
    "bro inspektion",            # Swedish/Norwegian
]

# Country codes for reference
COUNTRY_CODES = {
    "AT": "Austria", "BE": "Belgium", "CZ": "Czech Republic",
    "DE": "Germany", "DK": "Denmark", "EE": "Estonia",
    "FI": "Finland", "FR": "France", "HR": "Croatia",
    "HU": "Hungary", "IE": "Ireland", "IT": "Italy",
    "LT": "Lithuania", "LU": "Luxembourg", "LV": "Latvia",
    "NL": "Netherlands", "NO": "Norway", "PL": "Poland",
    "PT": "Portugal", "RO": "Romania", "SE": "Sweden",
    "SI": "Slovenia", "SK": "Slovakia", "ES": "Spain",
}


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
                print(f"  WARNING: HTTP {status} for {url}", file=sys.stderr)
                return None
        except (requests.exceptions.ConnectionError, requests.exceptions.Timeout) as exc:
            if attempt < MAX_RETRIES - 1:
                wait = BACKOFF_BASE ** attempt
                print(f"  {type(exc).__name__} — retrying in {wait:.0f}s...", file=sys.stderr)
                time.sleep(wait)
            else:
                print(f"  WARNING: Request failed for {url}", file=sys.stderr)
                return None
    return None


# ---------------------------------------------------------------------------
# EU Portal API
# ---------------------------------------------------------------------------

def search_datasets(
    query: str,
    limit: int = 20,
    page: int = 0,
    country: Optional[str] = None,
) -> Optional[dict]:
    """
    Search the EU Data Portal for datasets.
    Returns the 'result' block from the API response.
    """
    params: dict[str, Any] = {
        "q": query,
        "limit": limit,
        "page": page,
    }
    if country:
        params["filter[country]"] = country

    data = get_json(EU_SEARCH_API, params=params)
    if data is None:
        return None

    # EU Portal wraps results differently depending on API version
    if "result" in data:
        return data["result"]
    if "results" in data:
        return {"count": len(data["results"]), "items": data["results"]}
    return data


# ---------------------------------------------------------------------------
# Data processing
# ---------------------------------------------------------------------------

def extract_multilang(field: Any, preferred: str = "en") -> str:
    """Extract a string from a multilingual dict or return the value directly."""
    if isinstance(field, dict):
        return field.get(preferred) or field.get("en") or next(iter(field.values()), "")
    if isinstance(field, str):
        return field
    return ""


def extract_distribution(dist: dict) -> dict:
    """Extract relevant fields from a distribution (downloadable resource)."""
    fmt = extract_multilang(dist.get("format", "")).lower()
    access_url = dist.get("accessURL") or dist.get("access_url", "")
    download_url = dist.get("downloadURL") or dist.get("download_url", "")

    return {
        "format": extract_multilang(dist.get("format", "")),
        "access_url": access_url,
        "download_url": download_url,
        "byte_size": dist.get("byteSize") or dist.get("byte_size"),
        "is_downloadable": fmt in DOWNLOADABLE_FORMATS or bool(download_url),
        "licence": extract_multilang(dist.get("licence", "")),
    }


def extract_dataset(item: dict) -> dict:
    """Transform a raw EU Portal dataset item into a normalized record."""
    dataset_id = item.get("id", "")
    title = extract_multilang(item.get("title", {}))
    description = extract_multilang(item.get("description", {}))
    publisher = item.get("publisher", {})
    if isinstance(publisher, dict):
        publisher_name = publisher.get("name") or extract_multilang(publisher.get("label", {}))
    else:
        publisher_name = str(publisher)

    distributions = [
        extract_distribution(d)
        for d in item.get("distributions", []) or item.get("distribution", [])
    ]
    downloadable = [d for d in distributions if d["is_downloadable"]]
    formats = list({d["format"] for d in distributions if d["format"]})

    # Extract country
    country_raw = item.get("country") or item.get("spatial", "")
    if isinstance(country_raw, list):
        country = country_raw[0] if country_raw else ""
    else:
        country = str(country_raw)

    # Extract licence
    licence = extract_multilang(item.get("licence", {})) or item.get("license", "")

    return {
        "id": dataset_id,
        "title": title,
        "description": description[:400] + ("..." if len(description) > 400 else ""),
        "publisher": publisher_name,
        "country": country,
        "country_name": COUNTRY_CODES.get(country.upper(), country),
        "issued": item.get("issued") or item.get("release_date"),
        "modified": item.get("modified") or item.get("modification_date"),
        "licence": licence,
        "keywords": item.get("keywords", []) or item.get("tags", []),
        "formats": formats,
        "distributions": distributions,
        "downloadable_resources": downloadable,
        "has_downloadable": len(downloadable) > 0,
        "portal_url": (
            f"{EU_PORTAL_BASE}/en/data/datasets/{dataset_id}"
            if dataset_id else ""
        ),
    }


def deduplicate(datasets: list[dict]) -> list[dict]:
    """Remove datasets with duplicate IDs."""
    seen: set[str] = set()
    unique: list[dict] = []
    for ds in datasets:
        key = ds.get("id") or ds.get("title", "")
        if key not in seen:
            seen.add(key)
            unique.append(ds)
    return unique


# ---------------------------------------------------------------------------
# Main fetch logic
# ---------------------------------------------------------------------------

def fetch_catalog(
    queries: list[str],
    limit: int,
    country: Optional[str],
) -> list[dict]:
    """Run all queries and return deduplicated dataset list."""
    all_datasets: list[dict] = []

    for query in queries:
        print(f"  Searching: '{query}'...", end=" ", flush=True)
        result = search_datasets(query, limit=limit, country=country)

        if result is None:
            print("failed (API error).")
            time.sleep(1)
            continue

        items = result.get("items") or result.get("results") or []
        total = result.get("count", len(items))
        print(f"{total} found, {len(items)} returned.")

        for item in items:
            all_datasets.append(extract_dataset(item))

        time.sleep(0.5)

    return deduplicate(all_datasets)


# ---------------------------------------------------------------------------
# Output
# ---------------------------------------------------------------------------

def write_catalog(
    datasets: list[dict],
    output_dir: Path,
    queries: list[str],
    country: Optional[str],
) -> Path:
    """Write the catalog JSON file."""
    downloadable = [d for d in datasets if d["has_downloadable"]]

    # Group by country
    by_country: dict[str, int] = {}
    for ds in datasets:
        c = ds.get("country_name") or ds.get("country") or "Unknown"
        by_country[c] = by_country.get(c, 0) + 1

    output = {
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "source": EU_PORTAL_BASE,
        "api_endpoint": EU_SEARCH_API,
        "search_queries": queries,
        "country_filter": country,
        "total_found": len(datasets),
        "downloadable_count": len(downloadable),
        "datasets_by_country": dict(sorted(by_country.items(), key=lambda x: -x[1])),
        "deepinspect_notes": {
            "priority_countries": ["Norway", "Sweden", "Netherlands", "Germany", "Czech Republic"],
            "target_fields": ["bridge_id", "condition_rating", "inspection_date", "structure_type"],
            "exclude": ["Graffiti", "cosmetic-only datasets", "road pavement datasets"],
        },
        "datasets": datasets,
    }

    path = output_dir / "bridge_catalog.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    return path


def print_summary(datasets: list[dict]) -> None:
    """Print human-readable summary."""
    downloadable = [d for d in datasets if d["has_downloadable"]]

    print(f"\n=== Catalog Summary ===")
    print(f"  Total datasets:        {len(datasets)}")
    print(f"  With downloadable data:{len(downloadable)}")

    if datasets:
        print(f"\nTop datasets:")
        for ds in datasets[:10]:
            dl = f" [{len(ds['downloadable_resources'])} files]" if ds["has_downloadable"] else ""
            country = f" [{ds['country']}]" if ds.get("country") else ""
            print(f"  - {ds['title'][:70]}{country}{dl}")

    if len(datasets) > 10:
        print(f"  ... and {len(datasets) - 10} more (see bridge_catalog.json)")

    if downloadable:
        print(f"\nDownloadable datasets:")
        for ds in downloadable[:5]:
            print(f"  {ds['title'][:60]}")
            for r in ds["downloadable_resources"][:2]:
                url = r.get("download_url") or r.get("access_url", "")
                print(f"    [{r['format']}] {url[:80]}")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Discover bridge datasets from the EU Open Data Portal.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python download.py
  python download.py --query "bridge condition"
  python download.py --country NL
  python download.py --limit 50 --output-dir ./data
        """,
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path(__file__).parent,
        help="Directory to save bridge_catalog.json (default: script directory)",
    )
    parser.add_argument(
        "--query",
        type=str,
        default=None,
        help="Custom search query (default: runs multiple predefined queries)",
    )
    parser.add_argument(
        "--country",
        type=str,
        default=None,
        metavar="CODE",
        help="Filter by country code, e.g. NL, DE, SE (default: all countries)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=20,
        help="Results per query (default: 20, max: 100)",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    print("=== DeepInspect EU Open Data Portal Bridge Catalog ===")
    print(f"API: {EU_SEARCH_API}")
    if args.country:
        country_name = COUNTRY_CODES.get(args.country.upper(), args.country)
        print(f"Country filter: {args.country.upper()} ({country_name})")
    print()

    args.output_dir.mkdir(parents=True, exist_ok=True)

    queries = [args.query] if args.query else DEFAULT_QUERIES
    country = args.country.upper() if args.country else None

    print(f"Running {len(queries)} queries (limit {args.limit} per query)...")
    datasets = fetch_catalog(queries, limit=args.limit, country=country)

    path = write_catalog(datasets, args.output_dir, queries, country)
    print(f"\nCatalog saved to: {path}")

    print_summary(datasets)


if __name__ == "__main__":
    main()
