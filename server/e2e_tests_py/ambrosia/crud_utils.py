"""CRUD utility functions for E2E tests.

Provides helper functions for creating and managing products, orders,
categories, tickets, payments, and related entities in tests.
"""

import logging

from ambrosia.api_utils import assert_status_code
from ambrosia.http_client import AmbrosiaHttpClient

logger = logging.getLogger(__name__)


async def create_category(
    client: AmbrosiaHttpClient, name: str, description: str = ""
) -> dict:
    """Create a product category.

    Args:
        client: Authenticated HTTP client
        name: Category name
        description: Optional category description

    Returns:
        The created category as a dict
    """
    payload = {"name": name}
    if description:
        payload["description"] = description

    response = await client.post("/categories", json=payload)
    assert_status_code(response, 201, f"Failed to create category '{name}'")
    return response.json()


async def create_product(
    client: AmbrosiaHttpClient,
    name: str,
    price: float,
    category_id: str = None,
    description: str = "",
    stock: int = None,
) -> dict:
    """Create a product.

    Args:
        client: Authenticated HTTP client
        name: Product name
        price: Product price
        category_id: Optional category ID
        description: Optional description
        stock: Optional stock count

    Returns:
        The created product as a dict
    """
    payload = {"name": name, "price": price}
    if category_id:
        payload["category_id"] = category_id
    if description:
        payload["description"] = description
    if stock is not None:
        payload["stock"] = stock

    response = await client.post("/products", json=payload)
    assert_status_code(response, 201, f"Failed to create product '{name}'")
    return response.json()


async def get_product(client: AmbrosiaHttpClient, product_id: str) -> dict:
    """Get a product by ID.

    Args:
        client: Authenticated HTTP client
        product_id: Product ID

    Returns:
        The product as a dict
    """
    response = await client.get(f"/products/{product_id}")
    assert_status_code(response, 200, f"Failed to get product '{product_id}'")
    return response.json()


async def update_product(
    client: AmbrosiaHttpClient, product_id: str, updates: dict
) -> dict:
    """Update a product.

    Args:
        client: Authenticated HTTP client
        product_id: Product ID
        updates: Dict of fields to update

    Returns:
        The updated product as a dict
    """
    response = await client.put(f"/products/{product_id}", json=updates)
    assert_status_code(response, 200, f"Failed to update product '{product_id}'")
    return response.json()


async def delete_product(client: AmbrosiaHttpClient, product_id: str) -> None:
    """Delete a product.

    Args:
        client: Authenticated HTTP client
        product_id: Product ID
    """
    response = await client.delete(f"/products/{product_id}")
    assert_status_code(response, 200, f"Failed to delete product '{product_id}'")


async def create_order(
    client: AmbrosiaHttpClient, items: list[dict] = None
) -> dict:
    """Create an order.

    Args:
        client: Authenticated HTTP client
        items: Optional list of order items [{product_id, quantity, ...}]

    Returns:
        The created order as a dict
    """
    payload = {}
    if items:
        payload["items"] = items

    response = await client.post("/orders", json=payload)
    assert_status_code(response, 201, f"Failed to create order")
    return response.json()


async def get_orders(client: AmbrosiaHttpClient) -> list:
    """Get all orders.

    Args:
        client: Authenticated HTTP client

    Returns:
        List of orders
    """
    response = await client.get("/orders")
    assert_status_code(response, 200, "Failed to get orders")
    data = response.json()
    return data if isinstance(data, list) else data.get("orders", data.get("data", []))


async def create_ticket(client: AmbrosiaHttpClient, order_id: str = None) -> dict:
    """Create a payment ticket.

    Args:
        client: Authenticated HTTP client
        order_id: Optional order ID to associate

    Returns:
        The created ticket as a dict
    """
    payload = {}
    if order_id:
        payload["order_id"] = order_id

    response = await client.post("/tickets", json=payload)
    assert_status_code(response, 201, "Failed to create ticket")
    return response.json()


async def create_payment(
    client: AmbrosiaHttpClient,
    amount: float,
    method: str = "cash",
    currency: str = "USD",
) -> dict:
    """Create a payment.

    Args:
        client: Authenticated HTTP client
        amount: Payment amount
        method: Payment method (cash, bitcoin, card)
        currency: Currency code

    Returns:
        The created payment as a dict
    """
    payload = {
        "amount": amount,
        "method": method,
        "currency": currency,
    }

    response = await client.post("/payments", json=payload)
    assert_status_code(response, 201, "Failed to create payment")
    return response.json()


async def link_payment_to_ticket(
    client: AmbrosiaHttpClient, ticket_id: str, payment_id: str
) -> dict:
    """Link a payment to a ticket.

    Args:
        client: Authenticated HTTP client
        ticket_id: Ticket ID
        payment_id: Payment ID

    Returns:
        Response data
    """
    payload = {"payment_id": payment_id}
    response = await client.post(f"/tickets/{ticket_id}/payments", json=payload)
    assert_status_code(response, 200, "Failed to link payment to ticket")
    return response.json()


async def get_payment_methods(client: AmbrosiaHttpClient) -> list:
    """Get available payment methods.

    Args:
        client: Authenticated HTTP client

    Returns:
        List of payment methods
    """
    response = await client.get("/payment-methods")
    assert_status_code(response, 200, "Failed to get payment methods")
    data = response.json()
    return data if isinstance(data, list) else data.get("methods", data.get("data", []))


async def get_currencies(client: AmbrosiaHttpClient) -> list:
    """Get available currencies.

    Args:
        client: Authenticated HTTP client

    Returns:
        List of currencies
    """
    response = await client.get("/currencies")
    assert_status_code(response, 200, "Failed to get currencies")
    data = response.json()
    return data if isinstance(data, list) else data.get("currencies", data.get("data", []))
