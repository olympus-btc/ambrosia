"use client";
import { useCallback, useMemo, useState } from "react";

import { useTranslations } from "next-intl";

import formatDate from "@lib/formatDate";

const DEFAULT_ROWS_PER_PAGE = 10;

export function useOrdersDetailData(orders, formatCurrency) {
  const reportsTranslations = useTranslations("reports");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_ROWS_PER_PAGE);
  const [prevOrders, setPrevOrders] = useState(orders);

  if (prevOrders !== orders) {
    setPrevOrders(orders);
    setPage(1);
  }

  const totalPages = useMemo(() => Math.ceil(orders.length / rowsPerPage), [orders, rowsPerPage]);
  const paginatedOrders = useMemo(
    () => orders.slice((page - 1) * rowsPerPage, page * rowsPerPage),
    [orders, page, rowsPerPage],
  );

  const handleRowsPerPageChange = useCallback((newRowsPerPage) => {
    setRowsPerPage(newRowsPerPage);
    setPage(1);
  }, []);

  const exportToCsv = useCallback(() => {
    if (!orders.length) return;
    const headers = [
      reportsTranslations("orders.shortId"), reportsTranslations("sales.date"), reportsTranslations("sales.user"),
      reportsTranslations("orders.products"), reportsTranslations("sales.quantity"), reportsTranslations("sales.total"), reportsTranslations("sales.paymentMethod"),
    ];
    const rows = orders.map((order) => [
      order.shortId,
      order.date ? formatDate(order.date) : "",
      order.userName ?? "",
      order.items.map((item) => `${item.productName} x${item.quantity}`).join("; "),
      order.itemCount,
      formatCurrency(order.total),
      order.paymentMethod ?? "",
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `orders-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [orders, formatCurrency, reportsTranslations]);

  return { paginatedOrders, totalPages, page, setPage, rowsPerPage, handleRowsPerPageChange, exportToCsv };
}
