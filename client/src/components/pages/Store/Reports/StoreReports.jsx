"use client";
import { useCallback } from "react";

import { Card, CardBody, CardHeader } from "@heroui/react";
import { AlertCircle, DollarSign, ShoppingCart, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";

import { useCurrency } from "@/components/hooks/useCurrency";

import { DateRangeCard } from "./Filters";
import { SalesTable } from "./Sales";
import { ReportSkeleton, ReportsHeader, SummaryStat } from "./Summary";
import { useReports } from "./hooks/useReports";

export function StoreReports() {
  const { reportData, loading, error, filters, totalRevenue, totalItems, handleFiltersChange, generateReport } =
    useReports();
  const { formatAmount, loading: currencyLoading } = useCurrency();
  const t = useTranslations("reports");
  const formatCurrency = useCallback((cents) => formatAmount(cents), [formatAmount]);

  if (currencyLoading && !reportData) {
    return <ReportSkeleton />;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      <ReportsHeader
        onBack={() => window.history.back()}
        onRefresh={generateReport}
        loading={loading}
      />

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

      <DateRangeCard
        filters={filters}
        onFiltersChange={handleFiltersChange}
        disabled={currencyLoading}
      />

      {reportData && (
        <div className="space-y-6">
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

          <Card className="shadow-lg border-0 bg-white">
            <CardHeader>
              <h3 className="text-lg font-bold text-deep flex items-center">
                <ShoppingCart className="w-5 h-5 mr-2" />
                {t("sales.title")}
              </h3>
            </CardHeader>
            <CardBody>
              <SalesTable sales={reportData.sales} formatCurrency={formatCurrency} />
            </CardBody>
          </Card>
        </div>
      )}

    </div>
  );
}
