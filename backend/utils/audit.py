import json
import time
from datetime import datetime, timezone
from typing import Optional, Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware


audit_logs: list[dict] = []


def log_audit(
    action: str,
    bridge_id: Optional[str] = None,
    user_ip: Optional[str] = None,
    duration_ms: Optional[float] = None,
    status: str = "success",
    extra: Optional[dict] = None,
) -> dict:
    entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "action": action,
        "bridge_id": bridge_id,
        "user_ip": user_ip,
        "duration_ms": duration_ms,
        "status": status,
        **(extra or {}),
    }
    audit_logs.append(entry)
    return entry


class AuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.perf_counter()

        response = await call_next(request)

        duration_ms = (time.perf_counter() - start_time) * 1000

        if request.url.path.startswith("/api"):
            log_audit(
                action=request.url.path,
                user_ip=request.client.host if request.client else None,
                duration_ms=round(duration_ms, 2),
                status="success" if response.status_code < 400 else "error",
                extra={
                    "method": request.method,
                    "status_code": response.status_code,
                },
            )

        return response


def get_audit_logs(limit: int = 100) -> list[dict]:
    return audit_logs[-limit:]


def clear_audit_logs() -> None:
    audit_logs.clear()
