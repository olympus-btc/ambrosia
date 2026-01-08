"""End-to-end routing tests that replicate RoutingTest.kt functionality.

This module contains pytest tests that replicate the behavior of the Kotlin
RoutingE2ETest class, testing various API endpoints and their responses.
"""

import logging
import time

import pytest

from ambrosia.api_utils import assert_response_contains, assert_status_code

logger = logging.getLogger(__name__)


class TestRoutingE2E:
    """End-to-end routing tests that replicate RoutingE2ETest.kt functionality."""

    @pytest.mark.asyncio
    async def test_root_endpoint(self, public_client):
        """Test the root endpoint, equivalent to testRootEndpoint() in RoutingE2ETest."""
        response = await public_client.get("/")

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
    async def test_base_currency_endpoint(self, public_client):
        """Test the base currency endpoint, equivalent to testBaseCurrencyEndpoint() in RoutingE2ETest."""
        response = await public_client.get("/base-currency")

        # This might fail due to database dependency, same as Kotlin test
        # Accept either OK or InternalServerError
        assert response.status_code in [200, 500], (
            f"Unexpected status code: {response.status_code}"
        )

        if response.status_code == 200:
            # If successful, check that response contains expected field
            assert_response_contains(response, "currency_id")

    @pytest.mark.asyncio
    async def test_non_existent_endpoint(self, public_client):
        """Test non-existent endpoint, equivalent to testNonExistentEndpoint() in RoutingE2ETest."""
        response = await public_client.get("/non-existent")

        # Assert 404 status code matches Kotlin test
        assert_status_code(response, 404)

    @pytest.mark.asyncio
    async def test_base_currency_performance(self, public_client):
        """Test base currency endpoint performance, equivalent to testBaseCurrencyPerformance() in RoutingE2ETest."""
        start_time = time.time()
        await public_client.get("/base-currency")
        end_time = time.time()
        request_time = (end_time - start_time) * 1000  # Convert to milliseconds

        # Ensure response time is reasonable (under 1000ms, same as Kotlin test)
        assert request_time < 1000, f"Request took too long: {request_time:.2f}ms"

    @pytest.mark.asyncio
    async def test_cors_headers(self, public_client):
        """Test that CORS headers are properly set."""
        # Make a request with CORS headers
        headers = {
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
        }
        response = await public_client.get("/", headers=headers)

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
