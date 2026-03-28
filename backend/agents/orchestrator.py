import asyncio
from models.bridge import ScanRequest, BridgeRiskReport, BridgeSummary
from agents.discovery_agent import run_discovery, summary_to_target
from agents.vision_agent import run_vision_batch, analyze_bridge
from agents.context_agent import get_bridge_context
from agents.risk_agent import generate_report
from config import settings


async def run_single_analysis(summary: BridgeSummary) -> BridgeRiskReport:
    """
    On-demand deep analysis for a single bridge.
    Called when user clicks 'Run Deep Analysis' on the frontend.
    """
    bridge = summary_to_target(summary)
    print(f"[Orchestrator] Analysing bridge {bridge.osm_id} ({bridge.name or 'unnamed'})")

    # Vision + Context in parallel
    (visual, per_heading), ctx = await asyncio.gather(
        analyze_bridge(bridge),
        get_bridge_context(bridge),
    )

    report = await generate_report(bridge, visual, ctx, per_heading)
    print(f"[Orchestrator] Analysis complete: {bridge.osm_id} → {report.risk_tier} ({report.risk_score})")
    return report


async def run_pipeline(request: ScanRequest) -> list[BridgeRiskReport]:
    """
    Full 4-stage pipeline:
      1. Discovery  — find bridges via Overpass / geocoding
      2. Vision     — parallel Street View + Gemini vision per bridge
      3. Context    — parallel Gemini text context per bridge
      4. Risk       — fuse scores, generate narrative reports
    """
    print(f"[Orchestrator] Starting scan: query={request.query!r}, type={request.query_type}")

    # Stage 1: Discover bridges (returns BridgeSummary, convert to BridgeTarget)
    summaries = await run_discovery(request.query, request.query_type, request.bbox)
    summaries = summaries[:request.max_bridges]
    bridges = [summary_to_target(s) for s in summaries]
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

    covered = sum(1 for v, _ in vision_results.values() if v is not None)
    print(f"[Orchestrator] Vision done. Street View coverage: {covered}/{len(bridges)} bridges")

    # Stage 4: Generate risk reports
    report_tasks = [
        generate_report(
            b,
            vision_results[b.osm_id][0] if b.osm_id in vision_results else None,
            context_results.get(b.osm_id),
            vision_results[b.osm_id][1] if b.osm_id in vision_results else {},
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
