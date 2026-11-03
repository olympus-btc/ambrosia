import { DEFAULT_PRINT_FORMATS } from "../defaults";

import { formatPrintDate, formatPrintTime } from "./formatPrintDateTime";
import { sampleConfig, sampleShiftReport, sampleTicket } from "./sampleData";

export function formatShiftDateTime(localDateTime, printFormats = DEFAULT_PRINT_FORMATS) {
  if (!localDateTime) return "";
  const shiftDateTime = new Date(localDateTime);
  return `${formatPrintDate(shiftDateTime, printFormats.dateFormat)} ${formatPrintTime(shiftDateTime, printFormats.timeFormat)}`;
}

export function resolveTemplateVariables(templateText, businessConfig, printFormats = DEFAULT_PRINT_FORMATS, printedAt = new Date()) {
  if (!templateText) return "";
  const resolvedBusinessConfig = businessConfig ?? sampleConfig;
  const printDate = formatPrintDate(printedAt, printFormats.dateFormat);
  const printTime = formatPrintTime(printedAt, printFormats.timeFormat);
  return templateText
    .replaceAll("{{config.businessName}}", resolvedBusinessConfig.businessName ?? "")
    .replaceAll("{{config.businessAddress}}", resolvedBusinessConfig.businessAddress ?? "")
    .replaceAll("{{config.businessPhone}}", resolvedBusinessConfig.businessPhone ?? "")
    .replaceAll("{{config.businessEmail}}", resolvedBusinessConfig.businessEmail ?? "")
    .replaceAll("{{ticket.id}}", sampleTicket.ticketId)
    .replaceAll("{{ticket.tableName}}", sampleTicket.tableName)
    .replaceAll("{{ticket.roomName}}", sampleTicket.roomName)
    .replaceAll("{{ticket.date}}", sampleTicket.date)
    .replaceAll("{{ticket.total}}", sampleTicket.total.toString())
    .replaceAll("{{ticket.invoice}}", sampleTicket.invoice)
    .replaceAll("{{shift.cashier}}", sampleShiftReport.cashierName)
    .replaceAll("{{shift.openedAt}}", formatShiftDateTime(sampleShiftReport.openedAt, printFormats))
    .replaceAll("{{shift.closedAt}}", formatShiftDateTime(sampleShiftReport.closedAt, printFormats))
    .replaceAll("{{shift.totalTickets}}", String(sampleShiftReport.breakdown.totalTickets))
    .replaceAll("{{shift.totalSales}}", String(sampleShiftReport.breakdown.totalSales))
    .replaceAll("{{shift.totalTips}}", String(sampleShiftReport.breakdown.totalTips))
    .replaceAll("{{shift.initialAmount}}", String(sampleShiftReport.breakdown.initialAmount))
    .replaceAll("{{shift.cashSales}}", String(sampleShiftReport.breakdown.cashSales))
    .replaceAll("{{shift.cashRefunds}}", String(sampleShiftReport.breakdown.cashRefunds))
    .replaceAll("{{shift.expectedCash}}", String(sampleShiftReport.breakdown.expectedTotal))
    .replaceAll("{{shift.countedCash}}", String(sampleShiftReport.breakdown.finalAmount))
    .replaceAll("{{shift.difference}}", String(sampleShiftReport.breakdown.difference))
    .replaceAll("{{print.dateTime}}", `${printDate} ${printTime}`)
    .replaceAll("{{print.date}}", printDate)
    .replaceAll("{{print.time}}", printTime);
}
