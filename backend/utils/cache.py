"""
Optional Redis cache with in-memory fallback.
If Redis is unavailable or not configured, all caching falls back to a
process-level dict (no persistence, but zero-crash behaviour).
"""
from services.logging_service import get_logger

log = get_logger(__name__)
import json
from typing import Any, Optional

_memory_cache: dict = {}
_redis_client = None
_redis_checked = False


async def _get_redis():
    global _redis_client, _redis_checked
    if _redis_checked:
        return _redis_client
    _redis_checked = True
    try:
        import redis.asyncio as aioredis
        from config import settings
        client = aioredis.from_url(settings.REDIS_URL, socket_connect_timeout=2)
        await client.ping()
        _redis_client = client
        log.info("redis_connected")
    except Exception as e:
        log.warning("redis_unavailable", error=str(e))
        _redis_client = None
    return _redis_client


async def cache_get(key: str) -> Optional[Any]:
    client = await _get_redis()
    if client:
        try:
            val = await client.get(key)
            if val:
                return json.loads(val)
        except Exception:
            pass
    return _memory_cache.get(key)


async def cache_set(key: str, value: Any, ttl: int = 3600) -> None:
    client = await _get_redis()
    serialized = json.dumps(value, default=str)
    if client:
        try:
            await client.set(key, serialized, ex=ttl)
            return
        except Exception:
            pass
    _memory_cache[key] = value
