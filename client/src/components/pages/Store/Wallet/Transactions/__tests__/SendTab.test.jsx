import { addToast } from "@heroui/react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import * as walletService from "@/services/walletService";
import { I18nProvider } from "@i18n/I18nProvider";

import { SendTab } from "../SendTab";

jest.mock("@heroui/react", () => {
  const actual = jest.requireActual("@heroui/react");
  return {
    ...actual,
    addToast: jest.fn(),
  };
});

function renderSendTab(props = {}) {
  return render(
    <I18nProvider>
      <SendTab {...props} />
    </I18nProvider>,
  );
}

function typeInvoice(input, value) {
  fireEvent.change(input, { target: { value } });
}

const originalWarn = console.warn;
const originalError = console.error;

beforeEach(() => {
  console.warn = jest.fn((...args) => {
    if (typeof args[0] === "string" && args[0].includes("aria-label")) return;
    originalWarn.call(console, ...args);
  });

  console.error = jest.fn((...args) => {
    if (
      typeof args[0] === "string" &&
      (args[0].includes("onAnimationComplete") ||
        args[0].includes("Unknown event handler property") ||
        args[0].includes("validateDOMNesting"))
    ) return;
    if (args[0] instanceof Error && args[0].message === "API Error") return;
    originalError.call(console, ...args);
  });

  jest.clearAllMocks();
  jest.spyOn(walletService, "payInvoiceFromService").mockResolvedValue({
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

    it("accepts valid mainnet invoice (lnbc)", async () => {
      renderSendTab();
      typeInvoice(screen.getByLabelText("payments.send.payInvoiceLabel"), "lnbc1000n1pj9h8uqpp5test");
      fireEvent.click(screen.getByText("payments.send.payLightningButton"));

      await waitFor(() => {
        expect(walletService.payInvoiceFromService).toHaveBeenCalledWith("lnbc1000n1pj9h8uqpp5test");
      });
    });

    it("accepts valid testnet invoice (lntb)", async () => {
      renderSendTab();
      typeInvoice(screen.getByLabelText("payments.send.payInvoiceLabel"), "lntb1000n1pj9h8uqpp5test");
      fireEvent.click(screen.getByText("payments.send.payLightningButton"));

      await waitFor(() => {
        expect(walletService.payInvoiceFromService).toHaveBeenCalledWith("lntb1000n1pj9h8uqpp5test");
      });
    });

    it("accepts valid regtest invoice (lnbcrt)", async () => {
      renderSendTab();
      typeInvoice(screen.getByLabelText("payments.send.payInvoiceLabel"), "lnbcrt1000n1pj9h8uqpp5test");
      fireEvent.click(screen.getByText("payments.send.payLightningButton"));

      await waitFor(() => {
        expect(walletService.payInvoiceFromService).toHaveBeenCalledWith("lnbcrt1000n1pj9h8uqpp5test");
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

  describe("Payment Flow", () => {
    it("calls payInvoiceFromService with invoice", async () => {
      renderSendTab();
      typeInvoice(screen.getByLabelText("payments.send.payInvoiceLabel"), "lnbc1000n1pj9h8uqpp5test");
      fireEvent.click(screen.getByText("payments.send.payLightningButton"));

      await waitFor(() => {
        expect(walletService.payInvoiceFromService).toHaveBeenCalledWith("lnbc1000n1pj9h8uqpp5test");
      });
    });

    it("clears form after successful payment", async () => {
      renderSendTab();
      const invoiceInput = screen.getByLabelText("payments.send.payInvoiceLabel");
      typeInvoice(invoiceInput, "lnbc1000n1pj9h8uqpp5test");
      fireEvent.click(screen.getByText("payments.send.payLightningButton"));

      await waitFor(() => {
        expect(invoiceInput).toHaveValue("");
      });
    });

    it("shows payment result card after success", async () => {
      renderSendTab();
      typeInvoice(screen.getByLabelText("payments.send.payInvoiceLabel"), "lnbc1000n1pj9h8uqpp5test");
      fireEvent.click(screen.getByText("payments.send.payLightningButton"));

      await waitFor(() => {
        expect(screen.getByText("payments.send.paymentDone")).toBeInTheDocument();
      });
    });

    it("displays payment amount in result card", async () => {
      renderSendTab();
      typeInvoice(screen.getByLabelText("payments.send.payInvoiceLabel"), "lnbc1000n1pj9h8uqpp5test");
      fireEvent.click(screen.getByText("payments.send.payLightningButton"));

      await waitFor(() => {
        expect(screen.getByText("1,000 sats")).toBeInTheDocument();
      });
    });

    it("displays routing fee in result card", async () => {
      renderSendTab();
      typeInvoice(screen.getByLabelText("payments.send.payInvoiceLabel"), "lnbc1000n1pj9h8uqpp5test");
      fireEvent.click(screen.getByText("payments.send.payLightningButton"));

      await waitFor(() => {
        expect(screen.getByText("5 sats")).toBeInTheDocument();
      });
    });

    it("displays payment hash in result card", async () => {
      renderSendTab();
      typeInvoice(screen.getByLabelText("payments.send.payInvoiceLabel"), "lnbc1000n1pj9h8uqpp5test");
      fireEvent.click(screen.getByText("payments.send.payLightningButton"));

      await waitFor(() => {
        expect(screen.getByText("mock-payment-hash-123")).toBeInTheDocument();
      });
    });

    it("shows copy button for payment hash", async () => {
      renderSendTab();
      typeInvoice(screen.getByLabelText("payments.send.payInvoiceLabel"), "lnbc1000n1pj9h8uqpp5test");
      fireEvent.click(screen.getByText("payments.send.payLightningButton"));

      await waitFor(() => {
        expect(screen.getByText("payments.send.copyButton")).toBeInTheDocument();
      });
    });

    it("handles API error gracefully without crashing", async () => {
      jest.spyOn(walletService, "payInvoiceFromService").mockRejectedValue(new Error("API Error"));
      renderSendTab();
      typeInvoice(screen.getByLabelText("payments.send.payInvoiceLabel"), "lnbc1000n1pj9h8uqpp5test");
      fireEvent.click(screen.getByText("payments.send.payLightningButton"));

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
        expect(addToast).toHaveBeenCalledWith(expect.objectContaining({
          title: "payments.send.paymentError",
          description: "payments.send.errors.invoiceAlreadyPaid",
          color: "danger",
        }));
      });

      expect(screen.queryByText("payments.send.paymentDone")).not.toBeInTheDocument();
      expect(invoiceInput).toHaveValue("lnbc1000n1pj9h8uqpp5test");
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
        expect(addToast).toHaveBeenCalledWith(expect.objectContaining({
          title: "payments.send.paymentError",
          description: "payments.send.errors.invoiceExpired",
          color: "danger",
        }));
      });
    });

    it("shows translated error when recipient node rejects the payment", async () => {
      jest.spyOn(walletService, "payInvoiceFromService").mockRejectedValue(
        Object.assign(new Error("The recipient node rejected the payment"), {
          code: "recipient_rejected_payment",
        }),
      );

      renderSendTab();
      typeInvoice(screen.getByLabelText("payments.send.payInvoiceLabel"), "lnbc1000n1pj9h8uqpp5test");
      fireEvent.click(screen.getByText("payments.send.payLightningButton"));

      await waitFor(() => {
        expect(addToast).toHaveBeenCalledWith(expect.objectContaining({
          title: "payments.send.paymentError",
          description: "payments.send.errors.recipientRejectedPayment",
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
        expect(addToast).toHaveBeenCalledWith(expect.objectContaining({
          description: "phoenixd custom failure",
        }));
      });
    });

    it("uses console error for unexpected errors without code", async () => {
      jest.spyOn(walletService, "payInvoiceFromService").mockRejectedValue(new Error("unexpected failure"));

      renderSendTab();
      typeInvoice(screen.getByLabelText("payments.send.payInvoiceLabel"), "lnbc1000n1pj9h8uqpp5test");
      fireEvent.click(screen.getByText("payments.send.payLightningButton"));

      await waitFor(() => {
        expect(console.error).toHaveBeenCalled();
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

    it("shows loading text while paying invoice", async () => {
      jest.spyOn(walletService, "payInvoiceFromService").mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 500)),
      );

      renderSendTab();
      typeInvoice(screen.getByLabelText("payments.send.payInvoiceLabel"), "lnbc1000n1pj9h8uqpp5test");
      fireEvent.click(screen.getByText("payments.send.payLightningButton"));

      await waitFor(() => {
        expect(screen.getByText("payments.send.payLightningLoading")).toBeInTheDocument();
      });
    });

    it("disables input while paying invoice", async () => {
      jest.spyOn(walletService, "payInvoiceFromService").mockImplementation(
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
        expect(walletService.payInvoiceFromService).toHaveBeenCalledWith("LNBC1000N1PJ9H8UQPP5TEST");
      });
    });

    it("accepts invoice with mixed case", async () => {
      renderSendTab();
      typeInvoice(screen.getByLabelText("payments.send.payInvoiceLabel"), "LnBc1000N1pj9h8uqpp5test");
      fireEvent.click(screen.getByText("payments.send.payLightningButton"));

      await waitFor(() => {
        expect(walletService.payInvoiceFromService).toHaveBeenCalledWith("LnBc1000N1pj9h8uqpp5test");
      });
    });
  });

  describe("Whitespace Handling", () => {
    it("trims whitespace from invoice", async () => {
      renderSendTab();
      typeInvoice(screen.getByLabelText("payments.send.payInvoiceLabel"), "  lnbc1000n1pj9h8uqpp5test  ");
      fireEvent.click(screen.getByText("payments.send.payLightningButton"));

      await waitFor(() => {
        expect(walletService.payInvoiceFromService).toHaveBeenCalledWith("  lnbc1000n1pj9h8uqpp5test  ");
      });
    });

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
