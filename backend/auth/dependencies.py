"""FastAPI auth dependencies. When AUTH_ENABLED=false, all requests pass through."""

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from auth.jwt_service import decode_token, verify_role
from config import settings

_bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> dict | None:
    """Return the decoded user payload, or None when auth is disabled."""
    if not settings.AUTH_ENABLED:
        return None

    if not credentials:
        raise HTTPException(status_code=401, detail="Missing authorization token")

    try:
        return decode_token(credentials.credentials)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc


def require_role(role: str):
    """Dependency factory for role-based access."""

    async def _check(user: dict | None = Depends(get_current_user)):
        if not settings.AUTH_ENABLED:
            return None

        if not user:
            raise HTTPException(status_code=401, detail="Authentication required")

        if not verify_role(user, role):
            raise HTTPException(status_code=403, detail=f"Role '{role}' required")

        return user

    return _check
