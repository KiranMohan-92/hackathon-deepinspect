"""FastAPI middleware for structured request and response logging."""

import time
import uuid
from collections.abc import Awaitable, Callable

import structlog
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from structlog.contextvars import bind_contextvars, clear_contextvars


log = structlog.get_logger("middleware.request")


def _client_host(request: Request) -> str:
    return request.client.host if request.client else "unknown"


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Bind request context and log one structured event per request."""

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        start = time.monotonic()
        request_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex[:12]
        request.state.request_id = request_id

        bind_contextvars(
            request_id=request_id,
            method=request.method,
            path=request.url.path,
        )

        try:
            response = await call_next(request)
        except Exception:
            duration_ms = round((time.monotonic() - start) * 1000, 1)
            log.info(
                "request",
                status=500,
                duration_ms=duration_ms,
                client=_client_host(request),
            )
            raise
        else:
            duration_ms = round((time.monotonic() - start) * 1000, 1)
            log.info(
                "request",
                status=response.status_code,
                duration_ms=duration_ms,
                client=_client_host(request),
            )
            response.headers["X-Request-ID"] = request_id
            return response
        finally:
            clear_contextvars()
