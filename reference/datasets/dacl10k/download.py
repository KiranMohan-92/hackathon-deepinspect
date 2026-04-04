#!/usr/bin/env python3
"""
download.py — Download DACL10K dataset from HuggingFace.

By default, downloads only dataset metadata (fast).
Use --full to clone the full dataset via git-lfs (~15 GB).

Usage:
    python download.py [--output-dir DIR] [--full]

Requirements:
    Python 3.11+, requests (pip install requests)
    For --full: git and git-lfs must be installed

Dataset:
    phiyodr/dacl10k on HuggingFace
    https://huggingface.co/datasets/phiyodr/dacl10k
    Licence: CC BY 4.0
"""

import argparse
import json
import shutil
import subprocess
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

HF_DATASET_ID = "phiyodr/dacl10k"
HF_API_URL = f"https://huggingface.co/api/datasets/{HF_DATASET_ID}"
HF_REPO_URL = f"https://huggingface.co/datasets/{HF_DATASET_ID}"

HEADERS = {
    "User-Agent": "DeepInspect/3.0 (bridge-research)",
    "Accept": "application/json",
}

MAX_RETRIES = 3
BACKOFF_BASE = 2.0

# Official class taxonomy from the DACL10K paper (WACV 2024)
DACL10K_CLASSES = {
    "damage_types": [
        {"id": 0,  "name": "Crack",           "description": "Surface or structural cracking"},
        {"id": 1,  "name": "Spalling",         "description": "Concrete surface delamination"},
        {"id": 2,  "name": "Efflorescence",    "description": "White salt deposits from water infiltration"},
        {"id": 3,  "name": "ExposedRebar",     "description": "Visible reinforcement steel"},
        {"id": 4,  "name": "Rust",             "description": "Iron oxide corrosion on metal elements"},
        {"id": 5,  "name": "Graffiti",         "description": "Surface vandalism (cosmetic)"},
        {"id": 6,  "name": "BearingCorrosion", "description": "Corrosion on bearing elements"},
        {"id": 7,  "name": "SteelCorrosion",   "description": "Corrosion on structural steel members"},
        {"id": 8,  "name": "ConcreteCrumbling","description": "Advanced concrete disintegration"},
        {"id": 9,  "name": "WaterLeakage",     "description": "Active water seepage through structure"},
        {"id": 10, "name": "ChemicalDeposit",  "description": "Non-calcium chemical staining"},
        {"id": 11, "name": "SealantDamage",    "description": "Deteriorated expansion joint sealant"},
        {"id": 12, "name": "Joint",            "description": "Damaged or misaligned expansion joints"},
    ],
    "structural_objects": [
        {"id": 13, "name": "Railing",        "description": "Bridge safety railing elements"},
        {"id": 14, "name": "Drain",          "description": "Drainage outlets and gutters"},
        {"id": 15, "name": "ExpansionJoint", "description": "Structural expansion joint assemblies"},
        {"id": 16, "name": "Bearing",        "description": "Bearing pad and support assemblies"},
        {"id": 17, "name": "Curb",           "description": "Kerb and edge beam elements"},
        {"id": 18, "name": "Vegetation",     "description": "Plant growth (moisture indicator)"},
    ],
}

DEEPINSPECT_MAPPING = {
    "Crack":           "structural_crack (severity: high)",
    "Spalling":        "spalling (severity: medium-high)",
    "ExposedRebar":    "exposed_rebar (severity: critical)",
    "ConcreteCrumbling": "advanced_deterioration (severity: critical)",
    "SteelCorrosion":  "corrosion (severity: high)",
    "Rust":            "corrosion (severity: high)",
    "BearingCorrosion": "bearing_damage (severity: critical)",
    "WaterLeakage":    "water_damage (severity: medium)",
    "Efflorescence":   "water_damage (severity: low-medium)",
    "SealantDamage":   "expansion_joint_damage (severity: medium)",
    "Joint":           "expansion_joint_damage (severity: medium)",
    "Graffiti":        "ignored",
    "ChemicalDeposit": "chemical_damage (severity: low)",
    "Vegetation":      "moisture_indicator (severity: low)",
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


# ---------------------------------------------------------------------------
# Metadata fetch
# ---------------------------------------------------------------------------

def fetch_dataset_metadata() -> dict:
    """Fetch dataset metadata from HuggingFace API."""
    print(f"Fetching metadata for {HF_DATASET_ID}...")
    data = get_json(HF_API_URL)
    return data


def format_metadata_summary(raw: dict) -> dict:
    """Extract relevant fields from the HuggingFace API response."""
    card_data = raw.get("cardData", {}) or {}
    tags = raw.get("tags", [])

    # Extract dataset size info if present
    dataset_info = raw.get("datasetInfo", {}) or {}
    splits_info = {}
    for split_name, split_data in dataset_info.get("splits", {}).items():
        splits_info[split_name] = {
            "num_examples": split_data.get("numExamples"),
            "num_bytes": split_data.get("numBytes"),
        }

    return {
        "huggingface_id": HF_DATASET_ID,
        "dataset_url": f"https://huggingface.co/datasets/{HF_DATASET_ID}",
        "api_url": HF_API_URL,
        "repo_url": HF_REPO_URL,
        "title": raw.get("id", HF_DATASET_ID),
        "author": raw.get("author"),
        "created_at": raw.get("createdAt"),
        "last_modified": raw.get("lastModified"),
        "likes": raw.get("likes"),
        "downloads": raw.get("downloads"),
        "tags": tags,
        "licence": card_data.get("license"),
        "language": card_data.get("language"),
        "splits": splits_info,
        "approximate_size_gb": 15,  # ~15 GB as documented
        "paper_title": "DACL10K: Benchmark for Semantic Bridge Damage Segmentation",
        "paper_venue": "WACV 2024",
        "class_taxonomy": DACL10K_CLASSES,
        "total_classes": (
            len(DACL10K_CLASSES["damage_types"]) +
            len(DACL10K_CLASSES["structural_objects"])
        ),
        "deepinspect_mapping": DEEPINSPECT_MAPPING,
        "deepinspect_notes": {
            "primary_use": "Semantic segmentation training and evaluation",
            "structural_objects_use": "Context-aware damage localization",
            "recommended_splits": {
                "deepinspect_train": "train (80% of DACL10K train split)",
                "deepinspect_val": "validation (20% of DACL10K train split)",
                "deepinspect_test": "test (held out, compare with official leaderboard)",
            },
        },
    }


# ---------------------------------------------------------------------------
# Full clone via git-lfs
# ---------------------------------------------------------------------------

def check_git_dependencies() -> tuple[bool, bool]:
    """Check if git and git-lfs are available."""
    git_ok = shutil.which("git") is not None
    git_lfs_ok = False

    if git_ok:
        try:
            result = subprocess.run(
                ["git", "lfs", "version"],
                capture_output=True, text=True, timeout=10
            )
            git_lfs_ok = result.returncode == 0
        except (subprocess.TimeoutExpired, FileNotFoundError):
            pass

    return git_ok, git_lfs_ok


def clone_full_dataset(output_dir: Path) -> None:
    """Clone the full DACL10K dataset using git-lfs."""
    git_ok, git_lfs_ok = check_git_dependencies()

    if not git_ok:
        sys.exit(
            "ERROR: git is not installed. Install git to use --full.\n"
            "  Ubuntu/Debian: sudo apt install git\n"
            "  macOS: brew install git"
        )

    if not git_lfs_ok:
        sys.exit(
            "ERROR: git-lfs is not installed. Install git-lfs to use --full.\n"
            "  Ubuntu/Debian: sudo apt install git-lfs && git lfs install\n"
            "  macOS: brew install git-lfs && git lfs install\n"
            "  Windows: https://git-lfs.github.com/"
        )

    clone_dir = output_dir / "dacl10k"
    if clone_dir.exists():
        print(f"\nDataset directory already exists: {clone_dir}")
        print("Delete it and re-run to re-clone.")
        return

    print(f"\nCloning DACL10K (~15 GB) from HuggingFace...")
    print(f"Destination: {clone_dir}")
    print("\nThis will take a long time depending on your connection.")

    confirm = input("Proceed with full clone? [y/N] ").strip().lower()
    if confirm != "y":
        print("Full clone cancelled.")
        return

    try:
        # Enable git-lfs for this clone
        env_cmd = ["git", "lfs", "install"]
        subprocess.run(env_cmd, check=True, timeout=30)

        # Clone the repo
        clone_cmd = [
            "git", "clone",
            f"https://huggingface.co/datasets/{HF_DATASET_ID}",
            str(clone_dir),
        ]
        print(f"Running: {' '.join(clone_cmd)}")
        result = subprocess.run(
            clone_cmd,
            timeout=3600,  # 1 hour timeout
            check=True,
        )

        print(f"\nDataset cloned to: {clone_dir}")
        print("Directory structure:")
        for item in sorted(clone_dir.iterdir()):
            print(f"  {item.name}/")

    except subprocess.CalledProcessError as exc:
        sys.exit(f"ERROR: git clone failed with exit code {exc.returncode}")
    except subprocess.TimeoutExpired:
        sys.exit("ERROR: git clone timed out after 1 hour.")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Download DACL10K dataset from HuggingFace.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python download.py                          # Metadata only (fast)
  python download.py --full                   # Clone full dataset (~15 GB)
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
        help="Clone full dataset via git-lfs (~15 GB). Default: metadata only.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    print("=== DeepInspect DACL10K Downloader ===")
    print(f"Dataset: {HF_DATASET_ID}")
    print(f"URL: https://huggingface.co/datasets/{HF_DATASET_ID}")
    print()

    args.output_dir.mkdir(parents=True, exist_ok=True)

    # Always fetch metadata
    try:
        raw = fetch_dataset_metadata()
        summary = format_metadata_summary(raw)
    except Exception as exc:
        print(f"WARNING: Could not fetch live metadata ({exc}).", file=sys.stderr)
        print("Writing static metadata from known dataset properties...")
        summary = format_metadata_summary({})

    metadata_path = args.output_dir / "metadata.json"
    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)

    print(f"Metadata saved to: {metadata_path}")
    print(f"\nDataset summary:")
    print(f"  HuggingFace ID:  {summary['huggingface_id']}")
    print(f"  Licence:         {summary.get('licence', 'CC BY 4.0')}")
    print(f"  Total classes:   {summary['total_classes']}")
    print(f"  Approx. size:    ~{summary['approximate_size_gb']} GB")

    print(f"\nClass taxonomy:")
    print(f"  Damage types ({len(DACL10K_CLASSES['damage_types'])}):")
    for cls in DACL10K_CLASSES["damage_types"]:
        mapping = DEEPINSPECT_MAPPING.get(cls["name"], "—")
        print(f"    {cls['name']:<22} -> {mapping}")
    print(f"  Structural objects ({len(DACL10K_CLASSES['structural_objects'])}):")
    for cls in DACL10K_CLASSES["structural_objects"]:
        print(f"    {cls['name']:<22}    (context for damage localization)")

    if args.full:
        clone_full_dataset(args.output_dir)
    else:
        git_ok, git_lfs_ok = check_git_dependencies()
        if not git_ok or not git_lfs_ok:
            missing = []
            if not git_ok:
                missing.append("git")
            if not git_lfs_ok:
                missing.append("git-lfs")
            print(
                f"\nNote: --full requires {' and '.join(missing)} "
                f"(not currently installed)."
            )
        else:
            print(
                f"\nRun with --full to clone the full dataset "
                f"(~{summary['approximate_size_gb']} GB via git-lfs)."
            )


if __name__ == "__main__":
    main()
