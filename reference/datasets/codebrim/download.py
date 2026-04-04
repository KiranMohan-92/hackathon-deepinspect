#!/usr/bin/env python3
"""
download.py — Download CODEBRIM dataset from Zenodo.

By default, downloads only record metadata and file listing (fast).
Use --full to download all image files (~2 GB).

Usage:
    python download.py [--output-dir DIR] [--full]

Requirements:
    Python 3.11+, requests (pip install requests)

Dataset:
    Mundt et al. (2019), CVPR
    Zenodo record: 2620293
    DOI: 10.5281/zenodo.2620293
    Licence: CC BY 4.0
"""

import argparse
import json
import sys
import time
import urllib.request
from pathlib import Path
from typing import Any

try:
    import requests
except ImportError:
    sys.exit("requests is not installed. Run: pip install requests")

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

ZENODO_RECORD_ID = 2620293
ZENODO_API_URL = f"https://zenodo.org/api/records/{ZENODO_RECORD_ID}"
ZENODO_RECORD_URL = f"https://zenodo.org/record/{ZENODO_RECORD_ID}"

HEADERS = {
    "User-Agent": "DeepInspect/3.0 (bridge-research)",
    "Accept": "application/json",
}

MAX_RETRIES = 3
BACKOFF_BASE = 2.0

# Approximate class distribution from the paper
CLASS_DISTRIBUTION = {
    "Background": {"count": 2107, "percentage": 35.1, "multi_label": False},
    "Crack": {"count": 1810, "percentage": 30.2, "multi_label": True},
    "Spalling": {"count": 1187, "percentage": 19.8, "multi_label": True},
    "Efflorescence": {"count": 894, "percentage": 14.9, "multi_label": True},
    "ExposedRebar": {"count": 603, "percentage": 10.1, "multi_label": True},
    "CorrosionStain": {"count": 512, "percentage": 8.5, "multi_label": True},
}


# ---------------------------------------------------------------------------
# HTTP helpers
# ---------------------------------------------------------------------------

def get_json(url: str) -> Any:
    """GET a URL and return parsed JSON with retry/backoff."""
    for attempt in range(MAX_RETRIES):
        try:
            response = requests.get(url, headers=HEADERS, timeout=30)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.HTTPError as exc:
            status = exc.response.status_code if exc.response else "?"
            if attempt < MAX_RETRIES - 1:
                wait = BACKOFF_BASE ** attempt
                print(f"  HTTP {status} — retrying in {wait:.0f}s...", file=sys.stderr)
                time.sleep(wait)
            else:
                raise RuntimeError(f"HTTP {status} after {MAX_RETRIES} attempts") from exc
        except (requests.exceptions.ConnectionError, requests.exceptions.Timeout) as exc:
            if attempt < MAX_RETRIES - 1:
                wait = BACKOFF_BASE ** attempt
                print(f"  {type(exc).__name__} — retrying in {wait:.0f}s...", file=sys.stderr)
                time.sleep(wait)
            else:
                raise RuntimeError(f"Request failed after {MAX_RETRIES} attempts") from exc
    return None  # unreachable


def download_file(url: str, dest: Path, label: str = "") -> None:
    """Download a file with progress reporting."""
    label = label or dest.name
    print(f"  Downloading {label}...", end=" ", flush=True)

    response = requests.get(url, headers=HEADERS, stream=True, timeout=60)
    response.raise_for_status()

    total = int(response.headers.get("content-length", 0))
    downloaded = 0
    chunk_size = 1024 * 1024  # 1 MB

    with open(dest, "wb") as f:
        for chunk in response.iter_content(chunk_size=chunk_size):
            if chunk:
                f.write(chunk)
                downloaded += len(chunk)
                if total:
                    pct = 100 * downloaded // total
                    print(f"\r  Downloading {label}... {pct}%", end="", flush=True)

    size_mb = downloaded / (1024 * 1024)
    print(f"\r  Downloaded {label}: {size_mb:.1f} MB")


# ---------------------------------------------------------------------------
# Metadata fetch
# ---------------------------------------------------------------------------

def fetch_record_metadata() -> dict:
    """Fetch and return the full Zenodo record metadata."""
    print(f"Fetching Zenodo record {ZENODO_RECORD_ID}...")
    data = get_json(ZENODO_API_URL)
    return data


def format_metadata_summary(record: dict) -> dict:
    """Extract relevant fields from the Zenodo API response."""
    metadata = record.get("metadata", {})
    files = record.get("files", [])

    return {
        "zenodo_record_id": ZENODO_RECORD_ID,
        "doi": record.get("doi"),
        "title": metadata.get("title"),
        "description": metadata.get("description", "")[:500] + "...",
        "publication_date": metadata.get("publication_date"),
        "licence": metadata.get("license", {}).get("id"),
        "creators": [
            c.get("name") for c in metadata.get("creators", [])
        ],
        "keywords": metadata.get("keywords", []),
        "access_right": metadata.get("access_right"),
        "record_url": ZENODO_RECORD_URL,
        "api_url": ZENODO_API_URL,
        "files": [
            {
                "filename": f.get("key") or f.get("filename"),
                "size_bytes": f.get("size"),
                "size_mb": round(f.get("size", 0) / (1024 * 1024), 1),
                "checksum": f.get("checksum"),
                "download_url": f.get("links", {}).get("self") or f.get("links", {}).get("download"),
            }
            for f in files
        ],
        "total_size_bytes": sum(f.get("size", 0) for f in files),
        "total_size_gb": round(sum(f.get("size", 0) for f in files) / (1024 ** 3), 2),
        "class_distribution": CLASS_DISTRIBUTION,
        "deepinspect_notes": {
            "primary_use": "Multi-label defect classification benchmark",
            "class_mapping": {
                "Crack": "structural_crack (weight: 0.35)",
                "Spalling": "spalling (weight: 0.25)",
                "ExposedRebar": "exposed_rebar (weight: 0.40, critical)",
                "Efflorescence": "water_damage (weight: 0.10)",
                "CorrosionStain": "corrosion (weight: 0.30)",
            },
        },
    }


# ---------------------------------------------------------------------------
# Full download
# ---------------------------------------------------------------------------

def download_full_dataset(record: dict, output_dir: Path) -> None:
    """Download all files from the Zenodo record."""
    files = record.get("files", [])
    if not files:
        print("No files found in Zenodo record.", file=sys.stderr)
        return

    dataset_dir = output_dir / "CODEBRIM"
    dataset_dir.mkdir(parents=True, exist_ok=True)

    total_size_gb = sum(f.get("size", 0) for f in files) / (1024 ** 3)
    print(f"\nFull download: {len(files)} files, ~{total_size_gb:.1f} GB total")
    print("This may take a significant amount of time depending on your connection.")

    confirm = input("Proceed with full download? [y/N] ").strip().lower()
    if confirm != "y":
        print("Full download cancelled.")
        return

    for i, file_info in enumerate(files, 1):
        filename = file_info.get("key") or file_info.get("filename", f"file_{i}")
        url = file_info.get("links", {}).get("self") or file_info.get("links", {}).get("download")
        if not url:
            print(f"  Skipping {filename}: no download URL found.", file=sys.stderr)
            continue

        dest = dataset_dir / filename
        if dest.exists():
            print(f"  Skipping {filename}: already exists.")
            continue

        try:
            download_file(url, dest, label=f"[{i}/{len(files)}] {filename}")
        except Exception as exc:
            print(f"  ERROR downloading {filename}: {exc}", file=sys.stderr)

        time.sleep(0.5)  # polite rate limiting

    print(f"\nFull dataset saved to: {dataset_dir}")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Download CODEBRIM dataset from Zenodo (record 2620293).",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python download.py                          # Metadata only (fast)
  python download.py --full                   # Download all images (~2 GB)
  python download.py --output-dir ./data      # Custom output directory
        """,
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path(__file__).parent,
        help="Directory to save output files (default: script directory)",
    )
    parser.add_argument(
        "--full",
        action="store_true",
        help="Download full image dataset (~2 GB). Default: metadata only.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    print("=== DeepInspect CODEBRIM Downloader ===")
    print(f"Zenodo record: {ZENODO_RECORD_ID}")
    print(f"DOI: 10.5281/zenodo.{ZENODO_RECORD_ID}")
    print()

    args.output_dir.mkdir(parents=True, exist_ok=True)

    # Always fetch metadata
    record = fetch_record_metadata()
    summary = format_metadata_summary(record)

    metadata_path = args.output_dir / "metadata.json"
    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)

    print(f"\nMetadata saved to: {metadata_path}")
    print(f"\nRecord summary:")
    print(f"  Title:         {summary['title']}")
    print(f"  DOI:           {summary['doi']}")
    print(f"  Licence:       {summary['licence']}")
    print(f"  Files:         {len(summary['files'])}")
    print(f"  Total size:    {summary['total_size_gb']} GB")
    print(f"\nClass distribution:")
    for cls, info in CLASS_DISTRIBUTION.items():
        print(f"  {cls:<20} {info['count']:>5} patches  ({info['percentage']}%)")

    if summary["files"]:
        print(f"\nAvailable files:")
        for file_info in summary["files"]:
            print(f"  {file_info['filename']:<50} {file_info['size_mb']:>8.1f} MB")

    if args.full:
        download_full_dataset(record, args.output_dir)
    else:
        print(
            f"\nRun with --full to download all image files "
            f"({summary['total_size_gb']} GB)."
        )


if __name__ == "__main__":
    main()
