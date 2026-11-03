import { buildIssuerMarkup, escapeHtml } from "../../Invoices/invoiceDocument";
import { formatInvoicePeriod } from "../../Invoices/invoiceFormatters";

import { buildReportChartData } from "./reportCharts";
import { buildReportChartsMarkup } from "./reportChartsDocument";
import { REPORT_ROW_TYPES } from "./reportRows";

function buildSummaryMarkup(summaryStats) {
  return summaryStats.map(({ label, value }) => `
    <div style="border:1px solid #d1d5db;border-radius:8px;padding:14px;">
      <span style="color:#6b7280;display:block;font-size:12px;margin-bottom:4px;text-transform:uppercase;">${escapeHtml(label)}</span>
      <span style="font-size:15px;font-weight:700;">${escapeHtml(value)}</span>
    </div>
  `).join("");
}

function buildProjectRowMarkup(projectRow) {
  return `
    <tr>
      <td style="background:#f0fdf4;border-bottom:1px solid #e5e7eb;padding:10px;vertical-align:top;">
        <strong>${escapeHtml(projectRow.projectName)}</strong>
        <span style="color:#6b7280;display:block;font-size:12px;">${escapeHtml(projectRow.clientName)}</span>
      </td>
      <td style="background:#f0fdf4;border-bottom:1px solid #e5e7eb;font-weight:700;padding:10px;vertical-align:top;">${escapeHtml(projectRow.duration)}</td>
      <td style="background:#f0fdf4;border-bottom:1px solid #e5e7eb;font-weight:700;padding:10px;text-align:right;vertical-align:top;">${escapeHtml(projectRow.amount)}</td>
    </tr>
  `;
}

function buildTaskRowMarkup(taskRow) {
  return `
    <tr>
      <td style="border-bottom:1px solid #e5e7eb;padding:10px 10px 10px 26px;vertical-align:top;">${escapeHtml(taskRow.taskName)}</td>
      <td style="border-bottom:1px solid #e5e7eb;padding:10px;vertical-align:top;">${escapeHtml(taskRow.duration)}</td>
      <td style="border-bottom:1px solid #e5e7eb;padding:10px;text-align:right;vertical-align:top;">${escapeHtml(taskRow.amount)}</td>
    </tr>
  `;
}

function buildProjectRowsMarkup(projectRows, documentTranslations) {
  return projectRows.map((projectRow) => (
    projectRow.rowType === REPORT_ROW_TYPES.project
      ? buildProjectRowMarkup(projectRow)
      : buildTaskRowMarkup(projectRow)
  )).join("") || `
    <tr>
      <td colspan="3" style="border-bottom:1px solid #e5e7eb;color:#6b7280;padding:10px;text-align:center;">${escapeHtml(documentTranslations.noProjects)}</td>
    </tr>
  `;
}

export function buildFreelanceReportHtmlDocument({ report, projectRows, summaryStats, businessConfig, documentTranslations }) {
  const reportPeriod = formatInvoicePeriod({ periodStart: report?.from, periodEnd: report?.to });

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>${escapeHtml(documentTranslations.reportTitle)}</title>
  </head>
  <body style="box-sizing:border-box;color:#172016;font-family:Arial,sans-serif;line-height:1.4;margin:0;padding:40px;-webkit-print-color-adjust:exact;print-color-adjust:exact;">
    <main style="box-sizing:border-box;margin:0 auto;max-width:840px;">
      ${buildIssuerMarkup(businessConfig, documentTranslations)}
      <section style="margin:28px 0 16px;">
        <h2 style="color:#14532d;font-size:20px;margin:0;">${escapeHtml(documentTranslations.reportTitle)}</h2>
        <p style="color:#6b7280;margin:4px 0 0;">${escapeHtml(documentTranslations.period)}: ${escapeHtml(reportPeriod)}</p>
      </section>
      <section style="display:grid;gap:16px;grid-template-columns:repeat(3,minmax(0,1fr));margin-bottom:28px;">
        ${buildSummaryMarkup(summaryStats)}
      </section>
      ${buildReportChartsMarkup(buildReportChartData(report), documentTranslations.charts)}
      <section>
        <h2 style="color:#14532d;font-size:16px;margin:0 0 10px;">${escapeHtml(documentTranslations.projects)}</h2>
        <table style="border-collapse:collapse;margin-top:10px;width:100%;">
          <thead>
            <tr>
              <th style="background:#f3f4f6;color:#374151;font-size:12px;padding:10px;text-align:left;">${escapeHtml(documentTranslations.projectTask)}</th>
              <th style="background:#f3f4f6;color:#374151;font-size:12px;padding:10px;text-align:left;">${escapeHtml(documentTranslations.duration)}</th>
              <th style="background:#f3f4f6;color:#374151;font-size:12px;padding:10px;text-align:right;">${escapeHtml(documentTranslations.amount)}</th>
            </tr>
          </thead>
          <tbody>
            ${buildProjectRowsMarkup(projectRows, documentTranslations)}
          </tbody>
        </table>
      </section>
    </main>
  </body>
</html>`;
}
