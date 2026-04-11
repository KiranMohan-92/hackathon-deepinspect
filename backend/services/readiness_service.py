"""Readiness and health check service."""
import asyncio
from config import settings
from services.logging_service import get_logger

log = get_logger(__name__)


async def check_database_health() -> dict:
    try:
        from db.base import engine
        from sqlalchemy import text
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return {"status": "ok"}
    except Exception as e:
        return {"status": "error", "error": str(e)[:100]}


async def check_gemini_health() -> dict:
    try:
        from services.gemini_service import client
        # Just check the client object exists (don't make API call)
        if client:
            return {"status": "ok", "model": settings.GEMINI_MODEL}
        return {"status": "unknown"}
    except Exception as e:
        return {"status": "error", "error": str(e)[:100]}


async def readiness_snapshot() -> dict:
    db, gemini = await asyncio.gather(
        check_database_health(),
        check_gemini_health(),
    )
    all_ok = db["status"] == "ok"
    return {
        "ready": all_ok,
        "checks": {
            "database": db,
            "gemini": gemini,
        },
    }
