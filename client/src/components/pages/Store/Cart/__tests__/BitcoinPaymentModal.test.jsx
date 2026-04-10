import { act } from "react";

import { render, screen, fireEvent } from "@testing-library/react";

import { BitcoinPaymentModal } from "../BitcoinPaymentModal";

jest.mock("react-qr-code", () => ({
  QRCode: ({ value }) => <div data-testid="qr-code" data-value={value}>QR</div>,
}));

const mockSetInvoiceHash = jest.fn();
let mockPaymentHandlers = [];
let mockConnected = true;
let mockInvoiceState = {
  invoice: null,
  satsAmount: null,
  loading: false,
  error: "",
  generateInvoice: jest.fn(),
  reset: jest.fn(),
};

jest.mock("../hooks/useBitcoinInvoice", () => ({
  useBitcoinInvoice: () => mockInvoiceState,
}));

jest.mock("@/hooks/usePaymentWebsocket", () => ({
  usePaymentWebsocket: () => ({
    setInvoiceHash: mockSetInvoiceHash,
    connected: mockConnected,
    onPayment: (handler) => {
      mockPaymentHandlers.push(handler);
      return () => {};
    },
  }),
}));

const defaultInvoice = { paymentHash: "hash-1", serialized: "ln-invoice" };

function renderModal(props = {}) {
  return render(
    <BitcoinPaymentModal
      isOpen
      amountFiat={10}
      paymentId="pay-1"
      displayTotal="$10.00"
      {...props}
    />,
  );
}

describe("BitcoinPaymentModal", () => {
  beforeEach(() => {
    mockInvoiceState = {
      invoice: null,
      satsAmount: null,
      loading: false,
      error: "",
      generateInvoice: jest.fn(),
      reset: jest.fn(),
    };
    mockSetInvoiceHash.mockClear();
    mockPaymentHandlers = [];
    mockConnected = true;
  });

  describe("Loading state", () => {
    it("shows spinner while generating invoice", () => {
      mockInvoiceState = { ...mockInvoiceState, loading: true };
      renderModal();

      expect(screen.getByText("generating")).toBeInTheDocument();
    });

    it("does not show QR while loading", () => {
      mockInvoiceState = { ...mockInvoiceState, loading: true };
      renderModal();

      expect(screen.queryByTestId("qr-code")).not.toBeInTheDocument();
    });
  });

  describe("Error state", () => {
    it("shows error message", () => {
      mockInvoiceState = { ...mockInvoiceState, error: "invoice-error" };
      renderModal();

      expect(screen.getByText("invoice-error")).toBeInTheDocument();
    });

    it("calls generateInvoice on retry", () => {
      mockInvoiceState = { ...mockInvoiceState, error: "invoice-error" };
      renderModal();

      fireEvent.click(screen.getByText("retry"));
      expect(mockInvoiceState.generateInvoice).toHaveBeenCalled();
    });
  });

  describe("Invoice display", () => {
    beforeEach(() => {
      mockInvoiceState = {
        ...mockInvoiceState,
        invoice: defaultInvoice,
        satsAmount: 500,
      };
    });

    it("renders QR code with serialized invoice value", () => {
      renderModal();

      expect(screen.getByTestId("qr-code")).toHaveAttribute("data-value", "ln-invoice");
    });

    it("shows display total", () => {
      renderModal();

      expect(screen.getByText("$10.00")).toBeInTheDocument();
    });

    it("shows sats amount", () => {
      renderModal();

      expect(screen.getByText("500 sats")).toBeInTheDocument();
    });

    it("shows waiting spinner when awaiting payment", () => {
      renderModal();

      expect(screen.getByText("waitingPayment")).toBeInTheDocument();
    });
  });

  describe("Payment confirmation via WebSocket", () => {
    it("calls onComplete with auto:true when payment received", async () => {
      const onComplete = jest.fn();
      mockInvoiceState = {
        ...mockInvoiceState,
        invoice: defaultInvoice,
        satsAmount: 500,
      };

      renderModal({ onComplete });

      act(() => {
        mockPaymentHandlers[0]({ paymentHash: "hash-1" });
      });

      expect(onComplete).toHaveBeenCalledWith({
        invoice: defaultInvoice,
        satoshis: 500,
        paymentId: "pay-1",
        auto: true,
      });
    });

    it("ignores payment with wrong hash", () => {
      const onComplete = jest.fn();
      mockInvoiceState = { ...mockInvoiceState, invoice: defaultInvoice, satsAmount: 500 };

      renderModal({ onComplete });

      act(() => {
        mockPaymentHandlers[0]({ paymentHash: "wrong-hash" });
      });

      expect(onComplete).not.toHaveBeenCalled();
    });

    it("does not fire onComplete twice for the same payment", () => {
      const onComplete = jest.fn();
      mockInvoiceState = { ...mockInvoiceState, invoice: defaultInvoice, satsAmount: 500 };

      renderModal({ onComplete });

      act(() => {
        mockPaymentHandlers[0]({ paymentHash: "hash-1" });
        mockPaymentHandlers[0]({ paymentHash: "hash-1" });
      });

      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it("shows confirmed state after payment", async () => {
      mockInvoiceState = { ...mockInvoiceState, invoice: defaultInvoice, satsAmount: 500 };

      renderModal();

      act(() => {
        mockPaymentHandlers[0]({ paymentHash: "hash-1" });
      });

      expect(await screen.findByText("confirmed")).toBeInTheDocument();
    });

    it("shows paidAt timestamp after payment", async () => {
      mockInvoiceState = { ...mockInvoiceState, invoice: defaultInvoice, satsAmount: 500 };

      renderModal();

      act(() => {
        mockPaymentHandlers[0]({ paymentHash: "hash-1" });
      });

      expect(await screen.findByText(/paidAt/)).toBeInTheDocument();
    });

    it("shows close button text after payment (not cancel)", async () => {
      mockInvoiceState = { ...mockInvoiceState, invoice: defaultInvoice, satsAmount: 500 };

      renderModal();

      act(() => {
        mockPaymentHandlers[0]({ paymentHash: "hash-1" });
      });

      expect(await screen.findByText("close")).toBeInTheDocument();
      expect(screen.queryByText("cancel")).not.toBeInTheDocument();
    });
  });

  describe("Mark as Paid button", () => {
    beforeEach(() => {
      mockInvoiceState = {
        ...mockInvoiceState,
        invoice: defaultInvoice,
        satsAmount: 500,
      };
      mockConnected = false;
    });

    it("shows button when awaiting payment and WebSocket disconnected", () => {
      renderModal();

      expect(screen.getByText("markAsPaid")).toBeInTheDocument();
    });

    it("hides button when WebSocket is connected", () => {
      mockConnected = true;
      renderModal();

      expect(screen.queryByText("markAsPaid")).not.toBeInTheDocument();
    });

    it("hides button when no invoice is present", () => {
      mockInvoiceState = { ...mockInvoiceState, invoice: null };
      renderModal();

      expect(screen.queryByText("markAsPaid")).not.toBeInTheDocument();
    });

    it("calls onComplete with auto:false when pressed", () => {
      const onComplete = jest.fn();
      renderModal({ onComplete });

      fireEvent.click(screen.getByText("markAsPaid"));

      expect(onComplete).toHaveBeenCalledWith({
        invoice: defaultInvoice,
        satoshis: 500,
        paymentId: "pay-1",
        auto: false,
      });
    });

    it("shows confirmed state after marking as paid", async () => {
      renderModal();

      fireEvent.click(screen.getByText("markAsPaid"));

      expect(await screen.findByText("confirmed")).toBeInTheDocument();
    });

    it("hides button after marking as paid", async () => {
      renderModal();

      fireEvent.click(screen.getByText("markAsPaid"));

      expect(screen.queryByText("markAsPaid")).not.toBeInTheDocument();
    });
  });

  describe("Cancel and close", () => {
    it("shows cancel button when no payment received", () => {
      renderModal();

      expect(screen.getByText("cancel")).toBeInTheDocument();
    });

    it("calls reset and onClose when cancel is pressed", () => {
      const onClose = jest.fn();
      renderModal({ onClose });

      fireEvent.click(screen.getByText("cancel"));

      expect(mockInvoiceState.reset).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });

    it("does not call setInvoiceHash when modal is closed", () => {
      render(
        <BitcoinPaymentModal
          isOpen={false}
          amountFiat={10}
          paymentId="pay-1"
          displayTotal="$10.00"
        />,
      );

      expect(mockSetInvoiceHash).not.toHaveBeenCalled();
    });
  });
});
