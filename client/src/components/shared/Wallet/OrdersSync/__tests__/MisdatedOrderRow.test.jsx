jest.mock("@/lib/formatDate", () => ({
  __esModule: true,
  default: jest.fn((dateString) => `formatted-${dateString}`),
}));

const mockCorrectMisdatedOrder = jest.fn();
jest.mock("@/services/ordersSyncService", () => ({
  correctMisdatedOrder: (...args) => mockCorrectMisdatedOrder(...args),
}));

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { I18nProvider } from "@i18n/I18nProvider";

import { MisdatedOrderRow } from "../MisdatedOrderRow";

function renderMisdatedOrderRow(misdatedOrderOverrides = {}) {
  const onCorrected = jest.fn();
  render(
    <I18nProvider>
      <MisdatedOrderRow
        misdatedOrder={{
          paymentId: "payment-1",
          orderId: "order-1",
          paymentHash: "hash-1",
          recordedDate: "2024-01-15T18:52:00",
          actualCompletedAt: 1705349520000,
          ...misdatedOrderOverrides,
        }}
        onCorrected={onCorrected}
      />
    </I18nProvider>,
  );
  return { onCorrected };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("MisdatedOrderRow", () => {
  it("shows the recorded date and the actual completed date", () => {
    renderMisdatedOrderRow();

    expect(screen.getByText(/ordersSync.misdatedOrderRow.recordedDateLabel: formatted-2024-01-15T18:52:00/)).toBeInTheDocument();
    expect(screen.getByText(/ordersSync.misdatedOrderRow.actualDateLabel: formatted-1705349520000/)).toBeInTheDocument();
  });

  it("confirms the correction and reports it through onCorrected", async () => {
    mockCorrectMisdatedOrder.mockResolvedValue({ message: "Order date corrected" });
    const { onCorrected } = renderMisdatedOrderRow({ paymentId: "payment-2" });

    await userEvent.click(screen.getByText("ordersSync.misdatedOrderRow.confirmButton"));

    expect(mockCorrectMisdatedOrder).toHaveBeenCalledWith("payment-2");
    expect(onCorrected).toHaveBeenCalled();
  });

  it("shows an error message when the correction fails", async () => {
    mockCorrectMisdatedOrder.mockRejectedValue(new Error("network error"));
    const { onCorrected } = renderMisdatedOrderRow();

    await userEvent.click(screen.getByText("ordersSync.misdatedOrderRow.confirmButton"));

    expect(await screen.findByText("ordersSync.misdatedOrderRow.correctionError")).toBeInTheDocument();
    expect(onCorrected).not.toHaveBeenCalled();
  });
});
