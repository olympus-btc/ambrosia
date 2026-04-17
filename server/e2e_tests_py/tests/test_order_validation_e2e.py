"""End-to-end tests for order validation."""

import logging
import pytest

from ambrosia.api_utils import assert_status_code

logger = logging.getLogger(__name__)

NONEXISTENT_ID = "00000000-0000-0000-0000-000000000000"
VALID_STATUS = "open"
INVALID_STATUS = "invalid_status"


async def _get_current_user_id(admin_client) -> str:
    response = await admin_client.get("/users/me")
    assert_status_code(response, 200, "Failed to fetch current user")
    return response.json()["user"]["user_id"]


class TestOrderValidation:
    """Tests for input validation on the orders endpoints."""

    @pytest.fixture
    async def user_id(self, admin_client):
        """Fetch the current admin user's ID."""
        return await _get_current_user_id(admin_client)

    @pytest.fixture
    async def existing_order(self, admin_client, user_id):
        """Create a temporary order for PUT tests and clean it up after."""
        response = await admin_client.post(
            "/orders",
            json={
                "user_id": user_id,
                "table_id": None,
                "status": VALID_STATUS,
                "total": 0.0,
                "created_at": "2026-01-01T00:00:00",
            },
        )
        assert_status_code(response, 201, "Failed to create test order fixture")
        order_id = response.json()["id"]
        yield order_id
        await admin_client.delete(f"/orders/{order_id}")

    @pytest.mark.asyncio
    async def test_create_order_with_nonexistent_user_id_fails(self, admin_client):
        """POST /orders with a non-existent user_id should return 400."""
        response = await admin_client.post(
            "/orders",
            json={
                "user_id": NONEXISTENT_ID,
                "table_id": None,
                "status": VALID_STATUS,
                "total": 0.0,
                "created_at": "2026-01-01T00:00:00",
            },
        )
        assert_status_code(
            response, 400, "Non-existent user_id should be rejected on create"
        )
        logger.info("✓ Non-existent user_id correctly rejected on create")

    @pytest.mark.asyncio
    async def test_create_order_with_nonexistent_table_id_fails(
        self, admin_client, user_id
    ):
        """POST /orders with a non-existent table_id should return 400."""
        response = await admin_client.post(
            "/orders",
            json={
                "user_id": user_id,
                "table_id": NONEXISTENT_ID,
                "status": VALID_STATUS,
                "total": 0.0,
                "created_at": "2026-01-01T00:00:00",
            },
        )
        assert_status_code(
            response, 400, "Non-existent table_id should be rejected on create"
        )
        logger.info("✓ Non-existent table_id correctly rejected on create")

    @pytest.mark.asyncio
    async def test_create_order_with_invalid_status_fails(self, admin_client, user_id):
        """POST /orders with an invalid status should return 400."""
        response = await admin_client.post(
            "/orders",
            json={
                "user_id": user_id,
                "table_id": None,
                "status": INVALID_STATUS,
                "total": 0.0,
                "created_at": "2026-01-01T00:00:00",
            },
        )
        assert_status_code(response, 400, "Invalid status should be rejected on create")
        logger.info("✓ Invalid status correctly rejected on create")

    @pytest.mark.asyncio
    async def test_create_order_with_valid_data_succeeds(self, admin_client, user_id):
        """POST /orders with valid data should return 201."""
        response = await admin_client.post(
            "/orders",
            json={
                "user_id": user_id,
                "table_id": None,
                "status": VALID_STATUS,
                "total": 0.0,
                "created_at": "2026-01-01T00:00:00",
            },
        )
        assert_status_code(
            response, 201, "Valid order data should be accepted on create"
        )
        await admin_client.delete(f"/orders/{response.json()['id']}")
        logger.info("✓ Valid order data correctly accepted on create")

    @pytest.mark.asyncio
    async def test_update_order_with_nonexistent_user_id_returns_404(
        self, admin_client, existing_order
    ):
        """PUT /orders/{id} with a non-existent user_id currently returns 404.

        The service returns false for non-existent user_id and the route throws
        ResourceNotFoundException for any failure, mapping all failures to 404.
        This is a known inconsistency — should ideally be 400 for validation errors.
        """
        response = await admin_client.put(
            f"/orders/{existing_order}",
            json={
                "user_id": NONEXISTENT_ID,
                "table_id": None,
                "status": VALID_STATUS,
                "total": 0.0,
                "created_at": "2026-01-01T00:00:00",
            },
        )
        assert_status_code(
            response, 404, "Non-existent user_id on update currently returns 404"
        )
        logger.info("✓ Non-existent user_id on update returns 404 (current behaviour)")

    @pytest.mark.asyncio
    async def test_update_order_with_invalid_status_returns_404(
        self, admin_client, existing_order, user_id
    ):
        """PUT /orders/{id} with an invalid status currently returns 404."""
        response = await admin_client.put(
            f"/orders/{existing_order}",
            json={
                "user_id": user_id,
                "table_id": None,
                "status": INVALID_STATUS,
                "total": 0.0,
                "created_at": "2026-01-01T00:00:00",
            },
        )
        assert_status_code(
            response, 404, "Invalid status on update currently returns 404"
        )
        logger.info("✓ Invalid status on update returns 404 (current behaviour)")

    @pytest.mark.asyncio
    async def test_update_order_with_valid_data_succeeds(
        self, admin_client, existing_order, user_id
    ):
        """PUT /orders/{id} with valid data should return 200."""
        response = await admin_client.put(
            f"/orders/{existing_order}",
            json={
                "user_id": user_id,
                "table_id": None,
                "status": "closed",
                "total": 50.0,
                "created_at": "2026-01-01T00:00:00",
            },
        )
        assert_status_code(
            response, 200, "Valid order data should be accepted on update"
        )
        logger.info("✓ Valid order data correctly accepted on update")
