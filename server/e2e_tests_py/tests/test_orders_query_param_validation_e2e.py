"""End-to-end tests for GET /orders/with-payments query parameter validation."""

import logging

import pytest

from ambrosia.api_utils import assert_status_code

logger = logging.getLogger(__name__)

BASE = "/orders/with-payments"


class TestOrdersQueryParamValidation:
    """Tests for query parameter validation on GET /orders/with-payments."""

    @pytest.mark.asyncio
    async def test_invalid_start_date_format_returns_400(self, admin_client):
        """start_date that is not YYYY-MM-DD should return 400."""
        response = await admin_client.get(f"{BASE}?start_date=01-01-2026")
        assert_status_code(
            response, 400, "Invalid start_date format should be rejected"
        )
        logger.info("✓ Invalid start_date format correctly rejected")

    @pytest.mark.asyncio
    async def test_invalid_end_date_format_returns_400(self, admin_client):
        """end_date that is not YYYY-MM-DD should return 400."""
        response = await admin_client.get(f"{BASE}?end_date=not-a-date")
        assert_status_code(response, 400, "Invalid end_date format should be rejected")
        logger.info("✓ Invalid end_date format correctly rejected")

    @pytest.mark.asyncio
    async def test_start_date_after_end_date_returns_400(self, admin_client):
        """start_date later than end_date should return 400."""
        response = await admin_client.get(
            f"{BASE}?start_date=2026-12-31&end_date=2026-01-01"
        )
        assert_status_code(response, 400, "start_date > end_date should be rejected")
        logger.info("✓ start_date > end_date correctly rejected")

    @pytest.mark.asyncio
    async def test_valid_date_range_succeeds(self, admin_client):
        """Valid start_date and end_date should return 200."""
        response = await admin_client.get(
            f"{BASE}?start_date=2026-01-01&end_date=2026-12-31"
        )
        assert_status_code(response, 200, "Valid date range should be accepted")
        logger.info("✓ Valid date range correctly accepted")

    @pytest.mark.asyncio
    async def test_invalid_sort_by_returns_400(self, admin_client):
        """sort_by value not in allowed set should return 400."""
        response = await admin_client.get(f"{BASE}?sort_by=name")
        assert_status_code(response, 400, "Invalid sort_by should be rejected")
        logger.info("✓ Invalid sort_by correctly rejected")

    @pytest.mark.asyncio
    async def test_valid_sort_by_date_succeeds(self, admin_client):
        """sort_by=date should return 200."""
        response = await admin_client.get(f"{BASE}?sort_by=date")
        assert_status_code(response, 200, "sort_by=date should be accepted")
        logger.info("✓ sort_by=date correctly accepted")

    @pytest.mark.asyncio
    async def test_invalid_sort_order_returns_400(self, admin_client):
        """sort_order value not in allowed set should return 400."""
        response = await admin_client.get(f"{BASE}?sort_order=descending")
        assert_status_code(response, 400, "Invalid sort_order should be rejected")
        logger.info("✓ Invalid sort_order correctly rejected")

    @pytest.mark.asyncio
    async def test_valid_sort_order_desc_succeeds(self, admin_client):
        """sort_order=desc should return 200."""
        response = await admin_client.get(f"{BASE}?sort_order=desc")
        assert_status_code(response, 200, "sort_order=desc should be accepted")
        logger.info("✓ sort_order=desc correctly accepted")

    @pytest.mark.asyncio
    async def test_nonnumeric_min_total_returns_400(self, admin_client):
        """Non-numeric min_total should return 400."""
        response = await admin_client.get(f"{BASE}?min_total=abc")
        assert_status_code(response, 400, "Non-numeric min_total should be rejected")
        logger.info("✓ Non-numeric min_total correctly rejected")

    @pytest.mark.asyncio
    async def test_nonnumeric_max_total_returns_400(self, admin_client):
        """Non-numeric max_total should return 400."""
        response = await admin_client.get(f"{BASE}?max_total=abc")
        assert_status_code(response, 400, "Non-numeric max_total should be rejected")
        logger.info("✓ Non-numeric max_total correctly rejected")

    @pytest.mark.asyncio
    async def test_min_total_greater_than_max_total_returns_400(self, admin_client):
        """min_total greater than max_total should return 400."""
        response = await admin_client.get(f"{BASE}?min_total=100&max_total=50")
        assert_status_code(response, 400, "min_total > max_total should be rejected")
        logger.info("✓ min_total > max_total correctly rejected")

    @pytest.mark.asyncio
    async def test_valid_total_range_succeeds(self, admin_client):
        """Valid min_total and max_total should return 200."""
        response = await admin_client.get(f"{BASE}?min_total=0&max_total=1000")
        assert_status_code(response, 200, "Valid total range should be accepted")
        logger.info("✓ Valid total range correctly accepted")
