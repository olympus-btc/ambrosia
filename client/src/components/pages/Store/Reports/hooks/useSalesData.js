"use client";
import { useCallback, useMemo, useState } from "react";

import { useTranslations } from "next-intl";

import formatDate from "@lib/formatDate";

const DEFAULT_ROWS_PER_PAGE = 10;

export function useSalesData(sales, formatCurrency) {
  const t = useTranslations("reports");
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
    const headers = [
      t("sales.product"), t("sales.user"), t("sales.quantity"),
      t("sales.price"), t("sales.total"), t("sales.paymentMethod"), t("sales.date"),
    ];
    const rows = sales.map((sale) => [
      sale.productName,
      sale.userName ?? "",
      sale.quantity,
      formatCurrency(sale.priceAtOrder),
      formatCurrency(sale.priceAtOrder * sale.quantity),
      sale.paymentMethod ?? "",
      sale.saleDate ? formatDate(sale.saleDate) : "",
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `sales-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [sales, formatCurrency, t]);

  return { paginatedSales, totalPages, page, setPage, rowsPerPage, handleRowsPerPageChange, exportToCsv };
}
