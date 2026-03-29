import asyncio
import base64
import json
import os
from pathlib import Path

from fastapi import FastAPI, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse

from agents.orchestrator import run_pipeline, run_single_analysis
from config import settings
from models.bridge import BridgeRiskReport, BridgeSummary, BridgeTarget, ScanRequest

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


@app.post("/api/scan")
async def scan_bridges(request: ScanRequest):
    """
    Bridge discovery — streams SSE progress events then a final 'complete' event.
    Event format:  data: {"type": "progress"|"complete"|"error", ...}\n\n
    """
    from agents.discovery_agent import run_discovery

    queue: asyncio.Queue = asyncio.Queue()

    async def on_progress(msg: dict):
        await queue.put({"type": "progress", **msg})

    async def run():
        try:
            summaries = await run_discovery(
                request.query, request.query_type, request.bbox, on_progress=on_progress
            )
            if request.max_bridges:
                summaries = summaries[: request.max_bridges]
            await queue.put({
                "type": "complete",
                "bridges": [s.model_dump() for s in summaries],
            })
        except Exception as e:
            await queue.put({"type": "error", "message": str(e)})
        finally:
            await queue.put(None)  # sentinel

    asyncio.create_task(run())

    async def stream():
        while True:
            item = await queue.get()
            if item is None:
                break
            yield f"data: {json.dumps(item)}\n\n"

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.post("/api/bridges/{osm_id}/analyze")
async def analyze_bridge_detail(osm_id: str, summary: BridgeSummary):
    """
    Deep analysis for a single bridge. Streams SSE events:
      {"type": "thinking", "stage": "vision"|"context"|"risk", "steps": [...]}
      {"type": "complete", "report": {...}}
      {"type": "error", "message": "..."}
    """
    if summary.osm_id != osm_id:
        raise HTTPException(status_code=400, detail="osm_id in path must match body")

    queue: asyncio.Queue = asyncio.Queue()

    async def on_progress(msg: dict):
        await queue.put(msg)

    async def run():
        try:
            report = await run_single_analysis(summary, progress_callback=on_progress)
            await queue.put({"type": "complete", "report": json.loads(report.model_dump_json())})
        except Exception as e:
            await queue.put({"type": "error", "message": str(e)})
        finally:
            await queue.put(None)  # sentinel

    asyncio.create_task(run())

    async def stream():
        while True:
            item = await queue.get()
            if item is None:
                break
            yield f"data: {json.dumps(item)}\n\n"

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


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
    headings = [0, 60, 120, 180, 240, 300]
    available = [h for h in headings if (cache_dir / f"{osm_id}_{h}.jpg").exists()]
    return {
        "osm_id": osm_id,
        "images": [{"heading": h, "url": f"/api/images/{osm_id}/{h}"} for h in available],
    }
