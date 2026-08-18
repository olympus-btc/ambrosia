"use client";
import { useCallback, useMemo, useState } from "react";

import { addToast } from "@heroui/react";
import { useTranslations } from "next-intl";

import formatDate from "@lib/formatDate";

import { downloadCsv } from "../utils/downloadCsv";
import { formatLocalDateStamp } from "../utils/formatLocalDateStamp";
import { refundedToStatus } from "../utils/refundedToStatus";

const DEFAULT_ROWS_PER_PAGE = 10;

export function useSalesData(sales, formatCurrency) {
  const reportsTranslations = useTranslations("reports");
  const statusTranslations = useTranslations();
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_ROWS_PER_PAGE);
  const [prevSales, setPrevSales] = useState(sales);

  if (prevSales !== sales) {
    setPrevSales(sales);
    setPage(1);
  }

  const totalPages = useMemo(() => Math.ceil(sales.length / rowsPerPage), [sales, rowsPerPage]);
  const paginatedSales = useMemo(
    () => sales.slice((page - 1) * rowsPerPage, page * rowsPerPage),
    [sales, page, rowsPerPage],
  );

  const handleRowsPerPageChange = useCallback((newRowsPerPage) => {
    setRowsPerPage(newRowsPerPage);
    setPage(1);
  }, []);

  const exportToCsv = useCallback(() => {
    if (!sales.length) return;
    try {
      const headers = [
        reportsTranslations("sales.product"), reportsTranslations("sales.user"), reportsTranslations("sales.quantity"),
        reportsTranslations("sales.price"), reportsTranslations("sales.total"), reportsTranslations("sales.paymentMethod"), reportsTranslations("sales.date"),
        reportsTranslations("orders.statusLabel"),
      ];
      const rows = sales.map((sale) => [
        sale.productName,
        sale.userName ?? "",
        sale.quantity,
        formatCurrency(sale.priceAtOrder),
        formatCurrency(sale.priceAtOrder * sale.quantity),
        sale.paymentMethod ?? "",
        sale.saleDate ? formatDate(sale.saleDate) : "",
        statusTranslations(`status.${refundedToStatus(sale.refunded)}`),
      ]);

      const totalRevenue = sales.reduce((sum, sale) => sum + sale.priceAtOrder * sale.quantity, 0);
      const totalRefunded = sales
        .filter((sale) => sale.refunded)
        .reduce((sum, sale) => sum + sale.priceAtOrder * sale.quantity, 0);
      const summaryRows = [
        [],
        [reportsTranslations("summary.revenue"), formatCurrency(totalRevenue)],
        [reportsTranslations("summary.netRevenue"), formatCurrency(totalRevenue - totalRefunded)],
        [reportsTranslations("summary.totalRefunded"), formatCurrency(totalRefunded)],
      ];

      const csv = [headers, ...rows, ...summaryRows]
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
        .join("\n");
      downloadCsv(csv, `sales-report-${formatLocalDateStamp()}.csv`);
    } catch {
      addToast({ color: "danger", description: reportsTranslations("export.error") });
    }
  }, [sales, formatCurrency, reportsTranslations, statusTranslations]);

  return { paginatedSales, totalPages, page, setPage, rowsPerPage, handleRowsPerPageChange, exportToCsv };
}
