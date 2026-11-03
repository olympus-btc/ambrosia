import { renderHook } from "@testing-library/react";

import { httpClient } from "@/lib/http";

import { useCashDrawer } from "../useCashDrawer";

jest.mock("@/lib/http", () => ({
  httpClient: jest.fn(),
}));

beforeEach(() => {
  httpClient.mockReset();
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  console.error.mockRestore();
});

describe("useCashDrawer", () => {
  it("opens the cash drawer manually", async () => {
    httpClient.mockResolvedValue({ ok: true });
    const { result: cashDrawerHook } = renderHook(() => useCashDrawer());

    await cashDrawerHook.current.openCashDrawer();

    expect(httpClient).toHaveBeenCalledWith("/printers/cash-drawer/open", expect.objectContaining({ method: "POST" }));
  });

  it("opens the cash drawer of one printer", async () => {
    httpClient.mockResolvedValue({ ok: true });
    const { result: cashDrawerHook } = renderHook(() => useCashDrawer());

    await cashDrawerHook.current.openCashDrawer("cfg-1");

    expect(httpClient).toHaveBeenCalledWith(
      "/printers/cash-drawer/open",
      expect.objectContaining({ body: JSON.stringify({ printerId: "cfg-1" }) }),
    );
  });

  it("throws when the cash drawer could not be opened", async () => {
    httpClient.mockResolvedValue({ ok: false });
    const { result: cashDrawerHook } = renderHook(() => useCashDrawer());

    await expect(cashDrawerHook.current.openCashDrawer()).rejects.toThrow("cash_drawer_not_opened");
  });

  it("opens the cash drawer for the shift close without failing the close", async () => {
    httpClient.mockRejectedValue(new Error("network down"));
    const { result: cashDrawerHook } = renderHook(() => useCashDrawer());

    await expect(cashDrawerHook.current.openCashDrawerForShiftClose("shift-1")).resolves.toBeUndefined();
    expect(httpClient).toHaveBeenCalledWith("/shifts/shift-1/cash-drawer", expect.objectContaining({ method: "POST" }));
  });

  it("skips the shift close request without a shift", async () => {
    const { result: cashDrawerHook } = renderHook(() => useCashDrawer());

    await cashDrawerHook.current.openCashDrawerForShiftClose(null);

    expect(httpClient).not.toHaveBeenCalled();
  });
});
