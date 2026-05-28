import { render, screen, fireEvent } from "@testing-library/react";

import { useCurrency } from "@/components/hooks/useCurrency";

import { AmountDisplay } from "../AmountDisplay";

jest.mock("@/components/hooks/useCurrency", () => ({
  useCurrency: jest.fn(),
}));

const formatAmount = jest.fn((cents) => `$${(cents / 100).toFixed(2)}`);

function renderComponent(props = {}) {
  return render(<AmountDisplay {...props} />);
}

describe("AmountDisplay", () => {
  beforeEach(() => {
    useCurrency.mockReturnValue({ formatAmount });
    formatAmount.mockClear();
  });

  it("returns null when satoshis is 0", () => {
    const { container } = renderComponent({ satoshis: 0, exchangeRateAtSale: 50000, currentRate: 60000 });
    expect(container.firstChild).toBeNull();
  });

  it("shows historical fiat by default", () => {
    renderComponent({ satoshis: 100_000_000, exchangeRateAtSale: 50000, currentRate: 60000 });
    expect(formatAmount).toHaveBeenCalledWith(50000 * 100);
    expect(screen.getByText("$50000.00")).toBeInTheDocument();
  });

  it("clicking amount toggles to sats mode", () => {
    renderComponent({ satoshis: 20000, exchangeRateAtSale: 50000, currentRate: 60000 });
    fireEvent.click(screen.getByText("$10.00"));
    expect(screen.getByText(/20,000/)).toBeInTheDocument();
  });

  it("clicking amount in sats mode returns to fiat mode", () => {
    renderComponent({ satoshis: 20000, exchangeRateAtSale: 50000, currentRate: 60000 });
    fireEvent.click(screen.getByText("$10.00"));
    const satsButton = screen.getByText(/20,000/);
    fireEvent.click(satsButton);
    expect(screen.getByText("$10.00")).toBeInTheDocument();
  });

  it("shows clock icon when both rates are available", () => {
    const { container } = renderComponent({ satoshis: 20000, exchangeRateAtSale: 50000, currentRate: 60000 });
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("does not show clock icon when currentRate is missing", () => {
    const { container } = renderComponent({ satoshis: 20000, exchangeRateAtSale: 50000 });
    expect(container.querySelector("svg")).toBeNull();
  });

  it("does not show clock icon when exchangeRateAtSale is missing", () => {
    const { container } = renderComponent({ satoshis: 20000, currentRate: 60000 });
    expect(container.querySelector("svg")).toBeNull();
  });

  it("clicking clock shows current fiat", () => {
    renderComponent({ satoshis: 100_000_000, exchangeRateAtSale: 50000, currentRate: 60000 });
    fireEvent.click(screen.getByLabelText("showCurrentRate"));
    expect(formatAmount).toHaveBeenCalledWith(60000 * 100);
  });

  it("clicking clock again returns to historical fiat", () => {
    renderComponent({ satoshis: 100_000_000, exchangeRateAtSale: 50000, currentRate: 60000 });
    fireEvent.click(screen.getByLabelText("showCurrentRate"));
    formatAmount.mockClear();
    fireEvent.click(screen.getByLabelText("showHistoricalRate"));
    expect(formatAmount).toHaveBeenCalledWith(50000 * 100);
  });

  it("does not show clock icon in sats mode", () => {
    const { container } = renderComponent({ satoshis: 20000, exchangeRateAtSale: 50000, currentRate: 60000 });
    fireEvent.click(screen.getByText("$10.00"));
    expect(container.querySelector("svg")).toBeNull();
  });

  it("shows dash when exchangeRateAtSale is null and currentRate is null", () => {
    renderComponent({ satoshis: 20000, exchangeRateAtSale: null, currentRate: null });
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("shows historical rate label by default when both rates are available", () => {
    renderComponent({ satoshis: 20000, exchangeRateAtSale: 50000, currentRate: 60000 });
    expect(screen.getByText("amountAtTimeOfPayment")).toBeInTheDocument();
  });

  it("shows current rate label after clicking clock", () => {
    renderComponent({ satoshis: 20000, exchangeRateAtSale: 50000, currentRate: 60000 });
    fireEvent.click(screen.getByLabelText("showCurrentRate"));
    expect(screen.getByText("amountAtCurrentRate")).toBeInTheDocument();
  });

  it("does not show rate label when only one rate is available", () => {
    renderComponent({ satoshis: 20000, exchangeRateAtSale: 50000 });
    expect(screen.queryByText("amountAtTimeOfPayment")).not.toBeInTheDocument();
    expect(screen.queryByText("amountAtCurrentRate")).not.toBeInTheDocument();
  });
});
