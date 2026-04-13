"""End-to-end tests for the suppliers CRUD endpoints.

Covers the full create / read / update / delete happy path.

Note: POST /suppliers does not validate duplicate names at the route level —
if the service returns null (duplicate name), the route still responds 201 with
{"id": null}. This is a known inconsistency shared with dishes and ingredients.
These tests focus on the correct happy-path behaviour only.
"""

import logging
import uuid

import pytest

from ambrosia.api_utils import assert_status_code

logger = logging.getLogger(__name__)

NONEXISTENT_ID = "00000000-0000-0000-0000-000000000000"


def _supplier_payload(suffix: str) -> dict:
    return {
        "name": f"e2e_supplier_{suffix}",
        "contact": "Test Contact",
        "phone": "555-0100",
        "email": f"supplier_{suffix}@e2e.test",
        "address": "123 Test Street",
    }


class TestSuppliersEndpoint:
    """CRUD happy-path tests for /suppliers."""

    @pytest.fixture
    async def supplier(self, admin_client):
        """Create a temporary supplier and clean it up after."""
        uid = str(uuid.uuid4())[:8]
        response = await admin_client.post("/suppliers", json=_supplier_payload(uid))
        assert_status_code(response, 201, "Failed to create supplier fixture")
        supplier_id = response.json()["id"]
        yield supplier_id, uid
        await admin_client.delete(f"/suppliers/{supplier_id}")


    @pytest.mark.asyncio
    async def test_create_supplier_returns_201_with_id(self, admin_client):
        """POST /suppliers returns 201 with a valid id."""
        uid = str(uuid.uuid4())[:8]
        response = await admin_client.post("/suppliers", json=_supplier_payload(uid))
        assert_status_code(response, 201, "Creating a supplier should return 201")
        body = response.json()
        assert body["id"] is not None, "Response should contain a non-null id"
        await admin_client.delete(f"/suppliers/{body['id']}")
        logger.info("✓ POST /suppliers correctly returns 201 with id")


    @pytest.mark.asyncio
    async def test_get_suppliers_returns_200(self, admin_client, supplier):
        """GET /suppliers returns 200 and includes the created supplier."""
        supplier_id, _ = supplier
        response = await admin_client.get("/suppliers")
        assert_status_code(response, 200, "GET /suppliers should return 200")
        body = response.json()
        assert isinstance(body, list), "Response should be a list"
        assert any(s["id"] == supplier_id for s in body), (
            "Created supplier should be in the list"
        )
        logger.info("✓ GET /suppliers correctly includes created supplier")


    @pytest.mark.asyncio
    async def test_get_supplier_by_id_returns_correct_data(
        self, admin_client, supplier
    ):
        """GET /suppliers/{id} returns the supplier with correct fields."""
        supplier_id, uid = supplier
        response = await admin_client.get(f"/suppliers/{supplier_id}")
        assert_status_code(response, 200, "GET /suppliers/{id} should return 200")
        body = response.json()
        assert body["id"] == supplier_id
        assert body["name"] == f"e2e_supplier_{uid}"
        logger.info("✓ GET /suppliers/{id} returns correct supplier data")

    @pytest.mark.asyncio
    async def test_get_nonexistent_supplier_returns_404(self, admin_client):
        """GET /suppliers/{id} with a non-existent ID returns 404."""
        response = await admin_client.get(f"/suppliers/{NONEXISTENT_ID}")
        assert_status_code(response, 404, "Non-existent supplier should return 404")
        logger.info("✓ GET /suppliers/{id} with non-existent ID correctly returns 404")


    @pytest.mark.asyncio
    async def test_update_supplier_returns_200(self, admin_client, supplier):
        """PUT /suppliers/{id} updates the supplier and returns 200."""
        supplier_id, uid = supplier
        updated = {**_supplier_payload(uid), "name": f"e2e_supplier_{uid}_updated"}
        response = await admin_client.put(f"/suppliers/{supplier_id}", json=updated)
        assert_status_code(response, 200, "PUT /suppliers/{id} should return 200")
        logger.info("✓ PUT /suppliers/{id} correctly returns 200")

    @pytest.mark.asyncio
    async def test_update_supplier_persists_changes(self, admin_client, supplier):
        """After PUT /suppliers/{id}, GET reflects the updated name."""
        supplier_id, uid = supplier
        updated = {**_supplier_payload(uid), "name": f"e2e_supplier_{uid}_updated"}
        await admin_client.put(f"/suppliers/{supplier_id}", json=updated)

        response = await admin_client.get(f"/suppliers/{supplier_id}")
        assert_status_code(response, 200)
        assert response.json()["name"] == f"e2e_supplier_{uid}_updated"
        logger.info("✓ PUT /suppliers/{id} changes are correctly persisted")

    @pytest.mark.asyncio
    async def test_update_nonexistent_supplier_returns_404(self, admin_client):
        """PUT /suppliers/{id} with a non-existent ID returns 404."""
        response = await admin_client.put(
            f"/suppliers/{NONEXISTENT_ID}", json=_supplier_payload("ghost")
        )
        assert_status_code(
            response, 404, "Non-existent supplier update should return 404"
        )
        logger.info("✓ PUT /suppliers/{id} with non-existent ID correctly returns 404")


    @pytest.mark.asyncio
    async def test_delete_supplier_returns_204(self, admin_client):
        """DELETE /suppliers/{id} soft-deletes the supplier and returns 204."""
        uid = str(uuid.uuid4())[:8]
        create = await admin_client.post("/suppliers", json=_supplier_payload(uid))
        assert_status_code(create, 201)
        supplier_id = create.json()["id"]

        response = await admin_client.delete(f"/suppliers/{supplier_id}")
        assert_status_code(response, 204, "DELETE /suppliers/{id} should return 204")
        logger.info("✓ DELETE /suppliers/{id} correctly returns 204")

    @pytest.mark.asyncio
    async def test_deleted_supplier_not_found(self, admin_client):
        """After DELETE, GET /suppliers/{id} returns 404."""
        uid = str(uuid.uuid4())[:8]
        create = await admin_client.post("/suppliers", json=_supplier_payload(uid))
        supplier_id = create.json()["id"]
        await admin_client.delete(f"/suppliers/{supplier_id}")

        response = await admin_client.get(f"/suppliers/{supplier_id}")
        assert_status_code(response, 404, "Deleted supplier should return 404 on GET")
        logger.info("✓ Deleted supplier correctly returns 404 on GET")

    @pytest.mark.asyncio
    async def test_delete_nonexistent_supplier_returns_404(self, admin_client):
        """DELETE /suppliers/{id} with a non-existent ID returns 404."""
        response = await admin_client.delete(f"/suppliers/{NONEXISTENT_ID}")
        assert_status_code(
            response, 404, "Non-existent supplier delete should return 404"
        )
        logger.info(
            "✓ DELETE /suppliers/{id} with non-existent ID correctly returns 404"
        )
