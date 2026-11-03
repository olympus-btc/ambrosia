"""End-to-end routing tests that replicate RoutingTest.kt functionality.

This module contains pytest tests that replicate the behavior of the Kotlin
RoutingE2ETest class, testing various API endpoints and their responses.
"""

import time

import pytest

from ambrosia.api_utils import assert_response_contains, assert_status_code


class TestRoutingE2E:
    @pytest.mark.asyncio
    async def test_root_endpoint(self, public_client):
        root_response = await public_client.get("/")

        assert_status_code(root_response, 200)

        expected_text = "Root path of the API Nothing to see here"
        assert_response_contains(root_response, expected_text)

        content_type = root_response.headers.get("content-type", "")
        assert "text/plain" in content_type or "application/json" in content_type, (
            f"Unexpected content type: {content_type}"
        )

    @pytest.mark.asyncio
    async def test_base_currency_endpoint(self, public_client):
        base_currency_response = await public_client.get("/base-currency")

        assert base_currency_response.status_code in [200, 500], (
            f"Unexpected status code: {base_currency_response.status_code}"
        )

        if base_currency_response.status_code == 200:
            assert_response_contains(base_currency_response, "currencyId")

    @pytest.mark.asyncio
    async def test_non_existent_endpoint(self, public_client):
        non_existent_response = await public_client.get("/non-existent")

        assert_status_code(non_existent_response, 404)

    @pytest.mark.asyncio
    async def test_base_currency_performance(self, public_client):
        start_time = time.time()
        await public_client.get("/base-currency")
        end_time = time.time()
        request_time_ms = (end_time - start_time) * 1000

        assert request_time_ms < 1000, f"Request took too long: {request_time_ms:.2f}ms"

    @pytest.mark.asyncio
    async def test_cors_rejects_disallowed_origin(self, public_client):
        headers = {
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
        }
        cors_response = await public_client.get("/", headers=headers)

        assert_status_code(cors_response, 403)
        assert "access-control-allow-origin" not in cors_response.headers, (
            "Unexpected CORS header on a rejected cross-origin request: access-control-allow-origin"
        )

    @pytest.mark.asyncio
    async def test_security_headers(self, public_client):
        security_headers_response = await public_client.get("/")

        content_type_options = security_headers_response.headers.get(
            "x-content-type-options"
        )
        assert content_type_options == "nosniff", (
            f"Unexpected X-Content-Type-Options: {content_type_options}"
        )

        frame_options = security_headers_response.headers.get("x-frame-options")
        assert frame_options == "DENY", f"Unexpected X-Frame-Options: {frame_options}"

        referrer_policy = security_headers_response.headers.get("referrer-policy")
        assert referrer_policy == "strict-origin-when-cross-origin", (
            f"Unexpected Referrer-Policy: {referrer_policy}"
        )

        permissions_policy = security_headers_response.headers.get("permissions-policy")
        assert permissions_policy == "camera=(), microphone=(), geolocation=()", (
            f"Unexpected Permissions-Policy: {permissions_policy}"
        )
