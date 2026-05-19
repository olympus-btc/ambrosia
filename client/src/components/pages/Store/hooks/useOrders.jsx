"use client";
import { useState, useEffect, useCallback } from "react";

import { toArray } from "@/components/utils/array";
import { useFetchList } from "@/lib/http/useFetchList";

function buildOrdersQueryString(filters = {}) {
  const queryParams = new URLSearchParams();

  const filterEntries = [
    ["startDate", filters.startDate],
    ["endDate", filters.endDate],
    ["status", filters.status],
    ["userId", filters.userId],
    ["paymentMethod", filters.paymentMethod],
    ["minTotal", filters.minTotal],
    ["maxTotal", filters.maxTotal],
    ["sortBy", filters.sortBy],
    ["sortOrder", filters.sortOrder],
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
  const { fetchList } = useFetchList();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOrdersRequest = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);

    try {
      const endpoint = buildOrdersQueryString(filters);
      const ordersData = await fetchList(endpoint);
      if (ordersData === null) return null;
      setOrders(toArray(ordersData));
      return toArray(ordersData);
    } catch (err) {
      setError(err);
      setOrders([]);
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchList]);

  const fetchOrders = useCallback(async () => {
    await fetchOrdersRequest();
  }, [fetchOrdersRequest]);

  const fetchOrdersFiltered = useCallback(
    async (filters = {}) => await fetchOrdersRequest(filters),
    [fetchOrdersRequest],
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
  };
}
