"use client";

import { useMemo, useState } from "react";

import { addToast, Card, CardBody } from "@heroui/react";
import { AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";

import { PageHeader } from "@/components/shared/PageHeader";
import { PermissionBlockedMessage } from "@/components/shared/PermissionBlockedMessage";
import { printHtmlDocument } from "@/utils/printHtmlDocument";
import { useConfigurations } from "@providers/configurations/configurationsProvider";

import { PeriodFilter } from "../../Store/Reports/Filters";
import { useFiltersState } from "../../Store/Reports/hooks/useFilters";
import { ReportSkeleton, SummaryCard } from "../../Store/Reports/Summary";
import { useFreelanceReport, useReportSatsTotal } from "../hooks";

import { ReportAnalyticsCard } from "./Charts";
import { ReportProjectsDetailCard } from "./ReportProjectsDetailCard";
import { ReportProjectsFilters } from "./ReportProjectsFilters";
import { buildFreelanceReportCsv, downloadFreelanceReportCsv } from "./utils/reportCsv";
import { buildFreelanceReportHtmlDocument } from "./utils/reportDocument";
import { buildReportFilterOptions, filterReport } from "./utils/reportFilters";
import { buildReportProjectGroups, buildReportSummaryStats, flattenReportProjectGroups } from "./utils/reportRows";

export function Reports() {
  const reportTranslations = useTranslations("freelanceReports");
  const { config: businessConfig } = useConfigurations();
  const { report, loading, error: loadError, forbidden, fetchReport } = useFreelanceReport({ skipForbiddenRedirect: true });
  const { filters, handleFilters } = useFiltersState(fetchReport);
  const [reportFilters, setReportFilters] = useState({ search: "", clientId: "", projectId: "" });
  const reportFilterOptions = useMemo(() => buildReportFilterOptions(report), [report]);
  const filteredReport = useMemo(() => filterReport(report, reportFilters), [report, reportFilters]);
  const periodSatsTotal = useReportSatsTotal(report?.currencies);
  const filteredSatsTotal = useReportSatsTotal(filteredReport?.currencies);

  const projectGroups = useMemo(() => buildReportProjectGroups(filteredReport), [filteredReport]);
  const projectRows = useMemo(() => flattenReportProjectGroups(projectGroups), [projectGroups]);
  const summaryTranslations = useMemo(() => ({
    currencyTotal: (currencyAcronym) => reportTranslations("summary.currencyTotal", { currency: currencyAcronym }),
    totalDuration: reportTranslations("summary.totalDuration"),
    totalSatoshis: reportTranslations("summary.totalSatoshis"),
    satsCalculating: reportTranslations("summary.satsCalculating"),
    satsUnavailable: reportTranslations("summary.satsUnavailable"),
  }), [reportTranslations]);
  const periodSummaryStats = buildReportSummaryStats(report, periodSatsTotal, summaryTranslations);
  const exportSummaryStats = buildReportSummaryStats(filteredReport, filteredSatsTotal, summaryTranslations);

  const hasProjectRows = projectRows.length > 0;
  const hasReportProjects = reportFilterOptions.projects.length > 0;

  const handleReportFiltersChange = (reportFiltersUpdates) => {
    setReportFilters((previousReportFilters) => ({ ...previousReportFilters, ...reportFiltersUpdates }));
  };
  const isExportDisabled = loading || !hasProjectRows || filteredSatsTotal.loading;

  const handleExportCsv = () => {
    try {
      const csvContent = buildFreelanceReportCsv({
        projectRows,
        summaryStats: exportSummaryStats,
        csvTranslations: {
          project: reportTranslations("project"),
          task: reportTranslations("task"),
          client: reportTranslations("client"),
          duration: reportTranslations("duration"),
          amount: reportTranslations("amount"),
        },
      });
      downloadFreelanceReportCsv(csvContent, filteredReport);
    } catch {
      addToast({ color: "danger", description: reportTranslations("toasts.exportCsvError") });
    }
  };

  const handleExportPdf = () => {
    try {
      const reportHtmlDocument = buildFreelanceReportHtmlDocument({
        report: filteredReport,
        projectRows,
        summaryStats: exportSummaryStats,
        businessConfig,
        documentTranslations: {
          reportTitle: reportTranslations("document.reportTitle"),
          businessFallbackName: reportTranslations("document.businessFallbackName"),
          period: reportTranslations("document.period"),
          projects: reportTranslations("document.projects"),
          projectTask: reportTranslations("projectTask"),
          duration: reportTranslations("duration"),
          amount: reportTranslations("amount"),
          noProjects: reportTranslations("emptyState"),
          charts: {
            durationByProject: reportTranslations("charts.durationByProject"),
            durationByClient: reportTranslations("charts.durationByClient"),
            durationByTask: reportTranslations("charts.durationByTask"),
          },
        },
      });
      printHtmlDocument({ htmlContent: reportHtmlDocument, title: reportTranslations("document.reportTitle") });
    } catch {
      addToast({ color: "danger", description: reportTranslations("toasts.exportPdfError") });
    }
  };

  if (forbidden) {
    return (
      <>
        <PageHeader title={reportTranslations("title")} subtitle={reportTranslations("subtitle")} />
        <PermissionBlockedMessage
          title={reportTranslations("permissionBlocked.title")}
          subtitle={reportTranslations("permissionBlocked.subtitle")}
        />
      </>
    );
  }

  if (loading && !report) return <ReportSkeleton />;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        title={reportTranslations("title")}
        subtitle={reportTranslations("subtitle")}
        actions={(
          <PeriodFilter
            filters={filters}
            onFiltersChange={handleFilters}
            disabled={loading}
            subtitle={reportTranslations("periodFilterSubtitle")}
          />
        )}
      />

      {loadError && (
        <Card className="bg-red-50 border-red-200">
          <CardBody>
            <div className="flex items-center space-x-2">
              <AlertCircle aria-hidden="true" className="w-5 h-5 text-red-600" />
              <p className="text-red-600 font-semibold">{reportTranslations("loadError")}</p>
            </div>
          </CardBody>
        </Card>
      )}

      {hasReportProjects && <SummaryCard stats={periodSummaryStats} />}
      {hasReportProjects && <ReportAnalyticsCard report={report} />}
      <ReportProjectsDetailCard
        filters={hasReportProjects && (
          <ReportProjectsFilters
            reportFilters={reportFilters}
            clients={reportFilterOptions.clients}
            projects={reportFilterOptions.projects}
            onReportFiltersChange={handleReportFiltersChange}
            disabled={loading}
          />
        )}
        projectGroups={projectGroups}
        projectRows={projectRows}
        isExportDisabled={isExportDisabled}
        onExportCsv={handleExportCsv}
        onExportPdf={handleExportPdf}
      />
    </div>
  );
}
