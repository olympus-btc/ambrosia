"use client";
import { useMemo } from "react";

import { Card, CardBody } from "@heroui/react";
import { useTranslations } from "next-intl";

import { buildReportChartData } from "../utils/reportCharts";

import { DurationBarChart } from "./DurationBarChart";
import { DurationPieChart } from "./DurationPieChart";

export function ReportAnalyticsCard({ report }) {
  const reportTranslations = useTranslations("freelanceReports");
  const { durationByProject, durationByClient, durationByTask } = useMemo(() => buildReportChartData(report), [report]);

  return (
    <Card shadow="none" className="shadow-lg bg-white rounded-lg p-4 lg:p-8">
      <CardBody className="space-y-8">
        <DurationBarChart title={reportTranslations("charts.durationByProject")} durations={durationByProject} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <DurationBarChart title={reportTranslations("charts.durationByClient")} durations={durationByClient} />
          <DurationPieChart title={reportTranslations("charts.durationByTask")} durations={durationByTask} />
        </div>
      </CardBody>
    </Card>
  );
}
