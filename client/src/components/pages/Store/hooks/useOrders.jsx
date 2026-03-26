"use client";
import { useState, useEffect, useCallback } from "react";

import { toArray } from "@/components/utils/array";
import { httpClient, parseJsonResponse } from "@/lib/http";

function buildOrdersQueryString(filters = {}) {
  const queryParams = new URLSearchParams();

  const filterEntries = [
    ["start_date", filters.startDate],
    ["end_date", filters.endDate],
    ["status", filters.status],
    ["user_id", filters.userId],
    ["payment_method", filters.paymentMethod],
    ["min_total", filters.minTotal],
    ["max_total", filters.maxTotal],
    ["sort_by", filters.sortBy],
    ["sort_order", filters.sortOrder],
  ];

  filterEntries.forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "") {
      queryParams.set(key, String(value));
    }
  });

  const queryString = queryParams.toString();
  return queryString ? `/orders/with-payments?${queryString}` : "/orders/with-payments";
}

export function useOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOrdersRequest = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);

    try {
      const endpoint = buildOrdersQueryString(filters);
      const ordersResponse = await httpClient(endpoint);
      if (ordersResponse?.ok === false) {
        const errorResponse = await parseJsonResponse(ordersResponse, null);
        throw new Error(errorResponse?.message || "Failed to fetch orders");
      }
      const ordersData = await parseJsonResponse(ordersResponse, []);
      setOrders(toArray(ordersData));
      return toArray(ordersData);
    } catch (error) {
      console.error("Error fetching orders:", error);
      setError(error);
      setOrders([]);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      await fetchOrdersRequest();
    } catch {
      return [];
    }
  }, [fetchOrdersRequest]);

  const fetchOrdersFiltered = useCallback(
    async (filters = {}) => await fetchOrdersRequest(filters),
    [fetchOrdersRequest],
  );

  const createOrder = useCallback(
    async (orderBody) => {
      try {
        const createOrder = await httpClient("/orders", {
          method: "POST",
          body: JSON.stringify(orderBody),
          headers: {
            "Content-Type": "application/json",
          },
        });
        const createdDataOrder = await parseJsonResponse(createOrder, null);
        if (createdDataOrder?.id) {
          setOrders((prev) => (Array.isArray(prev) ? [...prev, createdDataOrder] : [createdDataOrder]),
          );
        }
        return createdDataOrder;
      } catch (error) {
        console.error("Error creating order:", error);
        setError(error);
        throw error;
      }
    },
    [],
  );

  const updateOrder = useCallback(
    async (orderId, orderBody) => {
      if (!orderId) throw new Error("orderId is required");
      try {
        const updateOrder = await httpClient(`/orders/${orderId}`, {
          method: "PUT",
          body: JSON.stringify(orderBody),
          headers: {
            "Content-Type": "application/json",
          },
        });

        const updatedDataOrder = await parseJsonResponse(updateOrder, null);

        if (updatedDataOrder?.id) {
          setOrders((prev) => (Array.isArray(prev)
            ? prev.map((o) => (o.id === orderId ? updatedDataOrder : o))
            : [updatedDataOrder]),
          );
        }
        return updatedDataOrder;
      } catch (error) {
        console.error("Error updating order:", error);
        setError(error);
        throw error;
      }
    },
    [],
  );

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return {
    orders,
    loading,
    error,
    refetch: fetchOrders,
    fetchOrders,
    fetchOrdersFiltered,
    createOrder,
    updateOrder,
  };
}
