"""End-to-end tests for the idempotent BTC checkout recovery flow.

Covers GET /store/orders/payment-status/{hash} and the idempotent
POST /store/orders/checkout used by both the foreground "payment complete"
handler and the background recovery sync.
"""

import logging
import uuid

import pytest

from ambrosia.api_utils import assert_status_code

logger = logging.getLogger(__name__)


async def _get_current_user_id(admin_client) -> str:
    response = await admin_client.get("/users/me")
    assert_status_code(response, 200, "Failed to fetch current user")
    return response.json()["user"]["userId"]


def _checkout_payload(
    user_id: str,
    payment_method_id: str,
    currency_id: str,
    payment_hash: str | None,
    items: list[dict] | None = None,
) -> dict:
    return {
        "userId": user_id,
        "items": items
        if items is not None
        else [{"productId": str(uuid.uuid4()), "quantity": 1, "priceAtOrder": 1000}],
        "paymentMethodId": payment_method_id,
        "currencyId": currency_id,
        "amount": 10.0,
        "paymentHash": payment_hash,
    }


class TestCheckoutRecovery:
    """Tests for GET /store/orders/payment-status/{hash} and POST /store/orders/checkout."""

    @pytest.fixture
    async def user_id(self, admin_client):
        """Fetch the current admin user's ID."""
        return await _get_current_user_id(admin_client)

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
    async def category_id(self, admin_client):
        """Create a temporary product-type category and clean it up after."""
        uid = str(uuid.uuid4())[:8]
        response = await admin_client.post(
            "/categories",
            json={"name": f"test_cat_{uid}", "type": "product"},
        )
        assert_status_code(response, 201, "Failed to create test category fixture")
        cid = response.json()["id"]
        yield cid
        await admin_client.delete(f"/categories/{cid}?type=product")

    @pytest.fixture
    async def product_id(self, admin_client, category_id):
        """Create a temporary product with stock for checkout tests."""
        uid = str(uuid.uuid4())[:8]
        response = await admin_client.post(
            "/products",
            json={
                "SKU": f"SKU-{uid}",
                "name": f"test_product_{uid}",
                "priceCents": 1000,
                "quantity": 10,
                "minStockThreshold": 2,
                "maxStockThreshold": 50,
                "categoryIds": [category_id],
            },
        )
        assert_status_code(response, 201, "Failed to create test product fixture")
        pid = response.json()["id"]
        yield pid
        await admin_client.delete(f"/products/{pid}")

    @pytest.mark.asyncio
    async def test_payment_status_for_unknown_hash_returns_pending(self, admin_client):
        """An unrecorded paymentHash should report status=pending without creating anything."""
        unknown_hash = f"unknown-{uuid.uuid4()}"

        response = await admin_client.get(
            f"/store/orders/payment-status/{unknown_hash}"
        )

        assert_status_code(response, 200, "payment-status lookup should succeed")
        assert response.json()["status"] == "pending"
        logger.info("✓ Unknown paymentHash reports status=pending")

    @pytest.mark.asyncio
    async def test_checkout_with_unpaid_payment_hash_returns_pending_without_creating_order(
        self, admin_client, user_id, method_id, currency_id, product_id
    ):
        """An unverifiable paymentHash should return 202 pending and leave stock untouched."""
        unknown_hash = f"unknown-{uuid.uuid4()}"
        items = [{"productId": product_id, "quantity": 1, "priceAtOrder": 1000}]

        before_response = await admin_client.get(f"/products/{product_id}")
        assert_status_code(
            before_response, 200, "Failed to fetch product before checkout"
        )
        quantity_before = before_response.json()["quantity"]

        response = await admin_client.post(
            "/store/orders/checkout",
            json=_checkout_payload(
                user_id, method_id, currency_id, unknown_hash, items=items
            ),
        )

        assert_status_code(
            response, 202, "Unpaid paymentHash should return 202 pending"
        )
        assert response.json()["status"] == "pending"

        after_response = await admin_client.get(f"/products/{product_id}")
        assert_status_code(
            after_response, 200, "Failed to fetch product after checkout"
        )
        assert after_response.json()["quantity"] == quantity_before
        logger.info("✓ Unpaid paymentHash returns 202 pending and does not touch stock")

    @pytest.mark.asyncio
    async def test_checkout_without_payment_hash_creates_separate_orders_each_time(
        self, admin_client, user_id, method_id, currency_id, product_id
    ):
        """Cash/card checkouts (no paymentHash) are not deduplicated."""
        items = [{"productId": product_id, "quantity": 1, "priceAtOrder": 1000}]
        payload = _checkout_payload(
            user_id, method_id, currency_id, payment_hash=None, items=items
        )

        first_response = await admin_client.post("/store/orders/checkout", json=payload)
        assert_status_code(first_response, 201, "Failed to create first cash checkout")

        second_response = await admin_client.post(
            "/store/orders/checkout", json=payload
        )
        assert_status_code(
            second_response, 201, "Failed to create second cash checkout"
        )

        assert first_response.json()["orderId"] != second_response.json()["orderId"]
        logger.info("✓ Checkouts without paymentHash are not deduplicated")
