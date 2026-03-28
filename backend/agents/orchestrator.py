import asyncio
from models.bridge import ScanRequest, BridgeRiskReport
from agents.discovery_agent import run_discovery
from agents.vision_agent import run_vision_batch
from agents.context_agent import get_bridge_context
from agents.risk_agent import generate_report
from config import settings


async def run_pipeline(request: ScanRequest) -> list[BridgeRiskReport]:
    """
    Full 4-stage pipeline:
      1. Discovery  — find bridges via Overpass / geocoding
      2. Vision     — parallel Street View + Gemini vision per bridge
      3. Context    — parallel Gemini text context per bridge
      4. Risk       — fuse scores, generate narrative reports
    """
    print(f"[Orchestrator] Starting scan: query={request.query!r}, type={request.query_type}")

    # Stage 1: Discover bridges
    bridges = await run_discovery(request.query, request.query_type, request.bbox)
    bridges = bridges[:request.max_bridges]
    print(f"[Orchestrator] Discovered {len(bridges)} bridges")

    if not bridges:
        return []

    # Stage 2 & 3: Vision + Context in parallel (both are I/O-bound)
    vision_task = run_vision_batch(bridges)

    context_sem = asyncio.Semaphore(5)

    async def get_ctx(b):
        async with context_sem:
            return b.osm_id, await get_bridge_context(b)

    context_task = asyncio.gather(*[get_ctx(b) for b in bridges])

    vision_results, context_pairs = await asyncio.gather(vision_task, context_task)
    context_results = dict(context_pairs)

    print(f"[Orchestrator] Vision done. Street View coverage: "
          f"{sum(1 for v in vision_results.values() if v is not None)}/{len(bridges)} bridges")

    # Stage 4: Generate risk reports
    report_tasks = [
        generate_report(
            b,
            vision_results.get(b.osm_id),
            context_results.get(b.osm_id),
        )
        for b in bridges
    ]
    raw_results = await asyncio.gather(*report_tasks, return_exceptions=True)
    reports = [r for r in raw_results if isinstance(r, BridgeRiskReport)]
    failed = len(raw_results) - len(reports)
    if failed:
        print(f"[Orchestrator] {failed} report(s) failed and were skipped.")

    # Sort by risk score descending (most critical first)
    reports.sort(key=lambda r: r.risk_score, reverse=True)
    print(f"[Orchestrator] Pipeline complete. {len(reports)} reports generated.")
    return reports
