"""End-to-end tests for the Products API.

Tests CRUD operations and permission enforcement for products.
Products require: SKU, name, category_id, quantity, min_stock_threshold,
max_stock_threshold, cost_cents, price_cents.
"""

import logging
import uuid

import pytest

from ambrosia.api_utils import assert_status_code

logger = logging.getLogger(__name__)


def _product_payload(name: str = None) -> dict:
    """Build a valid product payload with all required fields."""
    uid = str(uuid.uuid4())[:8]
    return {
        "SKU": f"TEST-{uid}",
        "name": name or f"test-product-{uid}",
        "category_id": "default",
        "quantity": 100,
        "min_stock_threshold": 5,
        "max_stock_threshold": 200,
        "cost_cents": 500,
        "price_cents": 999,
    }


@pytest.fixture
async def test_product(admin_client):
    """Create a temporary product for testing and clean up after."""
    payload = _product_payload()
    response = await admin_client.post("/products", json=payload)
    assert_status_code(response, 201, "Failed to create test product")
    product = response.json()
    yield product
    try:
        await admin_client.delete(f"/products/{product['id']}")
    except Exception as e:
        logger.warning(f"Failed to cleanup product: {e}")


class TestProductsCRUD:
    """CRUD tests for the products API."""

    @pytest.mark.asyncio
    async def test_create_product(self, admin_client):
        """Admin can create a product."""
        payload = _product_payload()
        response = await admin_client.post("/products", json=payload)
        assert_status_code(response, 201)

        data = response.json()
        assert data["id"]
        assert "success" in data.get("message", "").lower() or data["id"]

        # Cleanup
        await admin_client.delete(f"/products/{data['id']}")

    @pytest.mark.asyncio
    async def test_read_product(self, admin_client, test_product):
        """Can read a single product by ID."""
        response = await admin_client.get(f"/products/{test_product['id']}")
        assert_status_code(response, 200)

    @pytest.mark.asyncio
    async def test_list_products(self, admin_client, test_product):
        """Can list all products."""
        response = await admin_client.get("/products")
        # 200 with data or 204 empty
        assert response.status_code in [200, 204]

    @pytest.mark.asyncio
    async def test_update_product(self, admin_client, test_product):
        """Admin can update a product."""
        updates = {
            "SKU": test_product.get("SKU", "UPDATED-SKU"),
            "name": "updated-product-name",
            "category_id": "default",
            "quantity": 50,
            "min_stock_threshold": 5,
            "max_stock_threshold": 200,
            "cost_cents": 600,
            "price_cents": 1299,
        }
        response = await admin_client.put(
            f"/products/{test_product['id']}", json=updates
        )
        assert_status_code(response, 200)

    @pytest.mark.asyncio
    async def test_delete_product(self, admin_client):
        """Admin can delete a product."""
        payload = _product_payload()
        create_resp = await admin_client.post("/products", json=payload)
        assert_status_code(create_resp, 201)
        product_id = create_resp.json()["id"]

        delete_resp = await admin_client.delete(f"/products/{product_id}")
        assert delete_resp.status_code in [200, 204]

        # Verify deleted
        get_resp = await admin_client.get(f"/products/{product_id}")
        assert get_resp.status_code == 404

    @pytest.mark.asyncio
    async def test_get_nonexistent_product_returns_404(self, admin_client):
        """Getting a nonexistent product returns 404."""
        fake_id = str(uuid.uuid4())
        response = await admin_client.get(f"/products/{fake_id}")
        assert response.status_code == 404


class TestProductsPermissions:
    """Permission enforcement tests for products."""

    @pytest.mark.asyncio
    async def test_read_requires_products_read_permission(self, client_factory):
        """User with products_read can list products."""
        reader = await client_factory(permissions=["products_read"])
        response = await reader.get("/products")
        assert response.status_code in [200, 204]

    @pytest.mark.asyncio
    async def test_create_requires_products_create_permission(self, client_factory):
        """User without products_create cannot create products."""
        reader = await client_factory(permissions=["products_read"])
        payload = _product_payload("unauthorized-product")
        response = await reader.post("/products", json=payload)
        assert response.status_code == 403
