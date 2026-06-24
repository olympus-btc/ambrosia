import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import BitcoinPriceService from "@/services/bitcoinPriceService";
import * as walletService from "@/services/walletService";
import { I18nProvider } from "@i18n/I18nProvider";

import { ReceiveTab } from "../ReceiveTab";

jest.mock("@/components/hooks/useCurrency", () => ({
  useCurrency: () => ({
    currency: { acronym: "USD", symbol: "$", locale: "en-US" },
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

const mockFiatToSatoshis = BitcoinPriceService.__mockFiatToSatoshis;

function renderReceiveTab(props = {}) {
  const defaultProps = {
    invoiceActions: {
      createInvoice: jest.fn(),
      closeModal: jest.fn(),
      markAsPaid: jest.fn(),
    },
  };

  return render(
    <I18nProvider>
      <ReceiveTab {...defaultProps} {...props} />
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

    if (args[0] instanceof Error && args[0].message === "API Error") {
      return;
    }
    originalError.call(console, ...args);
  };

  jest.clearAllMocks();
  mockFiatToSatoshis.mockResolvedValue(5000);
  jest.spyOn(walletService, "createInvoice").mockResolvedValue({
    serialized: "lnbc1000n1...",
    paymentHash: "mock-payment-hash",
  });
});

afterEach(() => {
  console.warn = originalWarn;
  console.error = originalError;
  jest.restoreAllMocks();
});

describe("ReceiveTab Component", () => {
  describe("Rendering", () => {
    it("renders sats amount input by default", () => {
      renderReceiveTab();

      expect(screen.getByLabelText("payments.receive.invoiceAmountSatLabel")).toBeInTheDocument();
    });

    it("renders unit selector", () => {
      renderReceiveTab();

      expect(screen.getByText("payments.receive.satsOption")).toBeInTheDocument();
      expect(screen.getByText("payments.receive.fiatOption")).toBeInTheDocument();
    });

    it("switches to fiat labels when fiat mode is selected", () => {
      renderReceiveTab();

      fireEvent.click(screen.getByText("payments.receive.fiatOption"));

      expect(screen.getByLabelText("payments.receive.invoiceAmountFiatLabel")).toBeInTheDocument();
    });

    it("renders description input", () => {
      renderReceiveTab();

      expect(screen.getByLabelText("payments.receive.invoiceDescriptionLabel")).toBeInTheDocument();
    });

    it("renders create invoice button", () => {
      renderReceiveTab();

      expect(screen.getByText("payments.receive.invoiceLightningButton")).toBeInTheDocument();
    });

    it("shows placeholder in sats amount input", () => {
      renderReceiveTab();

      const amountInput = screen.getByLabelText("payments.receive.invoiceAmountSatLabel");
      expect(amountInput).toHaveAttribute("placeholder", "payments.receive.invoiceAmountSatPlaceholder");
    });
  });

  describe("Amount Validation", () => {
    it("shows error when submitting with amount less than 1", async () => {
      renderReceiveTab();

      fireEvent.click(screen.getByText("payments.receive.invoiceLightningButton"));

      await waitFor(() => {
        expect(screen.getByText("payments.receive.invoiceAmountError")).toBeInTheDocument();
      });
    });

    it("allows valid sat amount", async () => {
      renderReceiveTab();

      const amountInput = screen.getByLabelText("payments.receive.invoiceAmountSatLabel");
      fireEvent.change(amountInput, { target: { value: "1000" } });

      fireEvent.click(screen.getByText("payments.receive.invoiceLightningButton"));

      await waitFor(() => {
        expect(walletService.createInvoice).toHaveBeenCalledWith(expect.objectContaining({ amountSat: 1000, description: "" }));
      });
    });

    it("shows error when amount exceeds Number.MAX_SAFE_INTEGER", async () => {
      renderReceiveTab();

      const amountInput = screen.getByLabelText("payments.receive.invoiceAmountSatLabel");
      fireEvent.change(amountInput, { target: { value: "999999999999999999" } });

      fireEvent.click(screen.getByText("payments.receive.invoiceLightningButton"));

      await waitFor(() => {
        expect(screen.getByText("payments.receive.invoiceAmountTooLargeError")).toBeInTheDocument();
      });
    });

    it("clears amount error when user changes input", async () => {
      renderReceiveTab();

      fireEvent.click(screen.getByText("payments.receive.invoiceLightningButton"));

      await waitFor(() => {
        expect(screen.getByText("payments.receive.invoiceAmountError")).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText("payments.receive.invoiceAmountSatLabel"), {
        target: { value: "5" },
      });

      await waitFor(() => {
        expect(screen.queryByText("payments.receive.invoiceAmountError")).not.toBeInTheDocument();
      });
    });

    it("shows conversion error when fiat conversion fails", async () => {
      mockFiatToSatoshis.mockRejectedValueOnce(new Error("price unavailable"));
      renderReceiveTab();

      fireEvent.click(screen.getByText("payments.receive.fiatOption"));

      const amountInput = screen.getByLabelText("payments.receive.invoiceAmountFiatLabel");
      fireEvent.change(amountInput, { target: { value: "1.50" } });

      await waitFor(() => {
        expect(screen.getAllByText("payments.receive.invoiceFiatToSatsError")).toHaveLength(2);
      });
    });
  });

  describe("Creating Invoice", () => {
    it("calls createInvoice with sat amount and description", async () => {
      renderReceiveTab();

      const amountInput = screen.getByLabelText("payments.receive.invoiceAmountSatLabel");
      const descInput = screen.getByLabelText("payments.receive.invoiceDescriptionLabel");

      fireEvent.change(amountInput, { target: { value: "5000" } });
      await userEvent.type(descInput, "Test payment");

      fireEvent.click(screen.getByText("payments.receive.invoiceLightningButton"));

      await waitFor(() => {
        expect(walletService.createInvoice).toHaveBeenCalledWith(expect.objectContaining({ amountSat: 5000, description: "Test payment" }));
      });
    });

    it("converts fiat amount before creating invoice", async () => {
      renderReceiveTab();

      fireEvent.click(screen.getByText("payments.receive.fiatOption"));

      const amountInput = screen.getByLabelText("payments.receive.invoiceAmountFiatLabel");
      fireEvent.change(amountInput, { target: { value: "1.50" } });

      await waitFor(() => {
        expect(mockFiatToSatoshis).toHaveBeenCalledWith(1.5, "USD");
      });

      fireEvent.click(screen.getByText("payments.receive.invoiceLightningButton"));

      await waitFor(() => {
        expect(walletService.createInvoice).toHaveBeenCalledWith(expect.objectContaining({ amountSat: 5000, description: "" }));
      });
    });

    it("sends exchangeRate and fiatAmount when currentRate is provided", async () => {
      renderReceiveTab({ currentRate: 95000 });

      fireEvent.change(screen.getByLabelText("payments.receive.invoiceAmountSatLabel"), {
        target: { value: "100000" },
      });

      fireEvent.click(screen.getByText("payments.receive.invoiceLightningButton"));

      await waitFor(() => {
        expect(walletService.createInvoice).toHaveBeenCalledWith(
          expect.objectContaining({
            amountSat: 100000,
            exchangeRate: 95000,
            fiatAmount: (100000 / 100_000_000) * 95000,
          }),
        );
      });
    });

    it("sends null rate fields when currentRate is not provided", async () => {
      renderReceiveTab();

      fireEvent.change(screen.getByLabelText("payments.receive.invoiceAmountSatLabel"), {
        target: { value: "100000" },
      });

      fireEvent.click(screen.getByText("payments.receive.invoiceLightningButton"));

      await waitFor(() => {
        expect(walletService.createInvoice).toHaveBeenCalledWith(
          expect.objectContaining({
            exchangeRate: null,
            fiatAmount: null,
          }),
        );
      });
    });

    it("calls invoiceActions.createInvoice with result", async () => {
      const invoiceActions = {
        createInvoice: jest.fn(),
        closeModal: jest.fn(),
        markAsPaid: jest.fn(),
      };
      renderReceiveTab({ invoiceActions });

      fireEvent.change(screen.getByLabelText("payments.receive.invoiceAmountSatLabel"), {
        target: { value: "1000" },
      });

      fireEvent.click(screen.getByText("payments.receive.invoiceLightningButton"));

      await waitFor(() => {
        expect(invoiceActions.createInvoice).toHaveBeenCalledWith({
          serialized: "lnbc1000n1...",
          paymentHash: "mock-payment-hash",
        });
      });
    });

    it("clears form after successful invoice creation", async () => {
      renderReceiveTab();

      const amountInput = screen.getByLabelText("payments.receive.invoiceAmountSatLabel");
      const descInput = screen.getByLabelText("payments.receive.invoiceDescriptionLabel");

      fireEvent.change(amountInput, { target: { value: "1000" } });
      await userEvent.type(descInput, "Test");

      fireEvent.click(screen.getByText("payments.receive.invoiceLightningButton"));

      await waitFor(() => {
        const resetAmountInput = screen.getByLabelText("payments.receive.invoiceAmountSatLabel");
        expect(resetAmountInput.value).toBe("");
        expect(descInput).toHaveValue("");
      });
    });

    it("handles API error gracefully without crashing", async () => {
      jest.spyOn(walletService, "createInvoice").mockRejectedValue(new Error("API Error"));
      renderReceiveTab();

      fireEvent.change(screen.getByLabelText("payments.receive.invoiceAmountSatLabel"), {
        target: { value: "1000" },
      });

      fireEvent.click(screen.getByText("payments.receive.invoiceLightningButton"));

      await waitFor(() => {
        expect(screen.getByText("payments.receive.invoiceLightningButton")).toBeInTheDocument();
      });
    });
  });

  describe("Loading State", () => {
    it("shows loading text while creating invoice", async () => {
      jest.spyOn(walletService, "createInvoice").mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 500)),
      );

      renderReceiveTab();

      fireEvent.change(screen.getByLabelText("payments.receive.invoiceAmountSatLabel"), {
        target: { value: "1000" },
      });

      fireEvent.click(screen.getByText("payments.receive.invoiceLightningButton"));

      await waitFor(() => {
        expect(screen.getByText("payments.receive.invoiceLightningLoading")).toBeInTheDocument();
      });
    });

    it("disables inputs while creating invoice", async () => {
      jest.spyOn(walletService, "createInvoice").mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 500)),
      );

      renderReceiveTab();

      const amountInput = screen.getByLabelText("payments.receive.invoiceAmountSatLabel");
      fireEvent.change(amountInput, { target: { value: "1000" } });

      fireEvent.click(screen.getByText("payments.receive.invoiceLightningButton"));

      await waitFor(() => {
        expect(amountInput).toBeDisabled();
      });
    });
  });

  describe("Optional Description", () => {
    it("creates invoice without description", async () => {
      renderReceiveTab();

      fireEvent.change(screen.getByLabelText("payments.receive.invoiceAmountSatLabel"), {
        target: { value: "1000" },
      });

      fireEvent.click(screen.getByText("payments.receive.invoiceLightningButton"));

      await waitFor(() => {
        expect(walletService.createInvoice).toHaveBeenCalledWith(expect.objectContaining({ amountSat: 1000, description: "" }));
      });
    });

    it("shows placeholder for description", () => {
      renderReceiveTab();

      const descInput = screen.getByLabelText("payments.receive.invoiceDescriptionLabel");
      expect(descInput).toHaveAttribute("placeholder", "payments.receive.invoiceDescriptionPlaceholder");
    });
  });

  describe("driver.js tour anchor elements", () => {
    it("renders #wallet-receive-amount element for tour step 1", () => {
      renderReceiveTab();

      expect(document.getElementById("wallet-receive-amount")).toBeInTheDocument();
    });

    it("renders #wallet-receive-description element for tour step 2", () => {
      renderReceiveTab();

      expect(document.getElementById("wallet-receive-description")).toBeInTheDocument();
    });

    it("renders #wallet-receive-button element for tour step 3", () => {
      renderReceiveTab();

      expect(document.getElementById("wallet-receive-button")).toBeInTheDocument();
    });
  });
});
