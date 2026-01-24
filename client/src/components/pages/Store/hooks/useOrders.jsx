"use client";
import { useState, useEffect, useCallback } from "react";

import { apiClient } from "@/services/apiClient";

export function useOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const ordersResponse = await apiClient("/orders/with-payments");
      const ordersList = Array.isArray(ordersResponse) ? ordersResponse : [];
      setOrders(ordersList);
    } catch (err) {
      console.error("Error fetching orders:", err);
      setError(err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const createOrder = useCallback(
    async (orderBody) => {
      try {
        const created = await apiClient("/orders", {
          method: "POST",
          body: orderBody,
        });
        if (created?.id) {
          setOrders((prev) => (Array.isArray(prev) ? [...prev, created] : [created]),
          );
        }
        return created;
      } catch (err) {
        console.error("Error creating order:", err);
        setError(err);
        throw err;
      }
    },
    [],
  );

  const updateOrder = useCallback(
    async (orderId, orderBody) => {
      if (!orderId) throw new Error("orderId is required");
      try {
        const updated = await apiClient(`/orders/${orderId}`, {
          method: "PUT",
          body: orderBody,
        });
        if (updated?.id) {
          setOrders((prev) => (Array.isArray(prev)
            ? prev.map((o) => (o.id === orderId ? updated : o))
            : [updated]),
          );
        }
        return updated;
      } catch (err) {
        console.error("Error updating order:", err);
        setError(err);
        throw err;
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
