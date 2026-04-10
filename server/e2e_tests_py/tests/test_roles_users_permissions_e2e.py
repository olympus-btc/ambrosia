"""End-to-end permission enforcement tests for /roles and /users endpoints.

Verifies that the authorizePermission middleware correctly gates each
HTTP method with the appropriate permission, returning 403 when the
authenticated user lacks it.

Pattern per endpoint:
- No permission → 403
- Correct permission → not 403 (even 400 means the permission check passed)
"""

import logging

import pytest

from ambrosia.api_utils import assert_status_code

logger = logging.getLogger(__name__)

DUMMY_ID = "00000000-0000-0000-0000-000000000000"


class TestRolesPermissions:
    """Permission enforcement tests for /roles."""

    @pytest.mark.asyncio
    async def test_roles_read_required_for_get(self, client_factory):
        """GET /roles returns 403 without roles_read permission."""
        no_perm = await client_factory(permissions=[])
        response = await no_perm.get("/roles")
        assert_status_code(response, 403, "GET /roles should require roles_read")

        with_perm = await client_factory(permissions=["roles_read"])
        response = await with_perm.get("/roles")
        assert response.status_code != 403, "roles_read should allow GET /roles"
        logger.info("✓ roles_read correctly gates GET /roles")

    @pytest.mark.asyncio
    async def test_roles_create_required_for_post(self, client_factory):
        """POST /roles returns 403 without roles_create permission."""
        no_perm = await client_factory(permissions=[])
        response = await no_perm.post("/roles", json={"role": "test_role"})
        assert_status_code(response, 403, "POST /roles should require roles_create")

        with_perm = await client_factory(permissions=["roles_create"])
        response = await with_perm.post("/roles", json={"role": "test_role"})
        assert response.status_code != 403, "roles_create should allow POST /roles"
        logger.info("✓ roles_create correctly gates POST /roles")

    @pytest.mark.asyncio
    async def test_roles_update_required_for_put(self, client_factory):
        """PUT /roles/{id} returns 403 without roles_update permission."""
        no_perm = await client_factory(permissions=[])
        response = await no_perm.put(f"/roles/{DUMMY_ID}", json={"role": "updated"})
        assert_status_code(response, 403, "PUT /roles/{id} should require roles_update")

        with_perm = await client_factory(permissions=["roles_update"])
        response = await with_perm.put(f"/roles/{DUMMY_ID}", json={"role": "updated"})
        assert response.status_code != 403, "roles_update should allow PUT /roles/{id}"
        logger.info("✓ roles_update correctly gates PUT /roles/{id}")

    @pytest.mark.asyncio
    async def test_roles_delete_required_for_delete(self, client_factory):
        """DELETE /roles/{id} returns 403 without roles_delete permission."""
        no_perm = await client_factory(permissions=[])
        response = await no_perm.delete(f"/roles/{DUMMY_ID}")
        assert_status_code(
            response, 403, "DELETE /roles/{id} should require roles_delete"
        )

        with_perm = await client_factory(permissions=["roles_delete"])
        response = await with_perm.delete(f"/roles/{DUMMY_ID}")
        assert response.status_code != 403, (
            "roles_delete should allow DELETE /roles/{id}"
        )
        logger.info("✓ roles_delete correctly gates DELETE /roles/{id}")


class TestUsersPermissions:
    """Permission enforcement tests for /users."""

    @pytest.mark.asyncio
    async def test_users_read_required_for_get_by_id(self, client_factory):
        """GET /users/{id} returns 403 without users_read permission."""
        no_perm = await client_factory(permissions=[])
        response = await no_perm.get(f"/users/{DUMMY_ID}")
        assert_status_code(response, 403, "GET /users/{id} should require users_read")

        with_perm = await client_factory(permissions=["users_read"])
        response = await with_perm.get(f"/users/{DUMMY_ID}")
        assert response.status_code != 403, "users_read should allow GET /users/{id}"
        logger.info("✓ users_read correctly gates GET /users/{id}")

    @pytest.mark.asyncio
    async def test_users_create_required_for_post(self, client_factory):
        """POST /users returns 403 without users_create permission."""
        no_perm = await client_factory(permissions=[])
        response = await no_perm.post(
            "/users", json={"name": "x", "pin": "0000", "role": DUMMY_ID}
        )
        assert_status_code(response, 403, "POST /users should require users_create")

        with_perm = await client_factory(permissions=["users_create"])
        response = await with_perm.post(
            "/users", json={"name": "x", "pin": "0000", "role": DUMMY_ID}
        )
        assert response.status_code != 403, "users_create should allow POST /users"
        logger.info("✓ users_create correctly gates POST /users")

    @pytest.mark.asyncio
    async def test_users_update_required_for_put(self, client_factory):
        """PUT /users/{id} returns 403 without users_update permission."""
        no_perm = await client_factory(permissions=[])
        response = await no_perm.put(
            f"/users/{DUMMY_ID}", json={"name": "x", "pin": "0000"}
        )
        assert_status_code(response, 403, "PUT /users/{id} should require users_update")

        with_perm = await client_factory(permissions=["users_update"])
        response = await with_perm.put(
            f"/users/{DUMMY_ID}", json={"name": "x", "pin": "0000"}
        )
        assert response.status_code != 403, "users_update should allow PUT /users/{id}"
        logger.info("✓ users_update correctly gates PUT /users/{id}")

    @pytest.mark.asyncio
    async def test_users_delete_required_for_delete(self, client_factory):
        """DELETE /users/{id} returns 403 without users_delete permission."""
        no_perm = await client_factory(permissions=[])
        response = await no_perm.delete(f"/users/{DUMMY_ID}")
        assert_status_code(
            response, 403, "DELETE /users/{id} should require users_delete"
        )

        with_perm = await client_factory(permissions=["users_delete"])
        response = await with_perm.delete(f"/users/{DUMMY_ID}")
        assert response.status_code != 403, (
            "users_delete should allow DELETE /users/{id}"
        )
        logger.info("✓ users_delete correctly gates DELETE /users/{id}")
