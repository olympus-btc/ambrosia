import { act, renderHook } from "@testing-library/react";

import { httpClient, parseJsonResponse } from "@/lib/http";

import { useFetchList } from "../useFetchList";

jest.mock("@/lib/http", () => ({
  httpClient: jest.fn(),
  parseJsonResponse: jest.fn(),
}));

const mockAddToast = jest.fn();
jest.mock("@heroui/react", () => ({
  addToast: (...args) => mockAddToast(...args),
}));

jest.mock("next-intl", () => {
  const t = (key) => key;
  return { useTranslations: () => t };
});

describe("useFetchList", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns parsed data when response is ok", async () => {
    httpClient.mockResolvedValueOnce({ ok: true });
    parseJsonResponse.mockResolvedValueOnce([{ id: 1 }]);

    const { result } = renderHook(() => useFetchList());

    let data;
    await act(async () => {
      data = await result.current.fetchList("/items");
    });

    expect(httpClient).toHaveBeenCalledWith("/items");
    expect(data).toEqual([{ id: 1 }]);
    expect(mockAddToast).not.toHaveBeenCalled();
  });

  it("returns null and shows toast when response is not ok", async () => {
    httpClient.mockResolvedValueOnce({ ok: false });

    const { result } = renderHook(() => useFetchList());

    let data;
    await act(async () => {
      data = await result.current.fetchList("/items");
    });

    expect(data).toBeNull();
    expect(mockAddToast).toHaveBeenCalledWith({
      title: "connectionErrorTitle",
      description: "connectionErrorDescription",
      color: "danger",
    });
    expect(parseJsonResponse).not.toHaveBeenCalled();
  });

  it("uses the provided fallback when response is ok but data is empty", async () => {
    httpClient.mockResolvedValueOnce({ ok: true });
    parseJsonResponse.mockResolvedValueOnce(null);

    const { result } = renderHook(() => useFetchList());

    let data;
    await act(async () => {
      data = await result.current.fetchList("/items", []);
    });

    expect(parseJsonResponse).toHaveBeenCalledWith({ ok: true }, []);
    expect(data).toBeNull();
  });

  it("defaults fallback to empty array", async () => {
    httpClient.mockResolvedValueOnce({ ok: true });
    parseJsonResponse.mockResolvedValueOnce([]);

    const { result } = renderHook(() => useFetchList());

    await act(async () => {
      await result.current.fetchList("/items");
    });

    expect(parseJsonResponse).toHaveBeenCalledWith({ ok: true }, []);
  });

  it("returns a stable fetchList reference between renders", () => {
    const { result, rerender } = renderHook(() => useFetchList());
    const first = result.current.fetchList;
    rerender();
    expect(result.current.fetchList).toBe(first);
  });
});
