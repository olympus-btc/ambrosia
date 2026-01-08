"""Authentication-specific test utilities and helpers.

This module provides utility functions for testing authentication endpoints,
token management, and cookie handling.
"""

import httpx

from ambrosia.api_utils import assert_status_code
from ambrosia.http_client import AmbrosiaHttpClient

# Default test user credentials
DEFAULT_TEST_USER = {"name": "cooluser1", "pin": "0000"}


def get_tokens_from_response(response: httpx.Response) -> tuple[str, str]:
    """Extract access and refresh tokens from login/refresh response.

    Args:
        response: HTTP response containing cookies

    Returns:
        Tuple of (access_token, refresh_token)

    Raises:
        AssertionError: If tokens are missing
    """
    access_token = response.cookies.get("accessToken")
    refresh_token = response.cookies.get("refreshToken")
    assert access_token, "Should have accessToken after login"
    assert refresh_token, "Should have refreshToken after login"
    return access_token, refresh_token


def set_cookie_in_jar(client: AmbrosiaHttpClient, name: str, value: str) -> None:
    """Set a cookie in the client's cookie jar.

    Args:
        client: The HTTP client
        name: Cookie name
        value: Cookie value
    """
    assert client._client is not None, "HTTP client should be initialized"
    # Delete existing cookie first to avoid duplicates
    if name in client._client.cookies:
        del client._client.cookies[name]
    client._client.cookies.set(name, value)


def assert_cookies_present(response: httpx.Response, *cookie_names: str) -> None:
    """Assert that specified cookies are present in the response.

    Args:
        response: HTTP response
        *cookie_names: Names of cookies that should be present
    """
    cookies = response.cookies
    for cookie_name in cookie_names:
        assert cookie_name in cookies, f"{cookie_name} cookie should be set"
        assert cookies[cookie_name], f"{cookie_name} should not be empty"


def assert_cookies_absent(response: httpx.Response, *cookie_names: str) -> None:
    """Assert that specified cookies are absent from the response.

    Args:
        response: HTTP response
        *cookie_names: Names of cookies that should not be present
    """
    cookies = response.cookies
    for cookie_name in cookie_names:
        assert cookie_name not in cookies, f"{cookie_name} should not be set"


def assert_success_message(response: httpx.Response) -> None:
    """Assert that response contains a success message.

    Args:
        response: HTTP response with JSON body
    """
    response_data = response.json()
    assert "message" in response_data, "Response should contain 'message' field"
    assert "success" in response_data["message"].lower(), (
        "Response message should indicate success"
    )


async def login_user(
    client: AmbrosiaHttpClient,
    credentials: dict = None,
    expected_status: int | None = 200,
) -> httpx.Response:
    """Helper function to perform login with default or custom credentials.

    Args:
        client: The HTTP client to use
        credentials: Login credentials dict with 'name' and 'pin'. Defaults to test user.
        expected_status: Expected HTTP status code. Defaults to 200. Set to None to skip assertion.

    Returns:
        The login response
    """
    if credentials is None:
        credentials = DEFAULT_TEST_USER

    response = await client.post("/auth/login", json=credentials)
    if expected_status is not None:
        assert_status_code(response, expected_status)
    return response


async def create_test_role(admin_client: AmbrosiaHttpClient, role_name: str) -> str:
    """Create a new role using the admin client.

    Args:
        admin_client: An authenticated admin client
        role_name: Name of the role to create

    Returns:
        The ID of the newly created role
    """
    role_data = {"role": role_name}
    response = await admin_client.post("/roles", json=role_data)
    assert_status_code(response, 201, f"Failed to create role '{role_name}'")
    return response.json()["id"]


async def grant_permissions(
    admin_client: AmbrosiaHttpClient, role_id: str, permissions: list[str]
) -> None:
    """Grant specific permissions to a role.

    Args:
        admin_client: An authenticated admin client
        role_id: The ID of the role
        permissions: List of permission names (e.g., ['users_read', 'orders_create'])
    """
    payload = {"permissions": permissions}
    response = await admin_client.put(f"/roles/{role_id}/permissions", json=payload)
    assert_status_code(response, 200, f"Failed to grant permissions to role {role_id}")


async def create_test_user(
    admin_client: AmbrosiaHttpClient, name: str, pin: str, role_id: str
) -> str:
    """Create a new user using the admin client.

    Args:
        admin_client: An authenticated admin client
        name: User name
        pin: User PIN
        role_id: Role ID to assign to the user

    Returns:
        The ID of the newly created user
    """
    user_data = {"name": name, "pin": pin, "role_id": role_id}
    response = await admin_client.post("/users", json=user_data)
    assert_status_code(response, 201, f"Failed to create user '{name}'")
    return response.json()["id"]
