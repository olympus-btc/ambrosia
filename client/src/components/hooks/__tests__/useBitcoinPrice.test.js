import { act, renderHook, waitFor } from "@testing-library/react";

import { useBitcoinPrice } from "../useBitcoinPrice";

let mockGetBitcoinPrice;

jest.mock("@/services/bitcoinPriceService", () => jest.fn().mockImplementation(() => ({
  getBitcoinPrice: (...args) => mockGetBitcoinPrice(...args),
})),
);

describe("useBitcoinPrice", () => {
  beforeEach(() => {
    mockGetBitcoinPrice = jest.fn();
  });

  it("returns null currentRate and false isLoading initially without currencyAcronym", () => {
    const { result } = renderHook(() => useBitcoinPrice());
    expect(result.current.currentRate).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("fetches and returns currentRate when currencyAcronym is provided", async () => {
    mockGetBitcoinPrice.mockResolvedValue(50000);
    const { result } = renderHook(() => useBitcoinPrice({ currencyAcronym: "USD" }));

    await waitFor(() => expect(result.current.currentRate).toBe(50000));
    expect(mockGetBitcoinPrice).toHaveBeenCalledWith("usd");
    expect(result.current.isLoading).toBe(false);
  });

  it("sets isLoading true while fetching", async () => {
    let resolve;
    mockGetBitcoinPrice.mockReturnValue(new Promise((res) => { resolve = res; }));

    const { result } = renderHook(() => useBitcoinPrice({ currencyAcronym: "USD" }));
    expect(result.current.isLoading).toBe(true);

    await act(async () => { resolve(50000); });
    expect(result.current.isLoading).toBe(false);
  });

  it("resets isLoading on fetch error without throwing", async () => {
    mockGetBitcoinPrice.mockRejectedValue(new Error("network error"));
    const { result } = renderHook(() => useBitcoinPrice({ currencyAcronym: "USD" }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.currentRate).toBeNull();
  });

  it("convertSatoshisToFiat returns correct fiat value", async () => {
    mockGetBitcoinPrice.mockResolvedValue(100000);
    const { result } = renderHook(() => useBitcoinPrice({ currencyAcronym: "USD" }));

    await waitFor(() => expect(result.current.currentRate).toBe(100000));
    expect(result.current.convertSatoshisToFiat(100_000_000)).toBeCloseTo(100000);
    expect(result.current.convertSatoshisToFiat(1_000_000)).toBeCloseTo(1000);
  });

  it("convertSatoshisToFiat returns null when currentRate is not loaded", () => {
    const { result } = renderHook(() => useBitcoinPrice());
    expect(result.current.convertSatoshisToFiat(50000)).toBeNull();
  });
});
