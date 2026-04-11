from fastapi import APIRouter, Depends, UploadFile, Request
from fastapi.responses import StreamingResponse, JSONResponse
from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession
import asyncio
import base64
import json

from agents.orchestrator import run_single_analysis
from agents.discovery_agent import run_discovery
from config import settings
from db.base import get_session, async_session_factory
from db import repository as repo
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


@router.get("/metrics/prometheus")
async def prometheus_metrics():
    from services.metrics_service import prometheus_text
    from fastapi.responses import PlainTextResponse
    return PlainTextResponse(prometheus_text(), media_type="text/plain; version=0.0.4")


@router.get("/ready")
async def readiness():
    from services.readiness_service import readiness_snapshot
    result = await readiness_snapshot()
    status_code = 200 if result["ready"] else 503
    return JSONResponse(content=result, status_code=status_code)


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
            report_data = json.loads(report.model_dump_json())
            report_data.pop("thinking_steps", None)
            if report_data.get("certificate"):
                report_data["certificate"].pop("thinking_steps", None)
            await queue.put({"type": "complete", "report": report_data})

            # Persist bridge + assessment to database
            try:
                async with async_session_factory() as session:
                    await repo.save_bridge(
                        session, osm_id=osm_id, name=summary.name,
                        lat=summary.lat, lon=summary.lon,
                        road_class=summary.road_class,
                        material=summary.material,
                        construction_year=summary.construction_year,
                        max_weight_tons=summary.max_weight_tons,
                    )
                    cert_json = report_data.get("certificate")
                    await repo.save_assessment(
                        session, bridge_id=osm_id,
                        risk_score=report.risk_score,
                        risk_tier=report.risk_tier,
                        confidence=report.certificate.overall_confidence if report.certificate else None,
                        certificate_json=cert_json,
                        report_json=report_data,
                    )
                    await session.commit()
            except Exception as db_err:
                from services.logging_service import get_logger
                get_logger(__name__).warning("db_persist_failed", bridge_id=osm_id, error=str(db_err))

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

    from services.gemini_service import client, json_config

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
        response = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=parts,
            config=json_config,
        )
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


# ── Persistence endpoints (Phase 1) ─────────────────────────────────────────


@router.get("/bridges/{osm_id}/history")
async def get_bridge_history(osm_id: str, limit: int = 50,
                              session: AsyncSession = Depends(get_session)):
    """Get assessment history for a bridge, newest first."""
    records = await repo.get_bridge_history(session, osm_id, limit=limit)
    return [
        {
            "id": r.id,
            "risk_score": r.risk_score,
            "risk_tier": r.risk_tier,
            "confidence": r.confidence,
            "model_version": r.model_version,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in records
    ]


@router.get("/bridges/{osm_id}/trend")
async def get_bridge_trend(osm_id: str,
                            session: AsyncSession = Depends(get_session)):
    """Get the latest trend record for a bridge."""
    trend = await repo.detect_trend(session, osm_id)
    if not trend:
        return {"osm_id": osm_id, "trend": None}
    return {
        "osm_id": osm_id,
        "trend": {
            "direction": trend.direction,
            "delta": trend.delta,
            "previous_tier": trend.previous_tier,
            "current_tier": trend.current_tier,
            "previous_score": trend.previous_score,
            "current_score": trend.current_score,
            "assessed_at": trend.assessed_at.isoformat() if trend.assessed_at else None,
        },
    }


@router.get("/escalations")
async def get_escalations(limit: int = 20,
                           session: AsyncSession = Depends(get_session)):
    """Get bridges with escalating risk trends."""
    trends = await repo.get_escalations(session, limit=limit)
    return [
        {
            "bridge_id": t.bridge_id,
            "direction": t.direction,
            "delta": t.delta,
            "current_tier": t.current_tier,
            "previous_tier": t.previous_tier,
            "assessed_at": t.assessed_at.isoformat() if t.assessed_at else None,
        }
        for t in trends
    ]


@router.get("/bridges/{osm_id}/evidence")
async def get_bridge_evidence(osm_id: str,
                               session: AsyncSession = Depends(get_session)):
    """Get evidence records linked to the latest assessment for a bridge."""
    evidence = await repo.get_bridge_evidence(session, osm_id)
    return {"osm_id": osm_id, "evidence": evidence}
