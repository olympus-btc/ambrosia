"""End-to-end permission enforcement tests for inventory endpoints.

Covers /categories, /dishes, /ingredients, and /products.

Pattern per endpoint:
- No permission → 403
- Correct permission → not 403 (even 400 means the permission check passed)
"""

import logging

import pytest

from ambrosia.api_utils import assert_status_code

logger = logging.getLogger(__name__)

DUMMY_ID = "00000000-0000-0000-0000-000000000000"


class TestCategoriesPermissions:
    """Permission enforcement tests for /categories."""

    @pytest.mark.asyncio
    async def test_categories_read_required_for_get(self, client_factory):
        """GET /categories returns 403 without categories_read permission."""
        no_perm = await client_factory(permissions=["permissions_read"])
        assert_status_code(await no_perm.get("/categories"), 403)

        with_perm = await client_factory(permissions=["categories_read"])
        assert (await with_perm.get("/categories")).status_code != 403
        logger.info("✓ categories_read correctly gates GET /categories")

    @pytest.mark.asyncio
    async def test_categories_create_required_for_post(self, client_factory):
        """POST /categories returns 403 without categories_create permission."""
        no_perm = await client_factory(permissions=["permissions_read"])
        assert_status_code(
            await no_perm.post("/categories", json={"name": "x", "type": "dish"}), 403
        )

        with_perm = await client_factory(permissions=["categories_create"])
        assert (
            await with_perm.post("/categories", json={"name": "x", "type": "dish"})
        ).status_code != 403
        logger.info("✓ categories_create correctly gates POST /categories")

    @pytest.mark.asyncio
    async def test_categories_update_required_for_put(self, client_factory):
        """PUT /categories/{id} returns 403 without categories_update permission."""
        no_perm = await client_factory(permissions=["permissions_read"])
        assert_status_code(
            await no_perm.put(
                f"/categories/{DUMMY_ID}", json={"name": "x", "type": "dish"}
            ),
            403,
        )

        with_perm = await client_factory(permissions=["categories_update"])
        assert (
            await with_perm.put(
                f"/categories/{DUMMY_ID}", json={"name": "x", "type": "dish"}
            )
        ).status_code != 403
        logger.info("✓ categories_update correctly gates PUT /categories/{id}")

    @pytest.mark.asyncio
    async def test_categories_delete_required_for_delete(self, client_factory):
        """DELETE /categories/{id} returns 403 without categories_delete permission."""
        no_perm = await client_factory(permissions=["permissions_read"])
        assert_status_code(await no_perm.delete(f"/categories/{DUMMY_ID}"), 403)

        with_perm = await client_factory(permissions=["categories_delete"])
        assert (await with_perm.delete(f"/categories/{DUMMY_ID}")).status_code != 403
        logger.info("✓ categories_delete correctly gates DELETE /categories/{id}")


class TestIngredientsPermissions:
    """Permission enforcement tests for /ingredients."""

    @pytest.mark.asyncio
    async def test_ingredients_read_required_for_get(self, client_factory):
        """GET /ingredients returns 403 without ingredients_read permission."""
        no_perm = await client_factory(permissions=["permissions_read"])
        assert_status_code(await no_perm.get("/ingredients"), 403)

        with_perm = await client_factory(permissions=["ingredients_read"])
        assert (await with_perm.get("/ingredients")).status_code != 403
        logger.info("✓ ingredients_read correctly gates GET /ingredients")

    @pytest.mark.asyncio
    async def test_ingredients_create_required_for_post(self, client_factory):
        """POST /ingredients returns 403 without ingredients_create permission."""
        no_perm = await client_factory(permissions=["permissions_read"])
        assert_status_code(await no_perm.post("/ingredients", json={}), 403)

        with_perm = await client_factory(permissions=["ingredients_create"])
        assert (await with_perm.post("/ingredients", json={})).status_code != 403
        logger.info("✓ ingredients_create correctly gates POST /ingredients")

    @pytest.mark.asyncio
    async def test_ingredients_update_required_for_put(self, client_factory):
        """PUT /ingredients/{id} returns 403 without ingredients_update permission."""
        no_perm = await client_factory(permissions=["permissions_read"])
        assert_status_code(await no_perm.put(f"/ingredients/{DUMMY_ID}", json={}), 403)

        with_perm = await client_factory(permissions=["ingredients_update"])
        assert (
            await with_perm.put(f"/ingredients/{DUMMY_ID}", json={})
        ).status_code != 403
        logger.info("✓ ingredients_update correctly gates PUT /ingredients/{id}")

    @pytest.mark.asyncio
    async def test_ingredients_delete_required_for_delete(self, client_factory):
        """DELETE /ingredients/{id} returns 403 without ingredients_delete permission."""
        no_perm = await client_factory(permissions=["permissions_read"])
        assert_status_code(await no_perm.delete(f"/ingredients/{DUMMY_ID}"), 403)

        with_perm = await client_factory(permissions=["ingredients_delete"])
        assert (await with_perm.delete(f"/ingredients/{DUMMY_ID}")).status_code != 403
        logger.info("✓ ingredients_delete correctly gates DELETE /ingredients/{id}")


class TestProductsPermissions:
    """Permission enforcement tests for /products."""

    @pytest.mark.asyncio
    async def test_products_read_required_for_get(self, client_factory):
        """GET /products returns 403 without products_read permission."""
        no_perm = await client_factory(permissions=["permissions_read"])
        assert_status_code(await no_perm.get("/products"), 403)

        with_perm = await client_factory(permissions=["products_read"])
        assert (await with_perm.get("/products")).status_code != 403
        logger.info("✓ products_read correctly gates GET /products")

    @pytest.mark.asyncio
    async def test_products_create_required_for_post(self, client_factory):
        """POST /products returns 403 without products_create permission."""
        no_perm = await client_factory(permissions=["permissions_read"])
        assert_status_code(await no_perm.post("/products", json={}), 403)

        with_perm = await client_factory(permissions=["products_create"])
        assert (await with_perm.post("/products", json={})).status_code != 403
        logger.info("✓ products_create correctly gates POST /products")

    @pytest.mark.asyncio
    async def test_products_update_required_for_put(self, client_factory):
        """PUT /products/{id} returns 403 without products_update permission."""
        no_perm = await client_factory(permissions=["permissions_read"])
        assert_status_code(await no_perm.put(f"/products/{DUMMY_ID}", json={}), 403)

        with_perm = await client_factory(permissions=["products_update"])
        assert (
            await with_perm.put(f"/products/{DUMMY_ID}", json={})
        ).status_code != 403
        logger.info("✓ products_update correctly gates PUT /products/{id}")

    @pytest.mark.asyncio
    async def test_products_delete_required_for_delete(self, client_factory):
        """DELETE /products/{id} returns 403 without products_delete permission."""
        no_perm = await client_factory(permissions=["permissions_read"])
        assert_status_code(await no_perm.delete(f"/products/{DUMMY_ID}"), 403)

        with_perm = await client_factory(permissions=["products_delete"])
        assert (await with_perm.delete(f"/products/{DUMMY_ID}")).status_code != 403
        logger.info("✓ products_delete correctly gates DELETE /products/{id}")
