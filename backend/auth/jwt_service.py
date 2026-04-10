"""JWT authentication service for DeepInspect API."""
import time
from typing import Any

import jwt

from config import settings
from services.logging_service import get_logger

log = get_logger(__name__)

ALGORITHM = "HS256"
ROLE_HIERARCHY = {"admin": 3, "analyst": 2, "viewer": 1}


def create_access_token(user_id: str, role: str = "analyst", extra_claims: dict | None = None) -> str:
    now = int(time.time())
    payload = {
        "sub": user_id,
        "role": role,
        "iat": now,
        "exp": now + settings.JWT_EXPIRY_MINUTES * 60,
        "iss": settings.JWT_ISSUER,
        "aud": settings.JWT_AUDIENCE,
        **(extra_claims or {}),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=ALGORITHM)


def decode_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(
            token, settings.JWT_SECRET, algorithms=[ALGORITHM],
            issuer=settings.JWT_ISSUER, audience=settings.JWT_AUDIENCE,
        )
    except jwt.ExpiredSignatureError:
        raise ValueError("Token expired")
    except jwt.InvalidTokenError as e:
        raise ValueError(f"Invalid token: {e}")


def verify_role(payload: dict, required_role: str) -> bool:
    user_level = ROLE_HIERARCHY.get(payload.get("role", ""), 0)
    required_level = ROLE_HIERARCHY.get(required_role, 0)
    return user_level >= required_level
