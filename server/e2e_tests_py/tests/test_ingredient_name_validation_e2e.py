"""End-to-end tests for ingredient name validation.

Tests that the server enforces name validation on both
POST /ingredients (create) and PUT /ingredients/{id} (update) endpoints.

NOTE: POST /ingredients has no null check on the addIngredient return value, so a blank
      name causes the service to return null but the route still responds 201 with {"id": null}.
      PUT /ingredients/{id} returns 404 for blank names (known inconsistency — the service
      returns false for any failure and the route maps all failures to 404).
      Tests assert current actual behaviour. If the route handlers are fixed, update accordingly.
"""

import logging
import uuid

import pytest

from ambrosia.api_utils import assert_status_code

logger = logging.getLogger(__name__)

VALID_INGREDIENT = {
    "price": 5.0,
    "quantity": 10.0,
    "unit": "kg",
    "low_stock_threshold": 2.0,
    "cost_per_unit": 1.5,
}


class TestIngredientNameValidation:
    """Tests for name enforcement on the ingredients endpoints."""

    @pytest.fixture
    async def category_id(self, admin_client):
        """Create a temporary ingredient-type category and clean it up after."""
        uid = str(uuid.uuid4())[:8]
        response = await admin_client.post(
            "/categories",
            json={"name": f"test_cat_{uid}", "type": "ingredient"},
        )
        assert_status_code(response, 201, "Failed to create test category fixture")
        cid = response.json()["id"]
        yield cid
        await admin_client.delete(f"/categories/{cid}?type=ingredient")

    @pytest.fixture
    async def existing_ingredient(self, admin_client, category_id):
        """Create a temporary ingredient for PUT tests and clean it up after."""
        uid = str(uuid.uuid4())[:8]
        response = await admin_client.post(
            "/ingredients",
            json={
                "name": f"test_ingredient_{uid}",
                "category_id": category_id,
                **VALID_INGREDIENT,
            },
        )
        assert_status_code(response, 201, "Failed to create test ingredient fixture")
        ingredient_id = response.json()["id"]
        yield ingredient_id
        await admin_client.delete(f"/ingredients/{ingredient_id}")

    @pytest.mark.asyncio
    async def test_create_ingredient_with_blank_name_returns_201_with_null_id(
        self, admin_client, category_id
    ):
        """POST /ingredients with a blank name currently returns 201 with null id.

        The service returns null for blank names but the route has no null check,
        so it responds 201 with {"id": null, "message": "Ingredient added successfully"}.
        This is a known bug — should ideally return 400.
        """
        response = await admin_client.post(
            "/ingredients",
            json={"name": "", "category_id": category_id, **VALID_INGREDIENT},
        )
        assert_status_code(
            response,
            201,
            "Blank ingredient name on create currently returns 201 (known bug)",
        )
        assert response.json()["id"] is None, (
            "Expected null id for blank ingredient name"
        )
        logger.info(
            "✓ Blank ingredient name on create returns 201 with null id (current behaviour)"
        )

    @pytest.mark.asyncio
    async def test_create_ingredient_with_whitespace_name_returns_201_with_null_id(
        self, admin_client, category_id
    ):
        """POST /ingredients with a whitespace-only name currently returns 201 with null id."""
        response = await admin_client.post(
            "/ingredients",
            json={"name": "   ", "category_id": category_id, **VALID_INGREDIENT},
        )
        assert_status_code(
            response,
            201,
            "Whitespace-only ingredient name on create currently returns 201 (known bug)",
        )
        assert response.json()["id"] is None, (
            "Expected null id for whitespace-only ingredient name"
        )
        logger.info(
            "✓ Whitespace-only ingredient name on create returns 201 with null id (current behaviour)"
        )

    @pytest.mark.asyncio
    async def test_create_ingredient_with_valid_name_succeeds(
        self, admin_client, category_id
    ):
        """POST /ingredients with a valid name should return 201."""
        uid = str(uuid.uuid4())[:8]
        response = await admin_client.post(
            "/ingredients",
            json={
                "name": f"valid_ingredient_{uid}",
                "category_id": category_id,
                **VALID_INGREDIENT,
            },
        )
        assert_status_code(
            response, 201, "Valid ingredient name should be accepted on create"
        )
        await admin_client.delete(f"/ingredients/{response.json()['id']}")
        logger.info("✓ Valid ingredient name correctly accepted on create")

    @pytest.mark.asyncio
    async def test_update_ingredient_with_blank_name_returns_404(
        self, admin_client, existing_ingredient, category_id
    ):
        """PUT /ingredients/{id} with a blank name currently returns 404.

        The service returns false for blank names and the route maps all failures to 404.
        This is a known inconsistency — should ideally be 400.
        """
        response = await admin_client.put(
            f"/ingredients/{existing_ingredient}",
            json={"name": "", "category_id": category_id, **VALID_INGREDIENT},
        )
        assert_status_code(
            response, 404, "Blank ingredient name on update currently returns 404"
        )
        logger.info("✓ Blank ingredient name on update returns 404 (current behaviour)")

    @pytest.mark.asyncio
    async def test_update_ingredient_with_whitespace_name_returns_404(
        self, admin_client, existing_ingredient, category_id
    ):
        """PUT /ingredients/{id} with a whitespace-only name currently returns 404."""
        response = await admin_client.put(
            f"/ingredients/{existing_ingredient}",
            json={"name": "   ", "category_id": category_id, **VALID_INGREDIENT},
        )
        assert_status_code(
            response,
            404,
            "Whitespace-only ingredient name on update currently returns 404",
        )
        logger.info(
            "✓ Whitespace-only ingredient name on update returns 404 (current behaviour)"
        )

    @pytest.mark.asyncio
    async def test_update_ingredient_with_valid_name_succeeds(
        self, admin_client, existing_ingredient, category_id
    ):
        """PUT /ingredients/{id} with a valid name should return 200."""
        uid = str(uuid.uuid4())[:8]
        response = await admin_client.put(
            f"/ingredients/{existing_ingredient}",
            json={
                "name": f"updated_ingredient_{uid}",
                "category_id": category_id,
                **VALID_INGREDIENT,
            },
        )
        assert_status_code(
            response, 200, "Valid ingredient name should be accepted on update"
        )
        logger.info("✓ Valid ingredient name correctly accepted on update")
