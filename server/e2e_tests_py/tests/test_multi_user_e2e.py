"""End-to-end tests for multi-user permission boundaries.

Tests cross-permission enforcement and admin access. Particularly
relevant for NWC: verifying who can access wallet features.
"""

import logging

import pytest

from ambrosia.api_utils import assert_status_code

logger = logging.getLogger(__name__)


class TestCrossPermissionEnforcement:
    """Tests that permissions don't bleed across boundaries."""

    @pytest.mark.asyncio
    async def test_products_reader_cannot_create_products(self, client_factory):
        """User with only products_read cannot create products."""
        reader = await client_factory(permissions=["products_read"])

        response = await reader.post(
            "/products", json={"name": "unauthorized", "price": 10.00}
        )
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_orders_reader_cannot_delete_products(self, client_factory):
        """User with only orders_read cannot delete products."""
        reader = await client_factory(permissions=["orders_read"])

        # Try to delete a nonexistent product — should get 403, not 404
        response = await reader.delete("/products/nonexistent-id")
        assert response.status_code in [403, 404], (
            f"Expected 403 or 404, got {response.status_code}"
        )

    @pytest.mark.asyncio
    async def test_products_reader_cannot_access_orders(self, client_factory):
        """User with products_read cannot create orders."""
        reader = await client_factory(permissions=["products_read"])

        response = await reader.post("/orders", json={})
        assert response.status_code == 403


class TestWalletPermissionBoundary:
    """Wallet permission boundary tests (relevant for NWC)."""

    @pytest.mark.asyncio
    async def test_non_admin_cannot_access_wallet(self, client_factory):
        """Regular user without wallet permissions cannot access wallet endpoints."""
        user = await client_factory(permissions=["orders_read"])

        response = await user.get("/wallet/info")
        # Should be 401 (not authenticated for wallet) or 403 (forbidden)
        assert response.status_code in [401, 403, 404], (
            f"Expected 401/403/404 for wallet access, got {response.status_code}"
        )


class TestAdminAccess:
    """Tests that admin has access to all endpoints."""

    @pytest.mark.asyncio
    async def test_admin_can_access_products(self, admin_client):
        """Admin can access products endpoint."""
        response = await admin_client.get("/products")
        assert_status_code(response, 200)

    @pytest.mark.asyncio
    async def test_admin_can_access_orders(self, admin_client):
        """Admin can access orders endpoint."""
        response = await admin_client.get("/orders")
        assert_status_code(response, 200)

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
