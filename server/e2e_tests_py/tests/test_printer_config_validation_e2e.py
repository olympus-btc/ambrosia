"""End-to-end tests for printer config validation.

Tests that the server enforces uniqueness on both
POST /printers/configs (create) and PUT /printers/configs/{id} (update) endpoints.

A printer config is uniquely identified by its (printerType, printerName) pair.
Duplicate detection is the only service-level validation — there is no blank name check.

POST /printers/configs returns 409 Conflict when a config with the same type+name already exists.
PUT /printers/configs/{id} returns:
  - 409 Conflict when the new type+name is already taken by another config
  - 404 Not Found when the config ID does not exist
"""

import logging
import uuid

import pytest

from ambrosia.api_utils import assert_status_code

logger = logging.getLogger(__name__)

PRINTER_TYPE = "KITCHEN"
NONEXISTENT_ID = "00000000-0000-0000-0000-000000000000"


class TestPrinterConfigValidation:
    """Tests for duplicate enforcement on the printer configs endpoints."""

    @pytest.fixture
    async def existing_config(self, admin_client):
        """Create a temporary printer config and clean it up after."""
        uid = str(uuid.uuid4())[:8]
        printer_name = f"test_printer_{uid}"
        response = await admin_client.post(
            "/printers/configs",
            json={
                "printerType": PRINTER_TYPE,
                "printerName": printer_name,
                "isDefault": False,
                "enabled": True,
            },
        )
        assert_status_code(
            response, 201, "Failed to create test printer config fixture"
        )
        config_id = response.json()["id"]
        yield config_id, printer_name
        await admin_client.delete(f"/printers/configs/{config_id}")

    # --- POST tests ---

    @pytest.mark.asyncio
    async def test_create_printer_config_with_duplicate_type_and_name_fails(
        self, admin_client, existing_config
    ):
        """POST /printers/configs with an existing type+name pair should return 409."""
        _, printer_name = existing_config
        response = await admin_client.post(
            "/printers/configs",
            json={
                "printerType": PRINTER_TYPE,
                "printerName": printer_name,
                "isDefault": False,
                "enabled": True,
            },
        )
        assert_status_code(
            response, 409, "Duplicate printer type+name should be rejected on create"
        )
        logger.info("✓ Duplicate printer type+name correctly rejected on create")

    @pytest.mark.asyncio
    async def test_create_printer_config_with_valid_data_succeeds(self, admin_client):
        """POST /printers/configs with a unique type+name should return 201."""
        uid = str(uuid.uuid4())[:8]
        response = await admin_client.post(
            "/printers/configs",
            json={
                "printerType": PRINTER_TYPE,
                "printerName": f"valid_printer_{uid}",
                "isDefault": False,
                "enabled": True,
            },
        )
        assert_status_code(
            response, 201, "Valid printer config should be accepted on create"
        )
        await admin_client.delete(f"/printers/configs/{response.json()['id']}")
        logger.info("✓ Valid printer config correctly accepted on create")

    # --- PUT tests ---

    @pytest.mark.asyncio
    async def test_update_printer_config_with_duplicate_type_and_name_fails(
        self, admin_client, existing_config
    ):
        """PUT /printers/configs/{id} with a type+name already taken by another config should return 409."""
        _, existing_name = existing_config
        uid = str(uuid.uuid4())[:8]

        # Create a second config to update
        second = await admin_client.post(
            "/printers/configs",
            json={
                "printerType": PRINTER_TYPE,
                "printerName": f"second_printer_{uid}",
                "isDefault": False,
                "enabled": True,
            },
        )
        assert_status_code(second, 201, "Failed to create second test printer config")
        second_id = second.json()["id"]

        try:
            response = await admin_client.put(
                f"/printers/configs/{second_id}",
                json={"printerType": PRINTER_TYPE, "printerName": existing_name},
            )
            assert_status_code(
                response,
                409,
                "Duplicate printer type+name should be rejected on update",
            )
            logger.info("✓ Duplicate printer type+name correctly rejected on update")
        finally:
            await admin_client.delete(f"/printers/configs/{second_id}")

    @pytest.mark.asyncio
    async def test_update_nonexistent_printer_config_returns_404(self, admin_client):
        """PUT /printers/configs/{id} with a non-existent ID should return 404."""
        uid = str(uuid.uuid4())[:8]
        response = await admin_client.put(
            f"/printers/configs/{NONEXISTENT_ID}",
            json={"printerType": PRINTER_TYPE, "printerName": f"any_printer_{uid}"},
        )
        assert_status_code(
            response, 404, "Non-existent printer config ID should return 404 on update"
        )
        logger.info("✓ Non-existent printer config correctly returns 404 on update")

    @pytest.mark.asyncio
    async def test_update_printer_config_with_valid_data_succeeds(
        self, admin_client, existing_config
    ):
        """PUT /printers/configs/{id} with valid unique data should return 200."""
        existing_id, _ = existing_config
        uid = str(uuid.uuid4())[:8]
        response = await admin_client.put(
            f"/printers/configs/{existing_id}",
            json={"printerType": PRINTER_TYPE, "printerName": f"updated_printer_{uid}"},
        )
        assert_status_code(
            response, 200, "Valid printer config data should be accepted on update"
        )
        logger.info("✓ Valid printer config data correctly accepted on update")
