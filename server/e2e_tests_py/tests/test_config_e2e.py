"""End-to-end tests for the config endpoint.

GET /config  — public, no auth required; returns current business config or 404
PUT /config  — requires settings_update permission; updates all config fields
"""

import logging

import pytest

from ambrosia.api_utils import assert_status_code

logger = logging.getLogger(__name__)

EXPECTED_CONFIG_FIELDS = {
    "businessType",
    "businessName",
    "businessTypeConfirmed",
}


class TestConfigEndpoint:
    """Tests for GET and PUT /config."""

    @pytest.fixture
    async def original_config(self, admin_client):
        """Fetch the current config and restore it after the test."""
        response = await admin_client.get("/config")
        assert_status_code(response, 200, "Failed to fetch config for backup")
        config = response.json()
        yield config
        await admin_client.put("/config", json=config)


    @pytest.mark.asyncio
    async def test_get_config_returns_200(self, public_client):
        """GET /config is public and returns the business config."""
        response = await public_client.get("/config")
        assert_status_code(response, 200, "GET /config should return 200")
        body = response.json()
        for field in EXPECTED_CONFIG_FIELDS:
            assert field in body, f"Response missing expected field: {field}"
        logger.info("✓ GET /config returns config with expected fields")


    @pytest.mark.asyncio
    async def test_update_config_succeeds(self, admin_client, original_config):
        """PUT /config updates the business config and returns 200."""
        updated = {**original_config, "businessName": "E2E Test Business"}
        response = await admin_client.put("/config", json=updated)
        assert_status_code(response, 200, "PUT /config should return 200")
        logger.info("✓ PUT /config correctly returns 200")

    @pytest.mark.asyncio
    async def test_update_config_persists(self, admin_client, original_config):
        """After PUT /config, GET /config reflects the updated values."""
        updated = {**original_config, "businessName": "E2E Persisted Name"}
        await admin_client.put("/config", json=updated)

        response = await admin_client.get("/config")
        assert_status_code(response, 200)
        assert response.json()["businessName"] == "E2E Persisted Name", (
            "Updated businessName should be persisted"
        )
        logger.info("✓ PUT /config changes are correctly persisted")
