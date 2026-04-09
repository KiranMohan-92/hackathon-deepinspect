"""Tests for circuit breaker and resilience patterns."""
import asyncio
import time
from unittest.mock import AsyncMock, patch

import pytest

from services.resilience import (
    CircuitBreaker,
    CircuitBreakerOpen,
    with_timeout,
    with_retry,
    resilient_call,
)


class TestCircuitBreaker:
    def test_starts_closed(self):
        cb = CircuitBreaker("test")
        assert cb.state == "CLOSED"
        assert cb.failure_count == 0

    def test_stays_closed_below_threshold(self):
        cb = CircuitBreaker("test", failure_threshold=3)
        cb.record_failure()
        cb.record_failure()
        assert cb.state == "CLOSED"
        assert cb.failure_count == 2

    def test_opens_at_threshold(self):
        cb = CircuitBreaker("test", failure_threshold=3)
        for _ in range(3):
            cb.record_failure()
        assert cb.state == "OPEN"

    def test_open_raises_circuit_breaker_open(self):
        cb = CircuitBreaker("test", failure_threshold=1)
        cb.record_failure()
        assert cb.state == "OPEN"
        with pytest.raises(CircuitBreakerOpen):
            cb._check_state()

    def test_open_to_half_open_after_recovery(self):
        cb = CircuitBreaker("test", failure_threshold=1, recovery_timeout=0.01)
        cb.record_failure()
        assert cb.state == "OPEN"
        time.sleep(0.02)
        cb._check_state()  # Should not raise
        assert cb.state == "HALF_OPEN"

    def test_half_open_to_closed_on_success(self):
        cb = CircuitBreaker("test", failure_threshold=1, recovery_timeout=0.01)
        cb.record_failure()
        time.sleep(0.02)
        cb._check_state()
        assert cb.state == "HALF_OPEN"
        cb.record_success()
        assert cb.state == "CLOSED"
        assert cb.failure_count == 0

    def test_half_open_to_open_on_failure(self):
        cb = CircuitBreaker("test", failure_threshold=1, recovery_timeout=0.01)
        cb.record_failure()
        time.sleep(0.02)
        cb._check_state()
        assert cb.state == "HALF_OPEN"
        cb.record_failure()
        assert cb.state == "OPEN"

    @pytest.mark.asyncio
    async def test_call_success(self):
        cb = CircuitBreaker("test")

        async def ok():
            return 42

        result = await cb.call(lambda: ok())
        assert result == 42
        assert cb.state == "CLOSED"

    @pytest.mark.asyncio
    async def test_call_failure_records(self):
        cb = CircuitBreaker("test", failure_threshold=2)

        async def failing():
            raise ValueError("boom")

        with pytest.raises(ValueError):
            await cb.call(lambda: failing())
        assert cb.failure_count == 1

    @pytest.mark.asyncio
    async def test_call_open_fast_fails(self):
        cb = CircuitBreaker("test", failure_threshold=1)
        cb.record_failure()
        with pytest.raises(CircuitBreakerOpen):
            await cb.call(lambda: asyncio.sleep(0))


class TestWithTimeout:
    @pytest.mark.asyncio
    async def test_returns_result_within_timeout(self):
        async def quick():
            return "ok"
        result = await with_timeout(quick(), 5.0)
        assert result == "ok"

    @pytest.mark.asyncio
    async def test_raises_timeout_error(self):
        async def slow():
            await asyncio.sleep(10)
        with pytest.raises(asyncio.TimeoutError):
            await with_timeout(slow(), 0.01)


class TestWithRetry:
    @pytest.mark.asyncio
    async def test_returns_on_first_success(self):
        call_count = 0

        async def succeed():
            nonlocal call_count
            call_count += 1
            return "ok"

        result = await with_retry(succeed, max_attempts=3)
        assert result == "ok"
        assert call_count == 1

    @pytest.mark.asyncio
    async def test_retries_on_failure(self):
        call_count = 0

        async def fail_then_succeed():
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise ValueError("not yet")
            return "ok"

        with patch("services.resilience.asyncio.sleep", new_callable=AsyncMock):
            result = await with_retry(fail_then_succeed, max_attempts=3, backoff_base=0.001)
        assert result == "ok"
        assert call_count == 3

    @pytest.mark.asyncio
    async def test_raises_after_all_attempts_exhausted(self):
        async def always_fail():
            raise ValueError("always")

        with patch("services.resilience.asyncio.sleep", new_callable=AsyncMock):
            with pytest.raises(ValueError, match="always"):
                await with_retry(always_fail, max_attempts=2, backoff_base=0.001)


class TestResilientCall:
    @pytest.mark.asyncio
    async def test_success_without_breaker(self):
        async def ok():
            return 42

        result = await resilient_call(lambda: ok(), timeout_seconds=5.0)
        assert result == 42

    @pytest.mark.asyncio
    async def test_success_with_breaker(self):
        cb = CircuitBreaker("test")

        async def ok():
            return 42

        result = await resilient_call(lambda: ok(), timeout_seconds=5.0, circuit_breaker=cb)
        assert result == 42
        assert cb.state == "CLOSED"

    @pytest.mark.asyncio
    async def test_breaker_opens_on_repeated_failure(self):
        cb = CircuitBreaker("test", failure_threshold=2)

        async def fail():
            raise ValueError("boom")

        for _ in range(2):
            with pytest.raises(ValueError):
                await resilient_call(
                    lambda: fail(),
                    timeout_seconds=5.0,
                    max_retries=1,
                    circuit_breaker=cb,
                )

        assert cb.state == "OPEN"
