"""End-to-end tests for POST /printers/configs/{id}/default.

Sets a printer config as the default for its printer type,
clearing any previous default for that type first.

Returns 200 on success, 404 if the config ID does not exist.
"""

import logging
import uuid

import pytest

from ambrosia.api_utils import assert_status_code

logger = logging.getLogger(__name__)

PRINTER_TYPE = "KITCHEN"
NONEXISTENT_ID = "00000000-0000-0000-0000-000000000000"


class TestPrinterConfigDefault:
    """Tests for POST /printers/configs/{id}/default."""

    @pytest.fixture
    async def printer_config(self, admin_client):
        """Create a temporary printer config and clean it up after."""
        uid = str(uuid.uuid4())[:8]
        response = await admin_client.post(
            "/printers/configs",
            json={
                "printerType": PRINTER_TYPE,
                "printerName": f"e2e_printer_{uid}",
                "isDefault": False,
                "enabled": True,
            },
        )
        assert_status_code(response, 201, "Failed to create printer config fixture")
        config_id = response.json()["id"]
        yield config_id
        await admin_client.delete(f"/printers/configs/{config_id}")

    # --- Tests ---

    @pytest.mark.asyncio
    async def test_set_default_succeeds(self, admin_client, printer_config):
        """POST /printers/configs/{id}/default returns 200 for a valid config."""
        response = await admin_client.post(
            f"/printers/configs/{printer_config}/default"
        )
        assert_status_code(response, 200, "Setting default should return 200")
        logger.info("✓ Set default correctly returns 200")

    @pytest.mark.asyncio
    async def test_set_default_nonexistent_config_returns_404(self, admin_client):
        """POST /printers/configs/{id}/default returns 404 for a non-existent ID."""
        response = await admin_client.post(
            f"/printers/configs/{NONEXISTENT_ID}/default"
        )
        assert_status_code(response, 404, "Non-existent config ID should return 404")
        logger.info("✓ Non-existent config correctly returns 404")

    @pytest.mark.asyncio
    async def test_set_default_marks_config_as_default(
        self, admin_client, printer_config
    ):
        """After POST /printers/configs/{id}/default the config is marked isDefault=true."""
        await admin_client.post(f"/printers/configs/{printer_config}/default")

        response = await admin_client.get("/printers/configs")
        assert_status_code(response, 200, "Failed to fetch printer configs")
        configs = response.json()
        target = next((c for c in configs if c["id"] == printer_config), None)
        assert target is not None, "Config not found in list after setting default"
        assert target["isDefault"] is True, "Config should be marked as default"
        logger.info("✓ Config correctly marked as isDefault=true after setting default")

    @pytest.mark.asyncio
    async def test_set_default_clears_previous_default(
        self, admin_client, printer_config
    ):
        """Setting a new default clears the isDefault flag on the previous default config."""
        uid = str(uuid.uuid4())[:8]
        second = await admin_client.post(
            "/printers/configs",
            json={
                "printerType": PRINTER_TYPE,
                "printerName": f"e2e_second_{uid}",
                "isDefault": False,
                "enabled": True,
            },
        )
        assert_status_code(second, 201, "Failed to create second printer config")
        second_id = second.json()["id"]

        try:
            # Set first config as default, then second
            await admin_client.post(f"/printers/configs/{printer_config}/default")
            await admin_client.post(f"/printers/configs/{second_id}/default")

            configs = (await admin_client.get("/printers/configs")).json()
            first = next((c for c in configs if c["id"] == printer_config), None)
            second_cfg = next((c for c in configs if c["id"] == second_id), None)

            assert first is not None and second_cfg is not None
            assert second_cfg["isDefault"] is True, (
                "Second config should now be default"
            )
            assert first["isDefault"] is False, (
                "First config should no longer be default"
            )
            logger.info("✓ Setting new default correctly clears the previous default")
        finally:
            await admin_client.delete(f"/printers/configs/{second_id}")
