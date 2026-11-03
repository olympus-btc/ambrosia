"""Authentication-specific test utilities and helpers.

This module provides utility functions for testing authentication endpoints,
token management, and cookie handling.
"""

import httpx

from ambrosia.api_utils import assert_status_code
from ambrosia.http_client import AmbrosiaHttpClient

DEFAULT_TEST_USER = {"name": "cooluser1", "pin": "000000"}

CLIENT_FACTORY_USER_PIN = "123456"


def with_current_user_pin(
    request_fields: dict | None = None, pin: str = DEFAULT_TEST_USER["pin"]
) -> dict:
    return {**(request_fields or {}), "currentUserPin": pin}


def get_tokens_from_response(auth_response: httpx.Response) -> tuple[str, str]:
    """Extract access and refresh tokens from login/refresh response.

    Args:
        auth_response: HTTP response containing cookies

    Returns:
        Tuple of (access_token, refresh_token)

    Raises:
        AssertionError: If tokens are missing
    """
    access_token = auth_response.cookies.get("accessToken")
    refresh_token = auth_response.cookies.get("refreshToken")
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


def assert_cookies_present(auth_response: httpx.Response, *cookie_names: str) -> None:
    """Assert that specified cookies are present in the response.

    Args:
        auth_response: HTTP response
        *cookie_names: Names of cookies that should be present
    """
    cookies = auth_response.cookies
    for cookie_name in cookie_names:
        assert cookie_name in cookies, f"{cookie_name} cookie should be set"
        assert cookies[cookie_name], f"{cookie_name} should not be empty"


def assert_cookies_absent(auth_response: httpx.Response, *cookie_names: str) -> None:
    """Assert that specified cookies are absent from the response.

    Args:
        auth_response: HTTP response
        *cookie_names: Names of cookies that should not be present
    """
    cookies = auth_response.cookies
    for cookie_name in cookie_names:
        assert cookie_name not in cookies, f"{cookie_name} should not be set"


def assert_success_message(auth_response: httpx.Response) -> None:
    """Assert that response contains a success message.

    Args:
        auth_response: HTTP response with JSON body
    """
    response_json = auth_response.json()
    assert "message" in response_json, "Response should contain 'message' field"
    assert "success" in response_json["message"].lower(), (
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

    login_response = await client.post("/auth/login", json=credentials)
    if expected_status is not None:
        assert_status_code(login_response, expected_status)
    return login_response


async def create_role(admin_client: AmbrosiaHttpClient, role_name: str) -> str:
    """Create a new role using the admin client.

    Args:
        admin_client: An authenticated admin client
        role_name: Name of the role to create

    Returns:
        The ID of the newly created role
    """
    role_creation_response = await admin_client.post(
        "/roles", json=with_current_user_pin({"role": role_name})
    )
    assert_status_code(
        role_creation_response, 201, f"Failed to create role '{role_name}'"
    )
    return role_creation_response.json()["id"]


async def grant_permissions(
    admin_client: AmbrosiaHttpClient, role_id: str, permissions: list[str]
) -> None:
    """Grant specific permissions to a role.

    Args:
        admin_client: An authenticated admin client
        role_id: The ID of the role
        permissions: List of permission names (e.g., ['users_read', 'orders_create'])
    """
    permissions_grant_response = await admin_client.put(
        f"/roles/{role_id}/permissions",
        json=with_current_user_pin({"permissions": permissions}),
    )
    assert_status_code(
        permissions_grant_response,
        200,
        f"Failed to grant permissions to role {role_id}",
    )


async def create_user(
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
    user_creation_response = await admin_client.post(
        "/users",
        json=with_current_user_pin(
            {"user": {"name": name, "pin": pin, "role": role_id}}
        ),
    )
    assert_status_code(user_creation_response, 201, f"Failed to create user '{name}'")
    return user_creation_response.json()["id"]
