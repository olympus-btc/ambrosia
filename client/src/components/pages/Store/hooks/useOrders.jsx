"use client";
import { useState, useEffect, useCallback } from "react";

import { httpClient } from "@/lib/http/httpClient";

export function useOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const ordersResponse = await httpClient("/orders/with-payments");
      const ordersData = await ordersResponse.json();
      const ordersList = Array.isArray(ordersData) ? ordersData : [];
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
        const createOrder = await httpClient("/orders", {
          method: "POST",
          body: JSON.stringify(orderBody),
          headers: {
            "Content-Type": "application/json",
          },
        });
        const createdDataOrder = await createOrder.json();
        if (createdDataOrder?.id) {
          setOrders((prev) => (Array.isArray(prev) ? [...prev, createdDataOrder] : [createdDataOrder]),
          );
        }
        return createdDataOrder;
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
        const updateOrder = await httpClient(`/orders/${orderId}`, {
          method: "PUT",
          body: JSON.stringify(orderBody),
          headers: {
            "Content-Type": "application/json",
          },
        });

        const updatedDataOrder = updateOrder.json();

        if (updatedDataOrder?.id) {
          setOrders((prev) => (Array.isArray(prev)
            ? prev.map((o) => (o.id === orderId ? updatedDataOrder : o))
            : [updatedDataOrder]),
          );
        }
        return updatedDataOrder;
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
