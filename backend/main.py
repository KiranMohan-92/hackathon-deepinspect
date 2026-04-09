import asyncio
import base64
import json
import sys
from pathlib import Path
from typing import Any, Awaitable, Callable

from fastapi import FastAPI, HTTPException, UploadFile, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse, JSONResponse
from fastapi.responses import RedirectResponse

from agents.orchestrator import run_pipeline, run_single_analysis
from agents.discovery_agent import run_discovery
from config import settings
from models.bridge import BridgeRiskReport, BridgeSummary, BridgeTarget, ScanRequest
from utils.errors import (
    APIError,
    api_error_handler,
    generic_exception_handler,
    ErrorCode,
    error_response,
)
from utils.security import (
    SecurityHeadersMiddleware,
    APIKeyMiddleware,
    validate_file_upload,
)
from utils.audit import AuditMiddleware, log_audit, get_audit_logs
from services.logging_service import setup_logging, get_logger
from middleware.request_logging import RequestLoggingMiddleware
from api.v1 import router as v1_router

# Initialize structured logging before anything else
setup_logging(log_level=settings.LOG_LEVEL, log_format=settings.LOG_FORMAT)
log = get_logger(__name__)

missing_keys = settings.validate_required_keys()
if missing_keys:
    log.warning("missing_required_keys", keys=missing_keys)

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Production-grade bridge inspection API",
)

try:
    from slowapi import Limiter
    from slowapi.util import get_remote_address
    from slowapi.errors import RateLimitExceeded
    from slowapi.extension import _rate_limit_exceeded_handler

    limiter = Limiter(key_func=get_remote_address)
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
except ImportError:
    pass

app.add_exception_handler(APIError, api_error_handler)
app.add_exception_handler(Exception, generic_exception_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(AuditMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(APIKeyMiddleware)

app.include_router(v1_router)


@app.get("/", response_class=RedirectResponse)
async def root():
    return "/api/v1"


@app.get("/health")
def health():
    missing = settings.validate_required_keys()
    return {
        "status": "ok" if not missing else "degraded",
        "version": settings.APP_VERSION,
        "model": settings.GEMINI_MODEL,
        "missing_keys": missing,
    }


@app.post("/api/scan")
async def scan_bridges_legacy(request: ScanRequest):
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
                    "bridges": [s.model_dump() for s in summaries],
                    "meta": {"total": total, "returned": len(summaries)},
                }
            )
        except Exception:
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


@app.post("/api/bridges/{osm_id}/analyze")
async def analyze_bridge_detail_legacy(osm_id: str, summary: BridgeSummary):
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
            report_data = json.loads(report.model_dump_json())
            report_data.pop("thinking_steps", None)
            if report_data.get("certificate"):
                report_data["certificate"].pop("thinking_steps", None)
            await queue.put({"type": "complete", "report": report_data})
        except Exception:
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


@app.get("/api/demo", response_model=list[BridgeRiskReport])
async def demo_data_legacy():
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


@app.post("/api/analyze-image")
async def analyze_uploaded_image_legacy(file: UploadFile):
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
        return json.loads(response.text)
    except Exception:
        raise APIError(
            status_code=500,
            code=ErrorCode.INTERNAL_ERROR,
            message="Image analysis failed",
            details=[],
        )


@app.get("/api/images/{osm_id}/{heading}")
async def get_bridge_image_legacy(osm_id: str, heading: int):
    image_path = Path(settings.STREETVIEW_CACHE_DIR) / f"{osm_id}_{heading}.jpg"
    if not image_path.exists():
        raise APIError(
            status_code=404,
            code=ErrorCode.NOT_FOUND,
            message="Image not cached for this bridge/heading",
            details=[{"osm_id": osm_id, "heading": heading}],
        )
    return FileResponse(image_path, media_type="image/jpeg")


@app.get("/api/bridges/{osm_id}/images")
async def list_bridge_images_legacy(osm_id: str):
    cache_dir = Path(settings.STREETVIEW_CACHE_DIR)
    headings = [0, 60, 120, 180, 240, 300]
    available = [h for h in headings if (cache_dir / f"{osm_id}_{h}.jpg").exists()]
    return {
        "osm_id": osm_id,
        "images": [
            {"heading": h, "url": f"/api/images/{osm_id}/{h}"} for h in available
        ],
    }
