jest.mock("@/config/api", () => ({
  getApiUrl: () => "http://localhost:9154",
}));

jest.mock("@/lib/http/httpClient", () => ({
  httpClient: jest.fn(),
}));

jest.mock("@/lib/http/parseJsonResponse", () => ({
  parseJsonResponse: jest.fn(),
}));

import { httpClient } from "@/lib/http/httpClient";
import { parseJsonResponse } from "@/lib/http/parseJsonResponse";
import { waitForInstance } from "@test-utils/waitForInstance";

import { closeBackupProgressChannel, openBackupProgressChannel } from "../backupProgressChannel";

class FakeWebSocket {
  constructor(url) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  close() {
    this.onclose?.();
  }

  emitMessage(payload) {
    this.onmessage?.({ data: JSON.stringify(payload) });
  }

  emitError() {
    this.onerror?.();
  }
}
FakeWebSocket.instances = [];

describe("backupProgressChannel", () => {
  let originalWebSocket;

  beforeEach(() => {
    FakeWebSocket.instances = [];
    originalWebSocket = global.WebSocket;
    global.WebSocket = FakeWebSocket;
  });

  afterEach(() => {
    global.WebSocket = originalWebSocket;
    jest.clearAllMocks();
  });

  describe("openBackupProgressChannel", () => {
    it("returns null without requesting a token when onProgress is not provided", async () => {
      const progressChannel = await openBackupProgressChannel(undefined);

      expect(progressChannel).toBeNull();
      expect(httpClient).not.toHaveBeenCalled();
    });

    it("requests a token, connects with it, and resolves once the server confirms the connection", async () => {
      httpClient.mockResolvedValue({ ok: true });
      parseJsonResponse.mockResolvedValue({ operationId: "operation-1", token: "progress-token" });
      const onProgress = jest.fn();

      const channelPromise = openBackupProgressChannel(onProgress);
      const socket = await waitForInstance(FakeWebSocket);
      socket.emitMessage({ type: "connected" });
      const progressChannel = await channelPromise;

      expect(httpClient).toHaveBeenCalledWith("/backup/progress-token", { method: "POST" });
      expect(socket.url).toBe(
        "ws://localhost:9154/ws/backup-progress?operationId=operation-1&token=progress-token",
      );
      expect(progressChannel).toEqual({ operationId: "operation-1", socket });
    });

    it("requests the token from a custom endpoint when one is provided", async () => {
      httpClient.mockResolvedValue({ ok: true });
      parseJsonResponse.mockResolvedValue({ operationId: "operation-1", token: "progress-token" });
      const onProgress = jest.fn();

      const channelPromise = openBackupProgressChannel(onProgress, "/initial-setup/progress-token");
      const socket = await waitForInstance(FakeWebSocket);
      socket.emitMessage({ type: "connected" });
      await channelPromise;

      expect(httpClient).toHaveBeenCalledWith("/initial-setup/progress-token", { method: "POST" });
    });

    it("forwards phase updates to onProgress with a computed percent", async () => {
      httpClient.mockResolvedValue({ ok: true });
      parseJsonResponse.mockResolvedValue({ operationId: "operation-1", token: "progress-token" });
      const onProgress = jest.fn();

      const channelPromise = openBackupProgressChannel(onProgress);
      const socket = await waitForInstance(FakeWebSocket);
      socket.emitMessage({ type: "connected" });
      await channelPromise;
      socket.emitMessage({ phase: "writing", bytesProcessed: 50, totalBytes: 200 });

      expect(onProgress).toHaveBeenCalledWith({ phase: "writing", percent: 25 });
    });

    it("forwards a null percent when totalBytes is not known yet", async () => {
      httpClient.mockResolvedValue({ ok: true });
      parseJsonResponse.mockResolvedValue({ operationId: "operation-1", token: "progress-token" });
      const onProgress = jest.fn();

      const channelPromise = openBackupProgressChannel(onProgress);
      const socket = await waitForInstance(FakeWebSocket);
      socket.emitMessage({ type: "connected" });
      await channelPromise;
      socket.emitMessage({ phase: "preparing", bytesProcessed: 0, totalBytes: null });

      expect(onProgress).toHaveBeenCalledWith({ phase: "preparing", percent: null });
    });

    it("resolves to null when the progress-token request fails", async () => {
      httpClient.mockResolvedValue({ ok: false });

      const progressChannel = await openBackupProgressChannel(jest.fn());

      expect(progressChannel).toBeNull();
      expect(FakeWebSocket.instances).toHaveLength(0);
    });

    it("resolves to null when the socket errors before confirming the connection", async () => {
      httpClient.mockResolvedValue({ ok: true });
      parseJsonResponse.mockResolvedValue({ operationId: "operation-1", token: "progress-token" });

      const channelPromise = openBackupProgressChannel(jest.fn());
      const socket = await waitForInstance(FakeWebSocket);
      socket.emitError();

      await expect(channelPromise).resolves.toBeNull();
    });

    it("resolves to null when the socket closes before confirming the connection", async () => {
      httpClient.mockResolvedValue({ ok: true });
      parseJsonResponse.mockResolvedValue({ operationId: "operation-1", token: "progress-token" });

      const channelPromise = openBackupProgressChannel(jest.fn());
      const socket = await waitForInstance(FakeWebSocket);
      socket.close();

      await expect(channelPromise).resolves.toBeNull();
    });

    it("stops calling onProgress once the socket closes mid-operation, without throwing", async () => {
      httpClient.mockResolvedValue({ ok: true });
      parseJsonResponse.mockResolvedValue({ operationId: "operation-1", token: "progress-token" });
      const onProgress = jest.fn();

      const channelPromise = openBackupProgressChannel(onProgress);
      const socket = await waitForInstance(FakeWebSocket);
      socket.emitMessage({ type: "connected" });
      const progressChannel = await channelPromise;
      socket.close();

      expect(() => closeBackupProgressChannel(progressChannel)).not.toThrow();
      expect(onProgress).not.toHaveBeenCalled();
    });
  });

  describe("closeBackupProgressChannel", () => {
    it("closes the underlying socket", async () => {
      httpClient.mockResolvedValue({ ok: true });
      parseJsonResponse.mockResolvedValue({ operationId: "operation-1", token: "progress-token" });
      const channelPromise = openBackupProgressChannel(jest.fn());
      const socket = await waitForInstance(FakeWebSocket);
      socket.emitMessage({ type: "connected" });
      const progressChannel = await channelPromise;
      jest.spyOn(socket, "close");

      closeBackupProgressChannel(progressChannel);

      expect(socket.close).toHaveBeenCalledTimes(1);
    });

    it("does nothing when the channel is null", () => {
      expect(() => closeBackupProgressChannel(null)).not.toThrow();
    });
  });
});
