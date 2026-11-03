"""End-to-end permission enforcement tests for remaining gated endpoints."""

import logging

import pytest

from ambrosia.api_utils import assert_status_code

logger = logging.getLogger(__name__)


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
