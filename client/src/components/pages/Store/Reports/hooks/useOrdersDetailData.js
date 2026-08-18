"use client";
import { useCallback, useMemo, useState } from "react";

import { addToast } from "@heroui/react";
import { useTranslations } from "next-intl";

import formatDate from "@lib/formatDate";

import { downloadCsv } from "../utils/downloadCsv";
import { formatLocalDateStamp } from "../utils/formatLocalDateStamp";
import { refundedToStatus } from "../utils/refundedToStatus";

const DEFAULT_ROWS_PER_PAGE = 10;

export function useOrdersDetailData(orders, formatCurrency) {
  const reportsTranslations = useTranslations("reports");
  const statusTranslations = useTranslations();
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
    try {
      const headers = [
        reportsTranslations("orders.shortId"), reportsTranslations("sales.date"), reportsTranslations("sales.user"),
        reportsTranslations("orders.products"), reportsTranslations("sales.quantity"), reportsTranslations("sales.total"), reportsTranslations("sales.paymentMethod"),
        reportsTranslations("orders.statusLabel"),
      ];
      const rows = orders.map((order) => [
        order.shortId,
        order.date ? formatDate(order.date) : "",
        order.userName ?? "",
        order.items.map((item) => `${item.productName} x${item.quantity}`).join("; "),
        order.itemCount,
        formatCurrency(order.total),
        order.paymentMethod ?? "",
        statusTranslations(`status.${refundedToStatus(order.refunded)}`),
      ]);

      const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
      const totalRefunded = orders.filter((order) => order.refunded).reduce((sum, order) => sum + order.total, 0);
      const summaryRows = [
        [],
        [reportsTranslations("summary.revenue"), formatCurrency(totalRevenue)],
        [reportsTranslations("summary.netRevenue"), formatCurrency(totalRevenue - totalRefunded)],
        [reportsTranslations("summary.totalRefunded"), formatCurrency(totalRefunded)],
      ];

      const csv = [headers, ...rows, ...summaryRows]
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
        .join("\n");
      downloadCsv(csv, `orders-report-${formatLocalDateStamp()}.csv`);
    } catch {
      addToast({ color: "danger", description: reportsTranslations("export.error") });
    }
  }, [orders, formatCurrency, reportsTranslations, statusTranslations]);

  return { paginatedOrders, totalPages, page, setPage, rowsPerPage, handleRowsPerPageChange, exportToCsv };
}
