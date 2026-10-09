export function formatInvoiceAmount(amountCents, currencyAcronym = "") {
  const amount = Number(amountCents ?? 0) / 100;
  return `${currencyAcronym} ${amount.toFixed(2)}`.trim();
}

export function formatInvoiceDate(dateValue) {
  if (!dateValue) return "";

  return new Date(`${dateValue}T00:00:00`).toLocaleDateString();
}

export function formatInvoicePeriod(invoice) {
  const periodStart = formatInvoiceDate(invoice?.periodStart);
  const periodEnd = formatInvoiceDate(invoice?.periodEnd);

  if (!periodStart && !periodEnd) return "";
  if (!periodEnd) return periodStart;
  if (!periodStart) return periodEnd;

  return `${periodStart} - ${periodEnd}`;
}

export function formatInvoiceDuration(quantityMinutes) {
  const totalMinutes = Number(quantityMinutes ?? 0);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;

  return `${hours}h ${minutes}m`;
}

export function parsePayoutSnapshot(payoutSnapshot) {
  if (!payoutSnapshot) return null;
  if (typeof payoutSnapshot === "object") return payoutSnapshot;

  try {
    return JSON.parse(payoutSnapshot);
  } catch {
    return null;
  }
}
