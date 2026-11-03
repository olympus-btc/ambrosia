import { fireEvent, render, screen } from "@testing-library/react";

import { printHtmlDocument } from "@/utils/printHtmlDocument";

import { InvoiceDetailModal } from "../InvoiceDetailModal";

jest.mock("@/utils/printHtmlDocument", () => ({
  printHtmlDocument: jest.fn(),
}));

jest.mock("@providers/configurations/configurationsProvider", () => ({
  useConfigurations: () => ({
    config: {
      businessName: "Freelance Studio",
      businessEmail: "hello@example.com",
    },
  }),
}));

jest.mock("next-intl", () => ({
  useTranslations: () => (translationKey) => translationKey,
}));

jest.mock("@heroui/react", () => ({
  Button: ({ children, isDisabled, onPress }) => (
    <button type="button" disabled={isDisabled} onClick={onPress}>{children}</button>
  ),
  Modal: ({ children, isOpen }) => (isOpen ? <div role="dialog">{children}</div> : null),
  ModalBody: ({ children }) => <div>{children}</div>,
  ModalContent: ({ children }) => <div>{children}</div>,
  ModalFooter: ({ children }) => <div>{children}</div>,
  ModalHeader: ({ children }) => <h2>{children}</h2>,
  Spinner: () => <div>spinner</div>,
}));

const invoice = {
  id: "invoice-1",
  invoiceNumber: "2026-0001",
  clientName: "Acme",
  periodStart: "2026-10-01",
  periodEnd: "2026-10-31",
  status: "draft",
  paymentMethod: "bank",
  currencyAcronym: "USD",
  totalCents: 15000,
  payoutSnapshot: JSON.stringify({
    accountHolder: "Freelance Studio",
    bankName: "Bank A",
  }),
  lineItems: [{
    id: "line-1",
    projectName: "Website",
    taskName: "Development",
    quantityMinutes: 90,
    rateCents: 10000,
    amountCents: 15000,
  }],
};

describe("InvoiceDetailModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("prints the invoice document from the detail modal", () => {
    render(
      <InvoiceDetailModal
        invoice={invoice}
        isLoading={false}
        isOpen
        onClose={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "printInvoice" }));

    expect(printHtmlDocument).toHaveBeenCalledWith(expect.objectContaining({
      title: "2026-0001",
      htmlContent: expect.stringContaining("Freelance Studio"),
    }));
    expect(printHtmlDocument).toHaveBeenCalledWith(expect.objectContaining({
      htmlContent: expect.stringContaining("Development"),
    }));
  });

  it("disables print while invoice details are loading", () => {
    render(
      <InvoiceDetailModal
        invoice={null}
        isLoading
        isOpen
        onClose={jest.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "printInvoice" })).toBeDisabled();
  });
});
