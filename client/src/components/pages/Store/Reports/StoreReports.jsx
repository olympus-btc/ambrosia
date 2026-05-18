"use client";
import { useCallback, useState } from "react";

import { Card, CardBody, CardHeader, Pagination } from "@heroui/react";
import { AlertCircle, DollarSign, ShoppingCart, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";

import { useCurrency } from "@/components/hooks/useCurrency";

import { PaymentMethodPieChart, RevenueAreaChart, TopProductsBarChart } from "./Charts";
import { DateRangeCard } from "./Filters";
import { useReports } from "./hooks/useReports";
import { SalesList } from "./Sales";
import { ReportSkeleton, SummaryStat } from "./Summary";

const ROWS_PER_PAGE_OPTIONS = [5, 10, 20, 50];
const DEFAULT_ROWS_PER_PAGE = 10;

export function StoreReports() {
  const { reportData, error, filters, totalRevenue, totalItems, revenueByDay, topProducts, paymentMethodSplit, handleFiltersChange } =
    useReports();
  const { formatAmount, loading: currencyLoading } = useCurrency();
  const t = useTranslations("reports");
  const formatCurrency = useCallback((cents) => formatAmount(cents), [formatAmount]);

  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_ROWS_PER_PAGE);

  const sales = reportData?.sales ?? [];
  const totalPages = Math.ceil(sales.length / rowsPerPage);
  const paginatedSales = sales.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const handleFilters = useCallback(
    (patch) => {
      handleFiltersChange(patch);
      setPage(1);
    },
    [handleFiltersChange],
  );

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
              <select
                className="text-sm border border-gray-200 rounded-lg px-2 py-1 text-gray-700"
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setPage(1);
                }}
              >
                {ROWS_PER_PAGE_OPTIONS.map((pageSize) => (
                  <option key={pageSize} value={pageSize}>{pageSize}</option>
                ))}
              </select>
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
