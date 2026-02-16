"""End-to-end tests for multi-user permission boundaries.

Tests cross-permission enforcement and admin access. Particularly
relevant for NWC: verifying who can access wallet features.
"""

import logging
import uuid
from datetime import datetime

import pytest

from ambrosia.api_utils import assert_status_code

logger = logging.getLogger(__name__)


def _product_payload() -> dict:
    uid = str(uuid.uuid4())[:8]
    return {
        "SKU": f"MULTI-{uid}",
        "name": f"multi-test-{uid}",
        "category_id": "default",
        "quantity": 10,
        "min_stock_threshold": 1,
        "max_stock_threshold": 100,
        "cost_cents": 100,
        "price_cents": 200,
    }


def _order_payload() -> dict:
    return {
        "user_id": "test-user",
        "waiter": "test-waiter",
        "status": "pending",
        "total": 0.0,
        "created_at": datetime.now().isoformat(),
    }


class TestCrossPermissionEnforcement:
    """Tests that permissions don't bleed across boundaries."""

    @pytest.mark.asyncio
    async def test_products_reader_cannot_create_products(self, client_factory):
        """User with only products_read cannot create products."""
        reader = await client_factory(permissions=["products_read"])

        response = await reader.post("/products", json=_product_payload())
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_orders_reader_cannot_delete_products(self, client_factory):
        """User with only orders_read cannot delete products."""
        reader = await client_factory(permissions=["orders_read"])

        response = await reader.delete("/products/nonexistent-id")
        assert response.status_code in [403, 404]

    @pytest.mark.asyncio
    async def test_products_reader_cannot_access_orders(self, client_factory):
        """User with products_read cannot create orders."""
        reader = await client_factory(permissions=["products_read"])

        response = await reader.post("/orders", json=_order_payload())
        assert response.status_code == 403


class TestWalletPermissionBoundary:
    """Wallet permission boundary tests (relevant for NWC)."""

    @pytest.mark.asyncio
    async def test_non_admin_cannot_access_wallet(self, client_factory):
        """Regular user without wallet permissions cannot access wallet endpoints."""
        user = await client_factory(permissions=["orders_read"])

        response = await user.get("/wallet/info")
        assert response.status_code in [401, 403, 404]


class TestAdminAccess:
    """Tests that admin has access to all endpoints."""

    @pytest.mark.asyncio
    async def test_admin_can_access_products(self, admin_client):
        """Admin can access products endpoint."""
        response = await admin_client.get("/products")
        # 200 or 204 (empty list)
        assert response.status_code in [200, 204]

    @pytest.mark.asyncio
    async def test_admin_can_access_orders(self, admin_client):
        """Admin can access orders endpoint."""
        response = await admin_client.get("/orders")
        assert response.status_code in [200, 204]

    @pytest.mark.asyncio
    async def test_admin_can_access_users(self, admin_client):
        """Admin can access users endpoint."""
        response = await admin_client.get("/users")
        assert_status_code(response, 200)

    @pytest.mark.asyncio
    async def test_admin_can_access_roles(self, admin_client):
        """Admin can access roles endpoint."""
        response = await admin_client.get("/roles")
        assert_status_code(response, 200)
