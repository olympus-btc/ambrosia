import { renderHook, act } from "@testing-library/react";

import { useAutoLiquidity } from "../useAutoLiquidity";

jest.mock("@lib/isElectron", () => ({ isElectron: true }));

const mockInvoke = jest.fn();
const originalError = console.error;

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  console.error = jest.fn();
  window.electron = { ipc: { invoke: mockInvoke } };
});

afterEach(() => {
  jest.useRealTimers();
  console.error = originalError;
  delete window.electron;
});

describe("useAutoLiquidity", () => {
  describe("initial state", () => {
    it("starts with loading=false and enabled=false", () => {
      const { result } = renderHook(() => useAutoLiquidity());

      expect(result.current.loading).toBe(false);
      expect(result.current.enabled).toBe(false);
    });

    it("does not call the IPC bridge before load is invoked", () => {
      renderHook(() => useAutoLiquidity());

      expect(mockInvoke).not.toHaveBeenCalled();
    });
  });

  describe("loadAutoLiquidity", () => {
    it("sets loading=true synchronously when load is called", () => {
      mockInvoke.mockReturnValue(new Promise(() => {}));
      const { result } = renderHook(() => useAutoLiquidity());

      act(() => {
        result.current.loadAutoLiquidity();
      });

      expect(result.current.loading).toBe(true);
    });

    it("sets enabled=false when config returns 'off'", async () => {
      mockInvoke.mockResolvedValue("off");
      const { result } = renderHook(() => useAutoLiquidity());

      await act(async () => {
        await result.current.loadAutoLiquidity();
      });

      expect(result.current.enabled).toBe(false);
      expect(result.current.loading).toBe(false);
    });

    it("sets enabled=true when config returns '2m'", async () => {
      mockInvoke.mockResolvedValue("2m");
      const { result } = renderHook(() => useAutoLiquidity());

      await act(async () => {
        await result.current.loadAutoLiquidity();
      });

      expect(result.current.enabled).toBe(true);
      expect(result.current.loading).toBe(false);
    });

    it("returns 'nwc' and leaves enabled untouched when NWC is configured", async () => {
      mockInvoke.mockResolvedValue({ nwcConfigured: true });
      const { result } = renderHook(() => useAutoLiquidity());

      let returnValue;
      await act(async () => {
        returnValue = await result.current.loadAutoLiquidity();
      });

      expect(returnValue).toBe("nwc");
      expect(result.current.enabled).toBe(false);
    });

    it("sets error and returns false when the IPC call fails", async () => {
      mockInvoke.mockRejectedValue(new Error("IPC error"));
      const { result } = renderHook(() => useAutoLiquidity());

      let returnValue;
      await act(async () => {
        returnValue = await result.current.loadAutoLiquidity();
      });

      expect(returnValue).toBe(false);
      expect(result.current.error).toBe("IPC error");
      expect(result.current.loading).toBe(false);
    });
  });

  describe("toggleAutoLiquidity", () => {
    it("updates enabled optimistically before IPC resolves", async () => {
      mockInvoke.mockResolvedValue(true);
      const { result } = renderHook(() => useAutoLiquidity());

      act(() => {
        result.current.toggleAutoLiquidity(true);
      });

      expect(result.current.enabled).toBe(true);
      expect(result.current.restarting).toBe(true);
    });

    it("sends '2m' when enabling", async () => {
      mockInvoke.mockResolvedValue(true);
      const { result } = renderHook(() => useAutoLiquidity());

      await act(async () => {
        const togglePromise = result.current.toggleAutoLiquidity(true);
        jest.runAllTimers();
        await togglePromise;
      });

      expect(mockInvoke).toHaveBeenCalledWith("phoenixd:set-auto-liquidity", "2m");
    });

    it("sends 'off' when disabling", async () => {
      mockInvoke.mockResolvedValue(true);
      const { result } = renderHook(() => useAutoLiquidity());

      await act(async () => {
        const togglePromise = result.current.toggleAutoLiquidity(false);
        jest.runAllTimers();
        await togglePromise;
      });

      expect(mockInvoke).toHaveBeenCalledWith("phoenixd:set-auto-liquidity", "off");
    });

    it("returns true on success", async () => {
      mockInvoke.mockResolvedValue(true);
      const { result } = renderHook(() => useAutoLiquidity());

      let returnValue;
      await act(async () => {
        const togglePromise = result.current.toggleAutoLiquidity(true);
        jest.runAllTimers();
        returnValue = await togglePromise;
      });

      expect(returnValue).toBe(true);
    });

    it("returns 'manual' when requiresManualRestart is true", async () => {
      mockInvoke.mockResolvedValue({ requiresManualRestart: true });
      const { result } = renderHook(() => useAutoLiquidity());

      let returnValue;
      await act(async () => {
        const togglePromise = result.current.toggleAutoLiquidity(true);
        jest.runAllTimers();
        returnValue = await togglePromise;
      });

      expect(returnValue).toBe("manual");
    });

    it("returns 'nwc' when NWC is configured", async () => {
      mockInvoke.mockResolvedValue({ nwcConfigured: true });
      const { result } = renderHook(() => useAutoLiquidity());

      let returnValue;
      await act(async () => {
        const togglePromise = result.current.toggleAutoLiquidity(true);
        jest.runAllTimers();
        returnValue = await togglePromise;
      });

      expect(returnValue).toBe("nwc");
    });

    it("reverts enabled and returns false when IPC fails", async () => {
      mockInvoke.mockRejectedValue(new Error("restart failed"));
      const { result } = renderHook(() => useAutoLiquidity());

      let returnValue;
      await act(async () => {
        const togglePromise = result.current.toggleAutoLiquidity(true);
        jest.runAllTimers();
        returnValue = await togglePromise;
      });

      expect(returnValue).toBe(false);
      expect(result.current.enabled).toBe(false);
      expect(result.current.error).toBe("restart failed");
    });

    it("sets restarting=false after toggle completes", async () => {
      mockInvoke.mockResolvedValue(true);
      const { result } = renderHook(() => useAutoLiquidity());

      await act(async () => {
        const togglePromise = result.current.toggleAutoLiquidity(true);
        jest.runAllTimers();
        await togglePromise;
      });

      expect(result.current.restarting).toBe(false);
    });

    it("debounces rapid successive calls and only sends one IPC call", async () => {
      mockInvoke.mockResolvedValue(true);
      const { result } = renderHook(() => useAutoLiquidity());

      await act(async () => {
        result.current.toggleAutoLiquidity(true);
        result.current.toggleAutoLiquidity(false);
        result.current.toggleAutoLiquidity(true);
        jest.runAllTimers();
        await Promise.resolve();
        await Promise.resolve();
      });

      const setCalls = mockInvoke.mock.calls.filter(
        ([channel]) => channel === "phoenixd:set-auto-liquidity",
      );
      expect(setCalls).toHaveLength(1);
      expect(setCalls[0][1]).toBe("2m");
    });
  });
});
