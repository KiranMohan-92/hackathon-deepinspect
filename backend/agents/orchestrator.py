import asyncio
import json
import uuid
from pathlib import Path

from models.bridge import ScanRequest, BridgeRiskReport
from models.infrastructure import (
    InfrastructureTarget,
    InfrastructureReport,
    ValidationResult,
    DamagesAssessment,
    EnvironmentAnalysis,
    FailureModeAnalysis,
    PriorityReport,
)
from models.events import AgentEvent
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


# ── New Analysis Pipeline (image upload flow) ──────────────────────────────
# This is the ADK-powered pipeline for direct image analysis.
# It does NOT modify the existing bridge scan flow above.


async def validate_input(
    image_bytes: bytes,
    image_mime: str = "image/jpeg",
    user_context: dict | None = None,
) -> ValidationResult:
    """
    Stage 1: Validate that the image is infrastructure and classify it.
    Uses the orchestrator prompt to reject non-infrastructure images.
    """
    from services.gemini_service import run_adk_agent, is_adk_available

    prompt_text = Path("prompts/orchestrator_prompt.txt").read_text()

    context_str = ""
    if user_context:
        context_str = f"\n\nUser-provided context: {json.dumps(user_context)}"

    try:
        if is_adk_available():
            from google.adk.agents import Agent
            from services.gemini_service import get_model_name

            validator = Agent(
                name="orchestrator_validator",
                model=get_model_name(),
                instruction=prompt_text,
            )
            data = await run_adk_agent(
                validator,
                f"Validate this infrastructure image.{context_str}",
                image_bytes=image_bytes,
                image_mime=image_mime,
            )
        else:
            # Fallback: raw Gemini
            from services.gemini_service import client, get_model_name
            from google.genai import types

            response = client.models.generate_content(
                model=get_model_name(),
                contents=types.Content(
                    role="user",
                    parts=[
                        types.Part.from_text(text=prompt_text + context_str),
                        types.Part.from_bytes(data=image_bytes, mime_type=image_mime),
                    ],
                ),
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.1,
                ),
            )
            from services.gemini_service import _parse_json_response
            data = _parse_json_response(response.text or "")

        return ValidationResult(**data)
    except (TimeoutError, ConnectionError, OSError) as e:
        # Fail open only on connectivity issues — analysis can still proceed
        print(f"[Orchestrator] Validation connectivity error (failing open): {e}")
        return ValidationResult(
            valid=True,
            structure_type="other",
            environment_category="terrestrial_civil",
        )
    except Exception as e:
        # Fail closed on parse/validation errors — reject the input
        print(f"[Orchestrator] Validation error (failing closed): {e}")
        return ValidationResult(
            valid=False,
            rejection_reason=f"Validation failed: {e}. Please try again.",
        )


async def analyze_image_vision(
    image_bytes: bytes,
    image_mime: str = "image/jpeg",
) -> DamagesAssessment:
    """
    Stage 2: Run vision analysis on the uploaded image.
    Returns damages with bounding boxes and confidence scores.
    """
    from services.gemini_service import run_adk_agent, is_adk_available

    vision_prompt = Path("prompts/vision_prompt.txt").read_text()

    try:
        if is_adk_available():
            from google.adk.agents import Agent
            from services.gemini_service import get_model_name

            vision_agent = Agent(
                name="vision_agent",
                model=get_model_name(),
                instruction="You are a structural engineering vision specialist. Analyze infrastructure photos for structural damage.",
            )
            data = await run_adk_agent(
                vision_agent,
                vision_prompt,
                image_bytes=image_bytes,
                image_mime=image_mime,
            )
        else:
            from services.gemini_service import client, get_model_name
            from google.genai import types

            response = client.models.generate_content(
                model=get_model_name(),
                contents=types.Content(
                    role="user",
                    parts=[
                        types.Part.from_text(text=vision_prompt),
                        types.Part.from_bytes(data=image_bytes, mime_type=image_mime),
                    ],
                ),
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.1,
                ),
            )
            from services.gemini_service import _parse_json_response
            data = _parse_json_response(response.text or "")

        # Handle both old DefectScore format and new DamagesAssessment format
        if "damages" in data:
            return DamagesAssessment(**data)
        else:
            # Convert old format to a summary for downstream agents
            return DamagesAssessment(
                damages=[],
                overall_pattern=data.get("visible_defects_summary", ""),
                overall_severity="MODERATE",
                overall_confidence=0.7,
                healthy_areas_noted="",
            )
    except Exception as e:
        print(f"[VisionAgent] Analysis error: {e}")
        return DamagesAssessment(
            overall_pattern="Vision analysis failed",
            overall_severity="MODERATE",
            overall_confidence=0.0,
        )


async def run_parallel_analysis(
    structure_type: str,
    environment_category: str,
    vision_summary: str,
    location: str | None = None,
) -> tuple[EnvironmentAnalysis, FailureModeAnalysis]:
    """
    Stage 3: Run Environment + Failure Mode agents in parallel.
    Uses ADK ParallelAgent when available, falls back to asyncio.gather().
    """
    from agents.environment_agent import analyze_environment
    from agents.failure_mode_agent import analyze_failure_mode

    # Run Environment first (fast), then feed its output into Failure Mode
    # This is sequential but ensures Failure Mode has full environmental context
    print("[Orchestrator] Running Environment Agent...")
    env_result = await analyze_environment(structure_type, environment_category, location)

    env_summary = json.dumps(env_result.model_dump(), default=str) if env_result.stressors else ""

    print("[Orchestrator] Running Failure Mode Agent (with environment context)...")
    failure_result = await analyze_failure_mode(
        structure_type, environment_category, vision_summary, env_summary
    )

    return env_result, failure_result


async def run_analysis_pipeline(
    image_bytes: bytes,
    image_mime: str = "image/jpeg",
    user_context: dict | None = None,
) -> InfrastructureReport:
    """
    Full 5-stage analysis pipeline for direct image upload:
      1. Orchestrator — validates input, classifies structure
      2. Vision — damage detection with bounding boxes + confidence
      3. Environment + Failure Mode — parallel analysis
      4. Priority — risk synthesis with consistency validation

    This is the NEW pipeline. The existing run_pipeline() for bridge
    scanning is unchanged and continues to work independently.
    """
    from agents.priority_agent import synthesize_priority

    target_id = f"upload_{uuid.uuid4().hex[:12]}"

    # Stage 1: Validate input
    print("[Orchestrator] Stage 1: Validating input...")
    validation = await validate_input(image_bytes, image_mime, user_context)

    if not validation.valid:
        print(f"[Orchestrator] Input rejected: {validation.rejection_reason}")
        target = InfrastructureTarget(id=target_id)
        return InfrastructureReport(target=target, validation=validation)

    structure_type = validation.structure_type or "other"
    environment_category = validation.environment_category or "terrestrial_civil"
    location = (user_context or {}).get("location")

    target = InfrastructureTarget(
        id=target_id,
        structure_type=structure_type,
        environment_category=environment_category,
        location=location,
        age_years=_parse_age(user_context),
    )

    print(f"[Orchestrator] Validated: {structure_type} in {environment_category}")

    # Stage 2: Vision analysis
    print("[Orchestrator] Stage 2: Running vision analysis...")
    vision_result = await analyze_image_vision(image_bytes, image_mime)
    vision_summary = json.dumps(vision_result.model_dump(), default=str)
    print(f"[Orchestrator] Vision: {len(vision_result.damages)} damages found, "
          f"severity={vision_result.overall_severity}")

    # Stage 3: Parallel analysis (Environment + Failure Mode)
    print("[Orchestrator] Stage 3: Running parallel analysis...")
    env_result, failure_result = await run_parallel_analysis(
        structure_type, environment_category, vision_summary, location
    )
    print(f"[Orchestrator] Environment: {len(env_result.stressors)} stressors")
    print(f"[Orchestrator] Failure Mode: {failure_result.failure_mode}")

    # Stage 4: Priority synthesis
    print("[Orchestrator] Stage 4: Synthesizing priority report...")
    env_output = json.dumps(env_result.model_dump(), default=str)
    failure_output = json.dumps(failure_result.model_dump(), default=str)

    priority_result = await synthesize_priority(
        structure_type, environment_category,
        vision_summary, env_output, failure_output
    )
    print(f"[Orchestrator] Priority: {priority_result.risk_tier} "
          f"(composite={priority_result.risk_matrix.composite})")

    # Assemble final report
    report = InfrastructureReport(
        target=target,
        validation=validation,
        vision=vision_result,
        environment=env_result,
        failure_mode=failure_result,
        priority=priority_result,
    )

    print(f"[Orchestrator] Analysis complete. Risk tier: {priority_result.risk_tier}")
    return report


def _parse_age(context: dict | None) -> int | None:
    """Extract age_years from user context if provided."""
    if not context:
        return None
    age = context.get("age")
    if age is None:
        return None
    try:
        return int(str(age).strip().rstrip("yYears "))
    except (ValueError, TypeError):
        return None
