"use client";
import { useCallback, useMemo, useState, useTransition } from "react";

import { Card, CardBody } from "@heroui/react";
import { AlertCircle, Loader2, Package, ShoppingCart } from "lucide-react";
import { useTranslations } from "next-intl";

import { useCurrency } from "@/components/hooks/useCurrency";
import { PageHeader } from "@components/shared/PageHeader";

import { AnalyticsCard, OrdersAnalyticsCard } from "./Charts";
import { PeriodFilter } from "./Filters";
import { useFiltersState } from "./hooks/useFilters";
import { useOrdersData } from "./hooks/useOrdersData";
import { useOrdersSummaryData } from "./hooks/useOrdersSummaryData";
import { useReports } from "./hooks/useReports";
import { useSummaryData } from "./hooks/useSummaryData";
import { OrdersDetailCard } from "./Orders";
import { SalesDetailCard } from "./Sales";
import { ReportSkeleton, SummaryCard } from "./Summary";

export default function Reports() {
  const t = useTranslations("reports");
  const { fetchReport, reportData, error } = useReports();
  const { filters, handleFilters } = useFiltersState(fetchReport);
  const { formatAmount, loading: currencyLoading } = useCurrency();
  const formatCurrency = useCallback((cents) => formatAmount(cents), [formatAmount]);
  const [activeTab, setActiveTab] = useState("orders");
  const [pendingTab, setPendingTab] = useState(null);
  const [isPending, startTransition] = useTransition();

  const sales = useMemo(() => reportData?.sales ?? [], [reportData]);
  const orders = useOrdersData(sales);

  const { totalRevenue: ordersRevenue, orderCount, averageTicket, avgItemsPerOrder } = useOrdersSummaryData(reportData, orders);
  const { totalRevenue: productsRevenue, totalItems, productLines, uniqueProducts } = useSummaryData(reportData);

  const orderStats = useMemo(() => [
    { label: t("summary.revenue"), value: formatCurrency(ordersRevenue) },
    { label: t("summary.orderCount"), value: orderCount },
    { label: t("summary.averageTicket"), value: formatCurrency(averageTicket) },
    { label: t("summary.avgItemsPerOrder"), value: avgItemsPerOrder },
  ], [t, ordersRevenue, orderCount, averageTicket, avgItemsPerOrder, formatCurrency]);

  const productStats = useMemo(() => [
    { label: t("summary.revenue"), value: formatCurrency(productsRevenue) },
    { label: t("summary.items"), value: totalItems },
    { label: t("summary.productLines"), value: productLines },
    { label: t("summary.uniqueProducts"), value: uniqueProducts },
  ], [t, productsRevenue, totalItems, productLines, uniqueProducts, formatCurrency]);

  if (currencyLoading && !reportData) return <ReportSkeleton />;

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      <PageHeader
        title={t("header.title")}
        subtitle={t("header.subtitle")}
        actions={(
          <div className="flex items-center gap-3">
            <div className="flex bg-white rounded-xl p-1 shadow-sm" role="tablist" aria-label={t("header.title")}>
              {[
                { key: "orders", label: t("tabs.orders"), icon: <ShoppingCart aria-hidden="true" className="w-4 h-4" /> },
                { key: "products", label: t("tabs.products"), icon: <Package aria-hidden="true" className="w-4 h-4" /> },
              ].map(({ key, label, icon }) => (
                <button
                  key={key}
                  role="tab"
                  aria-selected={activeTab === key}
                  disabled={isPending}
                  onClick={() => {
                    setPendingTab(key);
                    startTransition(() => setActiveTab(key));
                  }}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === key
                      ? "bg-forest text-white"
                      : "text-gray-500 hover:text-forest hover:bg-forest/10"
                  }`}
                >
                  {isPending && pendingTab === key
                    ? <Loader2 aria-hidden="true" className="w-4 h-4 animate-spin" />
                    : icon}
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
            <PeriodFilter
              filters={filters}
              onFiltersChange={handleFilters}
              disabled={currencyLoading}
            />
          </div>
        )}
      />

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

      {reportData && (
        <div role="tabpanel">
          {activeTab === "orders" && (
            <div className="space-y-6">
              <SummaryCard stats={orderStats} />
              {orders.length > 0 && (
                <OrdersAnalyticsCard sales={sales} orders={orders} formatCurrency={formatCurrency} />
              )}
              <OrdersDetailCard orders={orders} formatCurrency={formatCurrency} />
            </div>
          )}
          {activeTab === "products" && (
            <div className="space-y-6">
              <SummaryCard stats={productStats} />
              {sales.length > 0 && (
                <AnalyticsCard sales={sales} formatCurrency={formatCurrency} />
              )}
              <SalesDetailCard
                sales={sales}
                formatCurrency={formatCurrency}
                filters={filters}
                onFiltersChange={handleFilters}
                disabled={currencyLoading}
              />
            </div>
          )}
        </div>
      )}

    </div>
  );
}
