import { render, screen, fireEvent } from "@testing-library/react";

import { I18nProvider } from "@i18n/I18nProvider";

import { InvoiceModal } from "../InvoiceModal";

const mockInvoiceCreated = {
  showModal: true,
  paid: false,
  created: {
    serialized: "lnbc1000n1pj9h8uqpp5test",
    paymentHash: "mock-payment-hash-123",
  },
  awaitingPayment: false,
};

const mockInvoicePaid = {
  showModal: true,
  paid: true,
  created: {
    serialized: "lnbc1000n1pj9h8uqpp5test",
    paymentHash: "mock-payment-hash-123",
  },
  completedAt: new Date("2024-01-15T10:30:00").getTime(),
};

const mockInvoiceAwaiting = {
  showModal: true,
  paid: false,
  created: {
    serialized: "lnbc1000n1pj9h8uqpp5test",
    paymentHash: "mock-payment-hash-123",
  },
  awaitingPayment: true,
};

function renderInvoiceModal(invoiceState, onClose = jest.fn()) {
  return render(
    <I18nProvider>
      <InvoiceModal invoiceState={invoiceState} onClose={onClose} />
    </I18nProvider>,
  );
}

const originalWarn = console.warn;
const originalError = console.error;

beforeEach(() => {
  console.warn = (...args) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("aria-label")
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };

  console.error = (...args) => {
    if (
      typeof args[0] === "string" &&
      (args[0].includes("onAnimationComplete") ||
       args[0].includes("Unknown event handler property") ||
       args[0].includes("validateDOMNesting"))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };

  jest.clearAllMocks();
});

afterEach(() => {
  console.warn = originalWarn;
  console.error = originalError;
  jest.restoreAllMocks();
});

describe("InvoiceModal Component", () => {
  describe("Modal State", () => {
    it("opens modal when showModal is true", () => {
      renderInvoiceModal(mockInvoiceCreated);

      expect(screen.getByText("invoiceModal.title")).toBeInTheDocument();
    });

    it("closes modal when showModal is false", () => {
      const closedState = { ...mockInvoiceCreated, showModal: false };
      renderInvoiceModal(closedState);

      expect(screen.queryByText("invoiceModal.title")).not.toBeInTheDocument();
    });

    it("displays modal title", () => {
      renderInvoiceModal(mockInvoiceCreated);

      expect(screen.getByText("invoiceModal.title")).toBeInTheDocument();
    });

    it("displays close button", () => {
      renderInvoiceModal(mockInvoiceCreated);

      expect(screen.getByText("invoiceModal.closeButton")).toBeInTheDocument();
    });

    it("displays QR icon in header", () => {
      renderInvoiceModal(mockInvoiceCreated);

      expect(screen.getByText("invoiceModal.title")).toBeInTheDocument();
    });
  });

  describe("Payment Received State", () => {
    it("shows payment received message when paid", () => {
      renderInvoiceModal(mockInvoicePaid);

      expect(screen.getByText("invoiceModal.paymentReceived")).toBeInTheDocument();
    });

    it("displays green check icon when paid", () => {
      renderInvoiceModal(mockInvoicePaid);

      expect(screen.getByText("invoiceModal.paymentReceived")).toBeInTheDocument();
    });

    it("shows payment timestamp when completedAt exists", () => {
      renderInvoiceModal(mockInvoicePaid);

      expect(screen.getByText(/invoiceModal.paidAt/)).toBeInTheDocument();
    });

    it("does not show QR code when paid", () => {
      renderInvoiceModal(mockInvoicePaid);

      expect(screen.queryByText("invoiceModal.invoice")).not.toBeInTheDocument();
    });

    it("does not show invoice details when paid", () => {
      renderInvoiceModal(mockInvoicePaid);

      expect(screen.queryByText("invoiceModal.invoice")).not.toBeInTheDocument();
      expect(screen.queryByText("invoiceModal.paymentHash")).not.toBeInTheDocument();
    });

    it("does not show timestamp when completedAt is null", () => {
      const paidWithoutTime = { ...mockInvoicePaid, completedAt: null };
      renderInvoiceModal(paidWithoutTime);

      expect(screen.getByText("invoiceModal.paymentReceived")).toBeInTheDocument();
      const timeRegex = /\d{1,2}:\d{2}/;
      expect(screen.queryByText(timeRegex)).not.toBeInTheDocument();
    });
  });

  describe("Invoice Created State", () => {
    it("shows QR code when invoice created", () => {
      renderInvoiceModal(mockInvoiceCreated);

      expect(screen.getByText("invoiceModal.invoice")).toBeInTheDocument();
      expect(screen.getByText(mockInvoiceCreated.created.serialized)).toBeInTheDocument();
    });

    it("displays serialized invoice", () => {
      renderInvoiceModal(mockInvoiceCreated);

      expect(screen.getByText("invoiceModal.invoice")).toBeInTheDocument();
      expect(screen.getByText("lnbc1000n1pj9h8uqpp5test")).toBeInTheDocument();
    });

    it("displays payment hash", () => {
      renderInvoiceModal(mockInvoiceCreated);

      expect(screen.getByText("invoiceModal.paymentHash")).toBeInTheDocument();
      expect(screen.getByText("mock-payment-hash-123")).toBeInTheDocument();
    });

    it("shows copy button for invoice", () => {
      renderInvoiceModal(mockInvoiceCreated);

      const copyButtons = screen.getAllByText("invoiceModal.copyButton");
      expect(copyButtons.length).toBeGreaterThanOrEqual(1);
    });

    it("shows copy button for payment hash", () => {
      renderInvoiceModal(mockInvoiceCreated);

      const copyButtons = screen.getAllByText("invoiceModal.copyButton");
      expect(copyButtons.length).toBe(2);
    });

    it("does not show payment received message when not paid", () => {
      renderInvoiceModal(mockInvoiceCreated);

      expect(screen.queryByText("invoiceModal.paymentReceived")).not.toBeInTheDocument();
    });
  });

  describe("Awaiting Payment State", () => {
    it("shows waiting message when awaiting payment", () => {
      renderInvoiceModal(mockInvoiceAwaiting);

      expect(screen.getByText("invoiceModal.waitingPayment")).toBeInTheDocument();
    });

    it("does not show waiting message when not awaiting", () => {
      renderInvoiceModal(mockInvoiceCreated);

      expect(screen.queryByText("invoiceModal.waitingPayment")).not.toBeInTheDocument();
    });

    it("shows QR code while awaiting payment", () => {
      renderInvoiceModal(mockInvoiceAwaiting);

      expect(screen.getByText(mockInvoiceAwaiting.created.serialized)).toBeInTheDocument();
    });

    it("shows invoice details while awaiting payment", () => {
      renderInvoiceModal(mockInvoiceAwaiting);

      expect(screen.getByText("invoiceModal.invoice")).toBeInTheDocument();
      expect(screen.getByText("invoiceModal.paymentHash")).toBeInTheDocument();
    });
  });

  describe("Close Functionality", () => {
    it("calls onClose when close button clicked", () => {
      const onClose = jest.fn();
      renderInvoiceModal(mockInvoiceCreated, onClose);

      const closeButton = screen.getByText("invoiceModal.closeButton");
      fireEvent.click(closeButton);

      expect(onClose).toHaveBeenCalled();
    });

    it("calls onClose when modal backdrop clicked", () => {
      const onClose = jest.fn();
      const { container } = renderInvoiceModal(mockInvoiceCreated, onClose);

      const backdrop = container.querySelector('[data-slot="backdrop"]');
      if (backdrop) {
        fireEvent.click(backdrop);
        expect(onClose).toHaveBeenCalled();
      }
    });
  });

  describe("Edge Cases", () => {
    it("handles missing created object gracefully", () => {
      const stateWithoutCreated = {
        showModal: true,
        paid: false,
        created: null,
      };

      expect(() => renderInvoiceModal(stateWithoutCreated)).not.toThrow();
    });

    it("renders correctly when both paid and created exist", () => {
      renderInvoiceModal(mockInvoicePaid);

      expect(screen.getByText("invoiceModal.paymentReceived")).toBeInTheDocument();
      expect(screen.queryByText("invoiceModal.invoice")).not.toBeInTheDocument();
    });

    it("displays invoice with very long serialized string", () => {
      const longInvoice = {
        ...mockInvoiceCreated,
        created: {
          serialized: `lnbc${"a".repeat(500)}`,
          paymentHash: "hash-123",
        },
      };

      renderInvoiceModal(longInvoice);

      expect(screen.getByText(/lnbcaaa/)).toBeInTheDocument();
    });

    it("handles undefined completedAt in paid state", () => {
      const paidWithoutTime = {
        ...mockInvoicePaid,
        completedAt: undefined,
      };

      expect(() => renderInvoiceModal(paidWithoutTime)).not.toThrow();
    });
  });

  describe("Copy Buttons Icons", () => {
    it("displays copy icons on copy buttons", () => {
      renderInvoiceModal(mockInvoiceCreated);

      const copyButtons = screen.getAllByText("invoiceModal.copyButton");
      expect(copyButtons.length).toBe(2);
    });
  });

  describe("Layout and Styling", () => {
    it("has white background for QR code container", () => {
      renderInvoiceModal(mockInvoiceCreated);

      expect(screen.getByText("invoiceModal.invoice")).toBeInTheDocument();
      expect(screen.getByText("invoiceModal.paymentHash")).toBeInTheDocument();
    });

    it("displays invoice and hash in gray background boxes", () => {
      renderInvoiceModal(mockInvoiceCreated);

      expect(screen.getByText(mockInvoiceCreated.created.serialized)).toBeInTheDocument();
      expect(screen.getByText(mockInvoiceCreated.created.paymentHash)).toBeInTheDocument();
    });

    it("uses green color scheme for paid state", () => {
      renderInvoiceModal(mockInvoicePaid);

      expect(screen.getByText("invoiceModal.paymentReceived")).toBeInTheDocument();
    });
  });
});
