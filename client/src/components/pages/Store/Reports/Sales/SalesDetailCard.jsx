"use client";
import { Card, CardBody, Pagination } from "@heroui/react";
import { Download } from "lucide-react";
import { useTranslations } from "next-intl";

import { useSalesData } from "../hooks/useSalesData";

import { SalesList } from "./SalesList";

const ROWS_PER_PAGE_OPTIONS = [5, 10, 20, 50];

export function SalesDetailCard({ sales, formatCurrency }) {
  const t = useTranslations("reports");
  const { paginatedSales, totalPages, page, setPage, rowsPerPage, handleRowsPerPageChange, exportToCsv } =
    useSalesData(sales, formatCurrency);
  return (
    <Card shadow="none" className="shadow-lg bg-white rounded-lg p-4 lg:p-8">
      <CardBody className="space-y-4">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={exportToCsv}
            disabled={!sales.length}
            className="flex items-center gap-1.5 text-sm border border-gray-200 rounded-lg px-2 py-1 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download aria-hidden="true" className="w-3.5 h-3.5" />
            {t("sales.export")}
          </button>
          <select
            aria-label={t("sales.rowsPerPage")}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1 text-gray-700"
            value={rowsPerPage}
            onChange={(e) => handleRowsPerPageChange(parseInt(e.target.value, 10))}
          >
            {ROWS_PER_PAGE_OPTIONS.map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>
        <SalesList sales={paginatedSales} formatCurrency={formatCurrency} />
        {totalPages > 1 && (
          <div className="flex justify-center mt-6">
            <Pagination
              total={totalPages}
              page={page}
              onChange={setPage}
              color="primary"
              showControls
              showShadow
              aria-label={t("sales.paginationAria")}
            />
          </div>
        )}
      </CardBody>
    </Card>
  );
}
