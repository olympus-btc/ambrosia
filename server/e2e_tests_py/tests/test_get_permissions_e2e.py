"""End-to-end tests for GET /permissions.

Returns the full list of system permissions seeded in the database.
Requires the permissions_read permission.
"""

import logging

import pytest

from ambrosia.api_utils import assert_status_code

logger = logging.getLogger(__name__)

EXPECTED_PERMISSION_FIELDS = {"id", "name", "description", "enabled"}


class TestGetPermissionsEndpoint:
    """Tests for GET /permissions."""

    @pytest.mark.asyncio
    async def test_get_permissions_returns_list(self, admin_client):
        """GET /permissions returns 200 with a non-empty list of permissions."""
        response = await admin_client.get("/permissions")
        assert_status_code(response, 200, "GET /permissions should return 200")
        body = response.json()
        assert isinstance(body, list), "Response should be a list"
        assert len(body) > 0, "Permissions list should not be empty"
        logger.info(f"✓ GET /permissions returned {len(body)} permissions")

    @pytest.mark.asyncio
    async def test_get_permissions_items_have_expected_fields(self, admin_client):
        """Each permission in the list has id, name, description, and enabled fields."""
        response = await admin_client.get("/permissions")
        assert_status_code(response, 200)
        for permission in response.json():
            for field in EXPECTED_PERMISSION_FIELDS:
                assert field in permission, f"Permission missing expected field: {field}"
        logger.info("✓ All permissions have expected fields")

    @pytest.mark.asyncio
    async def test_get_permissions_requires_auth(self, public_client):
        """GET /permissions without a token returns 401."""
        response = await public_client.get("/permissions")
        assert_status_code(response, 401, "GET /permissions should require authentication")
        logger.info("✓ GET /permissions correctly requires authentication")
