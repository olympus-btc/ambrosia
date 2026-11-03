import { act, renderHook } from "@testing-library/react";

import { getRestartCapabilities, restartPhoenixd, restartServer } from "@/services/systemService";

import { useSystemRestart } from "../useSystemRestart";

jest.mock("@/services/systemService", () => ({
  getRestartCapabilities: jest.fn(),
  restartServer: jest.fn(),
  restartPhoenixd: jest.fn(),
}));

jest.mock("@lib/isElectron", () => ({ isElectron: false }));

describe("useSystemRestart", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("initial state", () => {
    it("starts with both capabilities unsupported", () => {
      const { result: hookResult } = renderHook(() => useSystemRestart());

      expect(hookResult.current.serverRestartSupported).toBe(false);
      expect(hookResult.current.phoenixdRestartSupported).toBe(false);
    });
  });

  describe("loadRestartCapabilities", () => {
    it("applies the capabilities returned by the server", async () => {
      getRestartCapabilities.mockResolvedValue({
        serverRestartSupported: true,
        phoenixdRestartSupported: false,
      });
      const { result: hookResult } = renderHook(() => useSystemRestart());

      await act(async () => {
        await hookResult.current.loadRestartCapabilities();
      });

      expect(hookResult.current.serverRestartSupported).toBe(true);
      expect(hookResult.current.phoenixdRestartSupported).toBe(false);
    });

    it("sets an error when the request fails", async () => {
      getRestartCapabilities.mockRejectedValue(new Error("network error"));
      const { result: hookResult } = renderHook(() => useSystemRestart());

      await act(async () => {
        await hookResult.current.loadRestartCapabilities();
      });

      expect(hookResult.current.error).toBe("network error");
    });
  });

  describe("restartServer", () => {
    it("calls the server restart endpoint and returns true on success", async () => {
      restartServer.mockResolvedValue({ message: "Server restarting" });
      const { result: hookResult } = renderHook(() => useSystemRestart());

      let restartSucceeded;
      await act(async () => {
        restartSucceeded = await hookResult.current.restartServer();
      });

      expect(restartServer).toHaveBeenCalledTimes(1);
      expect(restartSucceeded).toBe(true);
      expect(hookResult.current.restartingTarget).toBeNull();
    });

    it("sets an error and returns false when the request fails", async () => {
      restartServer.mockRejectedValue(new Error("restart failed"));
      const { result: hookResult } = renderHook(() => useSystemRestart());

      let restartSucceeded;
      await act(async () => {
        restartSucceeded = await hookResult.current.restartServer();
      });

      expect(restartSucceeded).toBe(false);
      expect(hookResult.current.error).toBe("restart failed");
    });
  });

  describe("restartPhoenixd", () => {
    it("calls the phoenixd restart endpoint and returns true on success", async () => {
      restartPhoenixd.mockResolvedValue({ message: "phoenixd restarting" });
      const { result: hookResult } = renderHook(() => useSystemRestart());

      let restartSucceeded;
      await act(async () => {
        restartSucceeded = await hookResult.current.restartPhoenixd();
      });

      expect(restartPhoenixd).toHaveBeenCalledTimes(1);
      expect(restartSucceeded).toBe(true);
    });
  });
});
