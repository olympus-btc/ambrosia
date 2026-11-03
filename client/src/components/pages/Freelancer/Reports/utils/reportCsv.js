import { downloadBlob } from "@/utils/downloadBlob";

function escapeCsvCell(cellValue) {
  return `"${String(cellValue ?? "").replace(/"/g, '""')}"`;
}

export function buildFreelanceReportCsv({ projectRows, summaryStats, csvTranslations }) {
  const headerRow = [
    csvTranslations.project,
    csvTranslations.task,
    csvTranslations.client,
    csvTranslations.duration,
    csvTranslations.amount,
  ];
  const projectCsvRows = projectRows.map((projectRow) => [
    projectRow.projectName,
    projectRow.taskName,
    projectRow.clientName,
    projectRow.duration,
    projectRow.amount,
  ]);
  const summaryCsvRows = summaryStats.map(({ label, value }) => [label, value]);

  return [headerRow, ...projectCsvRows, [], ...summaryCsvRows]
    .map((csvRow) => csvRow.map(escapeCsvCell).join(","))
    .join("\n");
}

export function downloadFreelanceReportCsv(csvContent, report) {
  downloadBlob(
    new Blob([csvContent], { type: "text/csv;charset=utf-8;" }),
    `freelance-report-${report.from}-${report.to}.csv`,
  );
}
