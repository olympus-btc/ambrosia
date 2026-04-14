"""End-to-end permission enforcement tests for operations endpoints."""

import logging

import pytest

from ambrosia.api_utils import assert_status_code

logger = logging.getLogger(__name__)

DUMMY_ID = "00000000-0000-0000-0000-000000000000"


class TestPaymentsPermissions:
    """Permission enforcement tests for /payments."""

    @pytest.mark.asyncio
    async def test_payments_read_required_for_get(self, client_factory):
        """GET /payments returns 403 without payments_read permission."""
        no_perm = await client_factory(permissions=["permissions_read"])
        assert_status_code(await no_perm.get("/payments"), 403)

        with_perm = await client_factory(permissions=["payments_read"])
        assert (await with_perm.get("/payments")).status_code != 403
        logger.info("✓ payments_read correctly gates GET /payments")

    @pytest.mark.asyncio
    async def test_payments_create_required_for_post(self, client_factory):
        """POST /payments returns 403 without payments_create permission."""
        no_perm = await client_factory(permissions=["permissions_read"])
        assert_status_code(await no_perm.post("/payments", json={}), 403)

        with_perm = await client_factory(permissions=["payments_create"])
        assert (await with_perm.post("/payments", json={})).status_code != 403
        logger.info("✓ payments_create correctly gates POST /payments")

    @pytest.mark.asyncio
    async def test_payments_update_required_for_put(self, client_factory):
        """PUT /payments/{id} returns 403 without payments_update permission."""
        no_perm = await client_factory(permissions=["permissions_read"])
        assert_status_code(await no_perm.put(f"/payments/{DUMMY_ID}", json={}), 403)

        with_perm = await client_factory(permissions=["payments_update"])
        assert (
            await with_perm.put(f"/payments/{DUMMY_ID}", json={})
        ).status_code != 403
        logger.info("✓ payments_update correctly gates PUT /payments/{id}")

    @pytest.mark.asyncio
    async def test_payments_delete_required_for_delete(self, client_factory):
        """DELETE /payments/{id} returns 403 without payments_delete permission."""
        no_perm = await client_factory(permissions=["permissions_read"])
        assert_status_code(await no_perm.delete(f"/payments/{DUMMY_ID}"), 403)

        with_perm = await client_factory(permissions=["payments_delete"])
        assert (await with_perm.delete(f"/payments/{DUMMY_ID}")).status_code != 403
        logger.info("✓ payments_delete correctly gates DELETE /payments/{id}")


class TestSuppliersPermissions:
    """Permission enforcement tests for /suppliers."""

    @pytest.mark.asyncio
    async def test_suppliers_read_required_for_get(self, client_factory):
        """GET /suppliers returns 403 without suppliers_read permission."""
        no_perm = await client_factory(permissions=["permissions_read"])
        assert_status_code(await no_perm.get("/suppliers"), 403)

        with_perm = await client_factory(permissions=["suppliers_read"])
        assert (await with_perm.get("/suppliers")).status_code != 403
        logger.info("✓ suppliers_read correctly gates GET /suppliers")

    @pytest.mark.asyncio
    async def test_suppliers_create_required_for_post(self, client_factory):
        """POST /suppliers returns 403 without suppliers_create permission."""
        no_perm = await client_factory(permissions=["permissions_read"])
        assert_status_code(await no_perm.post("/suppliers", json={}), 403)

        with_perm = await client_factory(permissions=["suppliers_create"])
        assert (await with_perm.post("/suppliers", json={})).status_code != 403
        logger.info("✓ suppliers_create correctly gates POST /suppliers")

    @pytest.mark.asyncio
    async def test_suppliers_update_required_for_put(self, client_factory):
        """PUT /suppliers/{id} returns 403 without suppliers_update permission."""
        no_perm = await client_factory(permissions=["permissions_read"])
        assert_status_code(await no_perm.put(f"/suppliers/{DUMMY_ID}", json={}), 403)

        with_perm = await client_factory(permissions=["suppliers_update"])
        assert (
            await with_perm.put(f"/suppliers/{DUMMY_ID}", json={})
        ).status_code != 403
        logger.info("✓ suppliers_update correctly gates PUT /suppliers/{id}")

    @pytest.mark.asyncio
    async def test_suppliers_delete_required_for_delete(self, client_factory):
        """DELETE /suppliers/{id} returns 403 without suppliers_delete permission."""
        no_perm = await client_factory(permissions=["permissions_read"])
        assert_status_code(await no_perm.delete(f"/suppliers/{DUMMY_ID}"), 403)

        with_perm = await client_factory(permissions=["suppliers_delete"])
        assert (await with_perm.delete(f"/suppliers/{DUMMY_ID}")).status_code != 403
        logger.info("✓ suppliers_delete correctly gates DELETE /suppliers/{id}")


class TestSpacesPermissions:
    """Permission enforcement tests for /spaces."""

    @pytest.mark.asyncio
    async def test_spaces_read_required_for_get(self, client_factory):
        """GET /spaces returns 403 without spaces_read permission."""
        no_perm = await client_factory(permissions=["permissions_read"])
        assert_status_code(await no_perm.get("/spaces"), 403)

        with_perm = await client_factory(permissions=["spaces_read"])
        assert (await with_perm.get("/spaces")).status_code != 403
        logger.info("✓ spaces_read correctly gates GET /spaces")

    @pytest.mark.asyncio
    async def test_spaces_create_required_for_post(self, client_factory):
        """POST /spaces returns 403 without spaces_create permission."""
        no_perm = await client_factory(permissions=["permissions_read"])
        assert_status_code(await no_perm.post("/spaces", json={}), 403)

        with_perm = await client_factory(permissions=["spaces_create"])
        assert (await with_perm.post("/spaces", json={})).status_code != 403
        logger.info("✓ spaces_create correctly gates POST /spaces")

    @pytest.mark.asyncio
    async def test_spaces_update_required_for_put(self, client_factory):
        """PUT /spaces/{id} returns 403 without spaces_update permission."""
        no_perm = await client_factory(permissions=["permissions_read"])
        assert_status_code(await no_perm.put(f"/spaces/{DUMMY_ID}", json={}), 403)

        with_perm = await client_factory(permissions=["spaces_update"])
        assert (await with_perm.put(f"/spaces/{DUMMY_ID}", json={})).status_code != 403
        logger.info("✓ spaces_update correctly gates PUT /spaces/{id}")

    @pytest.mark.asyncio
    async def test_spaces_delete_required_for_delete(self, client_factory):
        """DELETE /spaces/{id} returns 403 without spaces_delete permission."""
        no_perm = await client_factory(permissions=["permissions_read"])
        assert_status_code(await no_perm.delete(f"/spaces/{DUMMY_ID}"), 403)

        with_perm = await client_factory(permissions=["spaces_delete"])
        assert (await with_perm.delete(f"/spaces/{DUMMY_ID}")).status_code != 403
        logger.info("✓ spaces_delete correctly gates DELETE /spaces/{id}")


class TestTablesPermissions:
    """Permission enforcement tests for /tables."""

    @pytest.mark.asyncio
    async def test_tables_read_required_for_get(self, client_factory):
        """GET /tables returns 403 without tables_read permission."""
        no_perm = await client_factory(permissions=["permissions_read"])
        assert_status_code(await no_perm.get("/tables"), 403)

        with_perm = await client_factory(permissions=["tables_read"])
        assert (await with_perm.get("/tables")).status_code != 403
        logger.info("✓ tables_read correctly gates GET /tables")

    @pytest.mark.asyncio
    async def test_tables_create_required_for_post(self, client_factory):
        """POST /tables returns 403 without tables_create permission."""
        no_perm = await client_factory(permissions=["permissions_read"])
        assert_status_code(await no_perm.post("/tables", json={}), 403)

        with_perm = await client_factory(permissions=["tables_create"])
        assert (await with_perm.post("/tables", json={})).status_code != 403
        logger.info("✓ tables_create correctly gates POST /tables")

    @pytest.mark.asyncio
    async def test_tables_update_required_for_put(self, client_factory):
        """PUT /tables/{id} returns 403 without tables_update permission."""
        no_perm = await client_factory(permissions=["permissions_read"])
        assert_status_code(await no_perm.put(f"/tables/{DUMMY_ID}", json={}), 403)

        with_perm = await client_factory(permissions=["tables_update"])
        assert (await with_perm.put(f"/tables/{DUMMY_ID}", json={})).status_code != 403
        logger.info("✓ tables_update correctly gates PUT /tables/{id}")

    @pytest.mark.asyncio
    async def test_tables_delete_required_for_delete(self, client_factory):
        """DELETE /tables/{id} returns 403 without tables_delete permission."""
        no_perm = await client_factory(permissions=["permissions_read"])
        assert_status_code(await no_perm.delete(f"/tables/{DUMMY_ID}"), 403)

        with_perm = await client_factory(permissions=["tables_delete"])
        assert (await with_perm.delete(f"/tables/{DUMMY_ID}")).status_code != 403
        logger.info("✓ tables_delete correctly gates DELETE /tables/{id}")


class TestShiftsPermissions:
    """Permission enforcement tests for /shifts."""

    @pytest.mark.asyncio
    async def test_shifts_read_required_for_get(self, client_factory):
        """GET /shifts returns 403 without shifts_read permission."""
        no_perm = await client_factory(permissions=["permissions_read"])
        assert_status_code(await no_perm.get("/shifts"), 403)

        with_perm = await client_factory(permissions=["shifts_read"])
        assert (await with_perm.get("/shifts")).status_code != 403
        logger.info("✓ shifts_read correctly gates GET /shifts")

    @pytest.mark.asyncio
    async def test_shifts_create_required_for_post(self, client_factory):
        """POST /shifts returns 403 without shifts_create permission."""
        no_perm = await client_factory(permissions=["permissions_read"])
        assert_status_code(await no_perm.post("/shifts", json={}), 403)

        with_perm = await client_factory(permissions=["shifts_create"])
        assert (await with_perm.post("/shifts", json={})).status_code != 403
        logger.info("✓ shifts_create correctly gates POST /shifts")

    @pytest.mark.asyncio
    async def test_shifts_update_required_for_put(self, client_factory):
        """PUT /shifts/{id} returns 403 without shifts_update permission."""
        no_perm = await client_factory(permissions=["permissions_read"])
        assert_status_code(await no_perm.put(f"/shifts/{DUMMY_ID}", json={}), 403)

        with_perm = await client_factory(permissions=["shifts_update"])
        assert (await with_perm.put(f"/shifts/{DUMMY_ID}", json={})).status_code != 403
        logger.info("✓ shifts_update correctly gates PUT /shifts/{id}")

    @pytest.mark.asyncio
    async def test_shifts_delete_required_for_delete(self, client_factory):
        """DELETE /shifts/{id} returns 403 without shifts_delete permission."""
        no_perm = await client_factory(permissions=["permissions_read"])
        assert_status_code(await no_perm.delete(f"/shifts/{DUMMY_ID}"), 403)

        with_perm = await client_factory(permissions=["shifts_delete"])
        assert (await with_perm.delete(f"/shifts/{DUMMY_ID}")).status_code != 403
        logger.info("✓ shifts_delete correctly gates DELETE /shifts/{id}")
