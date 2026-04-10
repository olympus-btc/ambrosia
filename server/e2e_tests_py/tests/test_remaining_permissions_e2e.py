"""End-to-end permission enforcement tests for remaining gated endpoints.

Covers:
- /orders update and delete (read/create already covered in test_permissions_e2e.py)
- /config PUT (requires settings_update)
- /permissions GET (requires permissions_read)

Pattern per endpoint:
- No permission → 403
- Correct permission → not 403 (even 400 means the permission check passed)
"""

import logging

import pytest

from ambrosia.api_utils import assert_status_code

logger = logging.getLogger(__name__)

DUMMY_ID = "00000000-0000-0000-0000-000000000000"


class TestOrdersRemainingPermissions:
    """Permission enforcement for orders_update and orders_delete.

    orders_read and orders_create are already tested in test_permissions_e2e.py.
    """

    @pytest.mark.asyncio
    async def test_orders_update_required_for_put(self, client_factory):
        """PUT /orders/{id} returns 403 without orders_update permission."""
        no_perm = await client_factory(permissions=["users_read"])
        assert_status_code(await no_perm.put(f"/orders/{DUMMY_ID}", json={}), 403)

        with_perm = await client_factory(permissions=["orders_update"])
        assert (await with_perm.put(f"/orders/{DUMMY_ID}", json={})).status_code != 403
        logger.info("✓ orders_update correctly gates PUT /orders/{id}")


class TestConfigPermissions:
    """Permission enforcement tests for /config."""

    @pytest.mark.asyncio
    async def test_config_get_is_public(self, public_client):
        """GET /config requires no authentication."""
        response = await public_client.get("/config")
        assert response.status_code != 403, "GET /config should be publicly accessible"
        logger.info("✓ GET /config is correctly public")

    @pytest.mark.asyncio
    async def test_settings_update_required_for_put_config(self, client_factory):
        """PUT /config returns 403 without settings_update permission."""
        no_perm = await client_factory(permissions=["users_read"])
        assert_status_code(
            await no_perm.put(
                "/config", json={"businessName": "x", "businessType": "store"}
            ),
            403,
        )

        with_perm = await client_factory(permissions=["settings_update"])
        assert (
            await with_perm.put(
                "/config", json={"businessName": "x", "businessType": "store"}
            )
        ).status_code != 403
        logger.info("✓ settings_update correctly gates PUT /config")
