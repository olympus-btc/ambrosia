"""End-to-end tests for role name validation."""

import logging
import uuid

import pytest

from ambrosia.api_utils import assert_status_code
from ambrosia.auth_utils import create_role

logger = logging.getLogger(__name__)


class TestRoleNameValidation:
    """Tests for blank name enforcement on the roles endpoints."""

    @pytest.fixture
    async def existing_role(self, admin_client):
        """Create a temporary role for PUT tests and clean it up after."""
        uid = str(uuid.uuid4())[:8]
        role_id = await create_role(admin_client, f"test_role_{uid}")
        yield role_id
        await admin_client.delete(f"/roles/{role_id}")

    @pytest.mark.asyncio
    async def test_create_role_with_blank_name_fails(self, admin_client):
        """POST /roles with a blank name should return 400."""
        response = await admin_client.post("/roles", json={"role": ""})
        assert_status_code(
            response, 400, "Blank role name should be rejected on create"
        )
        logger.info("✓ Blank role name correctly rejected on create")

    @pytest.mark.asyncio
    async def test_create_role_with_whitespace_name_fails(self, admin_client):
        """POST /roles with a whitespace-only name should return 400."""
        response = await admin_client.post("/roles", json={"role": "   "})
        assert_status_code(
            response, 400, "Whitespace-only role name should be rejected on create"
        )
        logger.info("✓ Whitespace-only role name correctly rejected on create")

    @pytest.mark.asyncio
    async def test_create_role_with_valid_name_succeeds(self, admin_client):
        """POST /roles with a valid name should return 201."""
        uid = str(uuid.uuid4())[:8]
        response = await admin_client.post("/roles", json={"role": f"valid_role_{uid}"})
        assert_status_code(
            response, 201, "Valid role name should be accepted on create"
        )
        await admin_client.delete(f"/roles/{response.json()['id']}")
        logger.info("✓ Valid role name correctly accepted on create")

    @pytest.mark.asyncio
    async def test_update_role_with_blank_name_fails(self, admin_client, existing_role):
        """PUT /roles/{id} with a blank name should return 400."""
        response = await admin_client.put(f"/roles/{existing_role}", json={"role": ""})
        assert_status_code(
            response, 400, "Blank role name should be rejected on update"
        )
        logger.info("✓ Blank role name correctly rejected on update")

    @pytest.mark.asyncio
    async def test_update_role_with_whitespace_name_fails(
        self, admin_client, existing_role
    ):
        """PUT /roles/{id} with a whitespace-only name should return 400."""
        response = await admin_client.put(
            f"/roles/{existing_role}", json={"role": "   "}
        )
        assert_status_code(
            response, 400, "Whitespace-only role name should be rejected on update"
        )
        logger.info("✓ Whitespace-only role name correctly rejected on update")

    @pytest.mark.asyncio
    async def test_update_role_with_valid_name_succeeds(
        self, admin_client, existing_role
    ):
        """PUT /roles/{id} with a valid name should return 200."""
        uid = str(uuid.uuid4())[:8]
        response = await admin_client.put(
            f"/roles/{existing_role}", json={"role": f"updated_role_{uid}"}
        )
        assert_status_code(
            response, 200, "Valid role name should be accepted on update"
        )
        logger.info("✓ Valid role name correctly accepted on update")
