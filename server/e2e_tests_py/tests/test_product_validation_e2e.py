"""End-to-end tests for product validation."""

import logging
import uuid

import pytest

from ambrosia.api_utils import assert_status_code

logger = logging.getLogger(__name__)

VALID_PRODUCT = {
    "SKU": "SKU-TEST-001",
    "name": "Test Product",
    "priceCents": 1000,
    "quantity": 10,
    "minStockThreshold": 2,
    "maxStockThreshold": 50,
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
            json={
                **VALID_PRODUCT,
                "SKU": f"SKU-{uid}",
                "name": f"test_product_{uid}",
                "categoryIds": [category_id],
            },
        )
        assert_status_code(response, 201, "Failed to create test product fixture")
        product_id = response.json()["id"]
        yield product_id
        await admin_client.delete(f"/products/{product_id}")

    @pytest.mark.asyncio
    async def test_create_product_with_blank_name_fails(
        self, admin_client, category_id
    ):
        """POST /products with a blank name should return 400."""
        response = await admin_client.post(
            "/products",
            json={**VALID_PRODUCT, "name": "", "categoryIds": [category_id]},
        )
        assert_status_code(
            response, 400, "Blank product name should be rejected on create"
        )
        logger.info("✓ Blank product name correctly rejected on create")

    @pytest.mark.asyncio
    async def test_create_product_with_blank_sku_succeeds(
        self, admin_client, category_id
    ):
        """POST /products with a blank SKU should return 201."""
        uid = str(uuid.uuid4())[:8]
        response = await admin_client.post(
            "/products",
            json={
                **VALID_PRODUCT,
                "SKU": "",
                "name": f"product_{uid}",
                "categoryIds": [category_id],
            },
        )
        assert_status_code(response, 201, "Blank SKU should be accepted on create")
        await admin_client.delete(f"/products/{response.json()['id']}")
        logger.info("✓ Blank SKU correctly accepted on create")

    @pytest.mark.asyncio
    async def test_create_product_with_null_sku_succeeds(
        self, admin_client, category_id
    ):
        """POST /products with a null SKU should return 201."""
        uid = str(uuid.uuid4())[:8]
        response = await admin_client.post(
            "/products",
            json={
                **VALID_PRODUCT,
                "SKU": None,
                "name": f"product_{uid}",
                "categoryIds": [category_id],
            },
        )
        assert_status_code(response, 201, "Null SKU should be accepted on create")
        await admin_client.delete(f"/products/{response.json()['id']}")
        logger.info("✓ Null SKU correctly accepted on create")

    @pytest.mark.asyncio
    async def test_create_product_defaults_to_tracking_stock(
        self, admin_client, category_id
    ):
        """POST /products without trackStock should default the flag to true."""
        uid = str(uuid.uuid4())[:8]
        response = await admin_client.post(
            "/products",
            json={
                **VALID_PRODUCT,
                "SKU": f"SKU-{uid}",
                "name": f"product_{uid}",
                "categoryIds": [category_id],
            },
        )
        assert_status_code(response, 201, "Product create should succeed")
        product_id = response.json()["id"]

        detail = await admin_client.get(f"/products/{product_id}")
        assert_status_code(detail, 200, "Product fetch should succeed")
        assert detail.json()["trackStock"] is True, "trackStock should default to true"

        await admin_client.delete(f"/products/{product_id}")
        logger.info("✓ trackStock defaults to true")

    @pytest.mark.asyncio
    async def test_create_product_without_stock_tracking_succeeds(
        self, admin_client, category_id
    ):
        """POST /products with trackStock false should persist the flag and zero the stock fields."""
        uid = str(uuid.uuid4())[:8]
        response = await admin_client.post(
            "/products",
            json={
                **VALID_PRODUCT,
                "SKU": f"SKU-{uid}",
                "name": f"product_{uid}",
                "categoryIds": [category_id],
                "trackStock": False,
            },
        )
        assert_status_code(
            response, 201, "Product without stock tracking should be accepted"
        )
        product_id = response.json()["id"]

        detail = await admin_client.get(f"/products/{product_id}")
        assert_status_code(detail, 200, "Product fetch should succeed")
        product = detail.json()
        assert product["trackStock"] is False, "trackStock should be persisted as false"
        assert product["quantity"] == 0, "Untracked product should report zero quantity"
        assert product["minStockThreshold"] == 0, "Thresholds should be zeroed"
        assert product["maxStockThreshold"] == 0, "Thresholds should be zeroed"

        await admin_client.delete(f"/products/{product_id}")
        logger.info("✓ Product without stock tracking created and persisted")

    @pytest.mark.asyncio
    async def test_create_product_with_negative_price_fails(
        self, admin_client, category_id
    ):
        """POST /products with a negative price_cents should return 400."""
        uid = str(uuid.uuid4())[:8]
        response = await admin_client.post(
            "/products",
            json={
                **VALID_PRODUCT,
                "SKU": f"SKU-{uid}",
                "name": f"product_{uid}",
                "priceCents": -1,
                "categoryIds": [category_id],
            },
        )
        assert_status_code(
            response, 400, "Negative price_cents should be rejected on create"
        )
        logger.info("✓ Negative price_cents correctly rejected on create")

    @pytest.mark.asyncio
    async def test_create_product_with_negative_quantity_fails(
        self, admin_client, category_id
    ):
        """POST /products with a negative quantity should return 400."""
        uid = str(uuid.uuid4())[:8]
        response = await admin_client.post(
            "/products",
            json={
                **VALID_PRODUCT,
                "SKU": f"SKU-{uid}",
                "name": f"product_{uid}",
                "quantity": -1,
                "categoryIds": [category_id],
            },
        )
        assert_status_code(
            response, 400, "Negative quantity should be rejected on create"
        )
        logger.info("✓ Negative quantity correctly rejected on create")

    @pytest.mark.asyncio
    async def test_create_product_with_empty_category_ids_succeeds(self, admin_client):
        """POST /products with empty category_ids should return 201."""
        uid = str(uuid.uuid4())[:8]
        response = await admin_client.post(
            "/products",
            json={
                **VALID_PRODUCT,
                "SKU": f"SKU-{uid}",
                "name": f"product_{uid}",
                "categoryIds": [],
            },
        )
        assert_status_code(
            response, 201, "Empty category_ids should be accepted on create"
        )
        await admin_client.delete(f"/products/{response.json()['id']}")
        logger.info("✓ Empty category_ids correctly accepted on create")

    @pytest.mark.asyncio
    async def test_create_product_with_min_threshold_exceeding_max_fails(
        self, admin_client, category_id
    ):
        """POST /products with min_stock_threshold > max_stock_threshold should return 400."""
        uid = str(uuid.uuid4())[:8]
        response = await admin_client.post(
            "/products",
            json={
                **VALID_PRODUCT,
                "SKU": f"SKU-{uid}",
                "name": f"product_{uid}",
                "minStockThreshold": 50,
                "maxStockThreshold": 10,
                "categoryIds": [category_id],
            },
        )
        assert_status_code(
            response,
            400,
            "min_stock_threshold > max_stock_threshold should be rejected on create",
        )
        logger.info("✓ min > max stock threshold correctly rejected on create")

    @pytest.mark.asyncio
    async def test_create_product_with_valid_data_succeeds(
        self, admin_client, category_id
    ):
        """POST /products with valid data should return 201."""
        uid = str(uuid.uuid4())[:8]
        response = await admin_client.post(
            "/products",
            json={
                **VALID_PRODUCT,
                "SKU": f"SKU-{uid}",
                "name": f"valid_product_{uid}",
                "categoryIds": [category_id],
            },
        )
        assert_status_code(
            response, 201, "Valid product data should be accepted on create"
        )
        await admin_client.delete(f"/products/{response.json()['id']}")
        logger.info("✓ Valid product data correctly accepted on create")

    @pytest.mark.asyncio
    async def test_update_product_with_blank_name_fails(
        self, admin_client, existing_product, category_id
    ):
        """PUT /products/{id} with a blank name should return 400."""
        response = await admin_client.put(
            f"/products/{existing_product}",
            json={**VALID_PRODUCT, "name": "", "categoryIds": [category_id]},
        )
        assert_status_code(
            response, 400, "Blank product name should be rejected on update"
        )
        logger.info("✓ Blank product name correctly rejected on update")

    @pytest.mark.asyncio
    async def test_update_product_with_blank_sku_succeeds(
        self, admin_client, existing_product, category_id
    ):
        """PUT /products/{id} with a blank SKU should return 200."""
        response = await admin_client.put(
            f"/products/{existing_product}",
            json={**VALID_PRODUCT, "SKU": "", "categoryIds": [category_id]},
        )
        assert_status_code(response, 200, "Blank SKU should be accepted on update")
        logger.info("✓ Blank SKU correctly accepted on update")

    @pytest.mark.asyncio
    async def test_update_product_with_empty_category_ids_succeeds(
        self, admin_client, existing_product
    ):
        """PUT /products/{id} with empty category_ids should return 200."""
        response = await admin_client.put(
            f"/products/{existing_product}",
            json={**VALID_PRODUCT, "categoryIds": []},
        )
        assert_status_code(
            response, 200, "Empty category_ids should be accepted on update"
        )
        logger.info("✓ Empty category_ids correctly accepted on update")

    @pytest.mark.asyncio
    async def test_update_product_with_valid_data_succeeds(
        self, admin_client, existing_product, category_id
    ):
        """PUT /products/{id} with valid data should return 200."""
        uid = str(uuid.uuid4())[:8]
        response = await admin_client.put(
            f"/products/{existing_product}",
            json={
                **VALID_PRODUCT,
                "SKU": f"SKU-{uid}",
                "name": f"updated_product_{uid}",
                "categoryIds": [category_id],
            },
        )
        assert_status_code(
            response, 200, "Valid product data should be accepted on update"
        )
        logger.info("✓ Valid product data correctly accepted on update")
