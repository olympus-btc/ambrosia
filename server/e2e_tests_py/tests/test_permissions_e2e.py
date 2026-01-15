"""Test cases for dynamic permission system using client_factory."""

import pytest
from ambrosia.api_utils import assert_status_code

@pytest.mark.asyncio
async def test_user_with_read_permission_can_read_but_not_write(client_factory):
    """Test that a user with only 'orders_read' can read orders but not create them."""
    # Create a client with ONLY read permissions
    viewer_client = await client_factory(permissions=["orders_read"])

    # 1. Should be able to read (GET)
    response = await viewer_client.get("/orders")
    # 200 OK or 204 No Content are both success
    assert response.status_code in [200, 204], f"Expected read success, got {response.status_code}"

    # 2. Should NOT be able to create (POST) - Expecting 403 Forbidden
    dummy_order = {
        "user_id": "some-id",
        "waiter": "some-waiter",
        "status": "pending",
        "total": 100.0,
        "created_at": "2023-01-01T00:00:00Z"
    }
    response = await viewer_client.post("/orders", json=dummy_order)
    assert_status_code(response, 403, "User without create permission should be forbidden")

@pytest.mark.asyncio
async def test_user_with_full_permissions_can_create(client_factory):
    """Test that a user with 'orders_create' can access the creation endpoint."""
    # Create a client with create permissions
    creator_client = await client_factory(permissions=["orders_create"])

    # Try to create - We expect something other than 403 Forbidden
    # Even if it returns 400 (Bad Request) due to invalid data, it means permission check PASSED
    dummy_order = {}
    response = await creator_client.post("/orders", json=dummy_order)
    
    assert response.status_code != 403, "User with permission should not be forbidden"
