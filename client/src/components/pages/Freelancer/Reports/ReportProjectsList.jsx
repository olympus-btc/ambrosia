"use client";

import { Clock } from "lucide-react";
import { useTranslations } from "next-intl";

import { ReportProjectsCard } from "./ReportProjectsCard";
import { ReportProjectsTable } from "./ReportProjectsTable";

export function ReportProjectsList({ projectGroups, projectRows }) {
  const reportTranslations = useTranslations("freelanceReports");

  if (projectGroups.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Clock aria-hidden="true" className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p className="font-medium">{reportTranslations("emptyState")}</p>
      </div>
    );
  }

  return (
    <section aria-label={reportTranslations("tableAriaLabel")} className="w-full">
      <div className="md:hidden space-y-3">
        {projectGroups.map(({ projectRow, taskRows }) => (
          <ReportProjectsCard key={projectRow.rowKey} projectRow={projectRow} taskRows={taskRows} />
        ))}
      </div>

      <div className="hidden md:block overflow-x-auto">
        <ReportProjectsTable projectRows={projectRows} />
      </div>
    </section>
  );
}
