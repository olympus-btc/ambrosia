"""End-to-end tests for the /reports endpoint."""

import pytest

from ambrosia.api_utils import assert_status_code


class TestReportsEndpoint:
    """Tests for GET /reports."""

    @pytest.mark.asyncio
    async def test_happy_path_authenticated(self, client_factory):
        """Authenticated user with tickets_read gets 200 with correct shape."""
        client = await client_factory(permissions=["tickets_read"])
        response = await client.get(
            "/reports?startDate=2020-01-01&endDate=2099-12-31"
        )
        assert_status_code(response, 200)

        data = response.json()
        assert "startDate" in data
        assert "endDate" in data
        assert "totalBalance" in data
        assert isinstance(data["reports"], list)
        if data["reports"]:
            day = data["reports"][0]
            assert "date" in day
            assert "balance" in day
            assert isinstance(day["tickets"], list)

    @pytest.mark.asyncio
    async def test_missing_start_date_returns_400(self, client_factory):
        """Request without startDate returns 400."""
        client = await client_factory(permissions=["tickets_read"])
        response = await client.get("/reports?endDate=2024-01-31")
        assert_status_code(response, 400)

    @pytest.mark.asyncio
    async def test_missing_end_date_returns_400(self, client_factory):
        """Request without endDate returns 400."""
        client = await client_factory(permissions=["tickets_read"])
        response = await client.get("/reports?startDate=2024-01-01")
        assert_status_code(response, 400)

    @pytest.mark.asyncio
    async def test_unauthenticated_returns_401(self, public_client):
        """Unauthenticated request returns 401."""
        response = await public_client.get(
            "/reports?startDate=2024-01-01&endDate=2024-01-31"
        )
        assert_status_code(response, 401)
