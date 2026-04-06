"""End-to-end tests for payment validation.

Tests that the server enforces input validation on both
POST /payments (create) and PUT /payments/{id} (update) endpoints.

Validated fields (via PaymentService):
- method_id must not be blank and must reference an existing payment method
- currency_id must not be blank and must reference an existing currency

POST /payments correctly returns 400 for all validation failures — no known inconsistencies.

PUT /payments/{id} returns 404 for all service failures (including validation failures).
This is a known inconsistency — the route maps any false return from the service to 404.
Tests assert current actual behaviour. If the route handler is fixed, update accordingly.
"""

import logging
import uuid

import pytest

from ambrosia.api_utils import assert_status_code

logger = logging.getLogger(__name__)

NONEXISTENT_ID = "00000000-0000-0000-0000-000000000000"


class TestPaymentValidation:
    """Tests for input validation on the payments endpoints."""

    @pytest.fixture
    async def method_id(self, admin_client):
        """Fetch the first available payment method ID from the server."""
        response = await admin_client.get("/payments/methods")
        assert_status_code(response, 200, "Failed to fetch payment methods")
        return response.json()[0]["id"]

    @pytest.fixture
    async def currency_id(self, admin_client):
        """Fetch the first available currency ID from the server."""
        response = await admin_client.get("/payments/currencies")
        assert_status_code(response, 200, "Failed to fetch currencies")
        return response.json()[0]["id"]

    @pytest.fixture
    async def existing_payment(self, admin_client, method_id, currency_id):
        """Create a temporary payment for PUT tests and clean it up after."""
        response = await admin_client.post(
            "/payments",
            json={"method_id": method_id, "currency_id": currency_id, "transaction_id": str(uuid.uuid4()), "amount": 100.0},
        )
        assert_status_code(response, 201, "Failed to create test payment fixture")
        payment_id = response.json()["id"]
        yield payment_id
        await admin_client.delete(f"/payments/{payment_id}")

    # --- POST tests ---

    @pytest.mark.asyncio
    async def test_create_payment_with_blank_method_id_fails(self, admin_client, currency_id):
        """POST /payments with a blank method_id should return 400."""
        response = await admin_client.post(
            "/payments",
            json={"method_id": "", "currency_id": currency_id, "transaction_id": str(uuid.uuid4()), "amount": 100.0},
        )
        assert_status_code(response, 400, "Blank method_id should be rejected on create")
        logger.info("✓ Blank method_id correctly rejected on create")

    @pytest.mark.asyncio
    async def test_create_payment_with_blank_currency_id_fails(self, admin_client, method_id):
        """POST /payments with a blank currency_id should return 400."""
        response = await admin_client.post(
            "/payments",
            json={"method_id": method_id, "currency_id": "", "transaction_id": str(uuid.uuid4()), "amount": 100.0},
        )
        assert_status_code(response, 400, "Blank currency_id should be rejected on create")
        logger.info("✓ Blank currency_id correctly rejected on create")

    @pytest.mark.asyncio
    async def test_create_payment_with_nonexistent_method_id_fails(self, admin_client, currency_id):
        """POST /payments with a non-existent method_id should return 400."""
        response = await admin_client.post(
            "/payments",
            json={"method_id": NONEXISTENT_ID, "currency_id": currency_id, "transaction_id": str(uuid.uuid4()), "amount": 100.0},
        )
        assert_status_code(response, 400, "Non-existent method_id should be rejected on create")
        logger.info("✓ Non-existent method_id correctly rejected on create")

    @pytest.mark.asyncio
    async def test_create_payment_with_nonexistent_currency_id_fails(self, admin_client, method_id):
        """POST /payments with a non-existent currency_id should return 400."""
        response = await admin_client.post(
            "/payments",
            json={"method_id": method_id, "currency_id": NONEXISTENT_ID, "transaction_id": str(uuid.uuid4()), "amount": 100.0},
        )
        assert_status_code(response, 400, "Non-existent currency_id should be rejected on create")
        logger.info("✓ Non-existent currency_id correctly rejected on create")

    @pytest.mark.asyncio
    async def test_create_payment_with_valid_data_succeeds(self, admin_client, method_id, currency_id):
        """POST /payments with valid data should return 201."""
        response = await admin_client.post(
            "/payments",
            json={"method_id": method_id, "currency_id": currency_id, "transaction_id": str(uuid.uuid4()), "amount": 100.0},
        )
        assert_status_code(response, 201, "Valid payment data should be accepted on create")
        await admin_client.delete(f"/payments/{response.json()['id']}")
        logger.info("✓ Valid payment data correctly accepted on create")

    # --- PUT tests ---

    @pytest.mark.asyncio
    async def test_update_payment_with_blank_method_id_returns_404(self, admin_client, existing_payment, currency_id):
        """PUT /payments/{id} with a blank method_id currently returns 404.

        The service returns false for blank method_id and the route maps all failures to 404.
        This is a known inconsistency — should ideally be 400.
        """
        response = await admin_client.put(
            f"/payments/{existing_payment}",
            json={"method_id": "", "currency_id": currency_id, "transaction_id": str(uuid.uuid4()), "amount": 100.0},
        )
        assert_status_code(response, 404, "Blank method_id on update currently returns 404")
        logger.info("✓ Blank method_id on update returns 404 (current behaviour)")

    @pytest.mark.asyncio
    async def test_update_payment_with_blank_currency_id_returns_404(self, admin_client, existing_payment, method_id):
        """PUT /payments/{id} with a blank currency_id currently returns 404."""
        response = await admin_client.put(
            f"/payments/{existing_payment}",
            json={"method_id": method_id, "currency_id": "", "transaction_id": str(uuid.uuid4()), "amount": 100.0},
        )
        assert_status_code(response, 404, "Blank currency_id on update currently returns 404")
        logger.info("✓ Blank currency_id on update returns 404 (current behaviour)")

    @pytest.mark.asyncio
    async def test_update_payment_with_nonexistent_method_id_returns_404(self, admin_client, existing_payment, currency_id):
        """PUT /payments/{id} with a non-existent method_id currently returns 404."""
        response = await admin_client.put(
            f"/payments/{existing_payment}",
            json={"method_id": NONEXISTENT_ID, "currency_id": currency_id, "transaction_id": str(uuid.uuid4()), "amount": 100.0},
        )
        assert_status_code(response, 404, "Non-existent method_id on update currently returns 404")
        logger.info("✓ Non-existent method_id on update returns 404 (current behaviour)")

    @pytest.mark.asyncio
    async def test_update_payment_with_nonexistent_currency_id_returns_404(self, admin_client, existing_payment, method_id):
        """PUT /payments/{id} with a non-existent currency_id currently returns 404."""
        response = await admin_client.put(
            f"/payments/{existing_payment}",
            json={"method_id": method_id, "currency_id": NONEXISTENT_ID, "transaction_id": str(uuid.uuid4()), "amount": 100.0},
        )
        assert_status_code(response, 404, "Non-existent currency_id on update currently returns 404")
        logger.info("✓ Non-existent currency_id on update returns 404 (current behaviour)")

    @pytest.mark.asyncio
    async def test_update_payment_with_valid_data_succeeds(self, admin_client, existing_payment, method_id, currency_id):
        """PUT /payments/{id} with valid data should return 200."""
        response = await admin_client.put(
            f"/payments/{existing_payment}",
            json={"method_id": method_id, "currency_id": currency_id, "transaction_id": str(uuid.uuid4()), "amount": 200.0},
        )
        assert_status_code(response, 200, "Valid payment data should be accepted on update")
        logger.info("✓ Valid payment data correctly accepted on update")
