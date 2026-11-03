import qrCodeGenerator from "qrcode-generator";

import {
  formatInvoiceAmount,
  formatInvoiceDuration,
  formatInvoicePeriod,
  parsePayoutSnapshot,
} from "./invoiceFormatters";

export function escapeHtml(rawValue) {
  return String(rawValue ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function buildIssuerMarkup(businessConfig, documentTranslations) {
  const businessName = businessConfig?.businessName || documentTranslations.businessFallbackName;
  const issuerRows = [
    businessConfig?.businessAddress,
    businessConfig?.businessPhone,
    businessConfig?.businessEmail,
    businessConfig?.businessTaxId,
  ].filter(Boolean);

  return `
    <section style="align-items:flex-start;border-bottom:2px solid #166534;display:flex;gap:18px;justify-content:space-between;padding-bottom:24px;">
      ${businessConfig?.businessLogoUrl ? `<img src="${escapeHtml(businessConfig.businessLogoUrl)}" alt="" style="max-height:72px;max-width:160px;object-fit:contain;">` : ""}
      <div>
        <h1 style="color:#14532d;font-size:28px;margin:0;">${escapeHtml(businessName)}</h1>
        ${issuerRows.map((issuerRow) => `<p style="margin:0;">${escapeHtml(issuerRow)}</p>`).join("")}
      </div>
    </section>
  `;
}

function buildLineItemsMarkup(invoice, documentTranslations) {
  return (invoice?.lineItems ?? []).map((lineItem) => `
    <tr>
      <td style="border-bottom:1px solid #e5e7eb;padding:10px;vertical-align:top;">
        <strong>${escapeHtml(lineItem.projectName)}</strong>
        <span style="color:#6b7280;display:block;font-size:12px;">${escapeHtml(lineItem.taskName)}</span>
      </td>
      <td style="border-bottom:1px solid #e5e7eb;padding:10px;vertical-align:top;">${escapeHtml(formatInvoiceDuration(lineItem.quantityMinutes))}</td>
      <td style="border-bottom:1px solid #e5e7eb;padding:10px;vertical-align:top;">${escapeHtml(formatInvoiceAmount(lineItem.rateCents, invoice?.currencyAcronym))}</td>
      <td style="border-bottom:1px solid #e5e7eb;padding:10px;text-align:right;vertical-align:top;">${escapeHtml(formatInvoiceAmount(lineItem.amountCents, invoice?.currencyAcronym))}</td>
    </tr>
  `).join("") || `
    <tr>
      <td colspan="4" style="border-bottom:1px solid #e5e7eb;color:#6b7280;padding:10px;text-align:center;">${escapeHtml(documentTranslations.noLineItems)}</td>
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
    <section style="border:1px solid #bbf7d0;border-radius:8px;padding:14px;">
      <h2 style="color:#14532d;font-size:16px;margin:0 0 10px;">${escapeHtml(documentTranslations.bankDetails)}</h2>
      <dl style="display:grid;gap:10px;grid-template-columns:repeat(2,minmax(0,1fr));margin:0;">
        ${payoutRows.map(([payoutLabel, payoutValue]) => `
          <div>
            <dt style="color:#6b7280;font-size:12px;">${escapeHtml(payoutLabel)}</dt>
            <dd style="font-weight:700;margin:0;overflow-wrap:anywhere;">${escapeHtml(payoutValue)}</dd>
          </div>
        `).join("")}
      </dl>
    </section>
  `;
}

function buildLightningQrCodeMarkup(lightningInvoice) {
  try {
    const lightningInvoiceQrCode = qrCodeGenerator(0, "M");
    lightningInvoiceQrCode.addData(lightningInvoice);
    lightningInvoiceQrCode.make();
    const lightningInvoiceQrCodeSvg = lightningInvoiceQrCode.createSvgTag({
      cellSize: 4,
      margin: 2,
      scalable: true,
    });

    return `
      <div style="background:#ffffff;border:1px solid #d1d5db;border-radius:8px;box-sizing:border-box;flex:0 0 184px;padding:12px;width:184px;">
        ${lightningInvoiceQrCodeSvg.replace(
          "<svg ",
          '<svg aria-label="Lightning invoice QR code" role="img" style="display:block;height:160px;width:160px;" ',
        )}
      </div>
    `;
  } catch {
    return "";
  }
}

function buildLightningInstructionsMarkup(invoice, documentTranslations) {
  if (!invoice?.bolt11) return "";

  return `
    <section style="border:1px solid #bbf7d0;border-radius:8px;padding:14px;">
      <h2 style="color:#14532d;font-size:16px;margin:0 0 10px;">${escapeHtml(documentTranslations.lightningDetails)}</h2>
      <div style="align-items:flex-start;display:flex;gap:16px;">
        ${buildLightningQrCodeMarkup(invoice.bolt11)}
        <p style="background:#f3f4f6;border-radius:6px;box-sizing:border-box;flex:1;font-family:monospace;font-size:12px;line-height:1.5;margin:0;min-width:0;overflow-wrap:anywhere;padding:10px;white-space:normal;word-break:break-word;">${escapeHtml(invoice.bolt11)}</p>
      </div>
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
  </head>
  <body style="box-sizing:border-box;color:#172016;font-family:Arial,sans-serif;line-height:1.4;margin:0;padding:40px;">
    <main style="box-sizing:border-box;margin:0 auto;max-width:840px;">
      ${buildIssuerMarkup(businessConfig, documentTranslations)}
      <section style="display:grid;gap:16px;grid-template-columns:repeat(3,minmax(0,1fr));margin:28px 0;">
        <div style="border:1px solid #d1d5db;border-radius:8px;padding:14px;">
          <span style="color:#6b7280;display:block;font-size:12px;margin-bottom:4px;text-transform:uppercase;">${escapeHtml(documentTranslations.invoiceTitle)}</span>
          <span style="font-size:15px;font-weight:700;">${escapeHtml(invoice?.invoiceNumber)}</span>
        </div>
        <div style="border:1px solid #d1d5db;border-radius:8px;padding:14px;">
          <span style="color:#6b7280;display:block;font-size:12px;margin-bottom:4px;text-transform:uppercase;">${escapeHtml(documentTranslations.client)}</span>
          <span style="font-size:15px;font-weight:700;">${escapeHtml(invoice?.clientName)}</span>
        </div>
        <div style="border:1px solid #d1d5db;border-radius:8px;padding:14px;">
          <span style="color:#6b7280;display:block;font-size:12px;margin-bottom:4px;text-transform:uppercase;">${escapeHtml(documentTranslations.period)}</span>
          <span style="font-size:15px;font-weight:700;">${escapeHtml(formatInvoicePeriod(invoice))}</span>
        </div>
      </section>
      <section>
        <h2 style="color:#14532d;font-size:16px;margin:0 0 10px;">${escapeHtml(documentTranslations.lineItems)}</h2>
        <table style="border-collapse:collapse;margin-top:10px;width:100%;">
          <thead>
            <tr>
              <th style="background:#f3f4f6;color:#374151;font-size:12px;padding:10px;text-align:left;">${escapeHtml(documentTranslations.lineItem)}</th>
              <th style="background:#f3f4f6;color:#374151;font-size:12px;padding:10px;text-align:left;">${escapeHtml(documentTranslations.duration)}</th>
              <th style="background:#f3f4f6;color:#374151;font-size:12px;padding:10px;text-align:left;">${escapeHtml(documentTranslations.rate)}</th>
              <th style="background:#f3f4f6;color:#374151;font-size:12px;padding:10px;text-align:right;">${escapeHtml(documentTranslations.amount)}</th>
            </tr>
          </thead>
          <tbody>
            ${buildLineItemsMarkup(invoice, documentTranslations)}
          </tbody>
        </table>
        <div style="display:flex;font-size:20px;font-weight:700;justify-content:flex-end;margin:18px 0 28px;">
          ${escapeHtml(documentTranslations.total)}: ${escapeHtml(formatInvoiceAmount(invoice?.totalCents, invoice?.currencyAcronym))}
        </div>
      </section>
      ${buildPaymentInstructionsMarkup(invoice, documentTranslations)}
    </main>
  </body>
</html>`;
}
