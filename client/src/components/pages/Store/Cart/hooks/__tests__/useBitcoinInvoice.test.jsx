import { act, useEffect } from "react";

import { render, screen, waitFor } from "@testing-library/react";

import { useBitcoinInvoice } from "../useBitcoinInvoice";

let mockGetBitcoinPrice;
let mockCreateInvoice;

jest.mock("@/services/bitcoinPriceService", () => jest.fn().mockImplementation(() => ({
  getBitcoinPrice: (...args) => mockGetBitcoinPrice(...args),
})),
);

jest.mock("@/services/walletService", () => ({
  createInvoiceForCart: (...args) => mockCreateInvoice(...args),
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
    mockGetBitcoinPrice = jest.fn();
    mockCreateInvoice = jest.fn();
    latestState = {};
  });

  it("auto-generates invoice when amount is provided", async () => {
    mockGetBitcoinPrice.mockResolvedValue(50000);
    mockCreateInvoice.mockResolvedValue({ serialized: "ln", paymentHash: "hash-1" });

    render(<TestComponent amountFiat={10} currencyAcronym="mxn" paymentId="pay-1" />);

    await waitFor(() => expect(screen.getByTestId("invoice")).toHaveTextContent("yes"));
    expect(mockGetBitcoinPrice).toHaveBeenCalledWith("mxn");
    expect(mockCreateInvoice).toHaveBeenCalledWith(20000, "pay-1");
    expect(screen.getByTestId("sats")).toHaveTextContent("20000");
  });

  it("calls onInvoiceReady with satoshis and exchangeRate", async () => {
    const onInvoiceReady = jest.fn();
    mockGetBitcoinPrice.mockResolvedValue(50000);
    mockCreateInvoice.mockResolvedValue({ serialized: "ln", paymentHash: "hash-1" });

    render(
      <TestComponent
        amountFiat={10}
        currencyAcronym="mxn"
        paymentId="pay-1"
        onInvoiceReady={onInvoiceReady}
      />,
    );

    await waitFor(() => expect(onInvoiceReady).toHaveBeenCalled());
    expect(onInvoiceReady).toHaveBeenCalledWith(
      expect.objectContaining({
        invoice: { serialized: "ln", paymentHash: "hash-1" },
        satoshis: 20000,
        paymentId: "pay-1",
        exchangeRate: 50000,
      }),
    );
  });

  it("captures errors when invoice creation fails", async () => {
    mockGetBitcoinPrice.mockResolvedValue(50000);
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

    expect(mockGetBitcoinPrice).not.toHaveBeenCalled();
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
    expect(mockGetBitcoinPrice).not.toHaveBeenCalled();
  });

  it("resets invoice state", async () => {
    mockGetBitcoinPrice.mockResolvedValue(50000);
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
