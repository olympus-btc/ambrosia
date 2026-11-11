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
      expect(screen.getByText("21000 sats — hash-1")).toBeInTheDocument();
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
      expect(screen.getByText("2024-01-15T18:52:00")).toBeInTheDocument();
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
});
