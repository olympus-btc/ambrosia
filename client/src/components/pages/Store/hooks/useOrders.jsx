"use client";
import { useState, useEffect, useCallback } from "react";

import { toArray } from "@/components/utils/array";
import { httpClient } from "@/lib/http/httpClient";
import { parseJsonResponse } from "@/lib/http/parseJsonResponse";

export function useOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const ordersResponse = await httpClient("/orders/with-payments");
      const ordersData = await parseJsonResponse(ordersResponse, []);
      setOrders(toArray(ordersData));
    } catch (error) {
      console.error("Error fetching orders:", error);
      setError(error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

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
    createOrder,
    updateOrder,
  };
}
