from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Callable, Optional
from config import settings
from utils.errors import APIError, ErrorCode


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)

        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains"
        )
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        return response


class APIKeyMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        if request.url.path in ["/health", "/api/v1/health", "/"]:
            return await call_next(request)

        valid_keys = settings.get_api_keys_list()

        if not valid_keys:
            return await call_next(request)

        api_key = request.headers.get("X-API-Key")

        if not api_key:
            raise APIError(
                status_code=401,
                code=ErrorCode.AUTHENTICATION_ERROR,
                message="Missing API key",
                details=[{"field": "X-API-Key", "issue": "Header required"}],
            )

        if api_key not in valid_keys:
            raise APIError(
                status_code=403,
                code=ErrorCode.AUTHENTICATION_ERROR,
                message="Invalid API key",
                details=[{"field": "X-API-Key", "issue": "Key not recognized"}],
            )

        return await call_next(request)


def validate_file_upload(content_type: Optional[str], content_length: int) -> None:
    allowed_types = settings.get_allowed_image_types()
    max_size = settings.max_upload_size_bytes

    if not content_type:
        raise APIError(
            status_code=400,
            code=ErrorCode.INVALID_FILE_TYPE,
            message="Missing content type",
            details=[{"field": "Content-Type", "issue": "Header required"}],
        )

    if content_type not in allowed_types:
        raise APIError(
            status_code=400,
            code=ErrorCode.INVALID_FILE_TYPE,
            message=f"Invalid file type: {content_type}",
            details=[
                {
                    "field": "Content-Type",
                    "issue": f"Allowed types: {', '.join(allowed_types)}",
                }
            ],
        )

    if content_length > max_size:
        raise APIError(
            status_code=413,
            code=ErrorCode.FILE_TOO_LARGE,
            message=f"File too large: {content_length} bytes",
            details=[
                {
                    "field": "Content-Length",
                    "issue": f"Maximum size: {settings.MAX_UPLOAD_SIZE_MB}MB",
                }
            ],
        )
