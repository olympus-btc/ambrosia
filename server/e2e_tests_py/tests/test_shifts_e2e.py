"""End-to-end tests for the shifts endpoint."""

import logging

import pytest

from ambrosia.api_utils import assert_status_code

logger = logging.getLogger(__name__)

NONEXISTENT_ID = "00000000-0000-0000-0000-000000000000"


async def _get_current_user_id(admin_client) -> str:
    response = await admin_client.get("/users/me")
    assert_status_code(response, 200, "Failed to fetch current user")
    return response.json()["user"]["user_id"]


def _shift_payload(user_id: str) -> dict:
    return {
        "user_id": user_id,
        "shift_date": "2026-01-01",
        "start_time": "08:00:00",
        "notes": "e2e test shift",
        "initial_amount": 100.0,
    }


class TestShiftsFlow:
    """Tests for the shifts business flow and input validation."""

    @pytest.fixture
    async def user_id(self, admin_client):
        return await _get_current_user_id(admin_client)

    @pytest.fixture(autouse=True)
    async def ensure_no_open_shift(self, admin_client):
        """Close any open shift before each test to ensure a clean state."""
        response = await admin_client.get("/shifts/open")
        if response.status_code == 200:
            open_id = response.json()["id"]
            await admin_client.post(f"/shifts/{open_id}/close")
        yield

    @pytest.fixture
    async def open_shift(self, admin_client, user_id):
        """Create an open shift and clean it up after the test."""
        response = await admin_client.post("/shifts", json=_shift_payload(user_id))
        assert_status_code(response, 201, "Failed to create test shift fixture")
        shift_id = response.json()["id"]
        yield shift_id
        # Close if still open, then soft-delete
        await admin_client.post(f"/shifts/{shift_id}/close")
        await admin_client.delete(f"/shifts/{shift_id}")

    @pytest.mark.asyncio
    async def test_no_open_shift_returns_204(self, admin_client):
        """GET /shifts/open returns 204 when no shift is open."""
        response = await admin_client.get("/shifts/open")
        assert_status_code(response, 204, "No open shift should return 204")
        logger.info("✓ No open shift correctly returns 204")

    @pytest.mark.asyncio
    async def test_open_shift_is_returned(self, admin_client, open_shift):
        """GET /shifts/open returns 200 with shift data when a shift is open."""
        response = await admin_client.get("/shifts/open")
        assert_status_code(response, 200, "Open shift should be returned")
        assert response.json()["id"] == open_shift
        logger.info("✓ Open shift correctly returned")

    @pytest.mark.asyncio
    async def test_open_shift_succeeds(self, admin_client, user_id):
        """POST /shifts opens a new shift and returns 201."""
        response = await admin_client.post("/shifts", json=_shift_payload(user_id))
        assert_status_code(response, 201, "Opening a shift should return 201")
        shift_id = response.json()["id"]
        # cleanup
        await admin_client.post(f"/shifts/{shift_id}/close")
        await admin_client.delete(f"/shifts/{shift_id}")
        logger.info("✓ Shift opened successfully")

    @pytest.mark.asyncio
    async def test_open_second_shift_returns_409(
        self, admin_client, open_shift, user_id
    ):
        """POST /shifts returns 409 when a shift is already open."""
        response = await admin_client.post("/shifts", json=_shift_payload(user_id))
        assert_status_code(response, 409, "Opening a second shift should return 409")
        logger.info("✓ Duplicate open shift correctly returns 409")

    @pytest.mark.asyncio
    async def test_open_shift_with_nonexistent_user_returns_400(self, admin_client):
        """POST /shifts with a non-existent user_id returns 400."""
        payload = _shift_payload(NONEXISTENT_ID)
        response = await admin_client.post("/shifts", json=payload)
        assert_status_code(response, 400, "Non-existent user_id should return 400")
        logger.info("✓ Non-existent user_id correctly returns 400")

    @pytest.mark.asyncio
    async def test_close_shift_succeeds(self, admin_client, open_shift):
        """POST /shifts/{id}/close closes the shift and returns 200."""
        response = await admin_client.post(
            f"/shifts/{open_shift}/close",
            json={"final_amount": 250.0, "difference": 150.0},
        )
        assert_status_code(response, 200, "Closing a shift should return 200")
        logger.info("✓ Shift closed successfully")

    @pytest.mark.asyncio
    async def test_close_shift_without_amounts_succeeds(self, admin_client, open_shift):
        """POST /shifts/{id}/close without a body also returns 200."""
        response = await admin_client.post(f"/shifts/{open_shift}/close")
        assert_status_code(
            response, 200, "Closing a shift without amounts should return 200"
        )
        logger.info("✓ Shift closed without amounts successfully")

    @pytest.mark.asyncio
    async def test_close_already_closed_shift_returns_404(
        self, admin_client, open_shift
    ):
        """POST /shifts/{id}/close on an already-closed shift returns 404."""
        await admin_client.post(f"/shifts/{open_shift}/close")
        response = await admin_client.post(f"/shifts/{open_shift}/close")
        assert_status_code(
            response, 404, "Closing an already-closed shift should return 404"
        )
        logger.info("✓ Already-closed shift correctly returns 404")

    @pytest.mark.asyncio
    async def test_close_nonexistent_shift_returns_404(self, admin_client):
        """POST /shifts/{id}/close with a non-existent ID returns 404."""
        response = await admin_client.post(f"/shifts/{NONEXISTENT_ID}/close")
        assert_status_code(response, 404, "Non-existent shift ID should return 404")
        logger.info("✓ Non-existent shift correctly returns 404")

    @pytest.mark.asyncio
    async def test_get_shift_by_id_succeeds(self, admin_client, open_shift):
        """GET /shifts/{id} returns the shift."""
        response = await admin_client.get(f"/shifts/{open_shift}")
        assert_status_code(response, 200, "GET by ID should return the shift")
        assert response.json()["id"] == open_shift
        logger.info("✓ GET shift by ID succeeded")

    @pytest.mark.asyncio
    async def test_get_nonexistent_shift_returns_404(self, admin_client):
        """GET /shifts/{id} with a non-existent ID returns 404."""
        response = await admin_client.get(f"/shifts/{NONEXISTENT_ID}")
        assert_status_code(response, 404, "Non-existent shift ID should return 404")
        logger.info("✓ Non-existent shift GET correctly returns 404")
