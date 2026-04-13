"""End-to-end tests for the tables CRUD endpoints.

Covers the full create / read / update / delete happy path plus
status transitions and the GET /tables/by-space/{id} endpoint.

Tables require a valid space_id and names must be unique within a space.
Valid statuses: "available", "occupied", "reserved".

Note: POST /tables does not validate failures at the route level —
if the service returns null (invalid space, duplicate name, invalid status),
the route still responds 201 with {"id": null}. This is a known inconsistency.
"""

import logging
import uuid

import pytest

from ambrosia.api_utils import assert_status_code

logger = logging.getLogger(__name__)

NONEXISTENT_ID = "00000000-0000-0000-0000-000000000000"


class TestTablesEndpoint:
    """CRUD happy-path and status transition tests for /tables."""

    @pytest.fixture
    async def space(self, admin_client):
        """Create a temporary space and clean it up after."""
        uid = str(uuid.uuid4())[:8]
        response = await admin_client.post("/spaces", json={"name": f"e2e_space_{uid}"})
        assert_status_code(response, 201, "Failed to create space fixture")
        space_id = response.json()["id"]
        yield space_id
        await admin_client.delete(f"/spaces/{space_id}")

    @pytest.fixture
    async def table(self, admin_client, space):
        """Create a temporary table in the test space and clean it up after."""
        uid = str(uuid.uuid4())[:8]
        name = f"e2e_table_{uid}"
        response = await admin_client.post(
            "/tables",
            json={"name": name, "space_id": space, "status": "available"},
        )
        assert_status_code(response, 201, "Failed to create table fixture")
        table_id = response.json()["id"]
        yield table_id, name
        await admin_client.delete(f"/tables/{table_id}")


    @pytest.mark.asyncio
    async def test_create_table_returns_201_with_id(self, admin_client, space):
        """POST /tables returns 201 with a valid id."""
        uid = str(uuid.uuid4())[:8]
        response = await admin_client.post(
            "/tables",
            json={"name": f"e2e_table_{uid}", "space_id": space, "status": "available"},
        )
        assert_status_code(response, 201, "Creating a table should return 201")
        body = response.json()
        assert body["id"] is not None, "Response should contain a non-null id"
        await admin_client.delete(f"/tables/{body['id']}")
        logger.info("✓ POST /tables correctly returns 201 with id")


    @pytest.mark.asyncio
    async def test_get_tables_returns_200(self, admin_client, table):
        """GET /tables returns 200 and includes the created table."""
        table_id, _ = table
        response = await admin_client.get("/tables")
        assert_status_code(response, 200, "GET /tables should return 200")
        body = response.json()
        assert isinstance(body, list), "Response should be a list"
        assert any(t["id"] == table_id for t in body), (
            "Created table should be in the list"
        )
        logger.info("✓ GET /tables correctly includes created table")


    @pytest.mark.asyncio
    async def test_get_table_by_id_returns_correct_data(
        self, admin_client, table, space
    ):
        """GET /tables/{id} returns the table with correct fields."""
        table_id, name = table
        response = await admin_client.get(f"/tables/{table_id}")
        assert_status_code(response, 200, "GET /tables/{id} should return 200")
        body = response.json()
        assert body["id"] == table_id
        assert body["name"] == name
        assert body["space_id"] == space
        assert body["status"] == "available"
        logger.info("✓ GET /tables/{id} returns correct table data")

    @pytest.mark.asyncio
    async def test_get_nonexistent_table_returns_404(self, admin_client):
        """GET /tables/{id} with a non-existent ID returns 404."""
        response = await admin_client.get(f"/tables/{NONEXISTENT_ID}")
        assert_status_code(response, 404, "Non-existent table should return 404")
        logger.info("✓ GET /tables/{id} with non-existent ID correctly returns 404")


    @pytest.mark.asyncio
    async def test_get_tables_by_space_returns_table(self, admin_client, table, space):
        """GET /tables/by-space/{id} returns tables belonging to the space."""
        table_id, _ = table
        response = await admin_client.get(f"/tables/by-space/{space}")
        assert_status_code(response, 200, "GET /tables/by-space/{id} should return 200")
        body = response.json()
        assert isinstance(body, list)
        assert any(t["id"] == table_id for t in body), (
            "Table should appear in space listing"
        )
        logger.info("✓ GET /tables/by-space/{id} correctly returns tables for space")

    @pytest.mark.asyncio
    async def test_get_tables_by_nonexistent_space_returns_404(self, admin_client):
        """GET /tables/by-space/{id} with a non-existent space ID returns 404."""
        response = await admin_client.get(f"/tables/by-space/{NONEXISTENT_ID}")
        assert_status_code(response, 404, "Non-existent space should return 404")
        logger.info(
            "✓ GET /tables/by-space/{id} with non-existent space correctly returns 404"
        )


    @pytest.mark.asyncio
    async def test_update_table_returns_200(self, admin_client, table, space):
        """PUT /tables/{id} updates the table and returns 200."""
        table_id, _ = table
        uid = str(uuid.uuid4())[:8]
        response = await admin_client.put(
            f"/tables/{table_id}",
            json={
                "name": f"e2e_table_{uid}_updated",
                "space_id": space,
                "status": "available",
            },
        )
        assert_status_code(response, 200, "PUT /tables/{id} should return 200")
        logger.info("✓ PUT /tables/{id} correctly returns 200")

    @pytest.mark.asyncio
    async def test_update_table_status_to_occupied(self, admin_client, table, space):
        """PUT /tables/{id} can transition status to 'occupied'."""
        table_id, name = table
        response = await admin_client.put(
            f"/tables/{table_id}",
            json={"name": name, "space_id": space, "status": "occupied"},
        )
        assert_status_code(
            response, 200, "Status transition to occupied should return 200"
        )

        get_response = await admin_client.get(f"/tables/{table_id}")
        assert get_response.json()["status"] == "occupied"
        logger.info("✓ Status transition to 'occupied' correctly persisted")

    @pytest.mark.asyncio
    async def test_update_table_status_to_reserved(self, admin_client, table, space):
        """PUT /tables/{id} can transition status to 'reserved'."""
        table_id, name = table
        response = await admin_client.put(
            f"/tables/{table_id}",
            json={"name": name, "space_id": space, "status": "reserved"},
        )
        assert_status_code(
            response, 200, "Status transition to reserved should return 200"
        )

        get_response = await admin_client.get(f"/tables/{table_id}")
        assert get_response.json()["status"] == "reserved"
        logger.info("✓ Status transition to 'reserved' correctly persisted")

    @pytest.mark.asyncio
    async def test_update_nonexistent_table_returns_404(self, admin_client, space):
        """PUT /tables/{id} with a non-existent ID returns 404."""
        response = await admin_client.put(
            f"/tables/{NONEXISTENT_ID}",
            json={"name": "ghost_table", "space_id": space, "status": "available"},
        )
        assert_status_code(response, 404, "Non-existent table update should return 404")
        logger.info("✓ PUT /tables/{id} with non-existent ID correctly returns 404")


    @pytest.mark.asyncio
    async def test_delete_table_returns_204(self, admin_client, space):
        """DELETE /tables/{id} soft-deletes the table and returns 204."""
        uid = str(uuid.uuid4())[:8]
        create = await admin_client.post(
            "/tables",
            json={"name": f"e2e_table_{uid}", "space_id": space, "status": "available"},
        )
        assert_status_code(create, 201)
        table_id = create.json()["id"]

        response = await admin_client.delete(f"/tables/{table_id}")
        assert_status_code(response, 204, "DELETE /tables/{id} should return 204")
        logger.info("✓ DELETE /tables/{id} correctly returns 204")

    @pytest.mark.asyncio
    async def test_deleted_table_not_found(self, admin_client, space):
        """After DELETE, GET /tables/{id} returns 404."""
        uid = str(uuid.uuid4())[:8]
        create = await admin_client.post(
            "/tables",
            json={"name": f"e2e_table_{uid}", "space_id": space, "status": "available"},
        )
        table_id = create.json()["id"]
        await admin_client.delete(f"/tables/{table_id}")

        response = await admin_client.get(f"/tables/{table_id}")
        assert_status_code(response, 404, "Deleted table should return 404 on GET")
        logger.info("✓ Deleted table correctly returns 404 on GET")

    @pytest.mark.asyncio
    async def test_delete_nonexistent_table_returns_404(self, admin_client):
        """DELETE /tables/{id} with a non-existent ID returns 404."""
        response = await admin_client.delete(f"/tables/{NONEXISTENT_ID}")
        assert_status_code(response, 404, "Non-existent table delete should return 404")
        logger.info("✓ DELETE /tables/{id} with non-existent ID correctly returns 404")
