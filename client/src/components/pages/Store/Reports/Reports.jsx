"use client";
import { useCallback, useMemo } from "react";

import { Card, CardBody } from "@heroui/react";
import { AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";

import { useCurrency } from "@/components/hooks/useCurrency";
import { PageHeader } from "@components/shared/PageHeader";

import { AnalyticsCard } from "./Charts";
import { FiltersCard } from "./Filters";
import { useFiltersState } from "./hooks/useFilters";
import { useReports } from "./hooks/useReports";
import { SalesDetailCard } from "./Sales";
import { ReportSkeleton, SummaryCard } from "./Summary";

export default function Reports() {
  const t = useTranslations("reports");
  const { fetchReport, reportData, error } = useReports();
  const { filters, handleFilters } = useFiltersState(fetchReport);
  const { formatAmount, loading: currencyLoading } = useCurrency();
  const formatCurrency = useCallback((cents) => formatAmount(cents), [formatAmount]);
  const sales = useMemo(() => reportData?.sales ?? [], [reportData]);

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

      {reportData && sales.length > 0 && (
        <>
          <PageHeader title={t("charts.title")} subtitle={t("charts.subtitle")} />
          <AnalyticsCard sales={sales} formatCurrency={formatCurrency} />
        </>
      )}

      {reportData && (
        <>
          <PageHeader title={t("summary.title")} subtitle={t("summary.subtitle")} />
          <SummaryCard reportData={reportData} formatCurrency={formatCurrency} />

          <PageHeader title={t("sales.title")} subtitle={t("sales.subtitle")} />
          <SalesDetailCard sales={sales} formatCurrency={formatCurrency} />
        </>
      )}

    </div>
  );
}
