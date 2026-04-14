"""End-to-end tests for ticket template name validation."""

import logging
import uuid

import pytest

from ambrosia.api_utils import assert_status_code

logger = logging.getLogger(__name__)

VALID_ELEMENTS = [{"type": "TEXT", "value": "Hello"}]


class TestTemplateNameValidation:
    """Tests for name uniqueness enforcement on the templates endpoints."""

    @pytest.fixture
    async def existing_template(self, admin_client):
        """Create a temporary template and clean it up after."""
        uid = str(uuid.uuid4())[:8]
        name = f"test_template_{uid}"
        response = await admin_client.post(
            "/templates",
            json={"name": name, "elements": VALID_ELEMENTS},
        )
        assert_status_code(response, 201, "Failed to create test template fixture")
        template_id = response.json()["id"]
        yield template_id, name
        await admin_client.delete(f"/templates/{template_id}")

    @pytest.mark.asyncio
    async def test_create_template_with_duplicate_name_fails(
        self, admin_client, existing_template
    ):
        """POST /templates with a name that already exists should return 409."""
        _, name = existing_template
        response = await admin_client.post(
            "/templates",
            json={"name": name, "elements": VALID_ELEMENTS},
        )
        assert_status_code(
            response, 409, "Duplicate template name should be rejected on create"
        )
        logger.info("✓ Duplicate template name correctly rejected on create")

    @pytest.mark.asyncio
    async def test_create_template_with_valid_name_succeeds(self, admin_client):
        """POST /templates with a unique name should return 201."""
        uid = str(uuid.uuid4())[:8]
        response = await admin_client.post(
            "/templates",
            json={"name": f"valid_template_{uid}", "elements": VALID_ELEMENTS},
        )
        assert_status_code(
            response, 201, "Valid template name should be accepted on create"
        )
        await admin_client.delete(f"/templates/{response.json()['id']}")
        logger.info("✓ Valid template name correctly accepted on create")

    @pytest.mark.asyncio
    async def test_update_template_with_duplicate_name_fails(
        self, admin_client, existing_template
    ):
        """PUT /templates/{id} with a name already taken by another template should return 409."""
        existing_id, existing_name = existing_template
        uid = str(uuid.uuid4())[:8]

        # Create a second template to update
        second = await admin_client.post(
            "/templates",
            json={"name": f"second_template_{uid}", "elements": VALID_ELEMENTS},
        )
        assert_status_code(second, 201, "Failed to create second test template")
        second_id = second.json()["id"]

        try:
            response = await admin_client.put(
                f"/templates/{second_id}",
                json={"name": existing_name, "elements": VALID_ELEMENTS},
            )
            assert_status_code(
                response, 409, "Duplicate template name should be rejected on update"
            )
            logger.info("✓ Duplicate template name correctly rejected on update")
        finally:
            await admin_client.delete(f"/templates/{second_id}")

    @pytest.mark.asyncio
    async def test_update_template_with_valid_name_succeeds(
        self, admin_client, existing_template
    ):
        """PUT /templates/{id} with a unique name should return 200."""
        existing_id, _ = existing_template
        uid = str(uuid.uuid4())[:8]
        response = await admin_client.put(
            f"/templates/{existing_id}",
            json={"name": f"updated_template_{uid}", "elements": VALID_ELEMENTS},
        )
        assert_status_code(
            response, 200, "Valid template name should be accepted on update"
        )
        logger.info("✓ Valid template name correctly accepted on update")
