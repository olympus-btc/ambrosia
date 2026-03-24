import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { driver } from "driver.js";

import { I18nProvider } from "@i18n/I18nProvider";

import { Transactions } from "../Transactions";

jest.mock("../ReceiveTab", () => ({
  ReceiveTab: ({ setLoading, setError, invoiceActions }) => (
    <div data-testid="receive-tab">
      Receive Tab
      <button onClick={() => setLoading(true)}>Set Loading</button>
      <button onClick={() => setError("Test error")}>Set Error</button>
      <button onClick={() => invoiceActions.createInvoice({ test: "invoice" })}>
        Create Invoice
      </button>
    </div>
  ),
}));

jest.mock("../SendTab", () => ({
  SendTab: ({ setLoading, setError }) => (
    <div data-testid="send-tab">
      Send Tab
      <button onClick={() => setLoading(true)}>Set Loading</button>
      <button onClick={() => setError("Test error")}>Set Error</button>
    </div>
  ),
}));

jest.mock("../HistoryTab", () => ({
  HistoryTab: ({ transactions, filter, setFilter }) => (
    <div data-testid="history-tab">
      History Tab
      <span>Transactions: {transactions.length}</span>
      <span>Filter: {filter}</span>
      <button onClick={() => setFilter("incoming")}>Change Filter</button>
    </div>
  ),
}));

function renderTransactions(props = {}) {
  const defaultProps = {
    transactions: [],
    loading: false,
    setLoading: jest.fn(),
    setError: jest.fn(),
    filter: "all",
    setFilter: jest.fn(),
    invoiceActions: {
      createInvoice: jest.fn(),
      closeModal: jest.fn(),
      markAsPaid: jest.fn(),
    },
  };

  return render(
    <I18nProvider>
      <Transactions {...defaultProps} {...props} />
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

describe("Transactions Component", () => {
  describe("Rendering", () => {
    it("renders all three tabs", () => {
      renderTransactions();

      expect(screen.getByText("payments.receive.tabTitle")).toBeInTheDocument();
      expect(screen.getByText("payments.send.tabTitle")).toBeInTheDocument();
      expect(screen.getByText("payments.history.tabTitle")).toBeInTheDocument();
    });

    it("shows receive tab content by default", () => {
      renderTransactions();

      expect(screen.getByTestId("receive-tab")).toBeInTheDocument();
      expect(screen.getByText("Receive Tab")).toBeInTheDocument();
    });

    it("renders tab icons", () => {
      const { container } = renderTransactions();

      const icons = container.querySelectorAll("svg");
      expect(icons.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("Tab Switching", () => {
    it("switches to send tab when clicked", async () => {
      renderTransactions();

      const sendTab = screen.getByText("payments.send.tabTitle");
      fireEvent.click(sendTab);

      await waitFor(() => {
        expect(screen.getByTestId("send-tab")).toBeInTheDocument();
        expect(screen.getByText("Send Tab")).toBeInTheDocument();
      });
    });

    it("switches to history tab when clicked", async () => {
      renderTransactions();

      const historyTab = screen.getByText("payments.history.tabTitle");
      fireEvent.click(historyTab);

      await waitFor(() => {
        expect(screen.getByTestId("history-tab")).toBeInTheDocument();
        expect(screen.getByText("History Tab")).toBeInTheDocument();
      });
    });

    it("can switch between tabs multiple times", async () => {
      renderTransactions();

      expect(screen.getByTestId("receive-tab")).toBeInTheDocument();

      fireEvent.click(screen.getByText("payments.send.tabTitle"));
      await waitFor(() => {
        expect(screen.getByTestId("send-tab")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("payments.history.tabTitle"));
      await waitFor(() => {
        expect(screen.getByTestId("history-tab")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("payments.receive.tabTitle"));
      await waitFor(() => {
        expect(screen.getByTestId("receive-tab")).toBeInTheDocument();
      });
    });
  });

  describe("Props Passing", () => {
    it("passes loading and setLoading to receive tab", () => {
      const setLoading = jest.fn();
      renderTransactions({ loading: false, setLoading });

      const setLoadingButton = screen.getByText("Set Loading");
      fireEvent.click(setLoadingButton);

      expect(setLoading).toHaveBeenCalledWith(true);
    });

    it("passes setError to receive tab", () => {
      const setError = jest.fn();
      renderTransactions({ setError });

      const setErrorButton = screen.getByText("Set Error");
      fireEvent.click(setErrorButton);

      expect(setError).toHaveBeenCalledWith("Test error");
    });

    it("passes invoiceActions to receive tab", () => {
      const invoiceActions = {
        createInvoice: jest.fn(),
        closeModal: jest.fn(),
        markAsPaid: jest.fn(),
      };
      renderTransactions({ invoiceActions });

      const createInvoiceButton = screen.getByText("Create Invoice");
      fireEvent.click(createInvoiceButton);

      expect(invoiceActions.createInvoice).toHaveBeenCalledWith({ test: "invoice" });
    });

    it("passes transactions to history tab", async () => {
      const transactions = [
        { id: 1, type: "incoming" },
        { id: 2, type: "outgoing" },
      ];
      renderTransactions({ transactions });

      fireEvent.click(screen.getByText("payments.history.tabTitle"));

      await waitFor(() => {
        expect(screen.getByText("Transactions: 2")).toBeInTheDocument();
      });
    });

    it("passes filter and setFilter to history tab", async () => {
      const setFilter = jest.fn();
      renderTransactions({ filter: "all", setFilter });

      fireEvent.click(screen.getByText("payments.history.tabTitle"));

      await waitFor(() => {
        expect(screen.getByText("Filter: all")).toBeInTheDocument();
      });

      const changeFilterButton = screen.getByText("Change Filter");
      fireEvent.click(changeFilterButton);

      expect(setFilter).toHaveBeenCalledWith("incoming");
    });
  });

  describe("Edge Cases", () => {
    it("handles empty transactions array", async () => {
      renderTransactions({ transactions: [] });

      fireEvent.click(screen.getByText("payments.history.tabTitle"));

      await waitFor(() => {
        expect(screen.getByText("Transactions: 0")).toBeInTheDocument();
      });
    });

    it("handles loading state", () => {
      renderTransactions({ loading: true });

      expect(screen.getByTestId("receive-tab")).toBeInTheDocument();
    });

    it("maintains tab state when props change", async () => {
      const { rerender } = renderTransactions({ loading: false });

      fireEvent.click(screen.getByText("payments.send.tabTitle"));

      await waitFor(() => {
        expect(screen.getByTestId("send-tab")).toBeInTheDocument();
      });

      rerender(
        <I18nProvider>
          <Transactions
            transactions={[]}
            loading
            setLoading={jest.fn()}
            setError={jest.fn()}
            filter="all"
            setFilter={jest.fn()}
            invoiceActions={{
              createInvoice: jest.fn(),
              closeModal: jest.fn(),
              markAsPaid: jest.fn(),
            }}
          />
        </I18nProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("send-tab")).toBeInTheDocument();
      });
    });
  });
});

const WALLET_RECEIVE_TOUR_KEY = "ambrosia:tour:wallet-receive";

describe("Transactions — driver.js tour", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
    localStorage.clear();
  });

  it("does not start the tour when WALLET_RECEIVE_TOUR_KEY is absent from localStorage", async () => {
    jest.useFakeTimers();

    await act(async () => {
      renderTransactions();
    });

    act(() => {
      jest.advanceTimersByTime(600);
    });

    expect(driver).not.toHaveBeenCalled();
  });

  it("calls driver() and drive() when WALLET_RECEIVE_TOUR_KEY is set", async () => {
    jest.useFakeTimers();
    localStorage.setItem(WALLET_RECEIVE_TOUR_KEY, "true");

    await act(async () => {
      renderTransactions();
    });

    act(() => {
      jest.advanceTimersByTime(600);
    });

    expect(driver).toHaveBeenCalledTimes(1);
    expect(driver.mock.results[0].value.drive).toHaveBeenCalledTimes(1);
  });

  it("configures the tour with 3 steps targeting the receive form elements", async () => {
    jest.useFakeTimers();
    localStorage.setItem(WALLET_RECEIVE_TOUR_KEY, "true");

    await act(async () => {
      renderTransactions();
    });

    act(() => {
      jest.advanceTimersByTime(600);
    });

    const { steps } = driver.mock.calls[0][0];
    expect(steps).toHaveLength(3);
    expect(steps[0].element).toBe("#wallet-receive-amount");
    expect(steps[1].element).toBe("#wallet-receive-description");
    expect(steps[2].element).toBe("#wallet-receive-button");
  });

  it("clears WALLET_RECEIVE_TOUR_KEY from localStorage when onDestroyStarted fires", async () => {
    jest.useFakeTimers();
    localStorage.setItem(WALLET_RECEIVE_TOUR_KEY, "true");

    await act(async () => {
      renderTransactions();
    });

    act(() => {
      jest.advanceTimersByTime(600);
    });

    const { onDestroyStarted } = driver.mock.calls[0][0];
    act(() => {
      onDestroyStarted();
    });

    expect(localStorage.getItem(WALLET_RECEIVE_TOUR_KEY)).toBeNull();
  });

  it("cancels the pending timer on unmount before driver is initialized", async () => {
    jest.useFakeTimers();
    localStorage.setItem(WALLET_RECEIVE_TOUR_KEY, "true");

    let unmount;
    await act(async () => {
      ({ unmount } = renderTransactions());
    });

    act(() => {
      unmount();
    });

    act(() => {
      jest.advanceTimersByTime(600);
    });

    expect(driver).not.toHaveBeenCalled();
  });
});
