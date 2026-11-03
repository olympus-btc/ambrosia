"""End-to-end tests for the config endpoint."""

import logging

import pytest

from ambrosia.api_utils import assert_status_code

logger = logging.getLogger(__name__)

EXPECTED_PUBLIC_CONFIG_FIELDS = {
    "businessType",
    "businessName",
    "businessLogoUrl",
}

PROTECTED_CONFIG_FIELDS = {
    "businessTypeConfirmed",
    "businessAddress",
    "businessPhone",
}


class TestConfigEndpoint:
    """Tests for GET and PUT /config."""

    @pytest.fixture
    async def original_config(self, admin_client):
        """Fetch the current config and restore it after the test."""
        get_config_response = await admin_client.get("/config")
        assert_status_code(
            get_config_response, 200, "Failed to fetch config for backup"
        )
        config = get_config_response.json()
        yield config
        await admin_client.put("/config", json=config)

    @pytest.mark.asyncio
    async def test_get_config_without_session_returns_public_config(
        self, public_client
    ):
        """Without a session, GET /config returns only the public projection."""
        get_config_response = await public_client.get("/config")
        assert_status_code(get_config_response, 200, "GET /config should return 200")
        config = get_config_response.json()
        for field_name in EXPECTED_PUBLIC_CONFIG_FIELDS:
            assert field_name in config, (
                f"Response missing expected public field: {field_name}"
            )
        for field_name in PROTECTED_CONFIG_FIELDS:
            assert field_name not in config, (
                f"Unauthenticated response leaked protected field: {field_name}"
            )
        logger.info(
            "✓ GET /config without a session returns only the public projection"
        )

    @pytest.mark.asyncio
    async def test_get_config_with_session_returns_full_config(self, admin_client):
        """With a session, GET /config returns the full business config."""
        get_config_response = await admin_client.get("/config")
        assert_status_code(get_config_response, 200, "GET /config should return 200")
        config = get_config_response.json()
        for field_name in EXPECTED_PUBLIC_CONFIG_FIELDS | PROTECTED_CONFIG_FIELDS:
            assert field_name in config, (
                f"Authenticated response missing expected field: {field_name}"
            )
        logger.info("✓ GET /config with a session returns the full config")

    @pytest.mark.asyncio
    async def test_update_config_succeeds(self, admin_client, original_config):
        """PUT /config updates the business config and returns 200."""
        updated_config = {**original_config, "businessName": "E2E Test Business"}
        update_config_response = await admin_client.put("/config", json=updated_config)
        assert_status_code(update_config_response, 200, "PUT /config should return 200")
        logger.info("✓ PUT /config correctly returns 200")

    @pytest.mark.asyncio
    async def test_update_config_persists(self, admin_client, original_config):
        """After PUT /config, GET /config reflects the updated values."""
        updated_config = {**original_config, "businessName": "E2E Persisted Name"}
        await admin_client.put("/config", json=updated_config)

        get_config_response = await admin_client.get("/config")
        assert_status_code(get_config_response, 200)
        assert get_config_response.json()["businessName"] == "E2E Persisted Name", (
            "Updated businessName should be persisted"
        )
        logger.info("✓ PUT /config changes are correctly persisted")
