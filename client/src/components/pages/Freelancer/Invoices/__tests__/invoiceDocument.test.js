import { buildFreelanceInvoiceHtmlDocument } from "../invoiceDocument";

const documentTranslations = {
  invoiceTitle: "Invoice",
  businessFallbackName: "Business",
  client: "Client",
  period: "Period",
  status: "Status",
  statusLabel: "Draft",
  lineItems: "Line items",
  lineItem: "Line item",
  duration: "Duration",
  rate: "Rate",
  amount: "Amount",
  total: "Total",
  noLineItems: "No line items",
  bankDetails: "Bank transfer details",
  lightningDetails: "Lightning invoice",
  accountHolder: "Account holder",
  bankName: "Bank",
  accountNumber: "Account number",
  clabe: "CLABE",
  swift: "SWIFT",
  iban: "IBAN",
};

const businessConfig = {
  businessName: "Freelance Studio",
  businessAddress: "123 Main St",
  businessPhone: "5551234567",
  businessEmail: "hello@example.com",
  businessTaxId: "ABC123",
  businessLogoUrl: "https://example.com/logo.png",
};

const lineItem = {
  id: "line-1",
  projectName: "Website",
  taskName: "Development",
  quantityMinutes: 90,
  rateCents: 10000,
  amountCents: 15000,
};

describe("buildFreelanceInvoiceHtmlDocument", () => {
  it("renders issuer, invoice summary, line items, and bank payout instructions", () => {
    const invoiceHtmlDocument = buildFreelanceInvoiceHtmlDocument({
      businessConfig,
      documentTranslations,
      invoice: {
        invoiceNumber: "2026-0001",
        clientName: "Acme",
        periodStart: "2026-10-01",
        periodEnd: "2026-10-31",
        currencyAcronym: "USD",
        status: "draft",
        totalCents: 15000,
        paymentMethod: "bank",
        payoutSnapshot: JSON.stringify({
          accountHolder: "Freelance Studio",
          bankName: "Bank A",
          accountNumber: "123456",
          clabe: "012345678901234567",
        }),
        lineItems: [lineItem],
      },
    });

    expect(invoiceHtmlDocument).toContain("Freelance Studio");
    expect(invoiceHtmlDocument).toContain("2026-0001");
    expect(invoiceHtmlDocument).toContain("Acme");
    expect(invoiceHtmlDocument).toContain("Website");
    expect(invoiceHtmlDocument).toContain("Development");
    expect(invoiceHtmlDocument).toContain("USD 150.00");
    expect(invoiceHtmlDocument).toContain("Bank transfer details");
    expect(invoiceHtmlDocument).toContain("012345678901234567");
  });

  it("renders Lightning payment instructions", () => {
    const invoiceHtmlDocument = buildFreelanceInvoiceHtmlDocument({
      businessConfig,
      documentTranslations,
      invoice: {
        invoiceNumber: "2026-0002",
        clientName: "Acme",
        currencyAcronym: "USD",
        totalCents: 1000,
        paymentMethod: "lightning",
        bolt11: "lnbc1invoice",
        lineItems: [],
      },
    });

    expect(invoiceHtmlDocument).toContain("Lightning invoice");
    expect(invoiceHtmlDocument).toContain("lnbc1invoice");
    expect(invoiceHtmlDocument).toContain("No line items");
  });

  it("escapes unsafe text values", () => {
    const invoiceHtmlDocument = buildFreelanceInvoiceHtmlDocument({
      businessConfig: { businessName: "<script>alert('issuer')</script>" },
      documentTranslations,
      invoice: {
        invoiceNumber: "2026-0003",
        clientName: "<img src=x onerror=alert(1)>",
        currencyAcronym: "USD",
        totalCents: 1000,
        paymentMethod: "bank",
        lineItems: [],
      },
    });

    expect(invoiceHtmlDocument).toContain("&lt;script&gt;alert(&#039;issuer&#039;)&lt;/script&gt;");
    expect(invoiceHtmlDocument).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(invoiceHtmlDocument).not.toContain("<img src=x onerror=alert(1)>");
  });
});
