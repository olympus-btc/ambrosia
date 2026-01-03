import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { I18nProvider } from "@i18n/I18nProvider";
import * as cashierService from "@modules/cashier/cashierService";

import { TransactionsReceiveTab } from "../TransactionsReceiveTab";

function renderReceiveTab(props = {}) {
  const defaultProps = {
    loading: false,
    setLoading: jest.fn(),
    setError: jest.fn(),
    invoiceActions: {
      createInvoice: jest.fn(),
      closeModal: jest.fn(),
      markAsPaid: jest.fn(),
    },
  };

  return render(
    <I18nProvider>
      <TransactionsReceiveTab {...defaultProps} {...props} />
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
  jest.spyOn(cashierService, "createInvoice").mockResolvedValue({
    serialized: "lnbc1000n1...",
    paymentHash: "mock-payment-hash",
  });
});

afterEach(() => {
  console.warn = originalWarn;
  console.error = originalError;
  jest.restoreAllMocks();
});

describe("TransactionsReceiveTab Component", () => {
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
        expect(cashierService.createInvoice).toHaveBeenCalledWith(1000, "");
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
        expect(cashierService.createInvoice).toHaveBeenCalledWith(5000, "Test payment");
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

    it("handles API error gracefully", async () => {
      const setError = jest.fn();
      jest.spyOn(cashierService, "createInvoice").mockRejectedValue(new Error("API Error"));

      renderReceiveTab({ setError });

      const amountInput = screen.getByLabelText("payments.receive.invoiceAmountLabel");
      fireEvent.focus(amountInput);
      fireEvent.input(amountInput, { target: { value: "1000" } });
      fireEvent.change(amountInput, { target: { value: "1000" } });
      fireEvent.blur(amountInput);

      const button = screen.getByText("payments.receive.invoiceLightningButton");
      fireEvent.click(button);

      await waitFor(() => {
        expect(setError).toHaveBeenCalledWith("payments.receive.invoiceCreateError");
      });
    });
  });

  describe("Loading State", () => {
    it("disables inputs when loading", () => {
      renderReceiveTab({ loading: true });

      const amountInput = screen.getByLabelText("payments.receive.invoiceAmountLabel");
      const descInput = screen.getByLabelText("payments.receive.invoiceDescriptionLabel");

      expect(amountInput).toBeDisabled();
      expect(descInput).toBeDisabled();
    });

    it("disables button when loading", () => {
      renderReceiveTab({ loading: true });

      const button = screen.getByText("payments.receive.invoiceLightningLoading");
      expect(button.closest("button")).toBeDisabled();
    });

    it("shows loading text on button", () => {
      renderReceiveTab({ loading: true });

      expect(screen.getByText("payments.receive.invoiceLightningLoading")).toBeInTheDocument();
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
        expect(cashierService.createInvoice).toHaveBeenCalledWith(1000, "");
      });
    });

    it("shows placeholder for description", () => {
      renderReceiveTab();

      const descInput = screen.getByLabelText("payments.receive.invoiceDescriptionLabel");
      expect(descInput).toHaveAttribute("placeholder", "payments.receive.invoiceDescriptionPlaceholder");
    });
  });
});
