"""End-to-end coverage for server-side order filtering and sorting."""

import sqlite3
import uuid
from pathlib import Path

import pytest

from ambrosia.api_utils import assert_status_code
from ambrosia.test_server import AmbrosiaTestServer


async def _get_current_user_id(admin_client) -> str:
    response = await admin_client.get("/users/me")
    assert_status_code(response, 200, "Failed to fetch current user")
    return response.json()["user"]["userId"]


def _seed_order(user_id: str, status: str, total: float, created_at: str) -> str:
    order_id = str(uuid.uuid4())
    database_path = Path(AmbrosiaTestServer.DEFAULT_DATADIR) / "ambrosia.db"
    connection = sqlite3.connect(database_path)
    try:
        connection.execute(
            "INSERT INTO orders (id, user_id, table_id, status, total, created_at, is_deleted) "
            "VALUES (?, ?, NULL, ?, ?, ?, 0)",
            (order_id, user_id, status, total, created_at),
        )
        connection.commit()
    finally:
        connection.close()
    return order_id


@pytest.mark.asyncio
async def test_orders_with_payments_filters_by_paid_status(admin_client):
    user_id = await _get_current_user_id(admin_client)
    paid_order_id = _seed_order(user_id, "paid", 55.0, "2025-01-10T10:00:00")
    _seed_order(user_id, "open", 22.0, "2025-01-11T10:00:00")

    response = await admin_client.get("/orders/with-payments?status=paid")
    assert_status_code(response, 200)

    body = response.json()
    assert isinstance(body, list)
    assert all(order["status"] == "paid" for order in body)
    assert any(order["id"] == paid_order_id for order in body)


@pytest.mark.asyncio
async def test_orders_with_payments_sorts_by_total_ascending(admin_client):
    user_id = await _get_current_user_id(admin_client)
    _seed_order(user_id, "paid", 31.0, "2025-02-01T10:00:00")
    _seed_order(user_id, "paid", 12.0, "2025-02-02T10:00:00")
    _seed_order(user_id, "paid", 25.0, "2025-02-03T10:00:00")

    response = await admin_client.get(
        "/orders/with-payments?sortBy=total&sortOrder=asc"
    )
    assert_status_code(response, 200)

    totals = [order["total"] for order in response.json()]
    assert totals == sorted(totals)


@pytest.mark.asyncio
async def test_orders_with_payments_rejects_invalid_status(admin_client):
    response = await admin_client.get("/orders/with-payments?status=invalid")
    assert_status_code(response, 400)

    body = response.json()
    assert body["message"] == "Invalid status: invalid"
