jest.mock("@/lib/formatDate", () => ({
  __esModule: true,
  default: jest.fn((dateString) => `formatted-${dateString}`),
}));

const mockOnReview = jest.fn();

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { I18nProvider } from "@i18n/I18nProvider";

import { PaymentWithoutOrderRow } from "../PaymentWithoutOrderRow";

function renderPaymentWithoutOrderRow(paymentWithoutOrderOverrides = {}) {
  const paymentWithoutOrder = {
    paymentHash: "de90706237467a4aaf49e57cdf2e48b5e37d300fd03328302e2dc1cd8e0f0c1a",
    receivedSat: 21000,
    completedAt: 1705349520000,
    ...paymentWithoutOrderOverrides,
  };
  render(
    <I18nProvider>
      <PaymentWithoutOrderRow paymentWithoutOrder={paymentWithoutOrder} onReview={mockOnReview} />
    </I18nProvider>,
  );
  return { paymentWithoutOrder };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("PaymentWithoutOrderRow", () => {
  it("shows the received amount and the payment date", () => {
    renderPaymentWithoutOrderRow();

    expect(screen.getByText(/ordersSync.paymentWithoutOrderRow.amountLabel: 21000 sats/)).toBeInTheDocument();
    expect(screen.getByText(/ordersSync.paymentWithoutOrderRow.dateLabel: formatted-1705349520000/)).toBeInTheDocument();
  });

  it("shows a truncated, copyable payment hash", () => {
    const { paymentWithoutOrder } = renderPaymentWithoutOrderRow();

    expect(screen.getByTitle(paymentWithoutOrder.paymentHash)).toBeInTheDocument();
  });

  it("requests a review with the payment when the review button is pressed", async () => {
    const { paymentWithoutOrder } = renderPaymentWithoutOrderRow();

    await userEvent.click(screen.getByText("ordersSync.paymentWithoutOrderRow.reviewButton"));

    expect(mockOnReview).toHaveBeenCalledWith(paymentWithoutOrder);
  });
});
