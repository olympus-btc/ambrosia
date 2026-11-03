jest.mock("@/lib/http", () => ({
  httpClient: jest.fn(),
  parseJsonResponse: jest.fn(),
}));

import { httpClient, parseJsonResponse } from "@/lib/http";

import { authenticateUser, logoutSession } from "../authSession";

describe("authSession", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    httpClient.mockResolvedValue({ ok: true });
    parseJsonResponse.mockResolvedValue({ user: { id: "user-1" }, perms: ["settings_update"] });
  });

  describe("authenticateUser", () => {
    it("logs in with the given name and pin, with skipRefresh disabled by default", async () => {
      await authenticateUser({ name: "cooluser1", pin: "0000" });

      expect(httpClient).toHaveBeenCalledWith("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "cooluser1", pin: "0000" }),
        skipRefresh: false,
      });
    });

    it("passes skipRefresh through to httpClient when requested", async () => {
      await authenticateUser({ name: "cooluser1", pin: "0000", skipRefresh: true });

      expect(httpClient).toHaveBeenCalledWith("/auth/login", expect.objectContaining({ skipRefresh: true }));
    });

    it("returns the authenticated user and permissions", async () => {
      const authenticatedSession = await authenticateUser({ name: "cooluser1", pin: "0000" });

      expect(authenticatedSession).toEqual({ user: { id: "user-1" }, permissions: ["settings_update"] });
    });

    it("throws with the server message when authentication fails", async () => {
      httpClient.mockResolvedValueOnce({ ok: false, status: 401 });
      parseJsonResponse.mockResolvedValueOnce({ message: "Invalid PIN" });

      await expect(authenticateUser({ name: "cooluser1", pin: "wrong-pin" })).rejects.toMatchObject({
        message: "Invalid PIN",
        status: 401,
      });
    });

    it("throws the fallback message when the server provides none", async () => {
      httpClient.mockResolvedValueOnce({ ok: false, status: 401 });
      parseJsonResponse.mockResolvedValueOnce({});

      await expect(authenticateUser({ name: "cooluser1", pin: "wrong-pin" })).rejects.toMatchObject({
        message: "Invalid Credentials",
        status: 401,
      });
    });
  });

  describe("logoutSession", () => {
    it("logs out with skipRefresh disabled by default", async () => {
      await logoutSession();

      expect(httpClient).toHaveBeenCalledWith("/auth/logout", { method: "POST", skipRefresh: false });
    });

    it("passes skipRefresh through to httpClient when requested", async () => {
      await logoutSession({ skipRefresh: true });

      expect(httpClient).toHaveBeenCalledWith("/auth/logout", { method: "POST", skipRefresh: true });
    });

    it("throws with the server message when logout fails", async () => {
      httpClient.mockResolvedValueOnce({ ok: false, status: 500 });
      parseJsonResponse.mockResolvedValueOnce({ message: "Logout unavailable" });

      await expect(logoutSession()).rejects.toMatchObject({
        message: "Logout unavailable",
        status: 500,
      });
    });

    it("throws the fallback message when the server provides none", async () => {
      httpClient.mockResolvedValueOnce({ ok: false, status: 500 });
      parseJsonResponse.mockResolvedValueOnce({});

      await expect(logoutSession()).rejects.toMatchObject({
        message: "Logout failed",
        status: 500,
      });
    });
  });
});
