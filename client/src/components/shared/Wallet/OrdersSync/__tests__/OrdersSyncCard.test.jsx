jest.mock("@/hooks/auth/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-1", userId: "user-1" } }),
}));

jest.mock("@/components/hooks/useCurrency", () => ({
  useCurrency: () => ({
    currency: { id: "currency-1", acronym: "USD", locale: "en-US" },
    formatAmount: (cents) => `$${(cents / 100).toFixed(2)}`,
  }),
}));

jest.mock("@/components/pages/Store/hooks/useProducts", () => ({
  useProducts: () => ({ products: [] }),
}));

jest.mock("@/components/pages/Store/hooks/useCategories", () => ({
  useCategories: () => ({ categories: [] }),
}));

jest.mock("@/components/pages/Store/Cart/hooks/usePaymentMethod", () => ({
  usePaymentMethods: () => ({ paymentMethods: [] }),
}));

let capturedEditorProps;
jest.mock("../PaymentWithoutOrderEditor/PaymentWithoutOrderEditor", () => ({
  PaymentWithoutOrderEditor: (props) => {
    capturedEditorProps = props;
    return <div data-testid="payment-without-order-editor" />;
  },
}));

let capturedMisdatedOrderRowProps;
jest.mock("../MisdatedOrderRow", () => ({
  MisdatedOrderRow: (props) => {
    capturedMisdatedOrderRowProps = props;
    return <div data-testid={`misdated-order-row-${props.misdatedOrder.paymentId}`} />;
  },
}));

let capturedPaymentWithoutOrderRowProps;
jest.mock("../PaymentWithoutOrderRow", () => ({
  PaymentWithoutOrderRow: (props) => {
    capturedPaymentWithoutOrderRowProps = props;
    return <div data-testid={`payment-without-order-row-${props.paymentWithoutOrder.paymentHash}`} />;
  },
}));

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import * as ordersSyncService from "@/services/ordersSyncService";
import { I18nProvider } from "@i18n/I18nProvider";

import { OrdersSyncCard } from "../OrdersSyncCard";

function renderOrdersSyncCard() {
  return render(
    <I18nProvider>
      <OrdersSyncCard />
    </I18nProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  capturedEditorProps = undefined;
  capturedMisdatedOrderRowProps = undefined;
  capturedPaymentWithoutOrderRowProps = undefined;
});

describe("OrdersSyncCard", () => {
  it("renders the title and subtitle", () => {
    renderOrdersSyncCard();

    expect(screen.getByText("ordersSync.title")).toBeInTheDocument();
    expect(screen.getByText("ordersSync.subtitle")).toBeInTheDocument();
  });

  it("requests findings for a date range when the sync button is pressed", async () => {
    jest.spyOn(ordersSyncService, "getOrdersSyncFindings").mockResolvedValue({
      paymentsWithoutOrder: [],
      misdatedOrders: [],
    });

    renderOrdersSyncCard();
    await userEvent.click(screen.getByText("ordersSync.syncButton"));

    await waitFor(() => {
      expect(ordersSyncService.getOrdersSyncFindings).toHaveBeenCalledWith(
        expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      );
    });
  });

  it("lists each payment without an order after a successful sync", async () => {
    jest.spyOn(ordersSyncService, "getOrdersSyncFindings").mockResolvedValue({
      paymentsWithoutOrder: [{ paymentHash: "hash-1", receivedSat: 21000 }],
      misdatedOrders: [],
    });

    renderOrdersSyncCard();
    await userEvent.click(screen.getByText("ordersSync.syncButton"));

    await waitFor(() => {
      expect(screen.getByTestId("payment-without-order-row-hash-1")).toBeInTheDocument();
    });
  });

  it("shows the empty message when there are no payments without an order", async () => {
    jest.spyOn(ordersSyncService, "getOrdersSyncFindings").mockResolvedValue({
      paymentsWithoutOrder: [],
      misdatedOrders: [],
    });

    renderOrdersSyncCard();
    await userEvent.click(screen.getByText("ordersSync.syncButton"));

    await waitFor(() => {
      expect(screen.getByText("ordersSync.paymentsWithoutOrder.empty")).toBeInTheDocument();
    });
  });

  it("lists each misdated order after a successful sync", async () => {
    jest.spyOn(ordersSyncService, "getOrdersSyncFindings").mockResolvedValue({
      paymentsWithoutOrder: [],
      misdatedOrders: [{ paymentId: "payment-1", recordedDate: "2024-01-15T18:52:00" }],
    });

    renderOrdersSyncCard();
    await userEvent.click(screen.getByText("ordersSync.syncButton"));

    await waitFor(() => {
      expect(screen.getByTestId("misdated-order-row-payment-1")).toBeInTheDocument();
    });
  });

  it("shows the empty message when there are no misdated orders", async () => {
    jest.spyOn(ordersSyncService, "getOrdersSyncFindings").mockResolvedValue({
      paymentsWithoutOrder: [],
      misdatedOrders: [],
    });

    renderOrdersSyncCard();
    await userEvent.click(screen.getByText("ordersSync.syncButton"));

    await waitFor(() => {
      expect(screen.getByText("ordersSync.misdatedOrders.empty")).toBeInTheDocument();
    });
  });

  it("shows an error message when the sync request fails", async () => {
    jest.spyOn(ordersSyncService, "getOrdersSyncFindings").mockRejectedValue(new Error("network error"));
    jest.spyOn(console, "error").mockImplementation(() => {});

    renderOrdersSyncCard();
    await userEvent.click(screen.getByText("ordersSync.syncButton"));

    await waitFor(() => {
      expect(screen.getByText("ordersSync.loadError")).toBeInTheDocument();
    });

    console.error.mockRestore();
  });

  it("opens the payment-without-order editor when a payment row requests review", async () => {
    const paymentWithoutOrder = { paymentHash: "hash-1", receivedSat: 21000 };
    jest.spyOn(ordersSyncService, "getOrdersSyncFindings").mockResolvedValue({
      paymentsWithoutOrder: [paymentWithoutOrder],
      misdatedOrders: [],
    });

    renderOrdersSyncCard();
    await userEvent.click(screen.getByText("ordersSync.syncButton"));
    await waitFor(() => expect(screen.getByTestId("payment-without-order-row-hash-1")).toBeInTheDocument());

    capturedPaymentWithoutOrderRowProps.onReview(paymentWithoutOrder);

    await waitFor(() => expect(screen.getByTestId("payment-without-order-editor")).toBeInTheDocument());
    expect(capturedEditorProps.payment).toEqual(paymentWithoutOrder);
    expect(capturedEditorProps.currencyAcronym).toBe("usd");
    expect(capturedEditorProps.userId).toBe("user-1");
  });

  it("closes the editor and refreshes the findings when a payment is confirmed", async () => {
    const paymentWithoutOrder = { paymentHash: "hash-1", receivedSat: 21000 };
    jest.spyOn(ordersSyncService, "getOrdersSyncFindings").mockResolvedValue({
      paymentsWithoutOrder: [paymentWithoutOrder],
      misdatedOrders: [],
    });

    renderOrdersSyncCard();
    await userEvent.click(screen.getByText("ordersSync.syncButton"));
    await waitFor(() => expect(screen.getByTestId("payment-without-order-row-hash-1")).toBeInTheDocument());
    capturedPaymentWithoutOrderRowProps.onReview(paymentWithoutOrder);
    await waitFor(() => expect(screen.getByTestId("payment-without-order-editor")).toBeInTheDocument());

    capturedEditorProps.onConfirmed({ orderId: "order-1" });

    await waitFor(() => {
      expect(screen.queryByTestId("payment-without-order-editor")).not.toBeInTheDocument();
    });
    expect(ordersSyncService.getOrdersSyncFindings).toHaveBeenCalledTimes(2);
  });

  it("refreshes the findings when a misdated order's date is corrected", async () => {
    jest.spyOn(ordersSyncService, "getOrdersSyncFindings").mockResolvedValue({
      paymentsWithoutOrder: [],
      misdatedOrders: [{ paymentId: "payment-1", recordedDate: "2024-01-15T18:52:00" }],
    });

    renderOrdersSyncCard();
    await userEvent.click(screen.getByText("ordersSync.syncButton"));
    await waitFor(() => expect(screen.getByTestId("misdated-order-row-payment-1")).toBeInTheDocument());

    capturedMisdatedOrderRowProps.onCorrected();

    await waitFor(() => {
      expect(ordersSyncService.getOrdersSyncFindings).toHaveBeenCalledTimes(2);
    });
  });
});
