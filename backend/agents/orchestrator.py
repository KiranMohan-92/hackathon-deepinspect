import asyncio
from models.bridge import ScanRequest, BridgeRiskReport, BridgeSummary
from agents.discovery_agent import run_discovery, summary_to_target
from agents.vision_agent import run_vision_batch, analyze_bridge
from agents.context_agent import get_bridge_context
from agents.risk_agent import generate_report
from agents.hydrological_agent import assess_scour
from agents.structural_type_agent import assess_structural_type
from agents.degradation_agent import assess_degradation
from config import settings


async def run_single_analysis(summary: BridgeSummary, progress_callback=None) -> BridgeRiskReport:
    """
    On-demand deep analysis for a single bridge.
    Called when user clicks 'Run Deep Analysis' on the frontend.

    Execution graph:
      Step 1 (parallel): HydrologicalAgent + VisionAgent + ContextAgent
      Step 2 (sequential): StructuralTypeAgent (needs vision + context)
      Step 3 (sequential): DegradationAgent (needs context + vision)
      Step 4 (sequential): RiskAgent (needs all sub-assessments)
    """
    bridge = summary_to_target(summary)
    print(f"[Orchestrator] Analysing bridge {bridge.osm_id} ({bridge.name or 'unnamed'})")

    # Step 1: Vision + Context + Hydrological in parallel
    (visual, per_heading), ctx, scour = await asyncio.gather(
        analyze_bridge(bridge, progress_callback=progress_callback),
        get_bridge_context(bridge, progress_callback=progress_callback),
        _safe_assess_scour(bridge, progress_callback),
    )

    # Step 2: Structural type (needs vision + context results)
    structural = await _safe_assess_structural_type(bridge, visual, ctx, progress_callback)

    # Step 3: Degradation (needs context + vision)
    degradation = await _safe_assess_degradation(bridge, ctx, visual, progress_callback)

    # Step 4: Risk report (needs all sub-assessments)
    report = await generate_report(
        bridge, visual, ctx, per_heading,
        scour=scour,
        structural=structural,
        degradation=degradation,
        progress_callback=progress_callback,
    )
    print(f"[Orchestrator] Analysis complete: {bridge.osm_id} → {report.risk_tier} ({report.risk_score})")
    return report


async def _safe_assess_scour(bridge, progress_callback):
    """Run HydrologicalAgent; return None on failure to keep pipeline running."""
    try:
        return await assess_scour(bridge, progress_callback=progress_callback)
    except Exception as e:
        print(f"[Orchestrator] HydrologicalAgent failed for {bridge.osm_id}: {e}")
        return None


async def _safe_assess_structural_type(bridge, visual, context, progress_callback):
    """Run StructuralTypeAgent; return None on failure to keep pipeline running."""
    try:
        return await assess_structural_type(
            bridge, visual, context, progress_callback=progress_callback
        )
    except Exception as e:
        print(f"[Orchestrator] StructuralTypeAgent failed for {bridge.osm_id}: {e}")
        return None


async def _safe_assess_degradation(bridge, context, visual, progress_callback):
    """Run DegradationAgent; return None on failure to keep pipeline running."""
    try:
        from models.context import BridgeContext
        ctx = context or BridgeContext()
        return await assess_degradation(
            bridge, ctx, visual, progress_callback=progress_callback
        )
    except Exception as e:
        print(f"[Orchestrator] DegradationAgent failed for {bridge.osm_id}: {e}")
        return None


async def run_pipeline(request: ScanRequest) -> list[BridgeRiskReport]:
    """
    Full pipeline:
      1. Discovery  — find bridges via Overpass / geocoding
      2. Vision     — parallel Street View + Gemini vision per bridge
      3. Context    — parallel Gemini text context per bridge
      4. Scour      — parallel hydrological assessment per bridge
      5. Structural — sequential per-bridge structural type classification
      6. Degradation — sequential per-bridge degradation assessment
      7. Risk       — fuse scores, generate narrative reports
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

    # Stage 4: Hydrological in parallel with vision + context
    scour_sem = asyncio.Semaphore(5)

    async def get_scour(b):
        async with scour_sem:
            result = await _safe_assess_scour(b, None)
            return b.osm_id, result

    scour_task = asyncio.gather(*[get_scour(b) for b in bridges])

    vision_results, context_pairs, scour_pairs = await asyncio.gather(
        vision_task, context_task, scour_task
    )
    context_results = dict(context_pairs)
    scour_results = dict(scour_pairs)

    covered = sum(1 for v, _ in vision_results.values() if v is not None)
    print(f"[Orchestrator] Vision done. Street View coverage: {covered}/{len(bridges)} bridges")

    # Stage 5: Structural type (sequential per bridge, needs vision + context)
    structural_sem = asyncio.Semaphore(3)

    async def get_structural(b):
        async with structural_sem:
            visual = vision_results[b.osm_id][0] if b.osm_id in vision_results else None
            ctx = context_results.get(b.osm_id)
            result = await _safe_assess_structural_type(b, visual, ctx, None)
            return b.osm_id, result

    structural_pairs = await asyncio.gather(*[get_structural(b) for b in bridges])
    structural_results = dict(structural_pairs)

    # Stage 6: Degradation (sequential per bridge, needs context + vision)
    degradation_sem = asyncio.Semaphore(3)

    async def get_degradation(b):
        async with degradation_sem:
            ctx = context_results.get(b.osm_id)
            visual = vision_results[b.osm_id][0] if b.osm_id in vision_results else None
            result = await _safe_assess_degradation(b, ctx, visual, None)
            return b.osm_id, result

    degradation_pairs = await asyncio.gather(*[get_degradation(b) for b in bridges])
    degradation_results = dict(degradation_pairs)

    # Stage 7: Generate risk reports
    report_tasks = [
        generate_report(
            b,
            vision_results[b.osm_id][0] if b.osm_id in vision_results else None,
            context_results.get(b.osm_id),
            vision_results[b.osm_id][1] if b.osm_id in vision_results else {},
            scour=scour_results.get(b.osm_id),
            structural=structural_results.get(b.osm_id),
            degradation=degradation_results.get(b.osm_id),
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
