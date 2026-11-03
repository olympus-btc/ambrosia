jest.mock("@/lib/http", () => ({
  httpClient: jest.fn(),
  parseJsonResponse: jest.fn(),
}));

jest.mock("../backupProgressChannel", () => ({
  openBackupProgressChannel: jest.fn(),
  closeBackupProgressChannel: jest.fn(),
}));

import { httpClient, parseJsonResponse } from "@/lib/http";
import { waitForInstance } from "@test-utils/waitForInstance";

import { closeBackupProgressChannel, openBackupProgressChannel } from "../backupProgressChannel";
import {
  confirmPendingRestore,
  getInitialSetupStatus,
  submitInitialSetup,
  restoreFromBackup,
  testPhoenixdConnection,
} from "../initialSetupService";

class FakeXMLHttpRequest {
  constructor() {
    this.upload = {};
    this.withCredentials = false;
    FakeXMLHttpRequest.instances.push(this);
  }

  open(method, url) {
    this.method = method;
    this.url = url;
  }

  send(body) {
    this.sentBody = body;
  }
}
FakeXMLHttpRequest.instances = [];

describe("initialSetupService", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getInitialSetupStatus", () => {
    it("calls GET /initial-setup with skipRefresh", async () => {
      const initialSetupStatusResponse = { initialized: true };
      httpClient.mockResolvedValue(initialSetupStatusResponse);

      const initialSetupStatus = await getInitialSetupStatus();

      expect(httpClient).toHaveBeenCalledWith("/initial-setup", {
        method: "GET",
        skipRefresh: true,
      });
      expect(initialSetupStatus).toBe(initialSetupStatusResponse);
    });
  });

  describe("submitInitialSetup", () => {
    it("calls POST /initial-setup with the JSON-encoded payload and skipRefresh", async () => {
      const submitInitialSetupResponse = { ok: true };
      httpClient.mockResolvedValue(submitInitialSetupResponse);
      const setupPayload = { businessType: "store", userName: "Ivan" };

      const submitInitialSetupResult = await submitInitialSetup(setupPayload);

      expect(httpClient).toHaveBeenCalledWith("/initial-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(setupPayload),
        skipRefresh: true,
      });
      expect(submitInitialSetupResult).toBe(submitInitialSetupResponse);
    });
  });

  describe("restoreFromBackup", () => {
    let originalXMLHttpRequest;

    beforeEach(() => {
      FakeXMLHttpRequest.instances = [];
      originalXMLHttpRequest = global.XMLHttpRequest;
      global.XMLHttpRequest = FakeXMLHttpRequest;
      openBackupProgressChannel.mockResolvedValue(null);
    });

    afterEach(() => {
      global.XMLHttpRequest = originalXMLHttpRequest;
    });

    async function resolveUpload({ status, body }) {
      const uploadRequest = await waitForInstance(FakeXMLHttpRequest);
      parseJsonResponse.mockResolvedValue(body);
      uploadRequest.status = status;
      uploadRequest.onload();
    }

    it("posts a multipart body with credentials to /api/initial-setup/restore", async () => {
      const backupFile = new File(["zip-content"], "backup.zip", { type: "application/zip" });

      const restoreFromBackupPromise = restoreFromBackup("backup-password", backupFile);
      await resolveUpload({ status: 200 });
      await restoreFromBackupPromise;

      const [uploadRequest] = FakeXMLHttpRequest.instances;
      expect(uploadRequest.method).toBe("POST");
      expect(uploadRequest.url).toBe("/api/initial-setup/restore");
      expect(uploadRequest.withCredentials).toBe(true);
      expect(uploadRequest.sentBody.get("password")).toBe("backup-password");
      expect(uploadRequest.sentBody.get("backup")).toBe(backupFile);
    });

    it("resolves with ok:true for a successful response", async () => {
      const restoreFromBackupPromise = restoreFromBackup("backup-password", new File(["zip"], "backup.zip"));
      await resolveUpload({ status: 200 });

      await expect(restoreFromBackupPromise).resolves.toEqual({ ok: true });
    });

    it("resolves with ok:false and the status for a failed response", async () => {
      const restoreFromBackupPromise = restoreFromBackup("wrong-password", new File(["zip"], "backup.zip"));
      await resolveUpload({ status: 400 });

      await expect(restoreFromBackupPromise).resolves.toEqual({ ok: false, status: 400, message: undefined });
    });

    it("resolves with the server message when a pending import is already staged", async () => {
      const restoreFromBackupPromise = restoreFromBackup("backup-password", new File(["zip"], "backup.zip"));
      await resolveUpload({
        status: 409,
        body: { message: "A previous import is already staged and waiting for a server restart" },
      });

      await expect(restoreFromBackupPromise).resolves.toEqual({
        ok: false,
        status: 409,
        message: "A previous import is already staged and waiting for a server restart",
      });
    });

    describe("progress reporting", () => {
      it("opens a progress channel with the caller's onProgress", async () => {
        const onProgress = jest.fn();

        const restoreFromBackupPromise = restoreFromBackup(
          "backup-password",
          new File(["zip"], "backup.zip"),
          onProgress,
        );
        await resolveUpload({ status: 200 });
        await restoreFromBackupPromise;

        expect(openBackupProgressChannel).toHaveBeenCalledWith(onProgress, "/initial-setup/progress-token");
      });

      it("appends operationId before the backup file when a progress channel connects", async () => {
        openBackupProgressChannel.mockResolvedValue({ operationId: "operation-1", socket: { close: jest.fn() } });

        const restoreFromBackupPromise = restoreFromBackup(
          "backup-password",
          new File(["zip"], "backup.zip"),
          jest.fn(),
        );
        await resolveUpload({ status: 200 });
        await restoreFromBackupPromise;

        const [uploadRequest] = FakeXMLHttpRequest.instances;
        const sentFieldNames = [...uploadRequest.sentBody.keys()];
        expect(uploadRequest.sentBody.get("operationId")).toBe("operation-1");
        expect(sentFieldNames.indexOf("operationId")).toBeLessThan(sentFieldNames.indexOf("backup"));
      });

      it("does not append operationId when no progress channel could connect", async () => {
        const restoreFromBackupPromise = restoreFromBackup(
          "backup-password",
          new File(["zip"], "backup.zip"),
          jest.fn(),
        );
        await resolveUpload({ status: 200 });
        await restoreFromBackupPromise;

        const [uploadRequest] = FakeXMLHttpRequest.instances;
        expect(uploadRequest.sentBody.has("operationId")).toBe(false);
      });

      it("closes the progress channel once the restore call settles", async () => {
        const progressChannel = { operationId: "operation-1", socket: { close: jest.fn() } };
        openBackupProgressChannel.mockResolvedValue(progressChannel);

        const restoreFromBackupPromise = restoreFromBackup(
          "backup-password",
          new File(["zip"], "backup.zip"),
          jest.fn(),
        );
        await resolveUpload({ status: 200 });
        await restoreFromBackupPromise;

        expect(closeBackupProgressChannel).toHaveBeenCalledWith(progressChannel);
      });
    });
  });

  describe("confirmPendingRestore", () => {
    it("calls POST /initial-setup/confirm-pending-restore with skipRefresh", async () => {
      httpClient.mockResolvedValue({ ok: true });

      await confirmPendingRestore();

      expect(httpClient).toHaveBeenCalledWith("/initial-setup/confirm-pending-restore", {
        method: "POST",
        skipRefresh: true,
      });
    });
  });

  describe("testPhoenixdConnection", () => {
    it("calls POST /initial-setup/test-phoenixd-connection with url and password", async () => {
      httpClient.mockResolvedValue({ ok: true });
      parseJsonResponse.mockResolvedValue({ nodeId: "node-1" });

      await testPhoenixdConnection("http://100.1.1.1:9740", "remote-password");

      expect(httpClient).toHaveBeenCalledWith("/initial-setup/test-phoenixd-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoenixdUrl: "http://100.1.1.1:9740", phoenixdPassword: "remote-password" }),
        skipRefresh: true,
      });
    });

    it("returns the parsed node info on success", async () => {
      httpClient.mockResolvedValue({ ok: true });
      parseJsonResponse.mockResolvedValue({ nodeId: "node-1" });

      const testConnectionResponse = await testPhoenixdConnection("http://100.1.1.1:9740", "remote-password");

      expect(testConnectionResponse).toEqual({ nodeId: "node-1" });
    });

    it("throws with the server message when the response is not ok", async () => {
      httpClient.mockResolvedValue({ ok: false });
      parseJsonResponse.mockResolvedValue({ message: "Lightning node is unavailable" });

      await expect(testPhoenixdConnection("http://100.1.1.1:9740", "wrong-password")).rejects.toThrow(
        "Lightning node is unavailable",
      );
    });
  });
});
