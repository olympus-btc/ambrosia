"use client";
import { Card, CardBody } from "@heroui/react";
import { AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";

import { PageHeader } from "@components/shared/PageHeader";

import { AnalyticsCard } from "./Charts";
import { FiltersCard } from "./Filters";
import { useReports } from "./hooks/useReports";
import { SalesDetailCard } from "./Sales";
import { ReportSkeleton, SummaryCard } from "./Summary";

export default function Reports() {
  const t = useTranslations("reports");
  const {
    reportData, error, filters,
    currencyLoading, formatCurrency,
    sales, paginatedSales, totalPages, page, setPage, rowsPerPage,
    totalRevenue, totalItems,
    revenueByDay, topProducts, paymentMethodSplit,
    handleFilters, handleRowsPerPageChange, exportToCsv,
  } = useReports();

  if (currencyLoading && !reportData) return <ReportSkeleton />;

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      <PageHeader title={t("header.title")} subtitle={t("header.subtitle")} />

      {error && (
        <Card className="bg-red-50 border-red-200">
          <CardBody>
            <div className="flex items-center space-x-2">
              <AlertCircle aria-hidden="true" className="w-5 h-5 text-red-600" />
              <p className="text-red-600 font-semibold">{t("statuses.errorGenerate")}</p>
            </div>
          </CardBody>
        </Card>
      )}

      <FiltersCard filters={filters} onFiltersChange={handleFilters} disabled={currencyLoading} />

      {reportData && (revenueByDay.length > 0 || topProducts.length > 0) && (
        <>
          <PageHeader title={t("charts.title")} subtitle={t("charts.subtitle")} />
          <AnalyticsCard
            revenueByDay={revenueByDay}
            topProducts={topProducts}
            paymentMethodSplit={paymentMethodSplit}
            formatCurrency={formatCurrency}
          />
        </>
      )}

      {reportData && (
        <>
          <PageHeader title={t("summary.title")} subtitle={t("summary.subtitle")} />
          <SummaryCard totalRevenue={totalRevenue} totalItems={totalItems} formatCurrency={formatCurrency} />

          <PageHeader title={t("sales.title")} subtitle={t("sales.subtitle")} />
          <SalesDetailCard
            sales={sales}
            paginatedSales={paginatedSales}
            formatCurrency={formatCurrency}
            totalPages={totalPages}
            page={page}
            setPage={setPage}
            rowsPerPage={rowsPerPage}
            handleRowsPerPageChange={handleRowsPerPageChange}
            exportToCsv={exportToCsv}
          />
        </>
      )}

    </div>
  );
}
