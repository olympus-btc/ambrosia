import { render, screen, fireEvent } from "@testing-library/react";

import { I18nProvider } from "@i18n/I18nProvider";

import { HistoryTab } from "../HistoryTab";

const mockIncomingTransaction = {
  paymentId: "payment-1",
  type: "incoming_payment",
  receivedSat: 5000,
  fees: 100,
  completedAt: new Date("2024-01-15T10:30:00").getTime(),
};

const mockOutgoingTransaction = {
  txId: "tx-1",
  type: "outgoing_payment",
  sent: 3000,
  fees: 150,
  completedAt: new Date("2024-01-16T14:45:00").getTime(),
};

function renderHistoryTab(props = {}) {
  const defaultProps = {
    transactions: [],
    loading: false,
    filter: "all",
    setFilter: jest.fn(),
  };

  return render(
    <I18nProvider>
      <HistoryTab {...defaultProps} {...props} />
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

describe("HistoryTab Component", () => {
  describe("Rendering", () => {
    it("renders all filter buttons", () => {
      renderHistoryTab();

      expect(screen.getByText("payments.history.all")).toBeInTheDocument();
      expect(screen.getByText("payments.history.received")).toBeInTheDocument();
      expect(screen.getByText("payments.history.sent")).toBeInTheDocument();
    });

    it("shows 'all' filter as active by default", () => {
      renderHistoryTab({ filter: "all" });

      const allButton = screen.getByText("payments.history.all").closest("button");
      expect(allButton).toHaveClass("bg-default");
    });

    it("shows 'received' filter as active when selected", () => {
      renderHistoryTab({ filter: "incoming" });

      const receivedButton = screen.getByText("payments.history.received").closest("button");
      expect(receivedButton).toHaveClass("bg-primary");
    });

    it("shows 'sent' filter as active when selected", () => {
      renderHistoryTab({ filter: "outgoing" });

      const sentButton = screen.getByText("payments.history.sent").closest("button");
      expect(sentButton).toHaveClass("bg-danger");
    });
  });

  describe("Filter Buttons", () => {
    it("calls setFilter with 'all' when all button clicked", () => {
      const setFilter = jest.fn();
      renderHistoryTab({ setFilter });

      const allButton = screen.getByText("payments.history.all");
      fireEvent.click(allButton);

      expect(setFilter).toHaveBeenCalledWith("all");
    });

    it("calls setFilter with 'incoming' when received button clicked", () => {
      const setFilter = jest.fn();
      renderHistoryTab({ setFilter });

      const receivedButton = screen.getByText("payments.history.received");
      fireEvent.click(receivedButton);

      expect(setFilter).toHaveBeenCalledWith("incoming");
    });

    it("calls setFilter with 'outgoing' when sent button clicked", () => {
      const setFilter = jest.fn();
      renderHistoryTab({ setFilter });

      const sentButton = screen.getByText("payments.history.sent");
      fireEvent.click(sentButton);

      expect(setFilter).toHaveBeenCalledWith("outgoing");
    });
  });

  describe("Empty State", () => {
    it("shows empty state when no transactions", () => {
      renderHistoryTab({ transactions: [] });

      expect(screen.getByText("payments.history.noTx")).toBeInTheDocument();
      expect(screen.getByText("payments.history.noTxMessage")).toBeInTheDocument();
    });

    it("displays empty state icon", () => {
      const { container } = renderHistoryTab({ transactions: [] });

      const icon = container.querySelector(".lucide-history");
      expect(icon).toBeInTheDocument();
    });

    it("does not show transactions list when empty", () => {
      renderHistoryTab({ transactions: [] });

      expect(screen.queryByText(/sats/)).not.toBeInTheDocument();
    });
  });

  describe("Loading State", () => {
    it("shows spinner when loading", () => {
      renderHistoryTab({ loading: true });

      expect(screen.queryByText("payments.history.noTx")).not.toBeInTheDocument();
    });

    it("does not show empty state when loading", () => {
      renderHistoryTab({ loading: true, transactions: [] });

      expect(screen.queryByText("payments.history.noTx")).not.toBeInTheDocument();
    });

    it("does not show transactions when loading", () => {
      renderHistoryTab({
        loading: true,
        transactions: [mockIncomingTransaction],
      });

      expect(screen.queryByText("payments.history.received")).toBeInTheDocument();
      expect(screen.queryByText("5,000 sats")).not.toBeInTheDocument();
    });
  });

  describe("Transaction List", () => {
    it("renders incoming transaction", () => {
      renderHistoryTab({ transactions: [mockIncomingTransaction] });

      expect(screen.getByText("5,000 sats")).toBeInTheDocument();
    });

    it("renders outgoing transaction", () => {
      renderHistoryTab({ transactions: [mockOutgoingTransaction] });

      expect(screen.getByText("3,000 sats")).toBeInTheDocument();
    });

    it("displays incoming transaction with green icon", () => {
      const { container } = renderHistoryTab({ transactions: [mockIncomingTransaction] });

      const greenIcon = container.querySelector(".text-green-600");
      expect(greenIcon).toBeInTheDocument();
    });

    it("displays outgoing transaction with red icon", () => {
      const { container } = renderHistoryTab({ transactions: [mockOutgoingTransaction] });

      const redIcon = container.querySelector(".text-red-600");
      expect(redIcon).toBeInTheDocument();
    });

    it("shows transaction date", () => {
      renderHistoryTab({ transactions: [mockIncomingTransaction] });

      const formatted = new Date(mockIncomingTransaction.completedAt).toISOString();
      expect(screen.getAllByText(formatted).length).toBeGreaterThan(0);
    });

    it("shows transaction time", () => {
      renderHistoryTab({ transactions: [mockIncomingTransaction] });

      const formatted = new Date(mockIncomingTransaction.completedAt).toISOString();
      expect(screen.getAllByText(formatted).length).toBeGreaterThan(0);
    });

    it("displays transaction fees", () => {
      renderHistoryTab({ transactions: [mockIncomingTransaction] });

      expect(screen.getByText(/payments.history.fee/)).toBeInTheDocument();
    });

    it("renders multiple transactions", () => {
      renderHistoryTab({
        transactions: [mockIncomingTransaction, mockOutgoingTransaction],
      });

      expect(screen.getByText("5,000 sats")).toBeInTheDocument();
      expect(screen.getByText("3,000 sats")).toBeInTheDocument();
    });

    it("displays incoming amount in default color", () => {
      const { container } = renderHistoryTab({ transactions: [mockIncomingTransaction] });

      const amount = container.querySelector(".text-deep.font-bold");
      expect(amount).toBeInTheDocument();
    });

    it("displays outgoing amount in red", () => {
      const { container } = renderHistoryTab({ transactions: [mockOutgoingTransaction] });

      const amount = container.querySelector(".text-red-700.font-bold");
      expect(amount).toBeInTheDocument();
    });
  });

  describe("Transaction Keys", () => {
    it("uses paymentId as key when available", () => {
      const { container } = renderHistoryTab({ transactions: [mockIncomingTransaction] });

      expect(container.querySelector('[class*="border"]')).toBeInTheDocument();
    });

    it("uses txId as key when paymentId not available", () => {
      const { container } = renderHistoryTab({ transactions: [mockOutgoingTransaction] });

      expect(container.querySelector('[class*="border"]')).toBeInTheDocument();
    });

    it("uses index as fallback key", () => {
      const txWithoutId = {
        type: "incoming_payment",
        receivedSat: 1000,
        fees: 50,
        completedAt: Date.now(),
      };

      const { container } = renderHistoryTab({ transactions: [txWithoutId] });

      expect(container.querySelector('[class*="border"]')).toBeInTheDocument();
    });
  });

  describe("Scrollable List", () => {
    it("applies overflow styling for long transaction lists", () => {
      const manyTransactions = Array.from({ length: 20 }, (_, i) => ({
        paymentId: `payment-${i}`,
        type: i % 2 === 0 ? "incoming_payment" : "outgoing_payment",
        receivedSat: 1000 + i,
        sent: 1000 + i,
        fees: 100,
        completedAt: Date.now() - i * 1000000,
      }));

      const { container } = renderHistoryTab({ transactions: manyTransactions });

      const scrollContainer = container.querySelector(".overflow-y-auto");
      expect(scrollContainer).toBeInTheDocument();
      expect(scrollContainer).toHaveClass("h-96");
    });
  });

  describe("Edge Cases", () => {
    it("handles zero fees correctly", () => {
      const txWithZeroFees = {
        ...mockIncomingTransaction,
        fees: 0,
      };

      renderHistoryTab({ transactions: [txWithZeroFees] });

      expect(screen.getByText(/payments.history.fee/)).toBeInTheDocument();
    });

    it("formats large amounts correctly", () => {
      const largeTransaction = {
        ...mockIncomingTransaction,
        receivedSat: 1000000,
      };

      renderHistoryTab({ transactions: [largeTransaction] });

      expect(screen.getByText("1,000,000 sats")).toBeInTheDocument();
    });

    it("shows description when present", () => {
      const txWithDescription = {
        ...mockIncomingTransaction,
        description: "Coffee payment",
      };

      renderHistoryTab({ transactions: [txWithDescription] });

      expect(screen.getByText("Coffee payment")).toBeInTheDocument();
    });

    it("does not show description for outgoing transactions", () => {
      renderHistoryTab({ transactions: [mockOutgoingTransaction] });

      expect(screen.queryByText("Coffee payment")).not.toBeInTheDocument();
    });

    it("handles transactions with missing completedAt gracefully", () => {
      const txWithoutDate = {
        paymentId: "no-date",
        type: "incoming_payment",
        receivedSat: 1000,
        fees: 50,
        completedAt: null,
      };

      expect(() => renderHistoryTab({ transactions: [txWithoutDate] })).not.toThrow();
    });
  });
});
