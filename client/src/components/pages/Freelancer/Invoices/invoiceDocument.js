import {
  formatInvoiceAmount,
  formatInvoiceDuration,
  formatInvoicePeriod,
  parsePayoutSnapshot,
} from "./invoiceFormatters";

function escapeHtml(rawValue) {
  return String(rawValue ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildIssuerMarkup(businessConfig, documentTranslations) {
  const businessName = businessConfig?.businessName || documentTranslations.businessFallbackName;
  const issuerRows = [
    businessConfig?.businessAddress,
    businessConfig?.businessPhone,
    businessConfig?.businessEmail,
    businessConfig?.businessTaxId,
  ].filter(Boolean);

  return `
    <section class="issuer">
      ${businessConfig?.businessLogoUrl ? `<img class="logo" src="${escapeHtml(businessConfig.businessLogoUrl)}" alt="">` : ""}
      <div>
        <h1>${escapeHtml(businessName)}</h1>
        ${issuerRows.map((issuerRow) => `<p>${escapeHtml(issuerRow)}</p>`).join("")}
      </div>
    </section>
  `;
}

function buildLineItemsMarkup(invoice, documentTranslations) {
  return (invoice?.lineItems ?? []).map((lineItem) => `
    <tr>
      <td>
        <strong>${escapeHtml(lineItem.projectName)}</strong>
        <span>${escapeHtml(lineItem.taskName)}</span>
      </td>
      <td>${escapeHtml(formatInvoiceDuration(lineItem.quantityMinutes))}</td>
      <td>${escapeHtml(formatInvoiceAmount(lineItem.rateCents, invoice?.currencyAcronym))}</td>
      <td class="amount">${escapeHtml(formatInvoiceAmount(lineItem.amountCents, invoice?.currencyAcronym))}</td>
    </tr>
  `).join("") || `
    <tr>
      <td colspan="4" class="empty">${escapeHtml(documentTranslations.noLineItems)}</td>
    </tr>
  `;
}

function buildBankInstructionsMarkup(invoice, documentTranslations) {
  const payoutSnapshot = parsePayoutSnapshot(invoice?.payoutSnapshot);
  if (!payoutSnapshot) return "";

  const payoutRows = [
    [documentTranslations.accountHolder, payoutSnapshot.accountHolder],
    [documentTranslations.bankName, payoutSnapshot.bankName],
    [documentTranslations.accountNumber, payoutSnapshot.accountNumber],
    [documentTranslations.clabe, payoutSnapshot.clabe],
    [documentTranslations.swift, payoutSnapshot.swift],
    [documentTranslations.iban, payoutSnapshot.iban],
  ].filter(([, payoutValue]) => payoutValue);

  return `
    <section class="payment">
      <h2>${escapeHtml(documentTranslations.bankDetails)}</h2>
      <dl>
        ${payoutRows.map(([payoutLabel, payoutValue]) => `
          <div>
            <dt>${escapeHtml(payoutLabel)}</dt>
            <dd>${escapeHtml(payoutValue)}</dd>
          </div>
        `).join("")}
      </dl>
    </section>
  `;
}

function buildLightningInstructionsMarkup(invoice, documentTranslations) {
  if (!invoice?.bolt11) return "";

  return `
    <section class="payment">
      <h2>${escapeHtml(documentTranslations.lightningDetails)}</h2>
      <p class="bolt11">${escapeHtml(invoice.bolt11)}</p>
    </section>
  `;
}

function buildPaymentInstructionsMarkup(invoice, documentTranslations) {
  if (invoice?.paymentMethod === "bank") {
    return buildBankInstructionsMarkup(invoice, documentTranslations);
  }

  if (invoice?.paymentMethod === "lightning") {
    return buildLightningInstructionsMarkup(invoice, documentTranslations);
  }

  return "";
}

export function buildFreelanceInvoiceHtmlDocument({ invoice, businessConfig, documentTranslations }) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>${escapeHtml(invoice?.invoiceNumber || documentTranslations.invoiceTitle)}</title>
    <style>
      * { box-sizing: border-box; }
      body {
        color: #172016;
        font-family: Arial, sans-serif;
        line-height: 1.4;
        margin: 0;
        padding: 40px;
      }
      .page { max-width: 840px; margin: 0 auto; }
      .issuer {
        align-items: flex-start;
        border-bottom: 2px solid #166534;
        display: flex;
        gap: 18px;
        justify-content: space-between;
        padding-bottom: 24px;
      }
      .logo {
        max-height: 72px;
        max-width: 160px;
        object-fit: contain;
      }
      h1, h2, p { margin: 0; }
      h1 { color: #14532d; font-size: 28px; }
      h2 { color: #14532d; font-size: 16px; margin-bottom: 10px; }
      .summary {
        display: grid;
        gap: 16px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        margin: 28px 0;
      }
      .summary-card {
        border: 1px solid #d1d5db;
        border-radius: 8px;
        padding: 14px;
      }
      .label {
        color: #6b7280;
        display: block;
        font-size: 12px;
        margin-bottom: 4px;
        text-transform: uppercase;
      }
      .value { font-size: 15px; font-weight: 700; }
      table {
        border-collapse: collapse;
        margin-top: 10px;
        width: 100%;
      }
      th {
        background: #f3f4f6;
        color: #374151;
        font-size: 12px;
        text-align: left;
      }
      th, td {
        border-bottom: 1px solid #e5e7eb;
        padding: 10px;
        vertical-align: top;
      }
      td span {
        color: #6b7280;
        display: block;
        font-size: 12px;
      }
      .amount { text-align: right; }
      .total {
        display: flex;
        font-size: 20px;
        font-weight: 700;
        justify-content: flex-end;
        margin: 18px 0 28px;
      }
      .payment {
        border: 1px solid #bbf7d0;
        border-radius: 8px;
        padding: 14px;
      }
      dl { display: grid; gap: 10px; grid-template-columns: repeat(2, minmax(0, 1fr)); margin: 0; }
      dt { color: #6b7280; font-size: 12px; }
      dd { font-weight: 700; margin: 0; overflow-wrap: anywhere; }
      .bolt11 {
        background: #f3f4f6;
        border-radius: 6px;
        font-family: monospace;
        font-size: 12px;
        overflow-wrap: anywhere;
        padding: 10px;
      }
      .empty { color: #6b7280; text-align: center; }
      @media print {
        body { padding: 24px; }
      }
    </style>
  </head>
  <body>
    <main class="page">
      ${buildIssuerMarkup(businessConfig, documentTranslations)}
      <section class="summary">
        <div class="summary-card">
          <span class="label">${escapeHtml(documentTranslations.invoiceTitle)}</span>
          <span class="value">${escapeHtml(invoice?.invoiceNumber)}</span>
        </div>
        <div class="summary-card">
          <span class="label">${escapeHtml(documentTranslations.client)}</span>
          <span class="value">${escapeHtml(invoice?.clientName)}</span>
        </div>
        <div class="summary-card">
          <span class="label">${escapeHtml(documentTranslations.period)}</span>
          <span class="value">${escapeHtml(formatInvoicePeriod(invoice))}</span>
        </div>
        <div class="summary-card">
          <span class="label">${escapeHtml(documentTranslations.status)}</span>
          <span class="value">${escapeHtml(documentTranslations.statusLabel)}</span>
        </div>
      </section>
      <section>
        <h2>${escapeHtml(documentTranslations.lineItems)}</h2>
        <table>
          <thead>
            <tr>
              <th>${escapeHtml(documentTranslations.lineItem)}</th>
              <th>${escapeHtml(documentTranslations.duration)}</th>
              <th>${escapeHtml(documentTranslations.rate)}</th>
              <th class="amount">${escapeHtml(documentTranslations.amount)}</th>
            </tr>
          </thead>
          <tbody>
            ${buildLineItemsMarkup(invoice, documentTranslations)}
          </tbody>
        </table>
        <div class="total">
          ${escapeHtml(documentTranslations.total)}: ${escapeHtml(formatInvoiceAmount(invoice?.totalCents, invoice?.currencyAcronym))}
        </div>
      </section>
      ${buildPaymentInstructionsMarkup(invoice, documentTranslations)}
    </main>
  </body>
</html>`;
}
