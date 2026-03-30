from fastapi import APIRouter, UploadFile, Request
from fastapi.responses import StreamingResponse, JSONResponse
from pathlib import Path
import asyncio
import base64
import json

from agents.orchestrator import run_single_analysis
from agents.discovery_agent import run_discovery
from config import settings
from models.bridge import BridgeRiskReport, BridgeSummary, ScanRequest
from utils.errors import APIError, ErrorCode, error_response
from utils.security import validate_file_upload
from utils.audit import log_audit, get_audit_logs

router = APIRouter(prefix="/api/v1", tags=["v1"])

metrics = {
    "scan_requests": 0,
    "analyze_requests": 0,
    "upload_requests": 0,
    "demo_requests": 0,
    "errors": 0,
}


@router.get("/health")
async def health_check():
    missing_keys = settings.validate_required_keys()
    deps = {
        "gemini_api": "ok" if settings.GEMINI_API_KEY else "missing",
        "maps_api": "ok" if settings.GOOGLE_MAPS_API_KEY else "missing",
        "redis": "not_checked",
    }

    status = "ok" if not missing_keys else "degraded"

    return {
        "status": status,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "dependencies": deps,
        "missing_keys": missing_keys,
    }


@router.get("/metrics")
async def get_metrics():
    return {
        "metrics": metrics,
        "audit_log_count": len(get_audit_logs(1000)),
    }


@router.post("/scan")
async def scan_bridges(request: ScanRequest, req: Request):
    metrics["scan_requests"] += 1

    queue: asyncio.Queue = asyncio.Queue()

    async def on_progress(msg: dict):
        await queue.put({"type": "progress", **msg})

    async def run():
        try:
            summaries = await run_discovery(
                request.query, request.query_type, request.bbox, on_progress=on_progress
            )
            total = len(summaries)
            if request.max_bridges:
                summaries = summaries[: request.max_bridges]
            await queue.put(
                {
                    "type": "complete",
                    "data": [s.model_dump() for s in summaries],
                    "meta": {"total": total, "returned": len(summaries)},
                }
            )
            log_audit(
                action="scan",
                user_ip=req.client.host if req.client else None,
                extra={"query": request.query, "bridges_found": total},
            )
        except Exception as e:
            metrics["errors"] += 1
            await queue.put(
                {
                    "type": "error",
                    "error": {
                        "code": ErrorCode.INTERNAL_ERROR,
                        "message": "Scan failed",
                        "details": [],
                    },
                }
            )
        finally:
            await queue.put(None)

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


@router.post("/bridges/{osm_id}/analyze")
async def analyze_bridge_detail(osm_id: str, summary: BridgeSummary, req: Request):
    metrics["analyze_requests"] += 1

    if summary.osm_id != osm_id:
        raise APIError(
            status_code=400,
            code=ErrorCode.INVALID_REQUEST,
            message="osm_id in path must match body",
            details=[{"field": "osm_id", "expected": osm_id, "actual": summary.osm_id}],
        )

    queue: asyncio.Queue = asyncio.Queue()

    async def on_progress(msg: dict):
        await queue.put(msg)

    async def run():
        try:
            report = await run_single_analysis(summary, progress_callback=on_progress)
            await queue.put(
                {"type": "complete", "report": json.loads(report.model_dump_json())}
            )
            log_audit(
                action="analyze",
                bridge_id=osm_id,
                user_ip=req.client.host if req.client else None,
                extra={"risk_tier": report.risk_tier},
            )
        except Exception as e:
            metrics["errors"] += 1
            await queue.put(
                {
                    "type": "error",
                    "error": {
                        "code": ErrorCode.INTERNAL_ERROR,
                        "message": "Analysis failed",
                        "details": [],
                    },
                }
            )
        finally:
            await queue.put(None)

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


@router.get("/demo", response_model=list[BridgeRiskReport])
async def demo_data():
    metrics["demo_requests"] += 1
    cache_path = Path("data/demo_cache/wroclaw.json")
    if not cache_path.exists():
        raise APIError(
            status_code=404,
            code=ErrorCode.NOT_FOUND,
            message="Demo cache not found. Run: python scripts/precompute_demo.py",
            details=[],
        )
    with open(cache_path) as f:
        data = json.load(f)
    return data


@router.post("/analyze-image")
async def analyze_uploaded_image(file: UploadFile, req: Request):
    metrics["upload_requests"] += 1

    validate_file_upload(file.content_type, 0)

    image_bytes = await file.read()
    validate_file_upload(file.content_type, len(image_bytes))

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
        log_audit(
            action="analyze-image",
            user_ip=req.client.host if req.client else None,
            extra={"content_type": file.content_type},
        )
        return json.loads(response.text)
    except Exception as e:
        metrics["errors"] += 1
        raise APIError(
            status_code=500,
            code=ErrorCode.INTERNAL_ERROR,
            message="Image analysis failed",
            details=[],
        )


@router.get("/images/{osm_id}/{heading}")
async def get_bridge_image(osm_id: str, heading: int):
    from fastapi.responses import FileResponse

    image_path = Path(settings.STREETVIEW_CACHE_DIR) / f"{osm_id}_{heading}.jpg"
    if not image_path.exists():
        raise APIError(
            status_code=404,
            code=ErrorCode.NOT_FOUND,
            message="Image not cached for this bridge/heading",
            details=[{"osm_id": osm_id, "heading": heading}],
        )
    return FileResponse(image_path, media_type="image/jpeg")


@router.get("/bridges/{osm_id}/images")
async def list_bridge_images(osm_id: str):
    cache_dir = Path(settings.STREETVIEW_CACHE_DIR)
    headings = [0, 60, 120, 180, 240, 300]
    available = [h for h in headings if (cache_dir / f"{osm_id}_{h}.jpg").exists()]
    return {
        "osm_id": osm_id,
        "images": [
            {"heading": h, "url": f"/api/v1/images/{osm_id}/{h}"} for h in available
        ],
    }
