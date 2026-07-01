"""End-to-end tests for the product variants and option types API."""

import logging
import uuid

import pytest

from ambrosia.api_utils import assert_status_code

logger = logging.getLogger(__name__)

DUMMY_ID = "00000000-0000-0000-0000-000000000000"


@pytest.fixture
async def product_id(admin_client):
    """Create a temporary product and clean it up after the test."""
    uid = str(uuid.uuid4())[:8]
    response = await admin_client.post(
        "/products",
        json={
            "name": f"test_product_{uid}",
            "SKU": f"SKU-{uid}",
            "priceCents": 1000,
            "quantity": 10,
            "categoryIds": [],
        },
    )
    assert_status_code(response, 201, "Failed to create test product fixture")
    pid = response.json()["id"]
    yield pid
    await admin_client.delete(f"/products/{pid}")


class TestVariantsCRUD:
    """Happy-path CRUD for /products/{id}/variants."""

    @pytest.mark.asyncio
    async def test_get_variants_returns_default_variant(self, admin_client, product_id):
        """GET /products/{id}/variants returns the auto-created default variant."""
        response = await admin_client.get(f"/products/{product_id}/variants")
        assert_status_code(response, 200)
        variants = response.json()
        assert len(variants) == 1
        assert variants[0]["priceCents"] == 1000
        logger.info("✓ GET /variants returns default variant")

    @pytest.mark.asyncio
    async def test_create_variant_returns_201(self, admin_client, product_id):
        """POST /products/{id}/variants with valid data returns 201 and an id."""
        response = await admin_client.post(
            f"/products/{product_id}/variants",
            json={"priceCents": 1500, "quantity": 5, "SKU": f"VAR-{product_id[:8]}"},
        )
        assert_status_code(response, 201)
        data = response.json()
        assert "id" in data
        logger.info("✓ POST /variants returns 201 with id")

    @pytest.mark.asyncio
    async def test_update_variant_returns_200(self, admin_client, product_id):
        """PUT /products/{id}/variants/{variantId} updates the variant."""
        variant_id = (
            await admin_client.get(f"/products/{product_id}/variants")
        ).json()[0]["id"]
        response = await admin_client.put(
            f"/products/{product_id}/variants/{variant_id}",
            json={"priceCents": 2000, "quantity": 3},
        )
        assert_status_code(response, 200)
        logger.info("✓ PUT /variants/{id} returns 200")

    @pytest.mark.asyncio
    async def test_delete_variant_returns_204(self, admin_client, product_id):
        """DELETE /products/{id}/variants/{variantId} removes the variant."""
        create_resp = await admin_client.post(
            f"/products/{product_id}/variants",
            json={"priceCents": 800, "quantity": 2},
        )
        assert_status_code(create_resp, 201)
        variant_id = create_resp.json()["id"]

        response = await admin_client.delete(
            f"/products/{product_id}/variants/{variant_id}"
        )
        assert_status_code(response, 204)
        logger.info("✓ DELETE /variants/{id} returns 204")

    @pytest.mark.asyncio
    async def test_update_nonexistent_variant_returns_404(
        self, admin_client, product_id
    ):
        """PUT /products/{id}/variants/{variantId} with unknown ID returns 404."""
        response = await admin_client.put(
            f"/products/{product_id}/variants/{DUMMY_ID}",
            json={"priceCents": 500},
        )
        assert_status_code(response, 404)
        logger.info("✓ PUT /variants/{unknown} returns 404")

    @pytest.mark.asyncio
    async def test_update_variant_for_wrong_product_returns_404(
        self, admin_client, product_id
    ):
        """PUT /products/{wrongId}/variants/{variantId} cannot update another product."""
        other_product_id = await _create_product(admin_client)
        variant_id = (
            await admin_client.get(f"/products/{product_id}/variants")
        ).json()[0]["id"]

        response = await admin_client.put(
            f"/products/{other_product_id}/variants/{variant_id}",
            json={"priceCents": 2000, "quantity": 3},
        )

        assert_status_code(response, 404)
        await admin_client.delete(f"/products/{other_product_id}")
        logger.info("✓ PUT /variants/{id} rejects wrong product")

    @pytest.mark.asyncio
    async def test_delete_variant_for_wrong_product_returns_404(
        self, admin_client, product_id
    ):
        """DELETE /products/{wrongId}/variants/{variantId} cannot delete another product."""
        other_product_id = await _create_product(admin_client)
        variant_id = (
            await admin_client.get(f"/products/{product_id}/variants")
        ).json()[0]["id"]

        response = await admin_client.delete(
            f"/products/{other_product_id}/variants/{variant_id}"
        )

        assert_status_code(response, 404)
        await admin_client.delete(f"/products/{other_product_id}")
        logger.info("✓ DELETE /variants/{id} rejects wrong product")

    @pytest.mark.asyncio
    async def test_delete_nonexistent_variant_returns_404(self, admin_client, product_id):
        """DELETE /products/{id}/variants/{variantId} with unknown ID returns 404."""
        response = await admin_client.delete(f"/products/{product_id}/variants/{DUMMY_ID}")
        assert_status_code(response, 404)
        logger.info("✓ DELETE /variants/{unknown} returns 404")


class TestVariantsValidation:
    """Input validation for /products/{id}/variants."""

    @pytest.mark.asyncio
    async def test_create_variant_with_negative_price_returns_400(
        self, admin_client, product_id
    ):
        """POST /products/{id}/variants with negative priceCents returns 400."""
        response = await admin_client.post(
            f"/products/{product_id}/variants",
            json={"priceCents": -1, "quantity": 1},
        )
        assert_status_code(response, 400)
        logger.info("✓ Negative priceCents rejected with 400")

    @pytest.mark.asyncio
    async def test_create_variant_with_negative_quantity_returns_400(
        self, admin_client, product_id
    ):
        """POST /products/{id}/variants with negative quantity returns 400."""
        response = await admin_client.post(
            f"/products/{product_id}/variants",
            json={"priceCents": 500, "quantity": -1},
        )
        assert_status_code(response, 400)
        logger.info("✓ Negative quantity rejected with 400")

    @pytest.mark.asyncio
    async def test_create_variant_with_duplicate_sku_returns_409(
        self, admin_client, product_id
    ):
        """POST /products/{id}/variants with a duplicate SKU returns 409."""
        sku = f"DUP-{str(uuid.uuid4())[:8]}"
        first = await admin_client.post(
            f"/products/{product_id}/variants",
            json={"priceCents": 500, "SKU": sku},
        )
        assert_status_code(first, 201)

        second = await admin_client.post(
            f"/products/{product_id}/variants",
            json={"priceCents": 600, "SKU": sku},
        )
        assert_status_code(second, 409)
        logger.info("✓ Duplicate SKU correctly returns 409")

    @pytest.mark.asyncio
    async def test_create_variant_with_foreign_option_value_returns_400(
        self, admin_client, product_id
    ):
        """POST /variants rejects option values from another product."""
        other_product_id = await _create_product(admin_client)
        option_response = await admin_client.post(
            f"/products/{other_product_id}/options",
            json={"name": "Color", "values": [{"value": "Red"}]},
        )
        assert_status_code(option_response, 201)
        foreign_option_value_id = (
            await admin_client.get(f"/products/{other_product_id}/options")
        ).json()[0]["values"][0]["id"]

        response = await admin_client.post(
            f"/products/{product_id}/variants",
            json={
                "priceCents": 500,
                "quantity": 1,
                "optionValueIds": [foreign_option_value_id],
            },
        )

        assert_status_code(response, 400)
        await admin_client.delete(f"/products/{other_product_id}")
        logger.info("✓ Foreign option value rejected with 400")


class TestOptionTypesCRUD:
    """Happy-path CRUD for /products/{id}/options."""

    @pytest.mark.asyncio
    async def test_get_options_returns_empty_list_initially(
        self, admin_client, product_id
    ):
        """GET /products/{id}/options returns empty list for a new product."""
        response = await admin_client.get(f"/products/{product_id}/options")
        assert_status_code(response, 200)
        assert response.json() == []
        logger.info("✓ GET /options returns [] for new product")

    @pytest.mark.asyncio
    async def test_create_option_type_returns_201(self, admin_client, product_id):
        """POST /products/{id}/options with valid data returns 201 and an id."""
        response = await admin_client.post(
            f"/products/{product_id}/options",
            json={"name": "Color", "values": [{"value": "Red"}, {"value": "Blue"}]},
        )
        assert_status_code(response, 201)
        data = response.json()
        assert "id" in data
        logger.info("✓ POST /options returns 201 with id")

    @pytest.mark.asyncio
    async def test_get_options_returns_created_type_with_values(
        self, admin_client, product_id
    ):
        """GET /products/{id}/options returns the option type with its values."""
        await admin_client.post(
            f"/products/{product_id}/options",
            json={
                "name": "Size",
                "values": [{"value": "S"}, {"value": "M"}, {"value": "L"}],
            },
        )
        response = await admin_client.get(f"/products/{product_id}/options")
        assert_status_code(response, 200)
        options = response.json()
        assert len(options) == 1
        assert options[0]["name"] == "Size"
        assert len(options[0]["values"]) == 3
        logger.info("✓ GET /options returns option type with nested values")

    @pytest.mark.asyncio
    async def test_update_option_type_replaces_values(self, admin_client, product_id):
        """PUT /products/{id}/options/{optionTypeId} replaces the values."""
        create_resp = await admin_client.post(
            f"/products/{product_id}/options",
            json={"name": "Color", "values": [{"value": "Red"}]},
        )
        assert_status_code(create_resp, 201)
        option_type_id = create_resp.json()["id"]

        update_resp = await admin_client.put(
            f"/products/{product_id}/options/{option_type_id}",
            json={"name": "Color", "values": [{"value": "Blue"}, {"value": "Green"}]},
        )
        assert_status_code(update_resp, 200)

        options = (await admin_client.get(f"/products/{product_id}/options")).json()
        assert len(options[0]["values"]) == 2
        logger.info("✓ PUT /options/{id} replaces values correctly")

    @pytest.mark.asyncio
    async def test_delete_option_type_returns_204(self, admin_client, product_id):
        """DELETE /products/{id}/options/{optionTypeId} removes the option type."""
        create_resp = await admin_client.post(
            f"/products/{product_id}/options",
            json={"name": "Material", "values": []},
        )
        assert_status_code(create_resp, 201)
        option_type_id = create_resp.json()["id"]

        response = await admin_client.delete(
            f"/products/{product_id}/options/{option_type_id}"
        )
        assert_status_code(response, 204)

        options = (await admin_client.get(f"/products/{product_id}/options")).json()
        assert options == []
        logger.info("✓ DELETE /options/{id} removes option type")

    @pytest.mark.asyncio
    async def test_update_nonexistent_option_type_returns_404(
        self, admin_client, product_id
    ):
        """PUT /products/{id}/options/{optionTypeId} with unknown ID returns 404."""
        response = await admin_client.put(
            f"/products/{product_id}/options/{DUMMY_ID}",
            json={"name": "Color", "values": []},
        )
        assert_status_code(response, 404)
        logger.info("✓ PUT /options/{unknown} returns 404")

    @pytest.mark.asyncio
    async def test_update_option_type_for_wrong_product_returns_404(
        self, admin_client, product_id
    ):
        """PUT /products/{wrongId}/options/{optionTypeId} cannot update another product."""
        other_product_id = await _create_product(admin_client)
        create_resp = await admin_client.post(
            f"/products/{product_id}/options",
            json={"name": "Color", "values": [{"value": "Red"}]},
        )
        assert_status_code(create_resp, 201)
        option_type_id = create_resp.json()["id"]

        response = await admin_client.put(
            f"/products/{other_product_id}/options/{option_type_id}",
            json={"name": "Size", "values": []},
        )

        assert_status_code(response, 404)
        await admin_client.delete(f"/products/{other_product_id}")
        logger.info("✓ PUT /options/{id} rejects wrong product")

    @pytest.mark.asyncio
    async def test_delete_option_type_for_wrong_product_returns_404(
        self, admin_client, product_id
    ):
        """DELETE /products/{wrongId}/options/{optionTypeId} cannot delete another product."""
        other_product_id = await _create_product(admin_client)
        create_resp = await admin_client.post(
            f"/products/{product_id}/options",
            json={"name": "Color", "values": [{"value": "Red"}]},
        )
        assert_status_code(create_resp, 201)
        option_type_id = create_resp.json()["id"]

        response = await admin_client.delete(
            f"/products/{other_product_id}/options/{option_type_id}"
        )

        assert_status_code(response, 404)
        await admin_client.delete(f"/products/{other_product_id}")
        logger.info("✓ DELETE /options/{id} rejects wrong product")

    @pytest.mark.asyncio
    async def test_delete_nonexistent_option_type_returns_404(
        self, admin_client, product_id
    ):
        """DELETE /products/{id}/options/{optionTypeId} with unknown ID returns 404."""
        response = await admin_client.delete(f"/products/{product_id}/options/{DUMMY_ID}")
        assert_status_code(response, 404)
        logger.info("✓ DELETE /options/{unknown} returns 404")


async def _create_product(admin_client):
    uid = str(uuid.uuid4())[:8]
    response = await admin_client.post(
        "/products",
        json={
            "name": f"test_product_{uid}",
            "SKU": f"SKU-{uid}",
            "priceCents": 1000,
            "quantity": 10,
            "categoryIds": [],
        },
    )
    assert_status_code(response, 201, "Failed to create helper product")
    return response.json()["id"]
