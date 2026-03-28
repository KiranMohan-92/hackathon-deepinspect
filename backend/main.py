import asyncio
import base64
import json
import os
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sse_starlette.sse import EventSourceResponse

from agents.orchestrator import (
    run_pipeline,
    validate_input,
    analyze_image_vision,
)
from agents.priority_agent import synthesize_priority
from config import settings
from models.bridge import BridgeRiskReport, BridgeTarget, ScanRequest
from models.infrastructure import InfrastructureTarget, InfrastructureReport
from services.sse_service import (
    thinking_event,
    complete_event,
    error_event,
    format_sse_done,
)

app = FastAPI(title="DeepInspect API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "model": settings.GEMINI_MODEL}


@app.post("/api/scan", response_model=list[BridgeRiskReport])
async def scan_bridges(request: ScanRequest):
    """Main endpoint. Accepts city name, bridge name, or GPS coordinates."""
    try:
        reports = await run_pipeline(request)
        return reports
    except Exception as e:
        print(f"[API] Scan error: {e}")
        raise HTTPException(status_code=500, detail="Analysis failed. Please try again.")


@app.get("/api/demo", response_model=list[BridgeRiskReport])
async def demo_data():
    """
    Returns pre-computed demo results from cache.
    Use this during live demos — zero API latency.
    Run scripts/precompute_demo.py first to populate the cache.
    """
    cache_path = Path("data/demo_cache/wroclaw.json")
    if not cache_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Demo cache not found. Run: python scripts/precompute_demo.py",
        )
    with open(cache_path) as f:
        data = json.load(f)
    return data


@app.post("/api/analyze-image")
async def analyze_uploaded_image(file: UploadFile):
    """
    Direct image upload — no bridge discovery, immediate vision analysis.
    Returns raw VisualAssessment JSON.
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    image_bytes = await file.read()

    from services.gemini_service import json_config, vision_model

    prompt_text = Path("prompts/vision_prompt.txt").read_text()
    parts = [
        {"text": prompt_text},
        {
            "inline_data": {
                "mime_type": file.content_type,
                "data": base64.b64encode(image_bytes).decode(),
            }
        },
    ]
    try:
        response = vision_model.generate_content(parts, generation_config=json_config)
        return json.loads(response.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/images/{osm_id}/{heading}")
async def get_bridge_image(osm_id: str, heading: int):
    """Serve a cached Street View image for a bridge."""
    image_path = Path(settings.STREETVIEW_CACHE_DIR) / f"{osm_id}_{heading}.jpg"
    if not image_path.exists():
        raise HTTPException(status_code=404, detail="Image not cached for this bridge/heading")
    return FileResponse(image_path, media_type="image/jpeg")


@app.get("/api/bridges/{osm_id}/images")
async def list_bridge_images(osm_id: str):
    """List available cached Street View headings for a bridge."""
    cache_dir = Path(settings.STREETVIEW_CACHE_DIR)
    headings = [0, 90, 270]
    available = [h for h in headings if (cache_dir / f"{osm_id}_{h}.jpg").exists()]
    return {
        "osm_id": osm_id,
        "images": [{"heading": h, "url": f"/api/images/{osm_id}/{h}"} for h in available],
    }


# ── SSE Streaming Endpoints (new — does not modify existing endpoints above) ──


@app.post("/api/analyze")
async def analyze_infrastructure(
    file: UploadFile,
    context: Optional[str] = Form(None),
):
    """
    Full multi-agent analysis pipeline with real-time SSE streaming.

    Accepts an infrastructure image + optional context JSON. Streams agent
    events as each stage completes:
      1. orchestrator — validates input, classifies structure
      2. vision — damage detection with bounding boxes + confidence
      3. environment — environmental stressors (Search grounding)
      4. failure_mode — failure classification + historical precedents
      5. priority — risk matrix + consistency validation

    Returns EventSourceResponse with events in the format:
      data: {"agent": "vision", "status": "complete", "payload": {...}, "timestamp": 1711612815000}
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    image_bytes = await file.read()
    image_mime = file.content_type

    # Parse optional context JSON
    user_context = None
    if context:
        try:
            user_context = json.loads(context)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid context JSON")

    async def event_generator():
        # Stage 1: Orchestrator — validate input
        yield thinking_event("orchestrator", "Validating infrastructure image...")

        validation = await validate_input(image_bytes, image_mime, user_context)

        if not validation.valid:
            yield error_event("orchestrator", validation.rejection_reason or "Invalid input")
            yield format_sse_done()
            return

        yield complete_event("orchestrator", validation.model_dump())

        structure_type = validation.structure_type or "other"
        environment_category = validation.environment_category or "terrestrial_civil"
        location = (user_context or {}).get("location")

        # Stage 2: Vision — damage detection
        yield thinking_event("vision", "Analyzing structural damage with bounding boxes...")

        vision_result = await analyze_image_vision(image_bytes, image_mime)
        vision_summary = json.dumps(vision_result.model_dump(), default=str)

        yield complete_event("vision", vision_result.model_dump())

        # Stage 3: Environment → Failure Mode (sequential — failure mode needs env context)
        yield thinking_event("environment", "Analyzing environmental stressors...")

        try:
            from agents.environment_agent import analyze_environment
            from agents.failure_mode_agent import analyze_failure_mode

            env_result = await analyze_environment(structure_type, environment_category, location)
            yield complete_event("environment", env_result.model_dump())

            env_summary = json.dumps(env_result.model_dump(), default=str) if env_result.stressors else ""
            yield thinking_event("failure_mode", "Researching failure modes and precedents...")

            failure_result = await analyze_failure_mode(
                structure_type, environment_category, vision_summary, env_summary
            )
            yield complete_event("failure_mode", failure_result.model_dump())
        except Exception as e:
            yield error_event("environment", f"Analysis failed: {e}")
            yield error_event("failure_mode", f"Analysis failed: {e}")
            # Create empty fallback results for priority agent
            from models.infrastructure import EnvironmentAnalysis, FailureModeAnalysis
            env_result = EnvironmentAnalysis()
            failure_result = FailureModeAnalysis()

        # Stage 4: Priority — risk synthesis
        yield thinking_event("priority", "Synthesizing risk assessment...")

        env_output = json.dumps(env_result.model_dump(), default=str)
        failure_output = json.dumps(failure_result.model_dump(), default=str)

        try:
            priority_result = await synthesize_priority(
                structure_type, environment_category,
                vision_summary, env_output, failure_output
            )
            yield complete_event("priority", priority_result.model_dump())
        except Exception as e:
            yield error_event("priority", f"Risk synthesis failed: {e}")

        # Done
        yield format_sse_done()

    return EventSourceResponse(event_generator())


@app.post("/api/analyze-demo")
async def analyze_demo(scenario: str = "bridge"):
    """
    Streams pre-cached SSE events for demo scenarios.
    Simulates real-time agent activity with artificial delays.

    Supported scenarios: "bridge", "satellite", "subsea"
    """
    VALID_SCENARIOS = {"bridge", "satellite", "subsea"}
    if scenario not in VALID_SCENARIOS:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown scenario '{scenario}'. Valid: {sorted(VALID_SCENARIOS)}",
        )
    cache_path = Path(__file__).parent / "data" / "demo_cache" / f"{scenario}.json"
    if not cache_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Demo cache not found for scenario '{scenario}'. Run precompute_demo.py first.",
        )

    with open(cache_path) as f:
        cached_events = json.load(f)

    async def event_generator():
        for event_data in cached_events:
            # Simulate real-time delays between agent stages
            status = event_data.get("status", "")
            if status == "thinking":
                await asyncio.sleep(0.5)
            elif status == "complete":
                await asyncio.sleep(1.5)

            yield {
                "event": "agent_event",
                "data": json.dumps(event_data),
            }

        yield format_sse_done()

    return EventSourceResponse(event_generator())
