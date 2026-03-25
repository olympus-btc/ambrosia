import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import * as walletService from "@/services/walletService";
import { I18nProvider } from "@i18n/I18nProvider";

import { ReceiveTab } from "../ReceiveTab";

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
    it("renders amount input", () => {
      renderReceiveTab();

      expect(screen.getByLabelText("payments.receive.invoiceAmountLabel")).toBeInTheDocument();
    });

    it("renders description input", () => {
      renderReceiveTab();

      expect(screen.getByLabelText("payments.receive.invoiceDescriptionLabel")).toBeInTheDocument();
    });

    it("renders create invoice button", () => {
      renderReceiveTab();

      expect(screen.getByText("payments.receive.invoiceLightningButton")).toBeInTheDocument();
    });

    it("shows placeholder in amount input", () => {
      renderReceiveTab();

      const amountInput = screen.getByLabelText("payments.receive.invoiceAmountLabel");
      expect(amountInput).toHaveAttribute("placeholder", "1000");
    });
  });

  describe("Amount Validation", () => {
    it("shows error when submitting with amount less than 1", async () => {
      renderReceiveTab();

      const button = screen.getByText("payments.receive.invoiceLightningButton");
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText("payments.receive.invoiceAmountError")).toBeInTheDocument();
      });
    });

    it("allows valid amount (greater than 0)", async () => {
      const invoiceActions = {
        createInvoice: jest.fn(),
        closeModal: jest.fn(),
        markAsPaid: jest.fn(),
      };
      renderReceiveTab({ invoiceActions });

      const amountInput = screen.getByLabelText("payments.receive.invoiceAmountLabel");

      fireEvent.focus(amountInput);
      fireEvent.input(amountInput, { target: { value: "1000" } });
      fireEvent.change(amountInput, { target: { value: "1000" } });
      fireEvent.blur(amountInput);

      const button = screen.getByText("payments.receive.invoiceLightningButton");
      fireEvent.click(button);

      await waitFor(() => {
        expect(walletService.createInvoice).toHaveBeenCalledWith(1000, "");
      });
    });

    it("clears error when user starts typing", async () => {
      renderReceiveTab();

      const button = screen.getByText("payments.receive.invoiceLightningButton");
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText("payments.receive.invoiceAmountError")).toBeInTheDocument();
      });

      const amountInput = screen.getByLabelText("payments.receive.invoiceAmountLabel");
      fireEvent.focus(amountInput);
      fireEvent.input(amountInput, { target: { value: "5" } });
      fireEvent.change(amountInput, { target: { value: "5" } });
      fireEvent.blur(amountInput);

      await waitFor(() => {
        expect(screen.queryByText("payments.receive.invoiceAmountError")).not.toBeInTheDocument();
      });
    });

    it("shows visual error state on NumberInput", async () => {
      const { container } = renderReceiveTab();

      const button = screen.getByText("payments.receive.invoiceLightningButton");
      fireEvent.click(button);

      await waitFor(() => {
        const invalidInput = container.querySelector('[data-invalid="true"]');
        expect(invalidInput).toBeInTheDocument();
      });
    });
  });

  describe("Creating Invoice", () => {
    it("calls createInvoice with amount and description", async () => {
      const invoiceActions = {
        createInvoice: jest.fn(),
        closeModal: jest.fn(),
        markAsPaid: jest.fn(),
      };
      renderReceiveTab({ invoiceActions });

      const amountInput = screen.getByLabelText("payments.receive.invoiceAmountLabel");
      const descInput = screen.getByLabelText("payments.receive.invoiceDescriptionLabel");

      fireEvent.focus(amountInput);
      fireEvent.input(amountInput, { target: { value: "5000" } });
      fireEvent.change(amountInput, { target: { value: "5000" } });
      fireEvent.blur(amountInput);
      await userEvent.type(descInput, "Test payment");

      const button = screen.getByText("payments.receive.invoiceLightningButton");
      fireEvent.click(button);

      await waitFor(() => {
        expect(walletService.createInvoice).toHaveBeenCalledWith(5000, "Test payment");
      });
    });

    it("calls invoiceActions.createInvoice with result", async () => {
      const invoiceActions = {
        createInvoice: jest.fn(),
        closeModal: jest.fn(),
        markAsPaid: jest.fn(),
      };
      renderReceiveTab({ invoiceActions });

      const amountInput = screen.getByLabelText("payments.receive.invoiceAmountLabel");
      fireEvent.focus(amountInput);
      fireEvent.input(amountInput, { target: { value: "1000" } });
      fireEvent.change(amountInput, { target: { value: "1000" } });
      fireEvent.blur(amountInput);

      const button = screen.getByText("payments.receive.invoiceLightningButton");
      fireEvent.click(button);

      await waitFor(() => {
        expect(invoiceActions.createInvoice).toHaveBeenCalledWith({
          serialized: "lnbc1000n1...",
          paymentHash: "mock-payment-hash",
        });
      });
    });

    it("clears form after successful invoice creation", async () => {
      renderReceiveTab();

      const amountInput = screen.getByLabelText("payments.receive.invoiceAmountLabel");
      const descInput = screen.getByLabelText("payments.receive.invoiceDescriptionLabel");

      fireEvent.focus(amountInput);
      fireEvent.input(amountInput, { target: { value: "1000" } });
      fireEvent.change(amountInput, { target: { value: "1000" } });
      fireEvent.blur(amountInput);
      await userEvent.type(descInput, "Test");

      const button = screen.getByText("payments.receive.invoiceLightningButton");
      fireEvent.click(button);

      await waitFor(() => {
        const value = amountInput.value;
        expect(value === "" || value === "0" || value === 0).toBe(true);
        expect(descInput).toHaveValue("");
      });
    });

    it("handles API error gracefully without crashing", async () => {
      jest.spyOn(walletService, "createInvoice").mockRejectedValue(new Error("API Error"));

      renderReceiveTab();

      const amountInput = screen.getByLabelText("payments.receive.invoiceAmountLabel");
      fireEvent.focus(amountInput);
      fireEvent.input(amountInput, { target: { value: "1000" } });
      fireEvent.change(amountInput, { target: { value: "1000" } });
      fireEvent.blur(amountInput);

      const button = screen.getByText("payments.receive.invoiceLightningButton");
      fireEvent.click(button);

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

      const amountInput = screen.getByLabelText("payments.receive.invoiceAmountLabel");
      fireEvent.focus(amountInput);
      fireEvent.input(amountInput, { target: { value: "1000" } });
      fireEvent.change(amountInput, { target: { value: "1000" } });
      fireEvent.blur(amountInput);

      const button = screen.getByText("payments.receive.invoiceLightningButton");
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText("payments.receive.invoiceLightningLoading")).toBeInTheDocument();
      });
    });

    it("disables inputs while creating invoice", async () => {
      jest.spyOn(walletService, "createInvoice").mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 500)),
      );

      renderReceiveTab();

      const amountInput = screen.getByLabelText("payments.receive.invoiceAmountLabel");
      fireEvent.focus(amountInput);
      fireEvent.input(amountInput, { target: { value: "1000" } });
      fireEvent.change(amountInput, { target: { value: "1000" } });
      fireEvent.blur(amountInput);

      fireEvent.click(screen.getByText("payments.receive.invoiceLightningButton"));

      await waitFor(() => {
        expect(amountInput).toBeDisabled();
      });
    });
  });

  describe("Optional Description", () => {
    it("creates invoice without description", async () => {
      renderReceiveTab();

      const amountInput = screen.getByLabelText("payments.receive.invoiceAmountLabel");
      fireEvent.focus(amountInput);
      fireEvent.input(amountInput, { target: { value: "1000" } });
      fireEvent.change(amountInput, { target: { value: "1000" } });
      fireEvent.blur(amountInput);

      const button = screen.getByText("payments.receive.invoiceLightningButton");
      fireEvent.click(button);

      await waitFor(() => {
        expect(walletService.createInvoice).toHaveBeenCalledWith(1000, "");
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
