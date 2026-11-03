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
  const errorsTranslations = (key) => key;
  return { useTranslations: () => errorsTranslations };
});

describe("useFetchList", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns parsed data when response is ok", async () => {
    httpClient.mockResolvedValueOnce({ ok: true });
    parseJsonResponse.mockResolvedValueOnce([{ id: 1 }]);

    const { result: fetchListHook } = renderHook(() => useFetchList());

    let fetchedList;
    await act(async () => {
      fetchedList = await fetchListHook.current.fetchList("/items");
    });

    expect(httpClient).toHaveBeenCalledWith("/items", {});
    expect(fetchedList).toEqual([{ id: 1 }]);
    expect(mockAddToast).not.toHaveBeenCalled();
  });

  it("throws without showing a toast when the response is 403", async () => {
    httpClient.mockResolvedValueOnce({ ok: false, status: 403 });
    parseJsonResponse.mockResolvedValueOnce(null);

    const { result: fetchListHook } = renderHook(() => useFetchList());

    await act(async () => {
      await expect(fetchListHook.current.fetchList("/items")).rejects.toMatchObject({ status: 403 });
    });

    expect(mockAddToast).not.toHaveBeenCalled();
  });

  it("throws and shows a toast with the server's message for a non-403 error", async () => {
    httpClient.mockResolvedValueOnce({ ok: false, status: 500 });
    parseJsonResponse.mockResolvedValueOnce({ message: "Database unavailable" });

    const { result: fetchListHook } = renderHook(() => useFetchList());

    await act(async () => {
      await expect(fetchListHook.current.fetchList("/items")).rejects.toMatchObject({ status: 500 });
    });

    expect(mockAddToast).toHaveBeenCalledWith({
      title: "requestErrorTitle",
      description: "Database unavailable",
      color: "danger",
    });
  });

  it("shows the fallback toast description when a non-403 error has no server message", async () => {
    httpClient.mockResolvedValueOnce({ ok: false, status: 500 });
    parseJsonResponse.mockResolvedValueOnce(null);

    const { result: fetchListHook } = renderHook(() => useFetchList());

    await act(async () => {
      await expect(fetchListHook.current.fetchList("/items")).rejects.toThrow();
    });

    expect(mockAddToast).toHaveBeenCalledWith({
      title: "requestErrorTitle",
      description: "requestErrorDescription",
      color: "danger",
    });
  });

  it("uses the provided fallback when response is ok but data is empty", async () => {
    httpClient.mockResolvedValueOnce({ ok: true });
    parseJsonResponse.mockResolvedValueOnce(null);

    const { result: fetchListHook } = renderHook(() => useFetchList());

    let fetchedList;
    await act(async () => {
      fetchedList = await fetchListHook.current.fetchList("/items", []);
    });

    expect(parseJsonResponse).toHaveBeenCalledWith({ ok: true }, []);
    expect(fetchedList).toBeNull();
  });

  it("defaults fallback to empty array", async () => {
    httpClient.mockResolvedValueOnce({ ok: true });
    parseJsonResponse.mockResolvedValueOnce([]);

    const { result: fetchListHook } = renderHook(() => useFetchList());

    await act(async () => {
      await fetchListHook.current.fetchList("/items");
    });

    expect(parseJsonResponse).toHaveBeenCalledWith({ ok: true }, []);
  });

  it("forwards options to httpClient, e.g. skipForbiddenRedirect", async () => {
    httpClient.mockResolvedValueOnce({ ok: true });
    parseJsonResponse.mockResolvedValueOnce([]);

    const { result: fetchListHook } = renderHook(() => useFetchList());

    await act(async () => {
      await fetchListHook.current.fetchList("/items", [], { skipForbiddenRedirect: true });
    });

    expect(httpClient).toHaveBeenCalledWith("/items", { skipForbiddenRedirect: true });
  });

  it("returns a stable fetchList reference between renders", () => {
    const { result: fetchListHook, rerender } = renderHook(() => useFetchList());
    const fetchListBeforeRerender = fetchListHook.current.fetchList;
    rerender();
    expect(fetchListHook.current.fetchList).toBe(fetchListBeforeRerender);
  });
});
