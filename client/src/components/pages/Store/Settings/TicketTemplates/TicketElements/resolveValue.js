import { sampleConfig, sampleTicket } from "./sampleData";

export function resolveValue(value, config) {
  if (!value) return "";
  const resolvedConfig = config ?? sampleConfig;
  return value
    .replaceAll("{{config.businessName}}", resolvedConfig.businessName ?? "")
    .replaceAll("{{config.businessAddress}}", resolvedConfig.businessAddress ?? "")
    .replaceAll("{{config.businessPhone}}", resolvedConfig.businessPhone ?? "")
    .replaceAll("{{config.businessEmail}}", resolvedConfig.businessEmail ?? "")
    .replaceAll("{{ticket.id}}", sampleTicket.ticketId)
    .replaceAll("{{ticket.tableName}}", sampleTicket.tableName)
    .replaceAll("{{ticket.roomName}}", sampleTicket.roomName)
    .replaceAll("{{ticket.date}}", sampleTicket.date)
    .replaceAll("{{ticket.total}}", sampleTicket.total.toString())
    .replaceAll("{{ticket.invoice}}", sampleTicket.invoice);
}
