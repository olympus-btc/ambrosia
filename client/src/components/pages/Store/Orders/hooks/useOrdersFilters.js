"use client";

import { useMemo, useState } from "react";

import { useOrders } from "../../hooks/useOrders";

const DEFAULT_FILTERS = {
  startDate: null,
  endDate: null,
  status: null,
  userId: null,
  paymentMethod: null,
  minTotal: null,
  maxTotal: null,
  sortBy: "date",
  sortOrder: "desc",
};

export function useOrdersFilters() {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const { orders, fetchOrders, fetchOrdersFiltered } = useOrders();

  const filteredOrders = useMemo(
    () => orders.filter((order) => {
      const normalizedSearch = searchTerm.toLowerCase();
      return (
        searchTerm === "" ||
        order.id.toLowerCase().includes(normalizedSearch) ||
        order.userName?.toLowerCase().includes(normalizedSearch) ||
        order.tableId?.toLowerCase().includes(normalizedSearch)
      );
    }),
    [orders, searchTerm],
  );

  const handleFiltersChange = (partialFilters) => {
    setFilters((currentFilters) => ({
      ...currentFilters,
      ...partialFilters,
    }));
  };

  const handleApplyFilters = async () => {
    await fetchOrdersFiltered(filters);
    setPage(1);
  };

  const handleClearFilters = async () => {
    setFilters(DEFAULT_FILTERS);
    await fetchOrders();
    setPage(1);
  };

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setPage(1);
  };

  const handleRowsPerPageChange = (value) => {
    setRowsPerPage(parseInt(value, 10));
    setPage(1);
  };

  const totalPages = Math.ceil(filteredOrders.length / rowsPerPage);
  const startIndex = (page - 1) * rowsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + rowsPerPage);

  return {
    filteredOrders,
    paginatedOrders,
    page,
    setPage,
    totalPages,
    filters,
    fetchOrdersFiltered,
    search: { term: searchTerm, onChange: handleSearchChange },
    pagination: { rowsPerPage, onChange: handleRowsPerPageChange },
    onFiltersChange: handleFiltersChange,
    onApplyFilters: handleApplyFilters,
    onClearFilters: handleClearFilters,
  };
}
