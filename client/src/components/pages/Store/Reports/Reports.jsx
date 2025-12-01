"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TrendingUp, DollarSign, Receipt, PieChart, Lock, AlertCircle, Calendar } from "lucide-react";
import { Card, CardBody, CardHeader, addToast } from "@heroui/react";
import { useTranslations } from "next-intl";
import { StoreLayout } from "../StoreLayout";
import { ReportsHeader } from "./components/ReportsHeader";
import { DateRangeCard } from "./components/DateRangeCard";
import { SummaryStat } from "./components/SummaryStat";
import { DayReport } from "./components/DayReport";
import { ReportSkeleton } from "./components/ReportSkeleton";
import { CloseTurnModal } from "./components/CloseTurnModal";
import { useCurrency } from "@/components/hooks/useCurrency";
import { useReports } from "./hooks/useReports";
import { useTurn } from "@/modules/cashier/useTurn";

const todayISO = () => new Date().toISOString().split("T")[0];

export default function Reports() {
  const router = useRouter();
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [reportData, setReportData] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [showCloseTurnModal, setShowCloseTurnModal] = useState(false);
  const { formatAmount, loading: currencyLoading } = useCurrency();
  const { loading: reportsLoading, error: reportsError, loadData, generateReportFromData } = useReports();
  const displayError = error || reportsError;
  const { closeShift } = useTurn();
  const [closingTurn, setClosingTurn] = useState(false);
  const t = useTranslations("reports");

  const formatDate = useCallback((dateString) => {
    const [year, month, day] = dateString.split("-");
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "UTC",
    });
  }, []);

  const formatCurrency = useCallback(
    (amount) => {
      const numeric = Number(amount);
      if (!Number.isFinite(numeric)) return amount;
      return formatAmount(Math.round(numeric * 100));
    },
    [formatAmount],
  );

  const showError = useCallback(
    (message) => {
      setError(message);
      addToast({
        title: t("statuses.errorTitle"),
        description: message,
        variant: "solid",
        color: "danger",
      });
    },
    [t],
  );

  const validateRange = useCallback(() => {
    if (!startDate || !endDate) {
      showError(t("errors.bothDates"));
      return false;
    }
    if (new Date(startDate) > new Date(endDate)) {
      showError(t("errors.invalidRange"));
      return false;
    }
    return true;
  }, [endDate, showError, startDate, t]);

  const generateReport = useCallback(async () => {
    if (!validateRange()) return;
    setGenerating(true);
    setError("");
    try {
      const report = await generateReportFromData(startDate, endDate);
      setReportData(report);
      addToast({
        title: t("statuses.generatedTitle"),
        description: t("statuses.generatedDesc"),
        variant: "solid",
        color: "success",
      });
    } catch (err) {
      console.error(err);
      showError(t("statuses.errorGenerate"));
    } finally {
      setGenerating(false);
    }
  }, [endDate, generateReportFromData, showError, startDate, t, validateRange]);

  const fetchData = useCallback(async () => {
    setError("");
    await loadData();
  }, [loadData]);

  useEffect(() => {
    if (!reportsLoading) {
      generateReport();
    }
  }, [generateReport, reportsLoading]);

  const setQuickDateRange = (days) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);

    setStartDate(start.toISOString().split("T")[0]);
    setEndDate(end.toISOString().split("T")[0]);
  };

  const totalTickets = useMemo(
    () =>
      reportData?.reports?.reduce((total, day) => total + day.tickets.length, 0) || 0,
    [reportData],
  );

  if ((reportsLoading || currencyLoading) && !reportData) {
    return (
      <StoreLayout>
        <ReportSkeleton />
      </StoreLayout>
    );
  }

  return (
    <StoreLayout>
      <div className="max-w-7xl mx-auto space-y-6">

        {displayError && (
          <Card className="bg-red-50 border-red-200">
            <CardBody>
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <p className="text-red-600 font-semibold">{displayError}</p>
              </div>
            </CardBody>
          </Card>
        )}

        <DateRangeCard
          startDate={startDate}
          endDate={endDate}
          onChangeStart={(e) => setStartDate(e.target.value)}
          onChangeEnd={(e) => setEndDate(e.target.value)}
          onQuickRange={setQuickDateRange}
          onGenerate={generateReport}
          disabled={reportsLoading || currencyLoading}
          generating={generating}
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <SummaryStat
                    icon={<Calendar className="w-6 h-6 text-blue-600" />}
                    label={t("summary.period")}
                    value={`${formatDate(reportData.startDate)} - ${formatDate(reportData.endDate)}`}
                    tone={{
                      bg: "bg-blue-50",
                      border: "border-blue-200",
                      iconBg: "bg-blue-100",
                      text: "text-blue-700",
                      value: "text-blue-900",
                    }}
                  />
                  <SummaryStat
                    icon={<DollarSign className="w-6 h-6 text-green-600" />}
                    label={t("summary.balance")}
                    value={formatCurrency(reportData.totalBalance)}
                    tone={{
                      bg: "bg-green-50",
                      border: "border-green-200",
                      iconBg: "bg-green-100",
                      text: "text-green-700",
                      value: "text-green-900",
                    }}
                  />
                  <SummaryStat
                    icon={<Receipt className="w-6 h-6 text-purple-600" />}
                    label={t("summary.tickets")}
                    value={totalTickets}
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
                  <PieChart className="w-5 h-5 mr-2" />
                  {t("breakdown.title")}
                </h3>
              </CardHeader>
              <CardBody>
                <div className="space-y-6 max-h-96 overflow-y-auto">
                  {reportData.reports.map((report, idx) => (
                    <DayReport key={`${report.date}-${idx}`} report={report} formatCurrency={formatCurrency} />
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>
        )}

        <Card className="shadow-lg border-0 bg-white">
          <CardBody className="flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="text-left">
              <p className="text-deep font-semibold">{t("close.sectionTitle")}</p>
              <p className="text-forest text-sm">{t("close.sectionSubtitle")}</p>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <Card className="bg-green-50 border-green-200 hidden md:block">
                <CardBody className="py-3 px-4">
                  <div className="flex items-center gap-2 text-green-800">
                    <DollarSign className="w-4 h-4" />
                    <span className="text-sm font-semibold">
                      {t("close.balanceLabel")} {reportData ? formatCurrency(reportData.totalBalance) : "--"}
                    </span>
                  </div>
                </CardBody>
              </Card>
              <button
                onClick={() => setShowCloseTurnModal(true)}
                className="bg-red-500 text-white text-lg px-6 py-3 rounded-xl hover:bg-red-600 transition-colors font-semibold w-full md:w-auto flex items-center justify-center gap-2"
              >
                <Lock className="w-5 h-5" />
                {t("close.confirm")}
              </button>
            </div>
          </CardBody>
        </Card>

        <CloseTurnModal
          isOpen={showCloseTurnModal}
          onClose={() => setShowCloseTurnModal(false)}
          onConfirm={async () => {
            setClosingTurn(true);
            try {
              const closed = await closeShift();
              if (!closed) {
                showError(t("statuses.closeError"));
                return;
              }
              addToast({
                title: t("statuses.closeSuccessTitle"),
                description: t("statuses.closeSuccessDesc"),
                variant: "solid",
                color: "success",
              });
              setShowCloseTurnModal(false);
            } catch (err) {
              console.error(err);
              showError(t("statuses.closeErrorGeneric"));
            } finally {
              setClosingTurn(false);
            }
          }}
          reportData={reportData}
          formatCurrency={formatCurrency}
          confirmLoading={closingTurn}
        />
      </div>
    </StoreLayout>
  );
}
