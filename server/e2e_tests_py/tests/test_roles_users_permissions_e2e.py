"""End-to-end permission enforcement tests for /roles and /users endpoints."""

import logging

import pytest

from ambrosia.api_utils import assert_status_code
from ambrosia.auth_utils import CLIENT_FACTORY_USER_PIN, with_current_user_pin

logger = logging.getLogger(__name__)

DUMMY_ID = "00000000-0000-0000-0000-000000000000"
BASELINE_PERMISSIONS = ["wallet_read"]


class TestRolesPermissions:
    """Permission enforcement tests for /roles."""

    @pytest.mark.asyncio
    async def test_roles_read_required_for_get(self, client_factory):
        """GET /roles returns 403 without roles_read permission."""
        no_permission = await client_factory(permissions=BASELINE_PERMISSIONS)
        no_permission_response = await no_permission.get("/roles")
        assert_status_code(
            no_permission_response, 403, "GET /roles should require roles_read"
        )

        with_permission = await client_factory(permissions=["roles_read"])
        with_permission_response = await with_permission.get("/roles")
        assert with_permission_response.status_code != 403, (
            "roles_read should allow GET /roles"
        )
        logger.info("✓ roles_read correctly gates GET /roles")

    @pytest.mark.asyncio
    async def test_roles_create_requires_admin(self, client_factory, admin_client):
        """POST /roles requires admin even when roles_create is requested."""
        no_permission = await client_factory(permissions=BASELINE_PERMISSIONS)
        no_permission_response = await no_permission.post(
            "/roles", json={"role": "test_role"}
        )
        assert_status_code(
            no_permission_response, 403, "POST /roles should require roles_create"
        )

        non_admin = await client_factory(permissions=["roles_create", "wallet_read"])
        non_admin_response = await non_admin.post("/roles", json={"role": "test_role"})
        assert_status_code(
            non_admin_response, 403, "roles_create must remain admin-only"
        )

        admin_response = await admin_client.post(
            "/roles", json=with_current_user_pin({"role": "test_role"})
        )
        assert admin_response.status_code != 403, (
            "admin should be allowed to POST /roles"
        )
        logger.info("✓ POST /roles correctly requires admin access")

    @pytest.mark.asyncio
    async def test_roles_update_requires_admin(self, client_factory, admin_client):
        """PUT /roles/{id} requires admin even when roles_update is requested."""
        no_permission = await client_factory(permissions=BASELINE_PERMISSIONS)
        no_permission_response = await no_permission.put(
            f"/roles/{DUMMY_ID}", json={"role": "updated"}
        )
        assert_status_code(
            no_permission_response, 403, "PUT /roles/{id} should require roles_update"
        )

        non_admin = await client_factory(permissions=["roles_update", "wallet_read"])
        non_admin_response = await non_admin.put(
            f"/roles/{DUMMY_ID}", json={"role": "updated"}
        )
        assert_status_code(
            non_admin_response, 403, "roles_update must remain admin-only"
        )

        admin_response = await admin_client.put(
            f"/roles/{DUMMY_ID}", json=with_current_user_pin({"role": "updated"})
        )
        assert admin_response.status_code != 403, (
            "admin should be allowed to PUT /roles/{id}"
        )
        logger.info("✓ PUT /roles/{id} correctly requires admin access")

    @pytest.mark.asyncio
    async def test_roles_delete_requires_admin(self, client_factory, admin_client):
        """DELETE /roles/{id} requires admin even when roles_delete is requested."""
        no_permission = await client_factory(permissions=BASELINE_PERMISSIONS)
        no_permission_response = await no_permission.delete(f"/roles/{DUMMY_ID}")
        assert_status_code(
            no_permission_response,
            403,
            "DELETE /roles/{id} should require roles_delete",
        )

        non_admin = await client_factory(permissions=["roles_delete", "wallet_read"])
        non_admin_response = await non_admin.delete(f"/roles/{DUMMY_ID}")
        assert_status_code(
            non_admin_response, 403, "roles_delete must remain admin-only"
        )

        admin_response = await admin_client.delete(
            f"/roles/{DUMMY_ID}", json=with_current_user_pin()
        )
        assert admin_response.status_code != 403, (
            "admin should be allowed to DELETE /roles/{id}"
        )
        logger.info("✓ DELETE /roles/{id} correctly requires admin access")


class TestUsersPermissions:
    """Permission enforcement tests for /users."""

    @pytest.mark.asyncio
    async def test_users_read_required_for_get_list(self, client_factory):
        """GET /users returns 403 without users_read permission."""
        no_permission = await client_factory(permissions=BASELINE_PERMISSIONS)
        no_permission_response = await no_permission.get("/users")
        assert_status_code(
            no_permission_response, 403, "GET /users should require users_read"
        )

        with_permission = await client_factory(permissions=["users_read"])
        with_permission_response = await with_permission.get("/users")
        assert with_permission_response.status_code != 403, (
            "users_read should allow GET /users"
        )
        logger.info("✓ users_read correctly gates GET /users")

    @pytest.mark.asyncio
    async def test_users_read_required_for_get_by_id(self, client_factory):
        """GET /users/{id} returns 403 without users_read permission."""
        no_permission = await client_factory(permissions=BASELINE_PERMISSIONS)
        no_permission_response = await no_permission.get(f"/users/{DUMMY_ID}")
        assert_status_code(
            no_permission_response, 403, "GET /users/{id} should require users_read"
        )

        with_permission = await client_factory(permissions=["users_read"])
        with_permission_response = await with_permission.get(f"/users/{DUMMY_ID}")
        assert with_permission_response.status_code != 403, (
            "users_read should allow GET /users/{id}"
        )
        logger.info("✓ users_read correctly gates GET /users/{id}")

    @pytest.mark.asyncio
    async def test_users_create_required_for_post(self, client_factory):
        """POST /users returns 403 without users_create permission."""
        no_permission = await client_factory(permissions=BASELINE_PERMISSIONS)
        no_permission_response = await no_permission.post(
            "/users", json={"name": "x", "pin": "000000", "role": DUMMY_ID}
        )
        assert_status_code(
            no_permission_response, 403, "POST /users should require users_create"
        )

        with_permission = await client_factory(permissions=["users_create"])
        with_permission_response = await with_permission.post(
            "/users",
            json=with_current_user_pin(
                {"user": {"name": "x", "pin": "000000", "role": DUMMY_ID}},
                pin=CLIENT_FACTORY_USER_PIN,
            ),
        )
        assert with_permission_response.status_code != 403, (
            "users_create should allow POST /users"
        )
        logger.info("✓ users_create correctly gates POST /users")

    @pytest.mark.asyncio
    async def test_users_update_required_for_put(self, client_factory):
        """PUT /users/{id} returns 403 without users_update permission."""
        no_permission = await client_factory(permissions=BASELINE_PERMISSIONS)
        no_permission_response = await no_permission.put(
            f"/users/{DUMMY_ID}", json={"name": "x", "pin": "000000"}
        )
        assert_status_code(
            no_permission_response, 403, "PUT /users/{id} should require users_update"
        )

        with_permission = await client_factory(permissions=["users_update"])
        with_permission_response = await with_permission.put(
            f"/users/{DUMMY_ID}",
            json=with_current_user_pin(
                {"name": "x", "pin": "000000"}, pin=CLIENT_FACTORY_USER_PIN
            ),
        )
        assert with_permission_response.status_code != 403, (
            "users_update should allow PUT /users/{id}"
        )
        logger.info("✓ users_update correctly gates PUT /users/{id}")

    @pytest.mark.asyncio
    async def test_users_delete_required_for_delete(self, client_factory):
        """DELETE /users/{id} returns 403 without users_delete permission."""
        no_permission = await client_factory(permissions=BASELINE_PERMISSIONS)
        no_permission_response = await no_permission.delete(f"/users/{DUMMY_ID}")
        assert_status_code(
            no_permission_response,
            403,
            "DELETE /users/{id} should require users_delete",
        )

        with_permission = await client_factory(permissions=["users_delete"])
        with_permission_response = await with_permission.delete(
            f"/users/{DUMMY_ID}",
            json=with_current_user_pin(pin=CLIENT_FACTORY_USER_PIN),
        )
        assert with_permission_response.status_code != 403, (
            "users_delete should allow DELETE /users/{id}"
        )
        logger.info("✓ users_delete correctly gates DELETE /users/{id}")
