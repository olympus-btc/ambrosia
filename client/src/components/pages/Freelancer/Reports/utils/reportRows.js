import { formatInvoiceAmount, formatInvoiceDuration } from "../../Invoices/invoiceFormatters";

import { formatSatoshis } from "./reportSatoshis";

export const REPORT_ROW_TYPES = {
  project: "project",
  task: "task",
};

function buildProjectRow(project, currencyAcronym) {
  return {
    rowKey: `${currencyAcronym}-${project.projectId}`,
    rowType: REPORT_ROW_TYPES.project,
    projectName: project.projectName,
    taskName: "",
    clientName: project.clientName,
    duration: formatInvoiceDuration(project.durationMinutes),
    amount: formatInvoiceAmount(project.amountCents, currencyAcronym),
  };
}

function buildTaskRow(project, task, currencyAcronym) {
  return {
    rowKey: `${currencyAcronym}-${project.projectId}-${task.taskId}`,
    rowType: REPORT_ROW_TYPES.task,
    projectName: project.projectName,
    taskName: task.taskName,
    clientName: project.clientName,
    duration: formatInvoiceDuration(task.durationMinutes),
    amount: formatInvoiceAmount(task.amountCents, currencyAcronym),
  };
}

export function buildReportProjectGroups(report) {
  return (report?.currencies ?? []).flatMap((currencyGroup) => currencyGroup.projects.map((project) => ({
    projectRow: buildProjectRow(project, currencyGroup.currencyAcronym),
    taskRows: project.tasks.map((task) => buildTaskRow(project, task, currencyGroup.currencyAcronym)),
  })));
}

export function flattenReportProjectGroups(projectGroups) {
  return projectGroups.flatMap(({ projectRow, taskRows }) => [projectRow, ...taskRows]);
}

function formatSatsTotalValue(satsTotal, summaryTranslations) {
  if (satsTotal.totalSatoshis !== null) return formatSatoshis(satsTotal.totalSatoshis);
  if (satsTotal.loading) return summaryTranslations.satsCalculating;

  return summaryTranslations.satsUnavailable;
}

export function buildReportSummaryStats(report, satsTotal, summaryTranslations) {
  const currencyGroups = report?.currencies ?? [];
  const totalDurationMinutes = currencyGroups.reduce(
    (durationMinutesSum, currencyGroup) => durationMinutesSum + currencyGroup.totalDurationMinutes,
    0,
  );

  return [
    ...currencyGroups.map((currencyGroup) => ({
      label: summaryTranslations.currencyTotal(currencyGroup.currencyAcronym),
      value: formatInvoiceAmount(currencyGroup.totalAmountCents, currencyGroup.currencyAcronym),
    })),
    { label: summaryTranslations.totalDuration, value: formatInvoiceDuration(totalDurationMinutes) },
    { label: summaryTranslations.totalSatoshis, value: formatSatsTotalValue(satsTotal, summaryTranslations) },
  ];
}
