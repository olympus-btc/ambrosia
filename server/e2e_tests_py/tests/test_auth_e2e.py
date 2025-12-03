"""Comprehensive end-to-end tests for authentication system.

This module tests the authentication flow including:
- Login with accessToken and refreshToken cookie handling
- Token refresh functionality
- Token expiration behavior
- Logout functionality
- Protected endpoint access
- Invalid token scenarios
"""

import asyncio
import logging

import pytest

from ambrosia.api_utils import assert_status_code
from ambrosia.auth_utils import (
    assert_cookies_absent,
    assert_cookies_present,
    assert_success_message,
    get_tokens_from_response,
    login_user,
    set_cookie_in_jar,
)
from ambrosia.http_client import AmbrosiaHttpClient

logger = logging.getLogger(__name__)


class TestAuthentication:
    """Tests for authentication endpoints and token management."""

    @pytest.mark.asyncio
    async def test_successful_login_sets_both_tokens(self, server_url: str):
        """Test that successful login sets both accessToken and refreshToken cookies."""
        async with AmbrosiaHttpClient(server_url) as client:
            response = await login_user(client)

            # Check response message
            assert_success_message(response)

            # Verify both cookies are set
            assert_cookies_present(response, "accessToken", "refreshToken")

            logger.info("✓ Login successful, both tokens set")

    @pytest.mark.asyncio
    async def test_failed_login_does_not_set_tokens(self, server_url: str):
        """Test that failed login does not set authentication cookies."""
        async with AmbrosiaHttpClient(server_url) as client:
            response = await login_user(
                client,
                credentials={"name": "cooluser1", "pin": "wrongpin"},
                expected_status=None,
            )

            # Should return 401 or 400
            assert response.status_code in [400, 401], (
                f"Expected 400/401 for invalid credentials, got {response.status_code}"
            )

            # Verify no cookies are set
            assert_cookies_absent(response, "accessToken", "refreshToken")

    @pytest.mark.asyncio
    async def test_refresh_without_token_fails(self, server_url: str):
        """Test that refresh endpoint fails without refreshToken cookie."""
        async with AmbrosiaHttpClient(server_url) as client:
            # Try to refresh without any cookies
            response = await client.post("/auth/refresh")

            assert response.status_code in [400, 401, 500], (
                f"Expected 400/401/500 without refreshToken, got {response.status_code}"
            )

    @pytest.mark.asyncio
    async def test_refresh_with_invalid_token_fails(self, server_url: str):
        """Test that refresh endpoint fails with invalid refreshToken."""
        async with AmbrosiaHttpClient(server_url) as client:
            # First, login to get a valid refresh token
            login_response = await login_user(client)

            # Verify we have a valid refresh token from login (just to ensure login worked)
            get_tokens_from_response(login_response)

            # Now overwrite it with an invalid token to test server validation
            set_cookie_in_jar(client, "refreshToken", "invalid_token_12345")

            response = await client.post("/auth/refresh")

            assert response.status_code in [400, 401, 500], (
                f"Expected 400/401/500 with invalid refreshToken, got {response.status_code}"
            )

    @pytest.mark.asyncio
    async def test_access_token_expiration_and_refresh(self, server_url: str):
        """Test that access token expires and refresh token still works.

        This test verifies:
        1. Access token expires after configured time (5 seconds in tests)
        2. Expired access token is rejected (401 on protected endpoints)
        3. Refresh token still works after access token expires
        4. New access token is generated and works

        Marked as @pytest.mark.slow - can be skipped with: pytest -m "not slow"
        """
        async with AmbrosiaHttpClient(server_url) as client:
            # Login to get tokens
            login_response = await login_user(client)

            original_access_token, refresh_token = get_tokens_from_response(
                login_response
            )

            # Wait for access token to expire (configured at 5 seconds, wait 8 to be safe)
            logger.info("Waiting for access token to expire (8 seconds)...")
            await asyncio.sleep(8)

            # Assert that the access token has expired by trying to use it on a protected endpoint
            # The expired token should be rejected with 401 Unauthorized
            protected_response = await client.get("/users/me")
            assert protected_response.status_code == 401, (
                f"Expected 401 Unauthorized with expired access token, "
                f"got {protected_response.status_code}"
            )
            logger.info("✓ Access token confirmed expired (401 on protected endpoint)")

            # Try refresh - this should work since refresh token is still valid
            refresh_response = await client.post("/auth/refresh")
            assert_status_code(
                refresh_response,
                200,
                "Refresh should work even after access token expires",
            )

            # Get new access token from response
            new_access_token = refresh_response.cookies.get("accessToken")
            assert new_access_token, "Should get new accessToken after refresh"
            assert new_access_token != original_access_token, (
                "New accessToken should be different from expired one"
            )

            # Verify the new access token works on a protected endpoint
            # httpx automatically handles Set-Cookie headers with secure=false
            protected_response_after_refresh = await client.get("/users/me")
            assert_status_code(
                protected_response_after_refresh,
                200,
                "New access token should work on protected endpoint",
            )
            logger.info(
                "✓ New access token confirmed working (200 on protected endpoint)"
            )

            logger.info("✓ Access token expiration and refresh verified")

    @pytest.mark.asyncio
    async def test_logout_revokes_tokens(self, server_url: str):
        """Test that logout revokes refresh token and deletes cookies."""
        async with AmbrosiaHttpClient(server_url) as client:
            # Login first
            login_response = await login_user(client)

            access_token, refresh_token = get_tokens_from_response(login_response)

            # Logout - this should revoke the refresh token server-side
            # httpx automatically handles accessToken cookie from login (secure=false)
            logout_response = await client.post("/auth/logout")
            assert_status_code(logout_response, 200)

            # Check response message
            assert_success_message(logout_response)

            # Verify cookies are deleted (maxAge=0 or empty value)
            # httpx might still show the cookies, but they should be expired
            deleted_access = logout_response.cookies.get("accessToken")
            deleted_refresh = logout_response.cookies.get("refreshToken")

            # Cookies should be empty or expired
            assert not deleted_access or deleted_access == "", (
                "accessToken cookie should be deleted/empty after logout"
            )
            assert not deleted_refresh or deleted_refresh == "", (
                "refreshToken cookie should be deleted/empty after logout"
            )

            # Verify refresh token is revoked server-side - try to refresh should fail
            # We stored the refresh token before logout, now test that it's been revoked
            async with AmbrosiaHttpClient(server_url) as new_client:
                # Manually set the old refresh token in the new client's cookie jar
                # This simulates someone trying to use a refresh token after logout
                set_cookie_in_jar(new_client, "refreshToken", refresh_token)

                # Try to refresh with the revoked token - should fail
                refresh_response = await new_client.post("/auth/refresh")

                # The logout endpoint now requires authentication and properly revokes tokens
                # This should always fail because the refresh token was revoked server-side
                assert refresh_response.status_code in [400, 401, 500], (
                    f"Expected refresh to fail after logout (token should be revoked), "
                    f"got {refresh_response.status_code}. This means the logout endpoint "
                    f"didn't properly revoke the refresh token on the server."
                )
                logger.info("✓ Revoked refresh token correctly rejected")

            logger.info(
                "✓ Logout successful, tokens revoked and refresh token invalidated"
            )

    @pytest.mark.asyncio
    async def test_multiple_refreshes_generate_unique_tokens(self, server_url: str):
        """Test that multiple token refreshes work and generate unique tokens.

        This test verifies:
        1. Refresh token remains valid across multiple refreshes (not rotated/invalidated)
        2. Each refresh generates a new unique access token
        3. The same refresh token can be reused multiple times
        4. Response body contains correct fields
        """
        async with AmbrosiaHttpClient(server_url) as client:
            # Login
            login_response = await login_user(client)

            # Get tokens and verify they exist
            original_access_token, _ = get_tokens_from_response(login_response)

            # Refresh multiple times to verify refresh token remains valid
            # If the refresh token was being rotated or invalidated, subsequent refreshes would fail
            access_tokens = [original_access_token]
            num_refreshes = 5

            for i in range(num_refreshes):
                # Add small delay to ensure different expiration timestamps
                # (tokens expire after 60 seconds, tokens generated in same second are identical)
                await asyncio.sleep(1)

                refresh_response = await client.post("/auth/refresh")
                assert_status_code(
                    refresh_response, 200, f"Refresh {i + 1} should succeed"
                )

                # On first refresh, validate response body structure
                if i == 0:
                    assert_success_message(refresh_response)
                    refresh_data = refresh_response.json()
                    assert "accessToken" in refresh_data, (
                        "Response should include new accessToken in body"
                    )

                # Verify we get a new access token each time
                new_access_token = refresh_response.cookies.get("accessToken")
                assert new_access_token, (
                    f"Should get new accessToken on refresh {i + 1}"
                )
                access_tokens.append(new_access_token)

            # All access tokens should be different (new token each time)
            assert len(set(access_tokens)) == len(access_tokens), (
                f"Each of {num_refreshes} refreshes should generate a unique accessToken"
            )

            # Note: Refresh token remains the same (not rotated), and the client
            # continues to use the original refresh token from login for all refreshes.
            # The server doesn't send it back in refresh responses.
            # The fact that all refreshes succeeded proves the refresh token remains valid.

            logger.info(
                f"✓ {num_refreshes} token refreshes successful, all tokens unique"
            )

    @pytest.mark.asyncio
    async def test_login_with_missing_fields_fails(self, server_url: str):
        """Test that login fails with missing required fields and does not set cookies."""
        async with AmbrosiaHttpClient(server_url) as client:
            # TODO: Server returns 500 for validation errors instead of proper error codes
            # Should return 400 Bad Request or 422 Unprocessable Entity

            # Missing pin
            response = await client.post("/auth/login", json={"name": "cooluser1"})
            assert response.status_code in [400, 401, 422, 500], (
                f"Expected 400/401/422/500 for missing pin, got {response.status_code}"
            )
            # Verify no cookies are set
            assert_cookies_absent(response, "accessToken", "refreshToken")

            # Missing name
            response = await client.post("/auth/login", json={"pin": "0000"})
            assert response.status_code in [400, 401, 422, 500], (
                f"Expected 400/401/422/500 for missing name, got {response.status_code}"
            )
            # Verify no cookies are set
            assert "accessToken" not in response.cookies, (
                "accessToken should not be set when name is missing"
            )
            assert "refreshToken" not in response.cookies, (
                "refreshToken should not be set when name is missing"
            )

            # Empty body
            response = await client.post("/auth/login", json={})
            assert response.status_code in [400, 401, 422, 500], (
                f"Expected 400/401/422/500 for empty body, got {response.status_code}"
            )
            # Verify no cookies are set
            assert "accessToken" not in response.cookies, (
                "accessToken should not be set for empty body"
            )
            assert "refreshToken" not in response.cookies, (
                "refreshToken should not be set for empty body"
            )
