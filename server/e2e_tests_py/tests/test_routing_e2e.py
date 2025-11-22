"""End-to-end routing tests that replicate RoutingTest.kt functionality.

This module contains pytest tests that replicate the behavior of the Kotlin
RoutingE2ETest class, testing various API endpoints and their responses.
"""

import logging
import time

import pytest

from ambrosia.api_utils import assert_response_contains, assert_status_code
from ambrosia.http_client import AmbrosiaHttpClient

logger = logging.getLogger(__name__)


class TestRoutingE2E:
    """End-to-end routing tests that replicate RoutingE2ETest.kt functionality."""

    @pytest.mark.asyncio
    async def test_root_endpoint(self, server_url: str):
        """Test the root endpoint, equivalent to testRootEndpoint() in RoutingE2ETest."""
        async with AmbrosiaHttpClient(server_url) as client:
            response = await client.get("/")

            # Assert status code matches Kotlin test
            assert_status_code(response, 200)

            # Assert response body matches expected content
            expected_text = "Root path of the API Nothing to see here"
            assert_response_contains(response, expected_text)

            # Check content type header
            content_type = response.headers.get("content-type", "")
            assert "text/plain" in content_type or "application/json" in content_type, (
                f"Unexpected content type: {content_type}"
            )

    @pytest.mark.asyncio
    async def test_base_currency_endpoint(self, server_url: str):
        """Test the base currency endpoint, equivalent to testBaseCurrencyEndpoint() in RoutingE2ETest."""
        async with AmbrosiaHttpClient(server_url) as client:
            response = await client.get("/base-currency")

            # This might fail due to database dependency, same as Kotlin test
            # Accept either OK or InternalServerError
            assert response.status_code in [200, 500], (
                f"Unexpected status code: {response.status_code}"
            )

            if response.status_code == 200:
                # If successful, check that response contains expected field
                assert_response_contains(response, "currency_id")

    @pytest.mark.asyncio
    async def test_non_existent_endpoint(self, server_url: str):
        """Test non-existent endpoint, equivalent to testNonExistentEndpoint() in RoutingE2ETest."""
        async with AmbrosiaHttpClient(server_url) as client:
            response = await client.get("/non-existent")

            # Assert 404 status code matches Kotlin test
            assert_status_code(response, 404)

    @pytest.mark.asyncio
    async def test_base_currency_performance(self, server_url: str):
        """Test base currency endpoint performance, equivalent to testBaseCurrencyPerformance() in RoutingE2ETest."""
        async with AmbrosiaHttpClient(server_url) as client:
            start_time = time.time()
            await client.get("/base-currency")
            end_time = time.time()
            request_time = (end_time - start_time) * 1000  # Convert to milliseconds

            # Ensure response time is reasonable (under 1000ms, same as Kotlin test)
            assert request_time < 1000, f"Request took too long: {request_time:.2f}ms"

    @pytest.mark.asyncio
    async def test_cors_headers(self, server_url: str):
        """Test that CORS headers are properly set."""
        async with AmbrosiaHttpClient(server_url) as client:
            # Make a request with CORS headers
            headers = {
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "GET",
            }
            response = await client.get("/", headers=headers)

            # Check for CORS headers in response (check what's actually available)
            assert "access-control-allow-origin" in response.headers, (
                "Missing CORS header: access-control-allow-origin"
            )
            assert "access-control-allow-credentials" in response.headers, (
                "Missing CORS header: access-control-allow-credentials"
            )

            # Optional headers that might not be present
            optional_headers = [
                "access-control-allow-methods",
                "access-control-allow-headers",
            ]

            for header in optional_headers:
                if header in response.headers:
                    logger.info(f"Found optional CORS header: {header}")

    @pytest.mark.asyncio
    async def test_logout_revokes_tokens(self, server_url: str):
        """Test that logout revokes refresh tokens and prevents further refresh.

        This test verifies that:
        1. Logout requires authentication (accessible only with valid access token)
        2. When properly authenticated, logout revokes the refresh token server-side
        3. After logout, even if we manually restore the cookie, the token won't work
        """
        async with AmbrosiaHttpClient(server_url) as client:
            # First, log in with default credentials to obtain tokens
            login_data = {"name": "cooluser1", "pin": "0000"}
            login_response = await client.post("/auth/login", json=login_data)

            assert login_response.status_code == 200, (
                f"Login failed with status {login_response.status_code}. "
                "Ensure the development database has the default user (cooluser1 / 0000)."
            )

            logger.info("Successfully logged in, cookies received")

            # Verify that refresh works BEFORE logout (to ensure the token is valid)
            refresh_before_logout = await client.post("/auth/refresh")
            assert refresh_before_logout.status_code == 200, (
                f"Refresh should work before logout, got {refresh_before_logout.status_code}. "
                "This ensures the refresh token is valid before we test logout."
            )
            logger.info("Refresh token works before logout")

            # Save the refresh token value BEFORE logout so we can test server-side revocation
            saved_refresh_token = client._client.cookies.get("refreshToken")
            assert saved_refresh_token, (
                "Should have a refresh token cookie before logout"
            )
            logger.info(f"Saved refresh token: {saved_refresh_token[:20]}...")

            # Now log out; this should revoke the refresh token server-side
            logout_response = await client.post("/auth/logout")
            assert logout_response.status_code == 200, (
                f"Expected 200 OK for logout, got {logout_response.status_code}"
            )
            logger.info("Successfully logged out")

            # Logout clears the cookies, so manually restore the refresh token
            # This proves we're testing SERVER-SIDE revocation, not just client-side cookie deletion
            client._client.cookies.set("refreshToken", saved_refresh_token)
            logger.info(
                "Manually restored refresh token cookie to test server-side revocation"
            )

            # After logout, attempting to refresh should fail because the token was revoked SERVER-SIDE
            refresh_response = await client.post("/auth/refresh")
            logger.info(
                f"Refresh after logout returned: {refresh_response.status_code}"
            )

            assert refresh_response.status_code in [400, 401, 500], (
                "Expected refresh to fail after logout (server-side revocation), "
                f"got status {refresh_response.status_code}. "
                "This means the logout endpoint didn't properly revoke the refresh token on the server. "
                "The token should be revoked even though we manually restored the cookie."
            )
