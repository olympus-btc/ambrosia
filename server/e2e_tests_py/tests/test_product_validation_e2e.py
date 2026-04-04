"""End-to-end tests for product validation.

Tests that the server enforces input validation on both
POST /products (create) and PUT /products/{id} (update) endpoints.

Unlike dishes/ingredients, Products.kt correctly returns 400 for all validation failures
on both POST and PUT — no known inconsistencies.

Validated fields (via ProductService.valid()):
- name must not be blank
- SKU must not be blank
- cost_cents, price_cents, quantity, min_stock_threshold, max_stock_threshold must be >= 0
- min_stock_threshold must not exceed max_stock_threshold (when max > 0)
- category_ids must not be empty
"""

import logging
import uuid

import pytest

from ambrosia.api_utils import assert_status_code

logger = logging.getLogger(__name__)

VALID_PRODUCT = {
    "SKU": "SKU-TEST-001",
    "name": "Test Product",
    "cost_cents": 500,
    "price_cents": 1000,
    "quantity": 10,
    "min_stock_threshold": 2,
    "max_stock_threshold": 50,
}


class TestProductValidation:
    """Tests for input validation on the products endpoints."""

    @pytest.fixture
    async def category_id(self, admin_client):
        """Create a temporary product-type category and clean it up after."""
        uid = str(uuid.uuid4())[:8]
        response = await admin_client.post(
            "/categories",
            json={"name": f"test_cat_{uid}", "type": "product"},
        )
        assert_status_code(response, 201, "Failed to create test category fixture")
        cid = response.json()["id"]
        yield cid
        await admin_client.delete(f"/categories/{cid}?type=product")

    @pytest.fixture
    async def existing_product(self, admin_client, category_id):
        """Create a temporary product for PUT tests and clean it up after."""
        uid = str(uuid.uuid4())[:8]
        response = await admin_client.post(
            "/products",
            json={**VALID_PRODUCT, "SKU": f"SKU-{uid}", "name": f"test_product_{uid}", "category_ids": [category_id]},
        )
        assert_status_code(response, 201, "Failed to create test product fixture")
        product_id = response.json()["id"]
        yield product_id
        await admin_client.delete(f"/products/{product_id}")

    # --- POST tests ---

    @pytest.mark.asyncio
    async def test_create_product_with_blank_name_fails(self, admin_client, category_id):
        """POST /products with a blank name should return 400."""
        response = await admin_client.post(
            "/products",
            json={**VALID_PRODUCT, "name": "", "category_ids": [category_id]},
        )
        assert_status_code(response, 400, "Blank product name should be rejected on create")
        logger.info("✓ Blank product name correctly rejected on create")

    @pytest.mark.asyncio
    async def test_create_product_with_blank_sku_fails(self, admin_client, category_id):
        """POST /products with a blank SKU should return 400."""
        uid = str(uuid.uuid4())[:8]
        response = await admin_client.post(
            "/products",
            json={**VALID_PRODUCT, "SKU": "", "name": f"product_{uid}", "category_ids": [category_id]},
        )
        assert_status_code(response, 400, "Blank SKU should be rejected on create")
        logger.info("✓ Blank SKU correctly rejected on create")

    @pytest.mark.asyncio
    async def test_create_product_with_negative_cost_fails(self, admin_client, category_id):
        """POST /products with a negative cost_cents should return 400."""
        uid = str(uuid.uuid4())[:8]
        response = await admin_client.post(
            "/products",
            json={**VALID_PRODUCT, "SKU": f"SKU-{uid}", "name": f"product_{uid}", "cost_cents": -1, "category_ids": [category_id]},
        )
        assert_status_code(response, 400, "Negative cost_cents should be rejected on create")
        logger.info("✓ Negative cost_cents correctly rejected on create")

    @pytest.mark.asyncio
    async def test_create_product_with_negative_price_fails(self, admin_client, category_id):
        """POST /products with a negative price_cents should return 400."""
        uid = str(uuid.uuid4())[:8]
        response = await admin_client.post(
            "/products",
            json={**VALID_PRODUCT, "SKU": f"SKU-{uid}", "name": f"product_{uid}", "price_cents": -1, "category_ids": [category_id]},
        )
        assert_status_code(response, 400, "Negative price_cents should be rejected on create")
        logger.info("✓ Negative price_cents correctly rejected on create")

    @pytest.mark.asyncio
    async def test_create_product_with_negative_quantity_fails(self, admin_client, category_id):
        """POST /products with a negative quantity should return 400."""
        uid = str(uuid.uuid4())[:8]
        response = await admin_client.post(
            "/products",
            json={**VALID_PRODUCT, "SKU": f"SKU-{uid}", "name": f"product_{uid}", "quantity": -1, "category_ids": [category_id]},
        )
        assert_status_code(response, 400, "Negative quantity should be rejected on create")
        logger.info("✓ Negative quantity correctly rejected on create")

    @pytest.mark.asyncio
    async def test_create_product_with_empty_category_ids_fails(self, admin_client):
        """POST /products with empty category_ids should return 400."""
        uid = str(uuid.uuid4())[:8]
        response = await admin_client.post(
            "/products",
            json={**VALID_PRODUCT, "SKU": f"SKU-{uid}", "name": f"product_{uid}", "category_ids": []},
        )
        assert_status_code(response, 400, "Empty category_ids should be rejected on create")
        logger.info("✓ Empty category_ids correctly rejected on create")

    @pytest.mark.asyncio
    async def test_create_product_with_min_threshold_exceeding_max_fails(self, admin_client, category_id):
        """POST /products with min_stock_threshold > max_stock_threshold should return 400."""
        uid = str(uuid.uuid4())[:8]
        response = await admin_client.post(
            "/products",
            json={
                **VALID_PRODUCT,
                "SKU": f"SKU-{uid}",
                "name": f"product_{uid}",
                "min_stock_threshold": 50,
                "max_stock_threshold": 10,
                "category_ids": [category_id],
            },
        )
        assert_status_code(response, 400, "min_stock_threshold > max_stock_threshold should be rejected on create")
        logger.info("✓ min > max stock threshold correctly rejected on create")

    @pytest.mark.asyncio
    async def test_create_product_with_valid_data_succeeds(self, admin_client, category_id):
        """POST /products with valid data should return 201."""
        uid = str(uuid.uuid4())[:8]
        response = await admin_client.post(
            "/products",
            json={**VALID_PRODUCT, "SKU": f"SKU-{uid}", "name": f"valid_product_{uid}", "category_ids": [category_id]},
        )
        assert_status_code(response, 201, "Valid product data should be accepted on create")
        await admin_client.delete(f"/products/{response.json()['id']}")
        logger.info("✓ Valid product data correctly accepted on create")

    # --- PUT tests ---

    @pytest.mark.asyncio
    async def test_update_product_with_blank_name_fails(self, admin_client, existing_product, category_id):
        """PUT /products/{id} with a blank name should return 400."""
        response = await admin_client.put(
            f"/products/{existing_product}",
            json={**VALID_PRODUCT, "name": "", "category_ids": [category_id]},
        )
        assert_status_code(response, 400, "Blank product name should be rejected on update")
        logger.info("✓ Blank product name correctly rejected on update")

    @pytest.mark.asyncio
    async def test_update_product_with_blank_sku_fails(self, admin_client, existing_product, category_id):
        """PUT /products/{id} with a blank SKU should return 400."""
        response = await admin_client.put(
            f"/products/{existing_product}",
            json={**VALID_PRODUCT, "SKU": "", "category_ids": [category_id]},
        )
        assert_status_code(response, 400, "Blank SKU should be rejected on update")
        logger.info("✓ Blank SKU correctly rejected on update")

    @pytest.mark.asyncio
    async def test_update_product_with_empty_category_ids_fails(self, admin_client, existing_product):
        """PUT /products/{id} with empty category_ids should return 400."""
        response = await admin_client.put(
            f"/products/{existing_product}",
            json={**VALID_PRODUCT, "category_ids": []},
        )
        assert_status_code(response, 400, "Empty category_ids should be rejected on update")
        logger.info("✓ Empty category_ids correctly rejected on update")

    @pytest.mark.asyncio
    async def test_update_product_with_valid_data_succeeds(self, admin_client, existing_product, category_id):
        """PUT /products/{id} with valid data should return 200."""
        uid = str(uuid.uuid4())[:8]
        response = await admin_client.put(
            f"/products/{existing_product}",
            json={**VALID_PRODUCT, "SKU": f"SKU-{uid}", "name": f"updated_product_{uid}", "category_ids": [category_id]},
        )
        assert_status_code(response, 200, "Valid product data should be accepted on update")
        logger.info("✓ Valid product data correctly accepted on update")
