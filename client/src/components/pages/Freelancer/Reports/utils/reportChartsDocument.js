import { CHART_COLORS } from "../../../Store/Reports/Charts/chartColors";
import { escapeHtml } from "../../Invoices/invoiceDocument";
import { formatInvoiceDuration } from "../../Invoices/invoiceFormatters";

const DONUT_RADIUS = 60;
const DONUT_STROKE_WIDTH = 28;
const DONUT_SIZE = (DONUT_RADIUS + DONUT_STROKE_WIDTH) * 2;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;

function buildChartTitleMarkup(title) {
  return `<h3 style="color:#4b5563;font-size:13px;margin:0 0 12px;">${escapeHtml(title)}</h3>`;
}

function buildBarChartMarkup(title, durations) {
  if (!durations.length) return "";
  const longestDurationMinutes = durations[0].durationMinutes || 1;

  const barRowsMarkup = durations.map(({ name, durationMinutes }, durationIndex) => `
    <div style="align-items:center;display:flex;gap:10px;margin-bottom:8px;">
      <span style="color:#374151;flex:0 0 130px;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(name)}</span>
      <span style="background:#f3f4f6;border-radius:4px;display:block;flex:1;height:14px;">
        <span style="background:${durationIndex === 0 ? CHART_COLORS[0] : CHART_COLORS[2]};border-radius:4px;display:block;height:14px;width:${(durationMinutes / longestDurationMinutes) * 100}%;"></span>
      </span>
      <span style="color:#6b7280;flex:0 0 60px;font-size:12px;text-align:right;">${escapeHtml(formatInvoiceDuration(durationMinutes))}</span>
    </div>
  `).join("");

  return `<div style="break-inside:avoid;">${buildChartTitleMarkup(title)}${barRowsMarkup}</div>`;
}

function buildDonutChartMarkup(title, durations) {
  if (!durations.length) return "";
  const totalDurationMinutes = durations.reduce((durationMinutesSum, { durationMinutes }) => durationMinutesSum + durationMinutes, 0) || 1;

  let accumulatedSegmentLength = 0;
  const segmentsMarkup = durations.map(({ durationMinutes }, durationIndex) => {
    const segmentLength = (durationMinutes / totalDurationMinutes) * DONUT_CIRCUMFERENCE;
    const segmentMarkup = `<circle cx="${DONUT_SIZE / 2}" cy="${DONUT_SIZE / 2}" r="${DONUT_RADIUS}" fill="none" stroke="${CHART_COLORS[durationIndex % CHART_COLORS.length]}" stroke-width="${DONUT_STROKE_WIDTH}" stroke-dasharray="${segmentLength} ${DONUT_CIRCUMFERENCE - segmentLength}" stroke-dashoffset="${-accumulatedSegmentLength}"></circle>`;
    accumulatedSegmentLength += segmentLength;
    return segmentMarkup;
  }).join("");

  const legendMarkup = durations.map(({ name, durationMinutes }, durationIndex) => `
    <div style="align-items:center;display:flex;gap:8px;margin-bottom:6px;">
      <span style="background:${CHART_COLORS[durationIndex % CHART_COLORS.length]};border-radius:2px;display:block;flex:0 0 10px;height:10px;"></span>
      <span style="color:#374151;flex:1;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(name)}</span>
      <span style="color:#6b7280;font-size:12px;">${escapeHtml(formatInvoiceDuration(durationMinutes))} · ${Math.round((durationMinutes / totalDurationMinutes) * 100)}%</span>
    </div>
  `).join("");

  return `
    <div style="break-inside:avoid;">
      ${buildChartTitleMarkup(title)}
      <div style="align-items:center;display:flex;gap:16px;">
        <svg width="${DONUT_SIZE / 1.5}" height="${DONUT_SIZE / 1.5}" viewBox="0 0 ${DONUT_SIZE} ${DONUT_SIZE}" style="flex:0 0 auto;transform:rotate(-90deg);">${segmentsMarkup}</svg>
        <div style="flex:1;min-width:0;">${legendMarkup}</div>
      </div>
    </div>
  `;
}

export function buildReportChartsMarkup(chartData, chartTranslations) {
  const { durationByProject, durationByClient, durationByTask } = chartData;
  if (!durationByProject.length) return "";

  return `
    <section style="border:1px solid #e5e7eb;border-radius:8px;display:grid;gap:24px;margin-bottom:28px;padding:20px;">
      ${buildBarChartMarkup(chartTranslations.durationByProject, durationByProject)}
      <div style="display:grid;gap:24px;grid-template-columns:repeat(2,minmax(0,1fr));">
        ${buildBarChartMarkup(chartTranslations.durationByClient, durationByClient)}
        ${buildDonutChartMarkup(chartTranslations.durationByTask, durationByTask)}
      </div>
    </section>
  `;
}
