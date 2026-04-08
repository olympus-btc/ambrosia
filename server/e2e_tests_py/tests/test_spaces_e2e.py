"""End-to-end tests for the spaces CRUD endpoints.

Covers the full create / read / update / delete happy path.

Note: POST /spaces does not validate duplicate names at the route level —
if the service returns null (duplicate name), the route still responds 201 with
{"id": null}. This is a known inconsistency shared with dishes and ingredients.

Note: DELETE /spaces/{id} returns 400 (not 404) when the space is not found
or has tables associated. This is a known inconsistency in the route handler.
"""

import logging
import uuid

import pytest

from ambrosia.api_utils import assert_status_code

logger = logging.getLogger(__name__)

NONEXISTENT_ID = "00000000-0000-0000-0000-000000000000"


class TestSpacesEndpoint:
    """CRUD happy-path tests for /spaces."""

    @pytest.fixture
    async def space(self, admin_client):
        """Create a temporary space and clean it up after."""
        uid = str(uuid.uuid4())[:8]
        name = f"e2e_space_{uid}"
        response = await admin_client.post("/spaces", json={"name": name})
        assert_status_code(response, 201, "Failed to create space fixture")
        space_id = response.json()["id"]
        yield space_id, name
        await admin_client.delete(f"/spaces/{space_id}")

    # --- POST ---

    @pytest.mark.asyncio
    async def test_create_space_returns_201_with_id(self, admin_client):
        """POST /spaces returns 201 with a valid id."""
        uid = str(uuid.uuid4())[:8]
        response = await admin_client.post("/spaces", json={"name": f"e2e_space_{uid}"})
        assert_status_code(response, 201, "Creating a space should return 201")
        body = response.json()
        assert body["id"] is not None, "Response should contain a non-null id"
        await admin_client.delete(f"/spaces/{body['id']}")
        logger.info("✓ POST /spaces correctly returns 201 with id")

    # --- GET list ---

    @pytest.mark.asyncio
    async def test_get_spaces_returns_200(self, admin_client, space):
        """GET /spaces returns 200 and includes the created space."""
        space_id, _ = space
        response = await admin_client.get("/spaces")
        assert_status_code(response, 200, "GET /spaces should return 200")
        body = response.json()
        assert isinstance(body, list), "Response should be a list"
        assert any(s["id"] == space_id for s in body), "Created space should be in the list"
        logger.info("✓ GET /spaces correctly includes created space")

    # --- GET by id ---

    @pytest.mark.asyncio
    async def test_get_space_by_id_returns_correct_data(self, admin_client, space):
        """GET /spaces/{id} returns the space with correct fields."""
        space_id, name = space
        response = await admin_client.get(f"/spaces/{space_id}")
        assert_status_code(response, 200, "GET /spaces/{id} should return 200")
        body = response.json()
        assert body["id"] == space_id
        assert body["name"] == name
        logger.info("✓ GET /spaces/{id} returns correct space data")

    @pytest.mark.asyncio
    async def test_get_nonexistent_space_returns_404(self, admin_client):
        """GET /spaces/{id} with a non-existent ID returns 404."""
        response = await admin_client.get(f"/spaces/{NONEXISTENT_ID}")
        assert_status_code(response, 404, "Non-existent space should return 404")
        logger.info("✓ GET /spaces/{id} with non-existent ID correctly returns 404")

    # --- PUT ---

    @pytest.mark.asyncio
    async def test_update_space_returns_200(self, admin_client, space):
        """PUT /spaces/{id} updates the space and returns 200."""
        space_id, _ = space
        uid = str(uuid.uuid4())[:8]
        response = await admin_client.put(f"/spaces/{space_id}", json={"name": f"e2e_space_{uid}_updated"})
        assert_status_code(response, 200, "PUT /spaces/{id} should return 200")
        logger.info("✓ PUT /spaces/{id} correctly returns 200")

    @pytest.mark.asyncio
    async def test_update_space_persists_changes(self, admin_client, space):
        """After PUT /spaces/{id}, GET reflects the updated name."""
        space_id, _ = space
        uid = str(uuid.uuid4())[:8]
        new_name = f"e2e_space_{uid}_updated"
        await admin_client.put(f"/spaces/{space_id}", json={"name": new_name})

        response = await admin_client.get(f"/spaces/{space_id}")
        assert_status_code(response, 200)
        assert response.json()["name"] == new_name
        logger.info("✓ PUT /spaces/{id} changes are correctly persisted")

    @pytest.mark.asyncio
    async def test_update_nonexistent_space_returns_404(self, admin_client):
        """PUT /spaces/{id} with a non-existent ID returns 404."""
        response = await admin_client.put(
            f"/spaces/{NONEXISTENT_ID}", json={"name": "ghost_space"}
        )
        assert_status_code(response, 404, "Non-existent space update should return 404")
        logger.info("✓ PUT /spaces/{id} with non-existent ID correctly returns 404")

    # --- DELETE ---

    @pytest.mark.asyncio
    async def test_delete_space_returns_204(self, admin_client):
        """DELETE /spaces/{id} soft-deletes the space and returns 204."""
        uid = str(uuid.uuid4())[:8]
        create = await admin_client.post("/spaces", json={"name": f"e2e_space_{uid}"})
        assert_status_code(create, 201)
        space_id = create.json()["id"]

        response = await admin_client.delete(f"/spaces/{space_id}")
        assert_status_code(response, 204, "DELETE /spaces/{id} should return 204")
        logger.info("✓ DELETE /spaces/{id} correctly returns 204")

    @pytest.mark.asyncio
    async def test_deleted_space_not_found(self, admin_client):
        """After DELETE, GET /spaces/{id} returns 404."""
        uid = str(uuid.uuid4())[:8]
        create = await admin_client.post("/spaces", json={"name": f"e2e_space_{uid}"})
        space_id = create.json()["id"]
        await admin_client.delete(f"/spaces/{space_id}")

        response = await admin_client.get(f"/spaces/{space_id}")
        assert_status_code(response, 404, "Deleted space should return 404 on GET")
        logger.info("✓ Deleted space correctly returns 404 on GET")

    @pytest.mark.asyncio
    async def test_delete_nonexistent_space_returns_400(self, admin_client):
        """DELETE /spaces/{id} with a non-existent ID returns 400.

        Note: the route returns 400 (not 404) for both not-found and in-use cases —
        this is a known inconsistency in the Spaces route handler.
        """
        response = await admin_client.delete(f"/spaces/{NONEXISTENT_ID}")
        assert_status_code(response, 400, "Non-existent space delete should return 400")
        logger.info("✓ DELETE /spaces/{id} with non-existent ID correctly returns 400")
