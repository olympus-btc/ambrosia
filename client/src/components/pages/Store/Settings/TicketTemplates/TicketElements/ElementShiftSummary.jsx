"use client";

import { removeAccents } from "./removeAccents";
import { formatShiftDateTime, resolveTemplateVariables } from "./resolveTemplateVariables";

function ShiftSummaryRow({ label, value, className }) {
  return (
    <div className={`flex justify-between gap-3 ${className}`}>
      <span>{removeAccents(label)}</span>
      <span className="whitespace-nowrap">{removeAccents(String(value))}</span>
    </div>
  );
}

export function ElementShiftSummary({ localId, templateText, businessConfig, printFormats, sampleShiftReport, className }) {
  const { labels: shiftReportLabels, breakdown: shiftBreakdown } = sampleShiftReport;
  const summaryTitle = resolveTemplateVariables(templateText || "", businessConfig, printFormats).trim() || shiftReportLabels.title;
  const paymentMethodLabel = (paymentMethodName) => shiftReportLabels.paymentMethods[paymentMethodName.trim().toLowerCase()] ?? paymentMethodName;

  return [
    <div key={`${localId}-shift-title`} className={className}>{removeAccents(summaryTitle)}</div>,
    <ShiftSummaryRow key={`${localId}-shift-cashier`} label={shiftReportLabels.cashier} value={sampleShiftReport.cashierName} className={className} />,
    <ShiftSummaryRow key={`${localId}-shift-opened`} label={shiftReportLabels.openedAt} value={formatShiftDateTime(sampleShiftReport.openedAt, printFormats)} className={className} />,
    <ShiftSummaryRow key={`${localId}-shift-closed`} label={shiftReportLabels.closedAt} value={formatShiftDateTime(sampleShiftReport.closedAt, printFormats)} className={className} />,
    <ShiftSummaryRow key={`${localId}-shift-tickets`} label={shiftReportLabels.tickets} value={shiftBreakdown.totalTickets} className={className} />,
    <div key={`${localId}-shift-sales-sep`} className="border-t border-gray-400 my-2" />,
    ...shiftBreakdown.byPaymentMethod.map(({ name, total }) => (
      <ShiftSummaryRow key={`${localId}-shift-method-${name}`} label={paymentMethodLabel(name)} value={total} className={className} />
    )),
    <ShiftSummaryRow key={`${localId}-shift-sales`} label={shiftReportLabels.totalSales} value={shiftBreakdown.totalSales} className={className} />,
    <ShiftSummaryRow key={`${localId}-shift-tips`} label={shiftReportLabels.tips} value={shiftBreakdown.totalTips} className={className} />,
    <div key={`${localId}-shift-cash-sep`} className="border-t border-gray-400 my-2" />,
    <ShiftSummaryRow key={`${localId}-shift-initial`} label={shiftReportLabels.initialAmount} value={shiftBreakdown.initialAmount} className={className} />,
    <ShiftSummaryRow key={`${localId}-shift-cash-sales`} label={shiftReportLabels.cashSales} value={shiftBreakdown.cashSales} className={className} />,
    <ShiftSummaryRow key={`${localId}-shift-cash-refunds`} label={shiftReportLabels.cashRefunds} value={`-${shiftBreakdown.cashRefunds}`} className={className} />,
    <ShiftSummaryRow key={`${localId}-shift-expected`} label={shiftReportLabels.expectedCash} value={shiftBreakdown.expectedTotal} className={className} />,
    <ShiftSummaryRow key={`${localId}-shift-counted`} label={shiftReportLabels.countedCash} value={shiftBreakdown.finalAmount} className={className} />,
    <ShiftSummaryRow key={`${localId}-shift-difference`} label={shiftReportLabels.difference} value={shiftBreakdown.difference} className={className} />,
  ];
}
