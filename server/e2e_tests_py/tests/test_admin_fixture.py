"""Test to verify the admin_client fixture."""

import pytest
import logging

logger = logging.getLogger(__name__)

@pytest.mark.asyncio
async def test_admin_client_access_protected_endpoint(admin_client):
    """Verify that admin_client can access a protected endpoint without manual login."""
    # /users/me is a protected endpoint that returns the current user's info
    response = await admin_client.get("/users/me")
    
    assert response.status_code == 200
    user_data = response.json()
    logger.info(f"User data: {user_data}")
    
    assert "user" in user_data
    assert user_data["user"]["name"] == "cooluser1"
    logger.info(f"✓ admin_client verified: successfully accessed /users/me as {user_data['user']['name']}")