"""CRUD utility functions for E2E tests.

Provides helper functions for creating and managing products, orders,
categories, tickets, payments, and related entities in tests.

API schema reference (from Ktor routes):
- Products: SKU, name, category_id, quantity, min_stock_threshold,
  max_stock_threshold, cost_cents, price_cents
- Orders: user_id, waiter, status, total, created_at
- Payments: method_id, currency_id, amount
- Tickets: order_id, user_id, ticket_date, status, total_amount, notes
- Payment methods: GET /payments/methods
- Currencies: GET /payments/currencies (also GET /currencies)
- Ticket-payment link: POST /payments/ticket-payments
"""

import logging
import uuid
from datetime import datetime

from ambrosia.api_utils import assert_status_code
from ambrosia.http_client import AmbrosiaHttpClient

logger = logging.getLogger(__name__)


def _uid() -> str:
    return str(uuid.uuid4())[:8]


async def create_category(
    client: AmbrosiaHttpClient, name: str, description: str = ""
) -> dict:
    """Create a product category."""
    payload = {"name": name}
    if description:
        payload["description"] = description

    response = await client.post("/categories", json=payload)
    assert_status_code(response, 201, f"Failed to create category '{name}'")
    return response.json()


async def create_product(
    client: AmbrosiaHttpClient,
    name: str = None,
    price_cents: int = 999,
    category_id: str = "default",
) -> dict:
    """Create a product with all required fields.

    Args:
        client: Authenticated HTTP client
        name: Product name (auto-generated if None)
        price_cents: Price in cents
        category_id: Category ID

    Returns:
        The created product response (contains 'id' and 'message')
    """
    uid = _uid()
    payload = {
        "SKU": f"TEST-{uid}",
        "name": name or f"test-product-{uid}",
        "category_id": category_id,
        "quantity": 100,
        "min_stock_threshold": 5,
        "max_stock_threshold": 200,
        "cost_cents": price_cents // 2,
        "price_cents": price_cents,
    }

    response = await client.post("/products", json=payload)
    assert_status_code(response, 201, "Failed to create product")
    return response.json()


async def get_product(client: AmbrosiaHttpClient, product_id: str) -> dict:
    """Get a product by ID."""
    response = await client.get(f"/products/{product_id}")
    assert_status_code(response, 200, f"Failed to get product '{product_id}'")
    return response.json()


async def update_product(
    client: AmbrosiaHttpClient, product_id: str, updates: dict
) -> dict:
    """Update a product."""
    response = await client.put(f"/products/{product_id}", json=updates)
    assert_status_code(response, 200, f"Failed to update product '{product_id}'")
    return response.json()


async def delete_product(client: AmbrosiaHttpClient, product_id: str) -> None:
    """Delete a product."""
    response = await client.delete(f"/products/{product_id}")
    assert_status_code(response, 200, f"Failed to delete product '{product_id}'")


async def create_order(
    client: AmbrosiaHttpClient,
    user_id: str = "test-user",
    waiter: str = "test-waiter",
    total: float = 0.0,
) -> dict:
    """Create an order with all required fields.

    Args:
        client: Authenticated HTTP client
        user_id: User who created the order
        waiter: Waiter name
        total: Order total amount

    Returns:
        The created order response (contains 'id' and 'message')
    """
    payload = {
        "user_id": user_id,
        "waiter": waiter,
        "status": "open",
        "total": total,
        "created_at": datetime.now().isoformat(),
    }

    response = await client.post("/orders", json=payload)
    assert_status_code(response, 201, "Failed to create order")
    return response.json()


async def get_orders(client: AmbrosiaHttpClient) -> list:
    """Get all orders. Accepts 200 or 204 (empty)."""
    response = await client.get("/orders")
    if response.status_code == 204:
        return []
    assert_status_code(response, 200, "Failed to get orders")
    data = response.json()
    return data if isinstance(data, list) else data.get("orders", data.get("data", []))


async def create_ticket(
    client: AmbrosiaHttpClient,
    order_id: str,
    user_id: str = "test-user",
    total_amount: float = 0.0,
) -> dict:
    """Create a payment ticket with all required fields."""
    payload = {
        "order_id": order_id,
        "user_id": user_id,
        "ticket_date": datetime.now().isoformat(),
        "status": 0,
        "total_amount": total_amount,
        "notes": "E2E test ticket",
    }

    response = await client.post("/tickets", json=payload)
    assert_status_code(response, 201, "Failed to create ticket")
    return response.json()


async def create_payment(
    client: AmbrosiaHttpClient,
    amount: float,
    method_id: str,
    currency_id: str,
) -> dict:
    """Create a payment with all required fields.

    Args:
        client: Authenticated HTTP client
        amount: Payment amount
        method_id: Payment method ID (from /payments/methods)
        currency_id: Currency ID (from /payments/currencies)

    Returns:
        The created payment response (contains 'id' and 'message')
    """
    payload = {
        "method_id": method_id,
        "currency_id": currency_id,
        "amount": amount,
    }

    response = await client.post("/payments", json=payload)
    assert_status_code(response, 201, "Failed to create payment")
    return response.json()


async def link_payment_to_ticket(
    client: AmbrosiaHttpClient, ticket_id: str, payment_id: str
) -> dict:
    """Link a payment to a ticket via /payments/ticket-payments."""
    payload = {"payment_id": payment_id, "ticket_id": ticket_id}
    response = await client.post("/payments/ticket-payments", json=payload)
    assert_status_code(response, 201, "Failed to link payment to ticket")
    return response.json()


async def get_payment_methods(client: AmbrosiaHttpClient) -> list:
    """Get available payment methods from /payments/methods."""
    response = await client.get("/payments/methods")
    if response.status_code == 204:
        return []
    assert_status_code(response, 200, "Failed to get payment methods")
    data = response.json()
    return data if isinstance(data, list) else data.get("methods", data.get("data", []))


async def get_currencies(client: AmbrosiaHttpClient) -> list:
    """Get available currencies from /payments/currencies."""
    response = await client.get("/payments/currencies")
    if response.status_code == 204:
        return []
    assert_status_code(response, 200, "Failed to get currencies")
    data = response.json()
    return (
        data if isinstance(data, list) else data.get("currencies", data.get("data", []))
    )
