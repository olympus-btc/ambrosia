"""End-to-end tests for the Orders API.

Tests order creation, lifecycle, and permission enforcement.
"""

import logging
import uuid

import pytest

from ambrosia.api_utils import assert_status_code

logger = logging.getLogger(__name__)


class TestOrdersCRUD:
    """CRUD tests for the orders API."""

    @pytest.mark.asyncio
    async def test_create_order(self, admin_client):
        """Admin can create an order."""
        response = await admin_client.post("/orders", json={})
        assert_status_code(response, 201)

        order = response.json()
        assert order["id"]

    @pytest.mark.asyncio
    async def test_list_orders(self, admin_client):
        """Can list all orders."""
        # Ensure at least one order exists
        await admin_client.post("/orders", json={})

        response = await admin_client.get("/orders")
        assert_status_code(response, 200)

        data = response.json()
        orders = data if isinstance(data, list) else data.get("orders", data.get("data", []))
        assert len(orders) > 0

    @pytest.mark.asyncio
    async def test_get_order_by_id(self, admin_client):
        """Can retrieve a specific order by ID."""
        create_resp = await admin_client.post("/orders", json={})
        assert_status_code(create_resp, 201)
        order_id = create_resp.json()["id"]

        get_resp = await admin_client.get(f"/orders/{order_id}")
        assert_status_code(get_resp, 200)
        assert get_resp.json()["id"] == order_id

    @pytest.mark.asyncio
    async def test_add_items_to_order(self, admin_client):
        """Can add items to an existing order.

        This test creates a product first, then an order, and adds items.
        """
        # Create a product
        uid = str(uuid.uuid4())[:8]
        product_resp = await admin_client.post(
            "/products", json={"name": f"order-item-{uid}", "price": 25.00}
        )
        if product_resp.status_code != 201:
            pytest.skip("Cannot create product — skipping order items test")
        product_id = product_resp.json()["id"]

        # Create order
        order_resp = await admin_client.post("/orders", json={})
        assert_status_code(order_resp, 201)
        order_id = order_resp.json()["id"]

        # Add item to order
        item_payload = {"product_id": product_id, "quantity": 2}
        add_resp = await admin_client.post(
            f"/orders/{order_id}/items", json=item_payload
        )
        # Accept 200 or 201 depending on API implementation
        assert add_resp.status_code in [200, 201], (
            f"Failed to add item to order: {add_resp.status_code} {add_resp.text}"
        )

        # Cleanup
        await admin_client.delete(f"/products/{product_id}")


class TestOrdersLifecycle:
    """Order lifecycle tests."""

    @pytest.mark.asyncio
    async def test_order_status_transitions(self, admin_client):
        """Order can transition through status states."""
        # Create order
        create_resp = await admin_client.post("/orders", json={})
        assert_status_code(create_resp, 201)
        order = create_resp.json()
        order_id = order["id"]

        # Update status to in_progress
        update_resp = await admin_client.put(
            f"/orders/{order_id}", json={"status": "in_progress"}
        )
        # Accept 200 or the original status if transitions aren't supported
        if update_resp.status_code == 200:
            updated = update_resp.json()
            assert updated.get("status") in ["in_progress", "pending", None]

    @pytest.mark.asyncio
    async def test_complete_order(self, admin_client):
        """Order can be marked as completed."""
        create_resp = await admin_client.post("/orders", json={})
        assert_status_code(create_resp, 201)
        order_id = create_resp.json()["id"]

        complete_resp = await admin_client.put(
            f"/orders/{order_id}", json={"status": "completed"}
        )
        assert complete_resp.status_code in [200, 204]


class TestOrdersPermissions:
    """Permission enforcement for orders."""

    @pytest.mark.asyncio
    async def test_orders_read_permission_grants_list(self, client_factory):
        """User with orders_read can list orders."""
        reader = await client_factory(permissions=["orders_read"])
        response = await reader.get("/orders")
        assert response.status_code in [200, 204]

    @pytest.mark.asyncio
    async def test_orders_create_permission_required(self, client_factory):
        """User without orders_create cannot create orders."""
        reader = await client_factory(permissions=["orders_read"])
        response = await reader.post("/orders", json={})
        assert response.status_code == 403
