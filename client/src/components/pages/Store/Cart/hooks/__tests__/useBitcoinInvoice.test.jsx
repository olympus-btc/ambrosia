import { act, useEffect } from "react";

import { render, screen, waitFor } from "@testing-library/react";

import { useBitcoinInvoice } from "../useBitcoinInvoice";

let mockFiatToSatoshis;
let mockCreateInvoice;

jest.mock("@/services/bitcoinPriceService", () => jest.fn().mockImplementation(() => ({
  fiatToSatoshis: (...args) => mockFiatToSatoshis(...args),
})),
);

jest.mock("@/services/walletService", () => ({
  createInvoice: (...args) => mockCreateInvoice(...args),
}));

let latestState = {};

function TestComponent(props) {
  const state = useBitcoinInvoice(props);
  useEffect(() => {
    latestState = state;
  }, [state]);
  return (
    <div>
      <span data-testid="loading">{state.loading ? "yes" : "no"}</span>
      <span data-testid="error">{state.error}</span>
      <span data-testid="invoice">{state.invoice ? "yes" : "no"}</span>
      <span data-testid="sats">{state.satsAmount ?? ""}</span>
    </div>
  );
}

describe("useBitcoinInvoice", () => {
  beforeEach(() => {
    mockFiatToSatoshis = jest.fn();
    mockCreateInvoice = jest.fn();
    latestState = {};
  });

  it("auto-generates invoice when amount is provided", async () => {
    mockFiatToSatoshis.mockResolvedValue(500);
    mockCreateInvoice.mockResolvedValue({ serialized: "ln", paymentHash: "hash-1" });

    render(<TestComponent amountFiat={10} currencyAcronym="mxn" paymentId="pay-1" />);

    await waitFor(() => expect(screen.getByTestId("invoice")).toHaveTextContent("yes"));
    expect(mockFiatToSatoshis).toHaveBeenCalledWith(10, "mxn");
    expect(mockCreateInvoice).toHaveBeenCalledWith(500, "pay-1");
    expect(screen.getByTestId("sats")).toHaveTextContent("500");
  });

  it("captures errors when invoice creation fails", async () => {
    mockFiatToSatoshis.mockResolvedValue(500);
    mockCreateInvoice.mockRejectedValue(new Error("invoice-error"));

    render(<TestComponent amountFiat={10} currencyAcronym="mxn" paymentId="pay-1" />);

    await waitFor(() => expect(screen.getByTestId("error")).toHaveTextContent("invoice-error"));
  });

  it("returns null when amountFiat is missing", async () => {
    render(<TestComponent amountFiat={0} currencyAcronym="mxn" paymentId="pay-1" />);

    await act(async () => {
      const result = await latestState.generateInvoice();
      expect(result).toBeNull();
    });

    expect(mockFiatToSatoshis).not.toHaveBeenCalled();
    expect(mockCreateInvoice).not.toHaveBeenCalled();
  });

  it("does not auto-generate when autoGenerate is false", async () => {
    render(
      <TestComponent
        amountFiat={10}
        currencyAcronym="mxn"
        paymentId="pay-1"
        autoGenerate={false}
      />,
    );

    await waitFor(() => expect(screen.getByTestId("invoice")).toHaveTextContent("no"));
    expect(mockFiatToSatoshis).not.toHaveBeenCalled();
  });

  it("resets invoice state", async () => {
    mockFiatToSatoshis.mockResolvedValue(500);
    mockCreateInvoice.mockResolvedValue({ serialized: "ln", paymentHash: "hash-1" });

    render(<TestComponent amountFiat={10} currencyAcronym="mxn" paymentId="pay-1" />);

    await waitFor(() => expect(screen.getByTestId("invoice")).toHaveTextContent("yes"));

    act(() => {
      latestState.reset();
    });

    expect(screen.getByTestId("invoice")).toHaveTextContent("no");
    expect(screen.getByTestId("error")).toHaveTextContent("");
  });
});
