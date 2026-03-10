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
  describe("initial load", () => {
    it("starts with loading=true and enabled=false", () => {
      mockInvoke.mockResolvedValue("off");
      const { result } = renderHook(() => useAutoLiquidity());

      expect(result.current.loading).toBe(true);
      expect(result.current.enabled).toBe(false);
    });

    it("sets enabled=false when config returns 'off'", async () => {
      mockInvoke.mockResolvedValue("off");
      const { result } = renderHook(() => useAutoLiquidity());

      await act(async () => {});

      expect(result.current.enabled).toBe(false);
      expect(result.current.loading).toBe(false);
    });

    it("sets enabled=true when config returns '2m'", async () => {
      mockInvoke.mockResolvedValue("2m");
      const { result } = renderHook(() => useAutoLiquidity());

      await act(async () => {});

      expect(result.current.enabled).toBe(true);
      expect(result.current.loading).toBe(false);
    });

    it("sets error when IPC call fails on mount", async () => {
      mockInvoke.mockRejectedValue(new Error("IPC error"));
      const { result } = renderHook(() => useAutoLiquidity());

      await act(async () => {});

      expect(result.current.error).toBe("IPC error");
      expect(result.current.loading).toBe(false);
    });
  });

  describe("toggle", () => {
    it("updates enabled optimistically before IPC resolves", async () => {
      mockInvoke
        .mockResolvedValueOnce("off")
        .mockResolvedValue(true);

      const { result } = renderHook(() => useAutoLiquidity());
      await act(async () => {});

      act(() => {
        result.current.toggle(true);
      });

      expect(result.current.enabled).toBe(true);
      expect(result.current.restarting).toBe(true);
    });

    it("sends '2m' when enabling", async () => {
      mockInvoke
        .mockResolvedValueOnce("off")
        .mockResolvedValue(true);

      const { result } = renderHook(() => useAutoLiquidity());
      await act(async () => {});

      await act(async () => {
        const togglePromise = result.current.toggle(true);
        jest.runAllTimers();
        await togglePromise;
      });

      expect(mockInvoke).toHaveBeenCalledWith("phoenixd:set-auto-liquidity", "2m");
    });

    it("sends 'off' when disabling", async () => {
      mockInvoke
        .mockResolvedValueOnce("2m")
        .mockResolvedValue(true);

      const { result } = renderHook(() => useAutoLiquidity());
      await act(async () => {});

      await act(async () => {
        const togglePromise = result.current.toggle(false);
        jest.runAllTimers();
        await togglePromise;
      });

      expect(mockInvoke).toHaveBeenCalledWith("phoenixd:set-auto-liquidity", "off");
    });

    it("returns true on success", async () => {
      mockInvoke
        .mockResolvedValueOnce("off")
        .mockResolvedValue(true);

      const { result } = renderHook(() => useAutoLiquidity());
      await act(async () => {});

      let returnValue;
      await act(async () => {
        const togglePromise = result.current.toggle(true);
        jest.runAllTimers();
        returnValue = await togglePromise;
      });

      expect(returnValue).toBe(true);
    });

    it("returns 'manual' when requiresManualRestart is true", async () => {
      mockInvoke
        .mockResolvedValueOnce("off")
        .mockResolvedValue({ requiresManualRestart: true });

      const { result } = renderHook(() => useAutoLiquidity());
      await act(async () => {});

      let returnValue;
      await act(async () => {
        const togglePromise = result.current.toggle(true);
        jest.runAllTimers();
        returnValue = await togglePromise;
      });

      expect(returnValue).toBe("manual");
    });

    it("reverts enabled and returns false when IPC fails", async () => {
      mockInvoke
        .mockResolvedValueOnce("off")
        .mockRejectedValue(new Error("restart failed"));

      const { result } = renderHook(() => useAutoLiquidity());
      await act(async () => {});

      let returnValue;
      await act(async () => {
        const togglePromise = result.current.toggle(true);
        jest.runAllTimers();
        returnValue = await togglePromise;
      });

      expect(returnValue).toBe(false);
      expect(result.current.enabled).toBe(false);
      expect(result.current.error).toBe("restart failed");
    });

    it("sets restarting=false after toggle completes", async () => {
      mockInvoke
        .mockResolvedValueOnce("off")
        .mockResolvedValue(true);

      const { result } = renderHook(() => useAutoLiquidity());
      await act(async () => {});

      await act(async () => {
        const togglePromise = result.current.toggle(true);
        jest.runAllTimers();
        await togglePromise;
      });

      expect(result.current.restarting).toBe(false);
    });

    it("debounces rapid successive calls and only sends one IPC call", async () => {
      mockInvoke
        .mockResolvedValueOnce("off")
        .mockResolvedValue(true);

      const { result } = renderHook(() => useAutoLiquidity());
      await act(async () => {});

      await act(async () => {
        result.current.toggle(true);
        result.current.toggle(false);
        result.current.toggle(true);
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
