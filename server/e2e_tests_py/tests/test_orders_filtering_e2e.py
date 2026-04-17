"""End-to-end coverage for server-side order filtering and sorting."""

import pytest

from ambrosia.api_utils import assert_status_code


async def _get_current_user_id(admin_client) -> str:
    response = await admin_client.get("/users/me")
    assert_status_code(response, 200, "Failed to fetch current user")
    return response.json()["user"]["user_id"]


async def _create_order(
    admin_client, user_id: str, status: str, total: float, created_at: str
) -> str:
    payload = {
        "user_id": user_id,
        "table_id": None,
        "status": status,
        "total": total,
        "created_at": created_at,
    }
    response = await admin_client.post("/orders", json=payload)
    assert_status_code(response, 201, f"Failed to create order with status {status}")
    return response.json()["id"]


@pytest.mark.asyncio
async def test_orders_with_payments_filters_by_paid_status(admin_client):
    user_id = await _get_current_user_id(admin_client)
    paid_order_id = await _create_order(
        admin_client, user_id, "paid", 55.0, "2025-01-10T10:00:00"
    )
    await _create_order(admin_client, user_id, "open", 22.0, "2025-01-11T10:00:00")

    response = await admin_client.get("/orders/with-payments?status=paid")
    assert_status_code(response, 200)

    body = response.json()
    assert isinstance(body, list)
    assert all(order["status"] == "paid" for order in body)
    assert any(order["id"] == paid_order_id for order in body)


@pytest.mark.asyncio
async def test_orders_with_payments_sorts_by_total_ascending(admin_client):
    user_id = await _get_current_user_id(admin_client)
    await _create_order(admin_client, user_id, "paid", 31.0, "2025-02-01T10:00:00")
    await _create_order(admin_client, user_id, "paid", 12.0, "2025-02-02T10:00:00")
    await _create_order(admin_client, user_id, "paid", 25.0, "2025-02-03T10:00:00")

    response = await admin_client.get(
        "/orders/with-payments?sort_by=total&sort_order=asc"
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
