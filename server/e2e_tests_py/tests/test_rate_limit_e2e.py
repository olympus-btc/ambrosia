"""End-to-end tests for the login rate limiter (LoginRateLimiter in Authorize.kt).

The rate limiter only counts FAILED login attempts per IP address:
  - Successful login  → counter reset, no token consumed
  - Failed login      → counter incremented
  - After 5 failures  → 429 Too Many Requests for 2 minutes

Because successful logins do not consume tokens, these tests can run
as part of the full suite without breaking other auth tests.
"""

import logging

import pytest

from ambrosia.auth_utils import DEFAULT_TEST_USER
from ambrosia.http_client import AmbrosiaHttpClient

logger = logging.getLogger(__name__)

# Must match LoginRateLimiter.MAX_FAILURES in Authorize.kt
MAX_FAILURES = 5
INVALID_CREDS = {"name": "nonexistent_user", "pin": "9999"}


class TestLoginRateLimit:
    """Tests for the failure-based login rate limiter."""

    @pytest.mark.asyncio
    @pytest.mark.slow
    async def test_successful_logins_do_not_consume_rate_limit_tokens(
        self, server_url: str
    ):
        """Successful logins must not count toward the rate limit.

        After a successful login the failure counter is reset, so a user
        who occasionally mistyped their PIN is not locked out.
        """
        async with AmbrosiaHttpClient(server_url) as client:
            # Accumulate MAX_FAILURES - 1 failed attempts
            for i in range(MAX_FAILURES - 1):
                response = await client.post("/auth/login", json=INVALID_CREDS)
                assert response.status_code in (400, 401), (
                    f"Failed attempt {i + 1}: expected 400/401, got {response.status_code}"
                )

            # A successful login resets the counter — must return 200, not 429
            response = await client.post("/auth/login", json=DEFAULT_TEST_USER)
            assert response.status_code == 200, (
                f"Successful login after {MAX_FAILURES - 1} failures: "
                f"expected 200 (counter reset), got {response.status_code}"
            )
            logger.info(
                f"✓ Successful login after {MAX_FAILURES - 1} failures returned 200 "
                "(counter reset confirmed)"
            )

            # Counter is now 0 again — a full new window of failures is available
            for i in range(MAX_FAILURES - 1):
                response = await client.post("/auth/login", json=INVALID_CREDS)
                assert response.status_code in (400, 401), (
                    f"Post-reset failed attempt {i + 1}: expected 400/401, "
                    f"got {response.status_code} (counter should have reset)"
                )

        logger.info("✓ Successful logins correctly reset the failure counter")

    @pytest.mark.asyncio
    @pytest.mark.slow
    async def test_rate_limit_blocks_after_five_failed_logins(self, server_url: str):
        """After MAX_FAILURES consecutive bad logins the IP must be blocked (429).

        Also verifies:
        - Each of the first MAX_FAILURES attempts returns a credential error (not 429)
        - A brand-new client session from the same IP shares the blocked bucket
        """
        async with AmbrosiaHttpClient(server_url) as client:
            # Reset the counter with a successful login so the test is order-independent
            reset = await client.post("/auth/login", json=DEFAULT_TEST_USER)
            assert reset.status_code == 200, (
                f"Pre-test reset login: expected 200, got {reset.status_code}"
            )

            # Exhaust the allowed failures
            for i in range(MAX_FAILURES):
                response = await client.post("/auth/login", json=INVALID_CREDS)
                assert response.status_code in (400, 401), (
                    f"Failed attempt {i + 1}/{MAX_FAILURES}: expected 400/401, "
                    f"got {response.status_code}"
                )
                logger.info(f"Attempt {i + 1}/{MAX_FAILURES}: {response.status_code}")

            # Next attempt must be blocked — even with valid credentials
            response = await client.post("/auth/login", json=DEFAULT_TEST_USER)
            assert response.status_code == 429, (
                f"Attempt {MAX_FAILURES + 1}: expected 429 (rate limited), "
                f"got {response.status_code}"
            )
            logger.info(
                f"Attempt {MAX_FAILURES + 1}: {response.status_code} (blocked ✓)"
            )

        # New client session from the same IP must also be blocked (bucket is per-IP)
        async with AmbrosiaHttpClient(server_url) as new_client:
            response = await new_client.post("/auth/login", json=DEFAULT_TEST_USER)
            assert response.status_code == 429, (
                "New session from same IP should share the blocked bucket, "
                f"got {response.status_code}"
            )
            logger.info(
                f"New session, same IP: {response.status_code} (shared bucket ✓)"
            )

        logger.info(
            f"✓ IP blocked after {MAX_FAILURES} failed logins; "
            "block is shared across sessions"
        )
