import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import BitcoinPriceService from "@/services/bitcoinPriceService";
import { I18nProvider } from "@i18n/I18nProvider";

import { PaymentConfirmModal } from "../PaymentConfirmModal";

jest.mock("@/components/hooks/useCurrency", () => ({
  useCurrency: () => ({
    currency: { acronym: "USD", symbol: "$", locale: "en-US" },
    formatAmount: jest.fn((cents) => `$ ${(cents / 100).toFixed(2)}`),
  }),
}));

jest.mock("@/services/bitcoinPriceService", () => {
  const satoshisToFiat = jest.fn(() => new Promise(() => {}));
  const fiatToSatoshis = jest.fn().mockResolvedValue(5000);
  const MockedBitcoinPriceService = jest.fn().mockImplementation(() => ({
    satoshisToFiat,
    fiatToSatoshis,
  }));
  MockedBitcoinPriceService.__mockSatoshisToFiat = satoshisToFiat;
  MockedBitcoinPriceService.__mockFiatToSatoshis = fiatToSatoshis;

  return {
    __esModule: true,
    default: MockedBitcoinPriceService,
  };
});

const mockSatoshisToFiat = BitcoinPriceService.__mockSatoshisToFiat;
const mockFiatToSatoshis = BitcoinPriceService.__mockFiatToSatoshis;

const mockPaymentResult = {
  recipientAmountSat: 1000,
  routingFeeSat: 5,
  paymentHash: "mock-hash-123",
};

function renderModal(props = {}) {
  const defaults = {
    decodedInvoice: { amountSat: 1000, description: "test payment" },
    isOpen: true,
    onClose: jest.fn(),
    onConfirm: jest.fn(),
    paymentResult: null,
    isLoading: false,
  };
  return render(
    <I18nProvider>
      <PaymentConfirmModal {...defaults} {...props} />
    </I18nProvider>,
  );
}

describe("PaymentConfirmModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSatoshisToFiat.mockImplementation(() => new Promise(() => {}));
    mockFiatToSatoshis.mockResolvedValue(5000);
  });

  describe("Confirm state", () => {
    it("renders the confirm modal title", () => {
      renderModal();
      expect(screen.getByText("payments.send.confirmModal.title")).toBeInTheDocument();
    });

    it("renders cancel and confirm buttons", () => {
      renderModal();
      expect(screen.getByText("payments.send.confirmModal.cancelButton")).toBeInTheDocument();
      expect(screen.getByText("payments.send.confirmModal.confirmButton")).toBeInTheDocument();
    });

    it("renders amount in sats", () => {
      renderModal();
      expect(screen.getByText("1,000 sats")).toBeInTheDocument();
    });

    it("renders description when present", () => {
      renderModal();
      expect(screen.getByText("test payment")).toBeInTheDocument();
    });

    it("does not render description section when null", () => {
      renderModal({ decodedInvoice: { amountSat: 1000, description: null } });
      expect(screen.queryByText("payments.send.confirmModal.descriptionLabel")).not.toBeInTheDocument();
    });

    it("renders amount and estimated labels for fixed invoices", () => {
      renderModal();
      expect(screen.getByText("payments.send.confirmModal.amountLabel")).toBeInTheDocument();
      expect(screen.getByText("payments.send.confirmModal.estimatedLabel")).toBeInTheDocument();
    });

    it("calls onClose when cancel is clicked", () => {
      const onClose = jest.fn();
      renderModal({ onClose });
      fireEvent.click(screen.getByText("payments.send.confirmModal.cancelButton"));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("calls onConfirm with null for invoices with amount", async () => {
      const onConfirm = jest.fn();
      renderModal({ onConfirm });
      fireEvent.click(screen.getByText("payments.send.confirmModal.confirmButton"));
      await waitFor(() => {
        expect(onConfirm).toHaveBeenCalledWith(null);
      });
    });

    it("disables cancel button when loading", () => {
      const onClose = jest.fn();
      renderModal({ isLoading: true, onClose });
      const cancelButton = screen.getByText("payments.send.confirmModal.cancelButton");
      expect(cancelButton).toBeDisabled();
    });
  });

  describe("Success state", () => {
    it("renders payment done title when result is present", () => {
      renderModal({ paymentResult: mockPaymentResult });
      expect(screen.getByText("payments.send.paymentDone")).toBeInTheDocument();
    });

    it("does not render confirm/cancel buttons in success state", () => {
      renderModal({ paymentResult: mockPaymentResult });
      expect(screen.queryByText("payments.send.confirmModal.cancelButton")).not.toBeInTheDocument();
      expect(screen.queryByText("payments.send.confirmModal.confirmButton")).not.toBeInTheDocument();
    });

    it("renders close button in success state", () => {
      renderModal({ paymentResult: mockPaymentResult });
      expect(screen.getByText("payments.send.closeButton")).toBeInTheDocument();
    });

    it("renders success message in success state", () => {
      renderModal({ paymentResult: mockPaymentResult });
      expect(screen.getByText("payments.send.paySuccessTitle")).toBeInTheDocument();
    });

    it("renders payment amount in success state", () => {
      renderModal({ paymentResult: mockPaymentResult });
      expect(screen.getByText("1,000 sats")).toBeInTheDocument();
    });

    it("renders estimated fiat in success state", async () => {
      mockSatoshisToFiat.mockResolvedValueOnce(0.62);
      renderModal({ paymentResult: mockPaymentResult });

      expect(screen.getByText("payments.send.estimatedLabel")).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText("$0.62")).toBeInTheDocument();
      });
    });

    it("renders routing fee in success state", () => {
      renderModal({ paymentResult: mockPaymentResult });
      expect(screen.getByText("5 sats")).toBeInTheDocument();
    });

    it("renders payment hash in success state", () => {
      renderModal({ paymentResult: mockPaymentResult });
      expect(screen.getByText("mock-hash-123")).toBeInTheDocument();
    });

    it("calls onClose when close button is clicked", () => {
      const onClose = jest.fn();
      renderModal({ paymentResult: mockPaymentResult, onClose });
      fireEvent.click(screen.getByText("payments.send.closeButton"));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("Zero-amount invoices", () => {
    it("renders amount input for zero-amount invoices", () => {
      renderModal({ decodedInvoice: { amountSat: null, description: null } });
      expect(screen.getByText("payments.send.confirmModal.zeroAmountTitle")).toBeInTheDocument();
      expect(screen.getByLabelText("payments.send.confirmModal.zeroAmountLabel")).toBeInTheDocument();
    });

    it("does not render amount input for invoices with amount", () => {
      renderModal();
      expect(screen.queryByText("payments.send.confirmModal.zeroAmountTitle")).not.toBeInTheDocument();
    });

    it("disables confirm button when custom amount is empty", () => {
      renderModal({ decodedInvoice: { amountSat: null, description: null } });
      const confirmButton = screen.getByText("payments.send.confirmModal.confirmButton");
      expect(confirmButton).toBeDisabled();
    });

    it("disables confirm button when sat amount is negative", () => {
      renderModal({ decodedInvoice: { amountSat: null, description: null } });
      const amountInput = screen.getByLabelText("payments.send.confirmModal.zeroAmountLabel");
      fireEvent.change(amountInput, { target: { value: "-10" } });
      const confirmButton = screen.getByText("payments.send.confirmModal.confirmButton");
      expect(confirmButton).toBeDisabled();
    });

    it("calls onConfirm with custom amount for zero-amount invoices", async () => {
      const onConfirm = jest.fn();
      renderModal({ decodedInvoice: { amountSat: null, description: null }, onConfirm });
      const amountInput = screen.getByLabelText("payments.send.confirmModal.zeroAmountLabel");
      fireEvent.change(amountInput, { target: { value: "5000" } });
      fireEvent.click(screen.getByText("payments.send.confirmModal.confirmButton"));
      await waitFor(() => {
        expect(onConfirm).toHaveBeenCalledWith(5000);
      });
    });

    it("calls onConfirm with converted sats for fiat zero-amount invoices", async () => {
      const onConfirm = jest.fn();
      renderModal({ decodedInvoice: { amountSat: null, description: null }, onConfirm });

      fireEvent.click(screen.getByText("payments.send.confirmModal.fiatOption"));

      const amountInput = screen.getByLabelText("payments.send.confirmModal.zeroAmountFiatLabel");
      fireEvent.change(amountInput, { target: { value: "1.50" } });

      await waitFor(() => {
        expect(mockFiatToSatoshis).toHaveBeenCalledWith(1.5, "USD");
      });

      await waitFor(() => {
        expect(screen.getByText("5,000 sats")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("payments.send.confirmModal.confirmButton"));

      await waitFor(() => {
        expect(onConfirm).toHaveBeenCalledWith(5000);
      });
    });
  });
});
