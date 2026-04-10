"""Readiness and health check service."""
import asyncio
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
        from services.gemini_service import text_model
        # Just check the model object exists (don't make API call)
        if text_model:
            return {"status": "ok", "model": str(text_model.model_name)}
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
