"use client";

import { useTranslations } from "next-intl";

import { DataTable } from "@/components/shared/DataTable";

import { REPORT_ROW_TYPES } from "./utils/reportRows";

export function ReportProjectsTable({ projectRows }) {
  const reportTranslations = useTranslations("freelanceReports");

  const reportTableColumns = [
    {
      key: "projectTask",
      label: reportTranslations("projectTask"),
      render: ({ rowType, projectName, taskName }) => (
        rowType === REPORT_ROW_TYPES.project
          ? <span className="font-bold text-deep">{projectName}</span>
          : <span className="pl-6 text-sm text-gray-700">{taskName}</span>
      ),
    },
    {
      key: "client",
      label: reportTranslations("client"),
      render: ({ rowType, clientName }) => (
        rowType === REPORT_ROW_TYPES.project ? <span className="text-sm text-gray-700">{clientName}</span> : null
      ),
    },
    {
      key: "duration",
      label: reportTranslations("duration"),
      render: ({ rowType, duration }) => (
        <span className={rowType === REPORT_ROW_TYPES.project ? "font-medium whitespace-nowrap" : "text-sm text-gray-500 whitespace-nowrap"}>
          {duration}
        </span>
      ),
    },
    {
      key: "amount",
      label: reportTranslations("amount"),
      render: ({ rowType, amount }) => (
        <span className={rowType === REPORT_ROW_TYPES.project ? "font-bold text-green-700 whitespace-nowrap" : "text-sm text-gray-500 whitespace-nowrap"}>
          {amount}
        </span>
      ),
    },
  ];

  return (
    <DataTable
      columns={reportTableColumns}
      items={projectRows}
      getKey={(projectRow) => projectRow.rowKey}
      getRowClassName={(projectRow) => (projectRow.rowType === REPORT_ROW_TYPES.project ? "bg-green-50" : "hover:bg-gray-50")}
    />
  );
}
