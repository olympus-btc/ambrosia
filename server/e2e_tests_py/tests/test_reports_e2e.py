"""End-to-end tests for the /reports endpoint."""

import pytest

from ambrosia.api_utils import assert_status_code


class TestReportsEndpoint:
    """Tests for GET /reports."""

    @pytest.mark.asyncio
    async def test_happy_path_authenticated(self, client_factory):
        """Authenticated user with reports_read gets 200 with correct shape."""
        client = await client_factory(permissions=["reports_read"])
        response = await client.get("/reports?startDate=2020-01-01&endDate=2099-12-31")
        assert_status_code(response, 200)

        data = response.json()
        assert "totalRevenueCents" in data, (
            "La respuesta debe incluir totalRevenueCents"
        )
        assert "totalItemsSold" in data, "La respuesta debe incluir totalItemsSold"
        assert "sales" in data, "La respuesta debe incluir el array sales"
        assert isinstance(data["sales"], list), "sales debe ser una lista"
        assert isinstance(data["totalRevenueCents"], int), (
            "totalRevenueCents debe ser entero"
        )
        assert isinstance(data["totalItemsSold"], int), "totalItemsSold debe ser entero"
        assert data["totalRevenueCents"] >= 0
        assert data["totalItemsSold"] >= 0

        if data["sales"]:
            sale = data["sales"][0]
            assert "productName" in sale
            assert "quantity" in sale
            assert "priceAtOrder" in sale
            assert "userName" in sale
            assert "paymentMethod" in sale
            assert "saleDate" in sale

    @pytest.mark.asyncio
    async def test_period_week_returns_200(self, client_factory):
        """?period=week returns 200 with valid report shape."""
        client = await client_factory(permissions=["reports_read"])
        response = await client.get("/reports?period=week")
        assert_status_code(response, 200)

        data = response.json()
        assert "totalRevenueCents" in data
        assert "totalItemsSold" in data
        assert "sales" in data

    @pytest.mark.asyncio
    async def test_period_month_returns_200(self, client_factory):
        """?period=month returns 200 with valid report shape."""
        client = await client_factory(permissions=["reports_read"])
        response = await client.get("/reports?period=month")
        assert_status_code(response, 200)

        data = response.json()
        assert "totalRevenueCents" in data
        assert "sales" in data

    @pytest.mark.asyncio
    async def test_period_year_returns_200(self, client_factory):
        """?period=year returns 200 with valid report shape."""
        client = await client_factory(permissions=["reports_read"])
        response = await client.get("/reports?period=year")
        assert_status_code(response, 200)

        data = response.json()
        assert "totalRevenueCents" in data
        assert "sales" in data

    @pytest.mark.asyncio
    async def test_invalid_period_returns_400(self, client_factory):
        """?period with unsupported value returns 400."""
        client = await client_factory(permissions=["reports_read"])
        response = await client.get("/reports?period=fortnight")
        assert_status_code(response, 400)

    @pytest.mark.asyncio
    async def test_invalid_date_format_returns_400(self, client_factory):
        """Non-ISO date string returns 400."""
        client = await client_factory(permissions=["reports_read"])
        response = await client.get("/reports?startDate=not-a-date&endDate=2024-01-31")
        assert_status_code(response, 400)

    @pytest.mark.asyncio
    async def test_start_after_end_returns_400(self, client_factory):
        """startDate after endDate returns 400."""
        client = await client_factory(permissions=["reports_read"])
        response = await client.get("/reports?startDate=2024-12-31&endDate=2024-01-01")
        assert_status_code(response, 400)

    @pytest.mark.asyncio
    async def test_missing_start_date_returns_400(self, client_factory):
        """Request with endDate only returns 400."""
        client = await client_factory(permissions=["reports_read"])
        response = await client.get("/reports?endDate=2024-01-31")
        assert_status_code(response, 400)

    @pytest.mark.asyncio
    async def test_missing_end_date_returns_400(self, client_factory):
        """Request with startDate only returns 400."""
        client = await client_factory(permissions=["reports_read"])
        response = await client.get("/reports?startDate=2024-01-01")
        assert_status_code(response, 400)

    @pytest.mark.asyncio
    async def test_no_permission_returns_403(self, client_factory):
        """User without reports_read permission is rejected with 403."""
        client = await client_factory(permissions=["orders_read"])
        response = await client.get("/reports?startDate=2024-01-01&endDate=2024-12-31")
        assert_status_code(response, 403)

    @pytest.mark.asyncio
    async def test_unauthenticated_returns_401(self, public_client):
        """Unauthenticated request returns 401."""
        response = await public_client.get(
            "/reports?startDate=2024-01-01&endDate=2024-01-31"
        )
        assert_status_code(response, 401)

    @pytest.mark.asyncio
    async def test_no_filters_returns_200_with_all_data(self, client_factory):
        """Request without any filter returns 200 (all data)."""
        client = await client_factory(permissions=["reports_read"])
        response = await client.get("/reports")
        assert_status_code(response, 200)

        data = response.json()
        assert "totalRevenueCents" in data
        assert "sales" in data

    @pytest.mark.asyncio
    async def test_product_name_filter_returns_200(self, client_factory):
        """?productName filter is accepted and returns 200."""
        client = await client_factory(permissions=["reports_read"])
        response = await client.get(
            "/reports?period=year&productName=NonExistentProduct12345"
        )
        assert_status_code(response, 200)

        data = response.json()
        assert data["totalRevenueCents"] == 0
        assert data["totalItemsSold"] == 0
        assert data["sales"] == []

    @pytest.mark.asyncio
    async def test_payment_method_filter_returns_200(self, client_factory):
        """?paymentMethod filter is accepted and returns 200."""
        client = await client_factory(permissions=["reports_read"])
        response = await client.get("/reports?period=year&paymentMethod=UnknownMethod")
        assert_status_code(response, 200)

        data = response.json()
        assert "sales" in data
        assert isinstance(data["sales"], list)
