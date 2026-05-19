"use client";
import { Card, CardBody, CardHeader, Pagination } from "@heroui/react";
import { AlertCircle, DollarSign, Download, ShoppingCart, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";

import { PaymentMethodPieChart, RevenueAreaChart, TopProductsBarChart } from "./Charts";
import { DateRangeCard } from "./Filters";
import { useReports } from "./hooks/useReports";
import { SalesList } from "./Sales";
import { ReportSkeleton, SummaryStat } from "./Summary";

const ROWS_PER_PAGE_OPTIONS = [5, 10, 20, 50];

export function StoreReports() {
  const {
    reportData, error, filters,
    currencyLoading, formatCurrency,
    sales, paginatedSales, totalPages, page, setPage, rowsPerPage,
    totalRevenue, totalItems,
    revenueByDay, topProducts, paymentMethodSplit,
    handleFilters, handleRowsPerPageChange, exportToCsv,
  } = useReports();
  const t = useTranslations("reports");

  if (currencyLoading && !reportData) {
    return <ReportSkeleton />;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {error && (
        <Card className="bg-red-50 border-red-200">
          <CardBody>
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <p className="text-red-600 font-semibold">{t("statuses.errorGenerate")}</p>
            </div>
          </CardBody>
        </Card>
      )}

      <Card shadow="none" className="shadow-lg bg-white rounded-lg p-4 lg:p-8">
        <CardBody>
          <DateRangeCard
            filters={filters}
            onFiltersChange={handleFilters}
            disabled={currencyLoading}
          />
        </CardBody>
      </Card>

      {reportData && (
        <div className="space-y-6">
          {(revenueByDay.length > 0 || topProducts.length > 0) && (
            <Card shadow="none" className="shadow-lg bg-white rounded-lg p-4 lg:p-8">
              <CardHeader>
                <h3 className="text-lg font-bold text-deep flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2" />
                  {t("charts.title")}
                </h3>
              </CardHeader>
              <CardBody className="space-y-8">
                <RevenueAreaChart dailyRevenue={revenueByDay} formatCurrency={formatCurrency} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <TopProductsBarChart products={topProducts} formatCurrency={formatCurrency} />
                  <PaymentMethodPieChart paymentMethods={paymentMethodSplit} formatCurrency={formatCurrency} />
                </div>
              </CardBody>
            </Card>
          )}

          <Card className="shadow-lg border-0 bg-white">
            <CardHeader>
              <h3 className="text-lg font-bold text-deep flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                {t("summary.title")}
              </h3>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SummaryStat
                  icon={<DollarSign className="w-6 h-6 text-green-600" />}
                  label={t("summary.revenue")}
                  value={formatCurrency(totalRevenue)}
                  tone={{
                    bg: "bg-green-50",
                    border: "border-green-200",
                    iconBg: "bg-green-100",
                    text: "text-green-700",
                    value: "text-green-900",
                  }}
                />
                <SummaryStat
                  icon={<ShoppingCart className="w-6 h-6 text-purple-600" />}
                  label={t("summary.items")}
                  value={totalItems}
                  tone={{
                    bg: "bg-purple-50",
                    border: "border-purple-200",
                    iconBg: "bg-purple-100",
                    text: "text-purple-700",
                    value: "text-purple-900",
                  }}
                />
              </div>
            </CardBody>
          </Card>

          <Card shadow="none" className="shadow-lg bg-white rounded-lg p-4 lg:p-8">
            <CardHeader className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-deep flex items-center">
                <ShoppingCart className="w-5 h-5 mr-2" />
                {t("sales.title")}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={exportToCsv}
                  disabled={!sales.length}
                  className="flex items-center gap-1.5 text-sm border border-gray-200 rounded-lg px-2 py-1 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Download className="w-3.5 h-3.5" />
                  {t("sales.export")}
                </button>
                <select
                  className="text-sm border border-gray-200 rounded-lg px-2 py-1 text-gray-700"
                  value={rowsPerPage}
                  onChange={(e) => handleRowsPerPageChange(parseInt(e.target.value, 10))}
                >
                  {ROWS_PER_PAGE_OPTIONS.map((pageSize) => (
                    <option key={pageSize} value={pageSize}>{pageSize}</option>
                  ))}
                </select>
              </div>
            </CardHeader>
            <CardBody>
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
                  />
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}

    </div>
  );
}
