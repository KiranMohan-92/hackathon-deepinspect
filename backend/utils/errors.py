import uuid

from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
from typing import Any, Optional


class ErrorCode:
    VALIDATION_ERROR = "VALIDATION_ERROR"
    AUTHENTICATION_ERROR = "AUTHENTICATION_ERROR"
    RATE_LIMIT_ERROR = "RATE_LIMIT_ERROR"
    NOT_FOUND = "NOT_FOUND"
    INTERNAL_ERROR = "INTERNAL_ERROR"
    INVALID_REQUEST = "INVALID_REQUEST"
    FILE_TOO_LARGE = "FILE_TOO_LARGE"
    INVALID_FILE_TYPE = "INVALID_FILE_TYPE"


class APIError(HTTPException):
    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        details: Optional[list] = None,
    ):
        self.code = code
        self.message = message
        self.details = details or []
        super().__init__(status_code=status_code, detail=message)


def error_response(
    status_code: int,
    code: str,
    message: str,
    details: Optional[list] = None,
) -> JSONResponse:
    error_id = uuid.uuid4().hex[:12]
    return JSONResponse(
        status_code=status_code,
        content={
            "error": {
                "error_id": error_id,
                "code": code,
                "message": message,
                "details": details or [],
            }
        },
    )


async def api_error_handler(request: Request, exc: APIError) -> JSONResponse:
    return error_response(
        status_code=exc.status_code,
        code=exc.code,
        message=exc.message,
        details=exc.details,
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    return error_response(
        status_code=500,
        code=ErrorCode.INTERNAL_ERROR,
        message="An internal error occurred",
        details=[],
    )


def sanitize_error_message(exc: Exception) -> str:
    return "An error occurred while processing your request"
