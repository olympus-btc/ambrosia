"""End-to-end tests for PUT /orders/{id}/calculate-total.

The endpoint recalculates an order's total by summing the price_at_order of all
dishes currently in the order, then persists the new value.

Response: 200 with {"message": "Order total updated successfully", "total": <new_total>}
         404 if the order does not exist
"""

import logging
import uuid

import pytest

from ambrosia.api_utils import assert_status_code

logger = logging.getLogger(__name__)

NONEXISTENT_ID = "00000000-0000-0000-0000-000000000000"


async def _get_current_user_id(admin_client) -> str:
    response = await admin_client.get("/users/me")
    assert_status_code(response, 200, "Failed to fetch current user")
    return response.json()["user"]["user_id"]


class TestOrderTotalCalculation:
    """Tests for order total recalculation via PUT /orders/{id}/calculate-total."""

    @pytest.fixture
    async def dish_category(self, admin_client):
        """Create a temporary dish category and clean it up after."""
        uid = str(uuid.uuid4())[:8]
        response = await admin_client.post(
            "/categories", json={"name": f"e2e_cat_{uid}", "type": "dish"}
        )
        assert_status_code(response, 201, "Failed to create dish category fixture")
        cat_id = response.json()["id"]
        yield cat_id
        await admin_client.delete(f"/categories/{cat_id}")

    @pytest.fixture
    async def dish(self, admin_client, dish_category):
        """Create a temporary dish and clean it up after."""
        uid = str(uuid.uuid4())[:8]
        response = await admin_client.post(
            "/dishes",
            json={"name": f"e2e_dish_{uid}", "price": 50.0, "category_id": dish_category},
        )
        assert_status_code(response, 201, "Failed to create dish fixture")
        dish_id = response.json()["id"]
        yield dish_id
        await admin_client.delete(f"/dishes/{dish_id}")

    @pytest.fixture
    async def order(self, admin_client):
        """Create a temporary order with no dishes and clean it up after."""
        user_id = await _get_current_user_id(admin_client)
        response = await admin_client.post(
            "/orders",
            json={
                "user_id": user_id,
                "table_id": None,
                "waiter": f"e2e_{str(uuid.uuid4())[:8]}",
                "status": "open",
                "total": 0.0,
                "created_at": "2026-01-01T00:00:00",
            },
        )
        assert_status_code(response, 201, "Failed to create order fixture")
        order_id = response.json()["id"]
        yield order_id
        await admin_client.delete(f"/orders/{order_id}/dishes")
        await admin_client.delete(f"/orders/{order_id}")

    # --- Tests ---

    @pytest.mark.asyncio
    async def test_calculate_total_with_no_dishes_returns_zero(self, admin_client, order):
        """PUT /orders/{id}/calculate-total on an order with no dishes returns total=0."""
        response = await admin_client.put(f"/orders/{order}/calculate-total")
        assert_status_code(response, 200, "Calculate total should return 200")
        body = response.json()
        assert body["total"] == 0.0, f"Expected total 0.0, got {body['total']}"
        logger.info("✓ Calculate total with no dishes correctly returns 0.0")

    @pytest.mark.asyncio
    async def test_calculate_total_sums_dish_prices(self, admin_client, order, dish):
        """PUT /orders/{id}/calculate-total returns the sum of all dish prices_at_order."""
        # Add two dishes with known prices
        add_response = await admin_client.post(
            f"/orders/{order}/dishes",
            json=[
                {"dish_id": dish, "price_at_order": 30.0},
                {"dish_id": dish, "price_at_order": 20.0},
            ],
        )
        assert_status_code(add_response, 201, "Failed to add dishes to order")

        response = await admin_client.put(f"/orders/{order}/calculate-total")
        assert_status_code(response, 200, "Calculate total should return 200")
        body = response.json()
        assert body["total"] == 50.0, f"Expected total 50.0, got {body['total']}"
        logger.info("✓ Calculate total correctly sums dish prices")

    @pytest.mark.asyncio
    async def test_calculate_total_updates_persisted_total(self, admin_client, order, dish):
        """After PUT /orders/{id}/calculate-total, GET /orders/{id} reflects the new total."""
        await admin_client.post(
            f"/orders/{order}/dishes",
            json=[{"dish_id": dish, "price_at_order": 75.0}],
        )

        await admin_client.put(f"/orders/{order}/calculate-total")

        get_response = await admin_client.get(f"/orders/{order}")
        assert_status_code(get_response, 200, "Failed to fetch order after total update")
        assert get_response.json()["total"] == 75.0, (
            f"Expected persisted total 75.0, got {get_response.json()['total']}"
        )
        logger.info("✓ Calculate total correctly persists the new total")

    @pytest.mark.asyncio
    async def test_calculate_total_nonexistent_order_returns_404(self, admin_client):
        """PUT /orders/{id}/calculate-total with a non-existent order ID returns 404."""
        response = await admin_client.put(f"/orders/{NONEXISTENT_ID}/calculate-total")
        assert_status_code(response, 404, "Non-existent order should return 404")
        logger.info("✓ Non-existent order correctly returns 404")
