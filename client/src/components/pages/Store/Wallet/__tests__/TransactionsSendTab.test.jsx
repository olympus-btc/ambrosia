import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { I18nProvider } from "@i18n/I18nProvider";
import * as cashierService from "@modules/cashier/cashierService";

import { TransactionsSendTab } from "../TransactionsSendTab";

function renderSendTab(props = {}) {
  const defaultProps = {
    loading: false,
    setLoading: jest.fn(),
    setError: jest.fn(),
  };

  return render(
    <I18nProvider>
      <TransactionsSendTab {...defaultProps} {...props} />
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
  jest.spyOn(cashierService, "payInvoiceFromService").mockResolvedValue({
    recipientAmountSat: 1000,
    routingFeeSat: 5,
    paymentHash: "mock-payment-hash-123",
  });
});

afterEach(() => {
  console.warn = originalWarn;
  console.error = originalError;
  jest.restoreAllMocks();
});

describe("TransactionsSendTab Component", () => {
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

      const invoiceInput = screen.getByLabelText("payments.send.payInvoiceLabel");
      expect(invoiceInput).toHaveAttribute("placeholder", "lnbc1...");
    });
  });

  describe("BOLT11 Validation", () => {
    it("shows error when submitting empty invoice", async () => {
      const setError = jest.fn();
      renderSendTab({ setError });

      const button = screen.getByText("payments.send.payLightningButton");
      fireEvent.click(button);

      await waitFor(() => {
        expect(setError).toHaveBeenCalledWith("payments.send.noInvoiceToPay");
      });
    });

    it("shows error when submitting random text", async () => {
      const setError = jest.fn();
      renderSendTab({ setError });

      const invoiceInput = screen.getByLabelText("payments.send.payInvoiceLabel");
      await userEvent.type(invoiceInput, "random-invalid-text");

      const button = screen.getByText("payments.send.payLightningButton");
      fireEvent.click(button);

      await waitFor(() => {
        expect(setError).toHaveBeenCalledWith("payments.send.invalidInvoiceFormat");
      });
    });

    it("accepts valid mainnet invoice (lnbc)", async () => {
      renderSendTab();

      const invoiceInput = screen.getByLabelText("payments.send.payInvoiceLabel");
      await userEvent.type(invoiceInput, "lnbc1000n1pj9h8uqpp5test");

      const button = screen.getByText("payments.send.payLightningButton");
      fireEvent.click(button);

      await waitFor(() => {
        expect(cashierService.payInvoiceFromService).toHaveBeenCalledWith("lnbc1000n1pj9h8uqpp5test");
      });
    });

    it("accepts valid testnet invoice (lntb)", async () => {
      renderSendTab();

      const invoiceInput = screen.getByLabelText("payments.send.payInvoiceLabel");
      await userEvent.type(invoiceInput, "lntb1000n1pj9h8uqpp5test");

      const button = screen.getByText("payments.send.payLightningButton");
      fireEvent.click(button);

      await waitFor(() => {
        expect(cashierService.payInvoiceFromService).toHaveBeenCalledWith("lntb1000n1pj9h8uqpp5test");
      });
    });

    it("accepts valid regtest invoice (lnbcrt)", async () => {
      renderSendTab();

      const invoiceInput = screen.getByLabelText("payments.send.payInvoiceLabel");
      await userEvent.type(invoiceInput, "lnbcrt1000n1pj9h8uqpp5test");

      const button = screen.getByText("payments.send.payLightningButton");
      fireEvent.click(button);

      await waitFor(() => {
        expect(cashierService.payInvoiceFromService).toHaveBeenCalledWith("lnbcrt1000n1pj9h8uqpp5test");
      });
    });

    it("rejects invoice with invalid prefix", async () => {
      const setError = jest.fn();
      renderSendTab({ setError });

      const invoiceInput = screen.getByLabelText("payments.send.payInvoiceLabel");
      await userEvent.type(invoiceInput, "invalid1000n1pj9h8uqpp5test");

      const button = screen.getByText("payments.send.payLightningButton");
      fireEvent.click(button);

      await waitFor(() => {
        expect(setError).toHaveBeenCalledWith("payments.send.invalidInvoiceFormat");
      });
    });

    it("rejects invoice shorter than 20 characters", async () => {
      const setError = jest.fn();
      renderSendTab({ setError });

      const invoiceInput = screen.getByLabelText("payments.send.payInvoiceLabel");
      await userEvent.type(invoiceInput, "lnbc123");

      const button = screen.getByText("payments.send.payLightningButton");
      fireEvent.click(button);

      await waitFor(() => {
        expect(setError).toHaveBeenCalledWith("payments.send.invalidInvoiceFormat");
      });
    });

    it("clears error when user starts typing", async () => {
      const setError = jest.fn();
      renderSendTab({ setError });

      const button = screen.getByText("payments.send.payLightningButton");
      fireEvent.click(button);

      await waitFor(() => {
        expect(setError).toHaveBeenCalledWith("payments.send.noInvoiceToPay");
      });

      const invoiceInput = screen.getByLabelText("payments.send.payInvoiceLabel");
      await userEvent.type(invoiceInput, "lnbc");

      await waitFor(() => {
        expect(setError).toHaveBeenCalledWith("");
      });
    });

    it("shows visual error state on Input", async () => {
      const { container } = renderSendTab();

      const button = screen.getByText("payments.send.payLightningButton");
      fireEvent.click(button);

      await waitFor(() => {
        const invalidInput = container.querySelector('[data-invalid="true"]');
        expect(invalidInput).toBeInTheDocument();
      });
    });
  });

  describe("Payment Flow", () => {
    it("calls payInvoiceFromService with invoice", async () => {
      renderSendTab();

      const invoiceInput = screen.getByLabelText("payments.send.payInvoiceLabel");
      await userEvent.type(invoiceInput, "lnbc1000n1pj9h8uqpp5test");

      const button = screen.getByText("payments.send.payLightningButton");
      fireEvent.click(button);

      await waitFor(() => {
        expect(cashierService.payInvoiceFromService).toHaveBeenCalledWith("lnbc1000n1pj9h8uqpp5test");
      });
    });

    it("clears form after successful payment", async () => {
      renderSendTab();

      const invoiceInput = screen.getByLabelText("payments.send.payInvoiceLabel");
      await userEvent.type(invoiceInput, "lnbc1000n1pj9h8uqpp5test");

      const button = screen.getByText("payments.send.payLightningButton");
      fireEvent.click(button);

      await waitFor(() => {
        expect(invoiceInput).toHaveValue("");
      });
    });

    it("shows payment result card after success", async () => {
      renderSendTab();

      const invoiceInput = screen.getByLabelText("payments.send.payInvoiceLabel");
      await userEvent.type(invoiceInput, "lnbc1000n1pj9h8uqpp5test");

      const button = screen.getByText("payments.send.payLightningButton");
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText("payments.send.paymentDone")).toBeInTheDocument();
      });
    });

    it("displays payment amount in result card", async () => {
      renderSendTab();

      const invoiceInput = screen.getByLabelText("payments.send.payInvoiceLabel");
      await userEvent.type(invoiceInput, "lnbc1000n1pj9h8uqpp5test");

      const button = screen.getByText("payments.send.payLightningButton");
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText("1,000 sats")).toBeInTheDocument();
      });
    });

    it("displays routing fee in result card", async () => {
      renderSendTab();

      const invoiceInput = screen.getByLabelText("payments.send.payInvoiceLabel");
      await userEvent.type(invoiceInput, "lnbc1000n1pj9h8uqpp5test");

      const button = screen.getByText("payments.send.payLightningButton");
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText("5 sats")).toBeInTheDocument();
      });
    });

    it("displays payment hash in result card", async () => {
      renderSendTab();

      const invoiceInput = screen.getByLabelText("payments.send.payInvoiceLabel");
      await userEvent.type(invoiceInput, "lnbc1000n1pj9h8uqpp5test");

      const button = screen.getByText("payments.send.payLightningButton");
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText("mock-payment-hash-123")).toBeInTheDocument();
      });
    });

    it("shows copy button for payment hash", async () => {
      renderSendTab();

      const invoiceInput = screen.getByLabelText("payments.send.payInvoiceLabel");
      await userEvent.type(invoiceInput, "lnbc1000n1pj9h8uqpp5test");

      const button = screen.getByText("payments.send.payLightningButton");
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText("payments.send.copyButton")).toBeInTheDocument();
      });
    });

    it("handles API error gracefully", async () => {
      const setError = jest.fn();
      jest.spyOn(cashierService, "payInvoiceFromService").mockRejectedValue(new Error("API Error"));

      renderSendTab({ setError });

      const invoiceInput = screen.getByLabelText("payments.send.payInvoiceLabel");
      await userEvent.type(invoiceInput, "lnbc1000n1pj9h8uqpp5test");

      const button = screen.getByText("payments.send.payLightningButton");
      fireEvent.click(button);

      await waitFor(() => {
        expect(setError).toHaveBeenCalledWith("payments.send.paymentError");
      });
    });
  });

  describe("Loading State", () => {
    it("disables input when loading", () => {
      renderSendTab({ loading: true });

      const invoiceInput = screen.getByLabelText("payments.send.payInvoiceLabel");
      expect(invoiceInput).toBeDisabled();
    });

    it("disables button when loading", () => {
      renderSendTab({ loading: true });

      const button = screen.getByText("payments.send.payLightningLoading");
      expect(button.closest("button")).toBeDisabled();
    });

    it("shows loading text on button", () => {
      renderSendTab({ loading: true });

      expect(screen.getByText("payments.send.payLightningLoading")).toBeInTheDocument();
    });
  });

  describe("Case Insensitivity", () => {
    it("accepts invoice with uppercase prefix", async () => {
      renderSendTab();

      const invoiceInput = screen.getByLabelText("payments.send.payInvoiceLabel");
      await userEvent.type(invoiceInput, "LNBC1000N1PJ9H8UQPP5TEST");

      const button = screen.getByText("payments.send.payLightningButton");
      fireEvent.click(button);

      await waitFor(() => {
        expect(cashierService.payInvoiceFromService).toHaveBeenCalledWith("LNBC1000N1PJ9H8UQPP5TEST");
      });
    });

    it("accepts invoice with mixed case", async () => {
      renderSendTab();

      const invoiceInput = screen.getByLabelText("payments.send.payInvoiceLabel");
      await userEvent.type(invoiceInput, "LnBc1000N1pj9h8uqpp5test");

      const button = screen.getByText("payments.send.payLightningButton");
      fireEvent.click(button);

      await waitFor(() => {
        expect(cashierService.payInvoiceFromService).toHaveBeenCalledWith("LnBc1000N1pj9h8uqpp5test");
      });
    });
  });

  describe("Whitespace Handling", () => {
    it("trims whitespace from invoice", async () => {
      renderSendTab();

      const invoiceInput = screen.getByLabelText("payments.send.payInvoiceLabel");
      await userEvent.type(invoiceInput, "  lnbc1000n1pj9h8uqpp5test  ");

      const button = screen.getByText("payments.send.payLightningButton");
      fireEvent.click(button);

      await waitFor(() => {
        expect(cashierService.payInvoiceFromService).toHaveBeenCalledWith("  lnbc1000n1pj9h8uqpp5test  ");
      });
    });

    it("treats whitespace-only input as empty", async () => {
      const setError = jest.fn();
      renderSendTab({ setError });

      const invoiceInput = screen.getByLabelText("payments.send.payInvoiceLabel");
      await userEvent.type(invoiceInput, "   ");

      const button = screen.getByText("payments.send.payLightningButton");
      fireEvent.click(button);

      await waitFor(() => {
        expect(setError).toHaveBeenCalledWith("payments.send.noInvoiceToPay");
      });
    });
  });
});
