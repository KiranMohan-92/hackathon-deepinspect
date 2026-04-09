"""
Resilience patterns for external service calls.

Provides timeout, retry with exponential backoff, and circuit breaker
for Gemini API, Overpass, and Google Maps calls.
"""

import asyncio
import logging
import time
from collections.abc import Awaitable, Callable
from typing import TypeVar


log = logging.getLogger(__name__)

T = TypeVar("T")


class CircuitBreakerOpen(Exception):
    """Raised when a circuit breaker is in OPEN state."""


class CircuitBreaker:
    """
    Circuit breaker pattern for external services.

    States: CLOSED (normal) -> OPEN (failing) -> HALF_OPEN (testing recovery).
    """

    def __init__(
        self,
        name: str,
        failure_threshold: int = 5,
        recovery_timeout: float = 60.0,
    ) -> None:
        self.name = name
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failure_count = 0
        self.last_failure_time = 0.0
        self.state = "CLOSED"

    def _check_state(self) -> None:
        if self.state != "OPEN":
            return

        if time.monotonic() - self.last_failure_time >= self.recovery_timeout:
            self.state = "HALF_OPEN"
            log.info("Circuit breaker %s: OPEN -> HALF_OPEN", self.name)
            return

        raise CircuitBreakerOpen(f"Circuit breaker '{self.name}' is OPEN")

    def record_success(self) -> None:
        if self.state == "HALF_OPEN":
            log.info("Circuit breaker %s: HALF_OPEN -> CLOSED", self.name)

        self.failure_count = 0
        self.state = "CLOSED"

    def record_failure(self) -> None:
        self.failure_count += 1
        self.last_failure_time = time.monotonic()

        if self.failure_count >= self.failure_threshold:
            self.state = "OPEN"
            log.warning(
                "Circuit breaker %s: CLOSED -> OPEN (failures=%d)",
                self.name,
                self.failure_count,
            )

    async def call(self, coro_factory: Callable[[], Awaitable[T]]) -> T:
        self._check_state()

        try:
            result = await coro_factory()
        except CircuitBreakerOpen:
            raise
        except Exception:
            self.record_failure()
            raise

        self.record_success()
        return result


# Bridge-domain circuit breakers.
gemini_breaker = CircuitBreaker("gemini", failure_threshold=5, recovery_timeout=60.0)
overpass_breaker = CircuitBreaker("overpass", failure_threshold=3, recovery_timeout=30.0)
google_maps_breaker = CircuitBreaker(
    "google_maps",
    failure_threshold=3,
    recovery_timeout=30.0,
)


async def with_timeout(coro: Awaitable[T], timeout_seconds: float) -> T:
    try:
        async with asyncio.timeout(timeout_seconds):
            return await coro
    except asyncio.TimeoutError:
        log.error("Operation timed out after %.1fs", timeout_seconds)
        raise


async def with_retry(
    coro_factory: Callable[[], Awaitable[T]],
    max_attempts: int = 3,
    backoff_base: float = 1.0,
    retryable_exceptions: tuple[type[Exception], ...] = (Exception,),
) -> T:
    last_error: Exception | None = None

    for attempt in range(max_attempts):
        try:
            return await coro_factory()
        except retryable_exceptions as error:
            last_error = error

            if attempt < max_attempts - 1:
                delay = backoff_base * (2**attempt)
                log.warning(
                    "Attempt %d/%d failed, retrying in %.1fs",
                    attempt + 1,
                    max_attempts,
                    delay,
                    exc_info=False,
                )
                await asyncio.sleep(delay)
            else:
                log.error("All %d attempts failed", max_attempts)

    if last_error is not None:
        raise last_error

    raise ValueError("max_attempts must be at least 1")


async def resilient_call(
    coro_factory: Callable[[], Awaitable[T]],
    timeout_seconds: float = 120.0,
    max_retries: int = 2,
    circuit_breaker: CircuitBreaker | None = None,
) -> T:
    async def call_with_retry_and_timeout() -> T:
        return await with_retry(
            lambda: with_timeout(coro_factory(), timeout_seconds),
            max_attempts=max_retries,
        )

    if circuit_breaker is not None:
        return await circuit_breaker.call(call_with_retry_and_timeout)

    return await call_with_retry_and_timeout()
