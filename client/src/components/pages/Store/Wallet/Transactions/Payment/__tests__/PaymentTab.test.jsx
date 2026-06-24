import { addToast } from "@heroui/react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import BitcoinPriceService from "@/services/bitcoinPriceService";
import * as walletService from "@/services/walletService";
import { I18nProvider } from "@i18n/I18nProvider";

import { PaymentTab } from "../PaymentTab";

jest.mock("@heroui/react", () => {
  const actual = jest.requireActual("@heroui/react");
  return {
    ...actual,
    addToast: jest.fn(),
  };
});

jest.mock("@/components/hooks/useCurrency", () => ({
  useCurrency: () => ({
    currency: { acronym: "USD", symbol: "$", locale: "en-US" },
    formatAmount: jest.fn(),
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

const originalWarn = console.warn;
const originalError = console.error;

function renderSendTab(props = {}) {
  return render(
    <I18nProvider>
      <PaymentTab {...props} />
    </I18nProvider>,
  );
}

function typeInvoice(input, value) {
  fireEvent.change(input, { target: { value } });
}

beforeEach(() => {
  console.warn = jest.fn();
  console.error = jest.fn();

  jest.clearAllMocks();
  mockSatoshisToFiat.mockImplementation(() => new Promise(() => {}));
  mockFiatToSatoshis.mockResolvedValue(5000);
  jest.spyOn(walletService, "payInvoiceFromService").mockResolvedValue({
    recipientAmountSat: 1000,
    routingFeeSat: 5,
    paymentHash: "mock-payment-hash-123",
  });
  jest.spyOn(walletService, "decodeInvoice").mockResolvedValue({
    amountSat: 1000,
    description: "test payment",
  });
});

afterEach(() => {
  console.warn = originalWarn;
  console.error = originalError;
  jest.restoreAllMocks();
});

describe("SendTab Component", () => {
  describe("Rendering", () => {
    it("renders invoice input", () => {
      renderSendTab();
      expect(screen.getByLabelText("payments.send.payInvoiceLabel")).toBeInTheDocument();
    });

    it("renders pay button", () => {
      renderSendTab();
      expect(screen.getByText("payments.send.payLightningButton")).toBeInTheDocument();
    });

    it("shows placeholder in invoice input", () => {
      renderSendTab();
      expect(screen.getByLabelText("payments.send.payInvoiceLabel")).toHaveAttribute("placeholder", "lnbc1...");
    });
  });

  describe("BOLT11 Validation", () => {
    it("shows inline error when submitting empty invoice", async () => {
      const { container } = renderSendTab();
      fireEvent.click(screen.getByText("payments.send.payLightningButton"));

      await waitFor(() => {
        expect(container.querySelector('[data-invalid="true"]')).toBeInTheDocument();
      });
    });

    it("shows inline error when submitting random text", async () => {
      renderSendTab();
      typeInvoice(screen.getByLabelText("payments.send.payInvoiceLabel"), "random-invalid-text");
      fireEvent.click(screen.getByText("payments.send.payLightningButton"));

      await waitFor(() => {
        expect(screen.getByText("payments.send.invalidInvoiceFormat")).toBeInTheDocument();
      });
    });

    it("rejects invoice with invalid prefix", async () => {
      renderSendTab();
      typeInvoice(screen.getByLabelText("payments.send.payInvoiceLabel"), "invalid1000n1pj9h8uqpp5test");
      fireEvent.click(screen.getByText("payments.send.payLightningButton"));

      await waitFor(() => {
        expect(screen.getByText("payments.send.invalidInvoiceFormat")).toBeInTheDocument();
      });
    });

    it("rejects invoice shorter than 20 characters", async () => {
      renderSendTab();
      typeInvoice(screen.getByLabelText("payments.send.payInvoiceLabel"), "lnbc123");
      fireEvent.click(screen.getByText("payments.send.payLightningButton"));

      await waitFor(() => {
        expect(screen.getByText("payments.send.invalidInvoiceFormat")).toBeInTheDocument();
      });
    });

    it("clears error when user starts typing", async () => {
      const { container } = renderSendTab();
      const invoiceInput = screen.getByLabelText("payments.send.payInvoiceLabel");

      fireEvent.click(screen.getByText("payments.send.payLightningButton"));
      await waitFor(() => {
        expect(container.querySelector('[data-invalid="true"]')).toBeInTheDocument();
      });

      typeInvoice(invoiceInput, "lnbc");
      await waitFor(() => {
        expect(container.querySelector('[data-invalid="true"]')).not.toBeInTheDocument();
      });
    });

    it("shows visual error state on Input", async () => {
      const { container } = renderSendTab();
      fireEvent.click(screen.getByText("payments.send.payLightningButton"));

      await waitFor(() => {
        expect(container.querySelector('[data-invalid="true"]')).toBeInTheDocument();
      });
    });
  });

  describe("Decode + Confirm Flow", () => {
    it("calls decodeInvoice when clicking pay with valid invoice", async () => {
      renderSendTab();
      typeInvoice(screen.getByLabelText("payments.send.payInvoiceLabel"), "lnbc1000n1pj9h8uqpp5test");
      fireEvent.click(screen.getByText("payments.send.payLightningButton"));

      await waitFor(() => {
        expect(walletService.decodeInvoice).toHaveBeenCalledWith("lnbc1000n1pj9h8uqpp5test");
      });
    });

    it("opens confirm modal after decoding", async () => {
      renderSendTab();
      typeInvoice(screen.getByLabelText("payments.send.payInvoiceLabel"), "lnbc1000n1pj9h8uqpp5test");
      fireEvent.click(screen.getByText("payments.send.payLightningButton"));

      await waitFor(() => {
        expect(screen.getByText("payments.send.confirmModal.title")).toBeInTheDocument();
      });
    });

    it("shows decoding error toast when decodeInvoice fails", async () => {
      jest.spyOn(walletService, "decodeInvoice").mockRejectedValue(new Error("Decode failed"));

      renderSendTab();
      typeInvoice(screen.getByLabelText("payments.send.payInvoiceLabel"), "lnbc1000n1pj9h8uqpp5test");
      fireEvent.click(screen.getByText("payments.send.payLightningButton"));

      await waitFor(() => {
        expect(addToast).toHaveBeenCalledWith(expect.objectContaining({
          description: "payments.send.confirmModal.decodingError",
          color: "danger",
        }));
      });
    });

    it("calls payInvoiceFromService when confirming payment", async () => {
      renderSendTab();
      typeInvoice(screen.getByLabelText("payments.send.payInvoiceLabel"), "lnbc1000n1pj9h8uqpp5test");
      fireEvent.click(screen.getByText("payments.send.payLightningButton"));

      await waitFor(() => {
        expect(screen.getByText("payments.send.confirmModal.title")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("payments.send.confirmModal.confirmButton"));

      await waitFor(() => {
        expect(walletService.payInvoiceFromService).toHaveBeenCalledWith("lnbc1000n1pj9h8uqpp5test", null, expect.any(Object));
      });
    });

    it("shows payment success in modal after confirming payment", async () => {
      renderSendTab();
      typeInvoice(screen.getByLabelText("payments.send.payInvoiceLabel"), "lnbc1000n1pj9h8uqpp5test");
      fireEvent.click(screen.getByText("payments.send.payLightningButton"));

      await waitFor(() => {
        expect(screen.getByText("payments.send.confirmModal.title")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("payments.send.confirmModal.confirmButton"));

      await waitFor(() => {
        expect(screen.getByText("payments.send.paymentDone")).toBeInTheDocument();
      });
    });

    it("displays payment amount in success view", async () => {
      renderSendTab();
      typeInvoice(screen.getByLabelText("payments.send.payInvoiceLabel"), "lnbc1000n1pj9h8uqpp5test");
      fireEvent.click(screen.getByText("payments.send.payLightningButton"));

      await waitFor(() => {
        expect(screen.getByText("payments.send.confirmModal.title")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("payments.send.confirmModal.confirmButton"));

      await waitFor(() => {
        expect(screen.getByText("1,000 sats")).toBeInTheDocument();
      });
    });

    it("displays routing fee in success view", async () => {
      renderSendTab();
      typeInvoice(screen.getByLabelText("payments.send.payInvoiceLabel"), "lnbc1000n1pj9h8uqpp5test");
      fireEvent.click(screen.getByText("payments.send.payLightningButton"));

      await waitFor(() => {
        expect(screen.getByText("payments.send.confirmModal.title")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("payments.send.confirmModal.confirmButton"));

      await waitFor(() => {
        expect(screen.getByText("5 sats")).toBeInTheDocument();
      });
    });

    it("displays payment hash in success view", async () => {
      renderSendTab();
      typeInvoice(screen.getByLabelText("payments.send.payInvoiceLabel"), "lnbc1000n1pj9h8uqpp5test");
      fireEvent.click(screen.getByText("payments.send.payLightningButton"));

      await waitFor(() => {
        expect(screen.getByText("payments.send.confirmModal.title")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("payments.send.confirmModal.confirmButton"));

      await waitFor(() => {
        expect(screen.getByText("mock-payment-hash-123")).toBeInTheDocument();
      });
    });

    it("clears form after successful payment", async () => {
      renderSendTab();
      const invoiceInput = screen.getByLabelText("payments.send.payInvoiceLabel");
      typeInvoice(invoiceInput, "lnbc1000n1pj9h8uqpp5test");
      fireEvent.click(screen.getByText("payments.send.payLightningButton"));

      await waitFor(() => {
        expect(screen.getByText("payments.send.confirmModal.title")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("payments.send.confirmModal.confirmButton"));

      await waitFor(() => {
        expect(invoiceInput).toHaveValue("");
      });
    });

    it("closes modal on cancel", async () => {
      renderSendTab();
      typeInvoice(screen.getByLabelText("payments.send.payInvoiceLabel"), "lnbc1000n1pj9h8uqpp5test");
      fireEvent.click(screen.getByText("payments.send.payLightningButton"));

      await waitFor(() => {
        expect(screen.getByText("payments.send.confirmModal.title")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("payments.send.confirmModal.cancelButton"));

      await waitFor(() => {
        expect(screen.queryByText("payments.send.confirmModal.title")).not.toBeInTheDocument();
      });
    });

    it("keeps invoice input after cancelling confirm", async () => {
      renderSendTab();
      const invoiceInput = screen.getByLabelText("payments.send.payInvoiceLabel");
      typeInvoice(invoiceInput, "lnbc1000n1pj9h8uqpp5test");
      fireEvent.click(screen.getByText("payments.send.payLightningButton"));

      await waitFor(() => {
        expect(screen.getByText("payments.send.confirmModal.title")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("payments.send.confirmModal.cancelButton"));

      await waitFor(() => {
        expect(invoiceInput).toHaveValue("lnbc1000n1pj9h8uqpp5test");
      });
    });

    it("handles zero-amount invoice with custom amount", async () => {
      jest.spyOn(walletService, "decodeInvoice").mockResolvedValue({
        amountSat: null,
        description: null,
      });

      renderSendTab();
      typeInvoice(screen.getByLabelText("payments.send.payInvoiceLabel"), "lnbc1000n1pj9h8uqpp5test");
      fireEvent.click(screen.getByText("payments.send.payLightningButton"));

      await waitFor(() => {
        expect(screen.getByText("payments.send.confirmModal.zeroAmountTitle")).toBeInTheDocument();
      });

      const amountInput = screen.getByLabelText("payments.send.confirmModal.zeroAmountLabel");
      fireEvent.change(amountInput, { target: { value: "5000" } });

      fireEvent.click(screen.getByText("payments.send.confirmModal.confirmButton"));

      await waitFor(() => {
        expect(walletService.payInvoiceFromService).toHaveBeenCalledWith("lnbc1000n1pj9h8uqpp5test", 5000, expect.any(Object));
      });
    });

    it("handles zero-amount invoice with fiat amount", async () => {
      jest.spyOn(walletService, "decodeInvoice").mockResolvedValue({
        amountSat: null,
        description: null,
      });

      renderSendTab();
      typeInvoice(screen.getByLabelText("payments.send.payInvoiceLabel"), "lnbc1000n1pj9h8uqpp5test");
      fireEvent.click(screen.getByText("payments.send.payLightningButton"));

      await waitFor(() => {
        expect(screen.getByText("payments.send.confirmModal.zeroAmountTitle")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("payments.send.confirmModal.fiatOption"));

      const amountInput = screen.getByLabelText("payments.send.confirmModal.zeroAmountFiatLabel");
      fireEvent.change(amountInput, { target: { value: "1.50" } });

      await waitFor(() => {
        expect(mockFiatToSatoshis).toHaveBeenCalledWith(1.5, "USD");
      });

      fireEvent.click(screen.getByText("payments.send.confirmModal.confirmButton"));

      await waitFor(() => {
        expect(walletService.payInvoiceFromService).toHaveBeenCalledWith("lnbc1000n1pj9h8uqpp5test", 5000, expect.any(Object));
      });
    });
  });

  describe("Error Handling", () => {
    it("handles API error gracefully without crashing", async () => {
      jest.spyOn(walletService, "payInvoiceFromService").mockRejectedValue(new Error("API Error"));

      renderSendTab();
      typeInvoice(screen.getByLabelText("payments.send.payInvoiceLabel"), "lnbc1000n1pj9h8uqpp5test");
      fireEvent.click(screen.getByText("payments.send.payLightningButton"));

      await waitFor(() => {
        expect(screen.getByText("payments.send.confirmModal.title")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("payments.send.confirmModal.confirmButton"));

      await waitFor(() => {
        expect(screen.getByText("payments.send.payLightningButton")).toBeInTheDocument();
      });
    });

    it("shows translated error when invoice was already paid", async () => {
      jest.spyOn(walletService, "payInvoiceFromService").mockRejectedValue(
        Object.assign(new Error("This invoice has already been paid"), {
          code: "invoice_already_paid",
        }),
      );

      renderSendTab();
      const invoiceInput = screen.getByLabelText("payments.send.payInvoiceLabel");
      typeInvoice(invoiceInput, "lnbc1000n1pj9h8uqpp5test");
      fireEvent.click(screen.getByText("payments.send.payLightningButton"));

      await waitFor(() => {
        expect(screen.getByText("payments.send.confirmModal.title")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("payments.send.confirmModal.confirmButton"));

      await waitFor(() => {
        expect(addToast).toHaveBeenCalledWith(expect.objectContaining({
          title: "payments.send.paymentError",
          description: "payments.send.errors.invoiceAlreadyPaid",
          color: "danger",
        }));
      });

      expect(console.warn).toHaveBeenCalled();
      expect(console.error).not.toHaveBeenCalledWith(expect.objectContaining({
        code: "invoice_already_paid",
      }));
    });

    it("shows translated error when invoice has expired", async () => {
      jest.spyOn(walletService, "payInvoiceFromService").mockRejectedValue(
        Object.assign(new Error("This invoice has expired"), {
          code: "invoice_expired",
        }),
      );

      renderSendTab();
      typeInvoice(screen.getByLabelText("payments.send.payInvoiceLabel"), "lnbc1000n1pj9h8uqpp5test");
      fireEvent.click(screen.getByText("payments.send.payLightningButton"));

      await waitFor(() => {
        expect(screen.getByText("payments.send.confirmModal.title")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("payments.send.confirmModal.confirmButton"));

      await waitFor(() => {
        expect(addToast).toHaveBeenCalledWith(expect.objectContaining({
          title: "payments.send.paymentError",
          description: "payments.send.errors.invoiceExpired",
          color: "danger",
        }));
      });
    });

    it("uses backend message as fallback for unknown errors", async () => {
      jest.spyOn(walletService, "payInvoiceFromService").mockRejectedValue(
        Object.assign(new Error("phoenixd custom failure"), {
          code: "unknown",
        }),
      );

      renderSendTab();
      typeInvoice(screen.getByLabelText("payments.send.payInvoiceLabel"), "lnbc1000n1pj9h8uqpp5test");
      fireEvent.click(screen.getByText("payments.send.payLightningButton"));

      await waitFor(() => {
        expect(screen.getByText("payments.send.confirmModal.title")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("payments.send.confirmModal.confirmButton"));

      await waitFor(() => {
        expect(addToast).toHaveBeenCalledWith(expect.objectContaining({
          description: "phoenixd custom failure",
        }));
      });
    });
  });

  describe("Loading State", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("shows loading text while decoding invoice", async () => {
      jest.spyOn(walletService, "decodeInvoice").mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 500)),
      );

      renderSendTab();
      typeInvoice(screen.getByLabelText("payments.send.payInvoiceLabel"), "lnbc1000n1pj9h8uqpp5test");
      fireEvent.click(screen.getByText("payments.send.payLightningButton"));

      await waitFor(() => {
        expect(screen.getByText("payments.send.payLightningLoading")).toBeInTheDocument();
      });
    });

    it("disables input while decoding invoice", async () => {
      jest.spyOn(walletService, "decodeInvoice").mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 500)),
      );

      renderSendTab();
      const invoiceInput = screen.getByLabelText("payments.send.payInvoiceLabel");
      typeInvoice(invoiceInput, "lnbc1000n1pj9h8uqpp5test");
      fireEvent.click(screen.getByText("payments.send.payLightningButton"));

      await waitFor(() => {
        expect(invoiceInput).toBeDisabled();
      });
    });
  });

  describe("Case Insensitivity", () => {
    it("accepts invoice with uppercase prefix", async () => {
      renderSendTab();
      typeInvoice(screen.getByLabelText("payments.send.payInvoiceLabel"), "LNBC1000N1PJ9H8UQPP5TEST");
      fireEvent.click(screen.getByText("payments.send.payLightningButton"));

      await waitFor(() => {
        expect(walletService.decodeInvoice).toHaveBeenCalledWith("LNBC1000N1PJ9H8UQPP5TEST");
      });
    });

    it("accepts invoice with mixed case", async () => {
      renderSendTab();
      typeInvoice(screen.getByLabelText("payments.send.payInvoiceLabel"), "LnBc1000N1pj9h8uqpp5test");
      fireEvent.click(screen.getByText("payments.send.payLightningButton"));

      await waitFor(() => {
        expect(walletService.decodeInvoice).toHaveBeenCalledWith("LnBc1000N1pj9h8uqpp5test");
      });
    });
  });

  describe("Whitespace Handling", () => {
    it("treats whitespace-only input as empty", async () => {
      const { container } = renderSendTab();
      typeInvoice(screen.getByLabelText("payments.send.payInvoiceLabel"), "   ");
      fireEvent.click(screen.getByText("payments.send.payLightningButton"));

      await waitFor(() => {
        expect(container.querySelector('[data-invalid="true"]')).toBeInTheDocument();
      });
    });
  });
});
