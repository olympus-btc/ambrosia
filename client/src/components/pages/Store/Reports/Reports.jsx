"use client";
import { useCallback, useMemo, useState, useTransition } from "react";

import { Card, CardBody, Tab, Tabs } from "@heroui/react";
import { AlertCircle, Loader2, Package, ShoppingCart } from "lucide-react";
import { useTranslations } from "next-intl";

import { useBitcoinPrice } from "@/components/hooks/useBitcoinPrice";
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
  const reportsTranslations = useTranslations("reports");
  const { fetchReport, reportData, error, loading: reportsLoading } = useReports();
  const { filters, handleFilters } = useFiltersState(fetchReport);
  const { formatAmount, loading: currencyLoading, currency } = useCurrency();
  const { currentRate } = useBitcoinPrice({ currencyAcronym: currency?.acronym });
  const formatCurrency = useCallback((cents) => formatAmount(cents), [formatAmount]);
  const [activeTab, setActiveTab] = useState("orders");
  const [pendingTab, setPendingTab] = useState(null);
  const [isPending, startTransition] = useTransition();

  const sales = useMemo(() => reportData?.sales ?? [], [reportData]);
  const orders = useOrdersData(sales);

  const { totalRevenue: ordersRevenue, orderCount, averageTicket, avgItemsPerOrder } = useOrdersSummaryData(reportData, orders);
  const { totalRevenue: productsRevenue, totalItems, productLines, uniqueProducts } = useSummaryData(reportData);

  const orderStats = useMemo(() => [
    { label: reportsTranslations("summary.revenue"), value: formatCurrency(ordersRevenue) },
    { label: reportsTranslations("summary.orderCount"), value: orderCount },
    { label: reportsTranslations("summary.averageTicket"), value: formatCurrency(averageTicket) },
    { label: reportsTranslations("summary.avgItemsPerOrder"), value: avgItemsPerOrder },
  ], [reportsTranslations, ordersRevenue, orderCount, averageTicket, avgItemsPerOrder, formatCurrency]);

  const totalBtcSatoshis = reportData?.totalBtcSatoshis ?? 0;

  const productStats = useMemo(() => {
    const stats = [
      { label: reportsTranslations("summary.revenue"), value: formatCurrency(productsRevenue) },
      { label: reportsTranslations("summary.items"), value: totalItems },
      { label: reportsTranslations("summary.productLines"), value: productLines },
      { label: reportsTranslations("summary.uniqueProducts"), value: uniqueProducts },
    ];
    if (totalBtcSatoshis > 0) {
      stats.push({
        label: reportsTranslations("summary.totalBtcSatoshis"),
        value: `${totalBtcSatoshis.toLocaleString()} sats`,
      });
    }
    return stats;
  }, [reportsTranslations, productsRevenue, totalItems, productLines, uniqueProducts, formatCurrency, totalBtcSatoshis]);

  if ((reportsLoading || currencyLoading) && !reportData) return <ReportSkeleton />;

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      <PageHeader
        title={reportsTranslations("header.title")}
        subtitle={reportsTranslations("header.subtitle")}
        actions={(
          <div className="flex items-center gap-3">
            <div className={isPending ? "pointer-events-none" : ""}>
              <Tabs
                selectedKey={activeTab}
                onSelectionChange={(key) => {
                  setPendingTab(key);
                  startTransition(() => setActiveTab(key));
                }}
                aria-label={reportsTranslations("header.title")}
                variant="solid"
                classNames={{
                  base: "bg-white rounded-xl p-1 shadow-sm",
                  tabList: "gap-0 bg-transparent p-0",
                  cursor: "bg-forest shadow-none rounded-lg",
                  tab: "px-4 py-2 h-auto rounded-lg data-[hover=true]:bg-forest/10",
                  tabContent: "group-data-[selected=true]:text-white text-gray-500 group-data-[hover=true]:text-forest text-sm font-medium",
                  panel: "hidden",
                }}
              >
                {[
                  { key: "orders", label: reportsTranslations("tabs.orders"), icon: <ShoppingCart aria-hidden="true" className="w-4 h-4" /> },
                  { key: "products", label: reportsTranslations("tabs.products"), icon: <Package aria-hidden="true" className="w-4 h-4" /> },
                ].map(({ key, label, icon }) => (
                  <Tab
                    key={key}
                    title={(
                      <div className="flex items-center gap-2">
                        {isPending && pendingTab === key
                          ? <Loader2 aria-hidden="true" className="w-4 h-4 animate-spin" />
                          : icon}
                        <span className="hidden sm:inline">{label}</span>
                      </div>
                    )}
                  />
                ))}
              </Tabs>
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
              <p className="text-red-600 font-semibold">{reportsTranslations("statuses.errorGenerate")}</p>
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
              <OrdersDetailCard
                orders={orders}
                formatCurrency={formatCurrency}
                disabled={currencyLoading}
                currentRate={currentRate}
              />
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
                disabled={currencyLoading}
                currentRate={currentRate}
              />
            </div>
          )}
        </div>
      )}

    </div>
  );
}
