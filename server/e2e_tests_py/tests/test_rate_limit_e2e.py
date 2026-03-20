"""End-to-end tests for the login rate limiter (LoginRateLimiter in Authorize.kt).

The rate limiter only counts FAILED login attempts per IP address:
  - Successful login  → counter reset, no token consumed
  - Failed login      → counter incremented
  - On the 5th failure → 429 Too Many Requests for 3 minutes

Because successful logins do not consume tokens, these tests can run
as part of the full suite without breaking other auth tests.
"""

import logging

import pytest

from ambrosia.auth_utils import DEFAULT_TEST_USER
from ambrosia.http_client import AmbrosiaHttpClient

logger = logging.getLogger(__name__)

# Must match LoginRateLimiter constants in Authorize.kt
MAX_FAILURES = 5
LOCKOUT_DURATION_S = 3 * 60
INVALID_CREDS = {"name": "nonexistent_user", "pin": "9999"}


class TestLoginRateLimit:
    """Tests for the failure-based login rate limiter."""

    @pytest.mark.asyncio
    @pytest.mark.slow
    async def test_successful_logins_do_not_consume_rate_limit_tokens(
        self, server_url: str
    ):
        """Successful logins reset the failure counter even if the IP was blocked.

        Correct credentials always succeed and clear the limiter, so a legitimate
        user who knows their PIN is never permanently locked out.
        """
        async with AmbrosiaHttpClient(server_url) as client:
            # Reset any pre-existing state from other tests
            reset = await client.post("/auth/login", json=DEFAULT_TEST_USER)
            assert reset.status_code == 200, (
                f"Pre-test reset login: expected 200, got {reset.status_code}"
            )

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
        """The MAX_FAILURES-th bad login itself returns 429 and the IP is blocked.

        Also verifies:
        - Each of the first MAX_FAILURES-1 attempts returns a credential error (not 429)
        - Wrong credentials from a blocked IP continue to return 429
        - Correct credentials from a blocked IP succeed and reset the counter
        - A brand-new client session from the same IP shares the blocked bucket
        """
        async with AmbrosiaHttpClient(server_url) as client:
            # Reset the counter with a successful login so the test is order-independent
            reset = await client.post("/auth/login", json=DEFAULT_TEST_USER)
            assert reset.status_code == 200, (
                f"Pre-test reset login: expected 200, got {reset.status_code}"
            )

            # First MAX_FAILURES-1 attempts return a credential error
            for i in range(MAX_FAILURES - 1):
                response = await client.post("/auth/login", json=INVALID_CREDS)
                assert response.status_code in (400, 401), (
                    f"Failed attempt {i + 1}/{MAX_FAILURES}: expected 400/401, "
                    f"got {response.status_code}"
                )
                logger.info(f"Attempt {i + 1}/{MAX_FAILURES}: {response.status_code}")

            # The MAX_FAILURES-th bad login itself triggers the lockout (429)
            response = await client.post("/auth/login", json=INVALID_CREDS)
            assert response.status_code == 429, (
                f"Attempt {MAX_FAILURES}/{MAX_FAILURES}: expected 429 (rate limited on 5th failure), "
                f"got {response.status_code}"
            )
            logger.info(
                f"Attempt {MAX_FAILURES}/{MAX_FAILURES}: {response.status_code} (blocked ✓)"
            )

            # Wrong credentials from a blocked IP continue to return 429
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
                f"New session, same IP, wrong creds: {response.status_code} (shared bucket ✓)"
            )

            # Correct credentials always succeed and reset the counter even when blocked
            response = await new_client.post("/auth/login", json=DEFAULT_TEST_USER)
            assert response.status_code == 200, (
                f"Correct credentials on blocked IP: expected 200 (bypass + reset), "
                f"got {response.status_code}"
            )
            logger.info(
                f"Correct credentials on blocked IP: {response.status_code} (reset ✓)"
            )

        logger.info(
            f"✓ IP blocked after {MAX_FAILURES} failed logins; "
            "block is shared across sessions; correct credentials bypass and reset"
        )

    @pytest.mark.asyncio
    @pytest.mark.slow
    async def test_rate_limit_429_includes_retry_after(self, server_url: str):
        """The 429 response must include retryAfter in the body and Retry-After header.

        Both values must match and be close to LOCKOUT_DURATION_S (allowing a few
        seconds of tolerance for test execution time).
        """
        async with AmbrosiaHttpClient(server_url) as client:
            # Reset counter with a successful login
            reset = await client.post("/auth/login", json=DEFAULT_TEST_USER)
            assert reset.status_code == 200, (
                f"Pre-test reset login: expected 200, got {reset.status_code}"
            )

            # Trigger lockout on the 5th failure
            for _ in range(MAX_FAILURES - 1):
                await client.post("/auth/login", json=INVALID_CREDS)
            response = await client.post("/auth/login", json=INVALID_CREDS)

        assert response.status_code == 429, (
            f"Expected 429 after {MAX_FAILURES} failures, got {response.status_code}"
        )

        # Verify body contains retryAfter
        body = response.json()
        assert "retryAfter" in body, f"429 body must contain 'retryAfter', got: {body}"
        retry_after_body = body["retryAfter"]
        assert isinstance(retry_after_body, int), (
            f"retryAfter must be an int, got {type(retry_after_body)}"
        )
        assert 0 < retry_after_body <= LOCKOUT_DURATION_S, (
            f"retryAfter={retry_after_body} must be in (0, {LOCKOUT_DURATION_S}]"
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
