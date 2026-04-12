"""End-to-end tests for the login rate limiter (LoginRateLimiter in Authorize.kt).

The rate limiter uses a precomputed Fibonacci sequence for backoff (minutes per IP):
  - Successful login           → counter reset
  - Failed login (1–5)         → counter incremented, no block → 401 Invalid credentials
  - Failed login (6+)          → counter incremented, IP blocked for FIB[count-5] minutes
  - FIB[1]=1min, FIB[2]=1min, FIB[3]=2min, FIB[4]=3min, FIB[5]=5min, ...

Every failed login beyond FREE_ATTEMPTS returns 429 Too Many Requests with a Retry-After
header (in seconds). The counter is cumulative and only resets on a successful login.
"""

import asyncio
import logging

import pytest

from ambrosia.auth_utils import DEFAULT_TEST_USER
from ambrosia.http_client import AmbrosiaHttpClient

logger = logging.getLogger(__name__)

FREE_ATTEMPTS = 5  # failures allowed before blocking kicks in
FIBONACCI_FIRST_S = 60  # fib(1) = 1 minute expressed in seconds (Retry-After unit)
INVALID_CREDS = {"name": "nonexistent_user", "pin": "9999"}


async def reset_block(client) -> None:
    """Wait for any active block to expire, then log in successfully to reset the counter.

    While blocked the IP gets 429 regardless of credentials. This helper retries until
    the block window expires and a successful login resets the failure counter.
    """
    while True:
        response = await client.post("/auth/login", json=DEFAULT_TEST_USER)
        if response.status_code == 200:
            return
        assert response.status_code == 429, (
            f"reset_block: unexpected status {response.status_code}"
        )
        retry_after = response.json().get("retryAfter", 1)
        logger.info(f"reset_block: still blocked, waiting {retry_after}s...")
        await asyncio.sleep(retry_after + 0.5)


class TestLoginRateLimit:
    """Tests for the Fibonacci-backoff login rate limiter."""

    @pytest.mark.asyncio
    @pytest.mark.slow
    async def test_successful_logins_reset_fibonacci_counter(self, server_url: str):
        """Successful login resets the failure counter back to zero.

        After a reset the next FREE_ATTEMPTS failed attempts return 401 (no block),
        and the (FREE_ATTEMPTS+1)-th failure returns 429 with retryAfter == FIBONACCI_FIRST_S,
        confirming the counter was cleared.
        """
        async with AmbrosiaHttpClient(server_url) as client:
            await reset_block(client)

            # Exhaust the free attempts and trigger the first block
            for _ in range(FREE_ATTEMPTS):
                r = await client.post("/auth/login", json=INVALID_CREDS)
                assert r.status_code == 401, (
                    f"Free attempt: expected 401, got {r.status_code}"
                )

            response = await client.post("/auth/login", json=INVALID_CREDS)
            assert response.status_code == 429, (
                f"Attempt {FREE_ATTEMPTS + 1}: expected 429, got {response.status_code}"
            )
            retry_after = response.json()["retryAfter"]
            assert retry_after == FIBONACCI_FIRST_S, (
                f"First block retryAfter: expected {FIBONACCI_FIRST_S}s, got {retry_after}s"
            )
            logger.info(f"First block: 429 with retryAfter={retry_after}s ✓")

            # Wait for the block to expire, then log in successfully to reset the counter
            await asyncio.sleep(retry_after + 0.5)
            response = await client.post("/auth/login", json=DEFAULT_TEST_USER)
            assert response.status_code == 200, (
                f"Successful login after block expiry: expected 200, got {response.status_code}"
            )
            logger.info("Successful login after block expiry: 200 ✓")

            # Counter was reset: next FREE_ATTEMPTS failures must return 401 again
            for i in range(FREE_ATTEMPTS):
                r = await client.post("/auth/login", json=INVALID_CREDS)
                assert r.status_code == 401, (
                    f"Post-reset free attempt {i + 1}: expected 401, got {r.status_code}"
                )

            # And the (FREE_ATTEMPTS+1)-th must start back at fib(1) == FIBONACCI_FIRST_S
            response = await client.post("/auth/login", json=INVALID_CREDS)
            assert response.status_code == 429, (
                f"Post-reset block trigger: expected 429, got {response.status_code}"
            )
            retry_after_after_reset = response.json()["retryAfter"]
            assert retry_after_after_reset == FIBONACCI_FIRST_S, (
                f"Post-reset retryAfter: expected {FIBONACCI_FIRST_S}s (counter reset), "
                f"got {retry_after_after_reset}s"
            )
            logger.info(
                f"Post-reset block: retryAfter={retry_after_after_reset}s == fib(1) ✓"
            )

        logger.info("✓ Successful login correctly resets the Fibonacci failure counter")

    @pytest.mark.asyncio
    @pytest.mark.slow
    async def test_grace_period_then_block_shared_across_sessions(
        self, server_url: str
    ):
        """First FREE_ATTEMPTS failures return 401; the next one triggers a 429 block.

        Also verifies:
        - Subsequent wrong attempts from a blocked IP continue to return 429
        - A brand-new client session from the same IP shares the blocked bucket
        """
        async with AmbrosiaHttpClient(server_url) as client:
            await reset_block(client)

            # First FREE_ATTEMPTS failures → 401 (grace period, no block)
            for i in range(FREE_ATTEMPTS):
                response = await client.post("/auth/login", json=INVALID_CREDS)
                assert response.status_code == 401, (
                    f"Free attempt {i + 1}: expected 401, got {response.status_code}"
                )
            logger.info(f"First {FREE_ATTEMPTS} failures: all 401 (grace period ✓)")

            # (FREE_ATTEMPTS+1)-th failure → 429
            response = await client.post("/auth/login", json=INVALID_CREDS)
            assert response.status_code == 429, (
                f"Attempt {FREE_ATTEMPTS + 1}: expected 429, got {response.status_code}"
            )
            logger.info(f"Attempt {FREE_ATTEMPTS + 1}: 429 (blocked ✓)")

            # Subsequent wrong attempts from blocked IP continue to return 429
            response = await client.post("/auth/login", json=INVALID_CREDS)
            assert response.status_code == 429, (
                f"Wrong creds on blocked IP: expected 429, got {response.status_code}"
            )
            logger.info(f"Wrong creds on blocked IP: {response.status_code} ✓")

        # New client session from the same IP also sees the block (bucket is per-IP)
        async with AmbrosiaHttpClient(server_url) as new_client:
            response = await new_client.post("/auth/login", json=INVALID_CREDS)
            assert response.status_code == 429, (
                "New session from same IP should share the blocked bucket, "
                f"got {response.status_code}"
            )
            logger.info(
                f"New session, same IP: {response.status_code} (shared bucket ✓)"
            )

        logger.info(
            "✓ Grace period respected; block triggered on attempt "
            f"{FREE_ATTEMPTS + 1} and shared across sessions"
        )

    @pytest.mark.asyncio
    @pytest.mark.slow
    async def test_rate_limit_429_includes_retry_after(self, server_url: str):
        """The 429 response must include retryAfter in the body and Retry-After header.

        Both values must match and be >= FIBONACCI_FIRST_S (fib(1) = 1 minute = 60 s).
        Requires FREE_ATTEMPTS+1 failures to reach the first block.
        """
        async with AmbrosiaHttpClient(server_url) as client:
            await reset_block(client)

            # Send enough failures to exhaust the grace period and trigger a block
            response = None
            for _ in range(FREE_ATTEMPTS + 1):
                response = await client.post("/auth/login", json=INVALID_CREDS)

        assert response is not None
        assert response.status_code == 429, (
            f"Expected 429 after {FREE_ATTEMPTS + 1} failed logins, "
            f"got {response.status_code}"
        )

        # Verify body contains retryAfter
        body = response.json()
        assert "retryAfter" in body, f"429 body must contain 'retryAfter', got: {body}"
        retry_after_body = body["retryAfter"]
        assert isinstance(retry_after_body, int), (
            f"retryAfter must be an int, got {type(retry_after_body)}"
        )
        assert retry_after_body >= FIBONACCI_FIRST_S, (
            f"retryAfter={retry_after_body} must be >= {FIBONACCI_FIRST_S}s (fib(1) = 1 min)"
        )
        logger.info(f"Body retryAfter: {retry_after_body}s ✓")

        # Verify Retry-After header is present and matches the body
        retry_after_header = response.headers.get("Retry-After")
        assert retry_after_header is not None, (
            "Retry-After header must be present on 429"
        )
        assert int(retry_after_header) == retry_after_body, (
            f"Retry-After header ({retry_after_header}) must match body retryAfter ({retry_after_body})"
        )
        logger.info(f"Retry-After header: {retry_after_header}s ✓")

        logger.info(
            "✓ 429 response includes matching retryAfter body and Retry-After header"
        )
