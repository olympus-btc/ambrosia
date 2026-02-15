"""End-to-end tests for the Products API.

Tests CRUD operations and permission enforcement for products.
"""

import logging
import uuid

import pytest

from ambrosia.api_utils import assert_status_code

logger = logging.getLogger(__name__)


@pytest.fixture
async def test_product(admin_client):
    """Create a temporary product for testing and clean up after."""
    uid = str(uuid.uuid4())[:8]
    payload = {"name": f"test-product-{uid}", "price": 9.99}
    response = await admin_client.post("/products", json=payload)
    assert_status_code(response, 201, "Failed to create test product")
    product = response.json()
    yield product
    # Cleanup
    try:
        await admin_client.delete(f"/products/{product['id']}")
    except Exception as e:
        logger.warning(f"Failed to cleanup product: {e}")


class TestProductsCRUD:
    """CRUD tests for the products API."""

    @pytest.mark.asyncio
    async def test_create_product(self, admin_client):
        """Admin can create a product."""
        uid = str(uuid.uuid4())[:8]
        payload = {"name": f"product-create-{uid}", "price": 15.50}
        response = await admin_client.post("/products", json=payload)
        assert_status_code(response, 201)

        product = response.json()
        assert product["name"] == payload["name"]
        assert product["id"]

        # Cleanup
        await admin_client.delete(f"/products/{product['id']}")

    @pytest.mark.asyncio
    async def test_read_product(self, admin_client, test_product):
        """Can read a single product by ID."""
        response = await admin_client.get(f"/products/{test_product['id']}")
        assert_status_code(response, 200)

        product = response.json()
        assert product["name"] == test_product["name"]

    @pytest.mark.asyncio
    async def test_list_products(self, admin_client, test_product):
        """Can list all products."""
        response = await admin_client.get("/products")
        assert_status_code(response, 200)

        data = response.json()
        products = data if isinstance(data, list) else data.get("products", data.get("data", []))
        assert len(products) > 0

    @pytest.mark.asyncio
    async def test_update_product(self, admin_client, test_product):
        """Admin can update a product."""
        updates = {"name": f"{test_product['name']}-updated", "price": 19.99}
        response = await admin_client.put(
            f"/products/{test_product['id']}", json=updates
        )
        assert_status_code(response, 200)

        updated = response.json()
        assert updated["name"] == updates["name"]

    @pytest.mark.asyncio
    async def test_delete_product(self, admin_client):
        """Admin can delete a product."""
        uid = str(uuid.uuid4())[:8]
        payload = {"name": f"product-delete-{uid}", "price": 5.00}
        create_resp = await admin_client.post("/products", json=payload)
        assert_status_code(create_resp, 201)
        product_id = create_resp.json()["id"]

        delete_resp = await admin_client.delete(f"/products/{product_id}")
        assert_status_code(delete_resp, 200)

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
        payload = {"name": "unauthorized-product", "price": 10.00}
        response = await reader.post("/products", json=payload)
        assert response.status_code == 403
