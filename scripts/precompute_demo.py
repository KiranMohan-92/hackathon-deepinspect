"""
Pre-compute and cache Wrocław bridge data for live demos.
Run BEFORE the hackathon demo to eliminate API latency during presentation.

Usage:
    cd deepinspect
    python scripts/precompute_demo.py

Output: backend/data/demo_cache/wroclaw.json
"""
import asyncio
import json
import os
import sys

# Add backend to path so we can import its modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../backend"))

from agents.orchestrator import run_pipeline
from models.bridge import ScanRequest
from pathlib import Path


async def main():
    print("Scanning Wrocław bridges — this will take 3–8 minutes on first run...")
    print("Street View images are cached to disk, so subsequent runs are faster.\n")

    request = ScanRequest(query="Wrocław", query_type="city_scan", max_bridges=30)
    reports = await run_pipeline(request)

    output_path = Path("backend/data/demo_cache/wroclaw.json")
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(
            [r.model_dump(mode="json") for r in reports],
            f,
            indent=2,
            default=str,
        )

    print(f"\nSaved {len(reports)} bridge reports to {output_path}")

    tiers = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "OK": 0}
    for r in reports:
        tiers[r.risk_tier] += 1

    print("Risk distribution:")
    for tier, count in tiers.items():
        bar = "█" * count
        print(f"  {tier:<10} {bar} ({count})")

    print("\nDemo cache ready. Use GET /api/demo endpoint during the presentation.")


if __name__ == "__main__":
    asyncio.run(main())
