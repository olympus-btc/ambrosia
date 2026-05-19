import { act, renderHook } from "@testing-library/react";

import { httpClient, parseJsonResponse } from "@/lib/http";

import { useReports } from "../useReports";

jest.mock("@/lib/http", () => ({
  httpClient: jest.fn(),
  parseJsonResponse: jest.fn(),
}));

const mockAddToast = jest.fn();
jest.mock("@heroui/react", () => ({
  addToast: (...args) => mockAddToast(...args),
}));

jest.mock("next-intl", () => ({
  useTranslations: () => (key) => key,
}));

const successReport = { totalRevenueCents: 0, totalItemsSold: 0, sales: [] };

async function setupHook() {
  const hook = renderHook(() => useReports());
  await act(async () => {});
  jest.clearAllMocks();
  httpClient.mockResolvedValue({});
  parseJsonResponse.mockResolvedValue(successReport);
  return hook;
}

describe("useReports — fetch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    httpClient.mockResolvedValue({});
    parseJsonResponse.mockResolvedValue(successReport);
  });

  it("exposes fetchReport as a function", async () => {
    const { result } = renderHook(() => useReports());
    await act(async () => {});
    expect(typeof result.current.fetchReport).toBe("function");
  });

  it("loading=false and error=null after initial auto-fetch completes", async () => {
    const { result } = renderHook(() => useReports());
    await act(async () => {});
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("loading=true during explicit fetch and false when done", async () => {
    let resolveHttp;
    const { result } = await setupHook();
    httpClient.mockReturnValueOnce(new Promise((r) => { resolveHttp = r; }));
    parseJsonResponse.mockResolvedValue(successReport);

    act(() => {
      result.current.fetchReport({ period: "month" });
    });

    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolveHttp({});
    });

    expect(result.current.loading).toBe(false);
  });

  it("error is set when fetchReport throws an exception", async () => {
    const { result } = await setupHook();
    const networkError = new Error("Network error");
    httpClient.mockRejectedValueOnce(networkError);

    await act(async () => {
      await result.current.fetchReport({ period: "month" }).catch(() => {});
    });

    expect(result.current.error).toBe(networkError);
    expect(result.current.loading).toBe(false);
  });

  it("error is cleared when a new successful fetch starts", async () => {
    const { result } = await setupHook();
    httpClient.mockRejectedValueOnce(new Error("fail"));

    await act(async () => {
      await result.current.fetchReport({ period: "month" }).catch(() => {});
    });
    expect(result.current.error).not.toBeNull();

    httpClient.mockResolvedValueOnce({});
    await act(async () => {
      await result.current.fetchReport({ period: "week" });
    });
    expect(result.current.error).toBeNull();
  });

  it("fetchReport re-throws the error for the caller to handle", async () => {
    const { result } = await setupHook();
    httpClient.mockRejectedValueOnce(new Error("fail"));

    await expect(
      act(async () => result.current.fetchReport({ period: "month" })),
    ).rejects.toThrow("fail");
  });

  it("reportData is set with the server response after a successful fetch", async () => {
    const { result } = await setupHook();
    const mockReport = { totalRevenueCents: 5000, totalItemsSold: 3, sales: [] };
    parseJsonResponse.mockResolvedValueOnce(mockReport);

    await act(async () => {
      await result.current.fetchReport({ period: "month" });
    });

    expect(result.current.reportData).toEqual(mockReport);
  });

  it("fetchReport returns the same value it stores in reportData", async () => {
    const { result } = await setupHook();
    const mockReport = { totalRevenueCents: 5000, totalItemsSold: 3, sales: [] };
    parseJsonResponse.mockResolvedValueOnce(mockReport);
    let returned;

    await act(async () => {
      returned = await result.current.fetchReport({ period: "month" });
    });

    expect(returned).toEqual(mockReport);
    expect(result.current.reportData).toEqual(mockReport);
  });

  it("fetchReport with period sends ?period=month", async () => {
    const { result } = await setupHook();

    await act(async () => {
      await result.current.fetchReport({ period: "month" });
    });

    expect(httpClient).toHaveBeenCalledWith("/reports?period=month");
  });

  it("fetchReport with period=week sends ?period=week", async () => {
    const { result } = await setupHook();

    await act(async () => {
      await result.current.fetchReport({ period: "week" });
    });

    expect(httpClient).toHaveBeenCalledWith("/reports?period=week");
  });

  it("fetchReport with period=year sends ?period=year", async () => {
    const { result } = await setupHook();

    await act(async () => {
      await result.current.fetchReport({ period: "year" });
    });

    expect(httpClient).toHaveBeenCalledWith("/reports?period=year");
  });

  it("fetchReport with startDate and endDate includes both in the URL", async () => {
    const { result } = await setupHook();

    await act(async () => {
      await result.current.fetchReport({ startDate: "2024-01-01", endDate: "2024-01-31" });
    });

    const url = httpClient.mock.calls[0][0];
    expect(url).toContain("startDate=2024-01-01");
    expect(url).toContain("endDate=2024-01-31");
  });

  it("fetchReport with productName includes it in the URL", async () => {
    const { result } = await setupHook();

    await act(async () => {
      await result.current.fetchReport({ productName: "Widget" });
    });

    expect(httpClient).toHaveBeenCalledWith("/reports?productName=Widget");
  });

  it("fetchReport with productName with spaces trims it", async () => {
    const { result } = await setupHook();

    await act(async () => {
      await result.current.fetchReport({ productName: "  Widget  " });
    });

    expect(httpClient).toHaveBeenCalledWith("/reports?productName=Widget");
  });

  it("fetchReport with paymentMethod includes it in the URL", async () => {
    const { result } = await setupHook();

    await act(async () => {
      await result.current.fetchReport({ paymentMethod: "Cash" });
    });

    expect(httpClient).toHaveBeenCalledWith("/reports?paymentMethod=Cash");
  });

  it("fetchReport with paymentMethod with spaces trims it", async () => {
    const { result } = await setupHook();

    await act(async () => {
      await result.current.fetchReport({ paymentMethod: "  BTC  " });
    });

    expect(httpClient).toHaveBeenCalledWith("/reports?paymentMethod=BTC");
  });

  it("fetchReport with no parameters calls /reports without query string", async () => {
    const { result } = await setupHook();

    await act(async () => {
      await result.current.fetchReport({});
    });

    expect(httpClient).toHaveBeenCalledWith("/reports");
  });

  it("fetchReport with no arguments calls /reports without query string", async () => {
    const { result } = await setupHook();

    await act(async () => {
      await result.current.fetchReport();
    });

    expect(httpClient).toHaveBeenCalledWith("/reports");
  });

  it("fetchReport with empty productName does not include it in the URL", async () => {
    const { result } = await setupHook();

    await act(async () => {
      await result.current.fetchReport({ productName: "   " });
    });

    expect(httpClient).toHaveBeenCalledWith("/reports");
  });

  it("fetchReport with empty paymentMethod does not include it in the URL", async () => {
    const { result } = await setupHook();

    await act(async () => {
      await result.current.fetchReport({ paymentMethod: "" });
    });

    expect(httpClient).toHaveBeenCalledWith("/reports");
  });

  it("fetchReport with multiple filters builds the URL correctly", async () => {
    const { result } = await setupHook();

    await act(async () => {
      await result.current.fetchReport({
        period: "month",
        productName: "Widget",
        paymentMethod: "Cash",
      });
    });

    const url = httpClient.mock.calls[0][0];
    expect(url).toContain("period=month");
    expect(url).toContain("productName=Widget");
    expect(url).toContain("paymentMethod=Cash");
  });

  it("GAP: fetchReport does not send userId even though the server supports it", async () => {
    const { result } = await setupHook();

    await act(async () => {
      await result.current.fetchReport({ period: "month" });
    });

    const url = httpClient.mock.calls[0][0];
    expect(url).not.toContain("userId");
  });
});
