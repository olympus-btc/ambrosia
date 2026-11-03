jest.mock("@/lib/http/httpClient", () => ({
  httpClient: jest.fn(),
  dispatchAuthEvent: jest.fn(),
}));

jest.mock("@/lib/http/parseJsonResponse", () => ({
  parseJsonResponse: jest.fn(),
}));

jest.mock("@/utils/downloadBlob", () => ({
  downloadBlob: jest.fn(),
}));

jest.mock("../backupProgressChannel", () => ({
  openBackupProgressChannel: jest.fn(),
  closeBackupProgressChannel: jest.fn(),
}));

import { dispatchAuthEvent, httpClient } from "@/lib/http/httpClient";
import { parseJsonResponse } from "@/lib/http/parseJsonResponse";
import { downloadBlob } from "@/utils/downloadBlob";
import { waitForInstance } from "@test-utils/waitForInstance";

import { closeBackupProgressChannel, openBackupProgressChannel } from "../backupProgressChannel";
import { confirmPendingImport, exportBackup, importBackup } from "../backupService";

function makeResponse({ ok, status, contentDisposition, blob }) {
  return {
    ok,
    status,
    headers: {
      get: (headerName) => (headerName === "content-disposition" ? (contentDisposition ?? null) : null),
    },
    blob: jest.fn().mockResolvedValue(blob),
  };
}

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

describe("backupService", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("exportBackup", () => {
    beforeEach(() => {
      openBackupProgressChannel.mockResolvedValue(null);
    });

    it("calls /backup/export with the password and skipForbiddenRedirect", async () => {
      const backupBlob = new Blob(["encrypted-zip-bytes"]);
      httpClient.mockResolvedValue(makeResponse({
        ok: true,
        status: 200,
        contentDisposition: 'attachment; filename="ambrosia-backup-my-store-2026-08-24.zip"',
        blob: backupBlob,
      }));

      await exportBackup("wallet-password");

      expect(httpClient).toHaveBeenCalledWith("/backup/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: "wallet-password" }),
        skipForbiddenRedirect: true,
      });
    });

    it("downloads the blob using the filename from Content-Disposition", async () => {
      const backupBlob = new Blob(["encrypted-zip-bytes"]);
      httpClient.mockResolvedValue(makeResponse({
        ok: true,
        status: 200,
        contentDisposition: 'attachment; filename="ambrosia-backup-my-store-2026-08-24.zip"',
        blob: backupBlob,
      }));

      await exportBackup("wallet-password");

      expect(downloadBlob).toHaveBeenCalledWith(backupBlob, "ambrosia-backup-my-store-2026-08-24.zip");
    });

    it("falls back to a default filename when Content-Disposition is missing", async () => {
      const backupBlob = new Blob(["encrypted-zip-bytes"]);
      httpClient.mockResolvedValue(makeResponse({
        ok: true,
        status: 200,
        contentDisposition: null,
        blob: backupBlob,
      }));

      await exportBackup("wallet-password");

      expect(downloadBlob).toHaveBeenCalledWith(backupBlob, "ambrosia-backup.zip");
    });

    it("throws with the server message when the response is not ok", async () => {
      httpClient.mockResolvedValue(makeResponse({ ok: false, status: 401 }));
      parseJsonResponse.mockResolvedValue({ message: "Invalid password" });

      await expect(exportBackup("wrong-password")).rejects.toMatchObject({
        message: "Invalid password",
        status: 401,
      });
      expect(downloadBlob).not.toHaveBeenCalled();
    });

    it("throws a fallback message when the error response has no body", async () => {
      httpClient.mockResolvedValue(makeResponse({ ok: false, status: 401 }));
      parseJsonResponse.mockResolvedValue(null);

      await expect(exportBackup("wrong-password")).rejects.toMatchObject({
        message: "Could not export the backup",
        status: 401,
      });
    });

    describe("progress reporting", () => {
      it("opens a progress channel with the caller's onProgress", async () => {
        httpClient.mockResolvedValue(makeResponse({ ok: true, status: 200, blob: new Blob() }));
        const onProgress = jest.fn();

        await exportBackup("wallet-password", onProgress);

        expect(openBackupProgressChannel).toHaveBeenCalledWith(onProgress);
      });

      it("sends the operationId as a header when a progress channel connects", async () => {
        openBackupProgressChannel.mockResolvedValue({ operationId: "operation-1", socket: { close: jest.fn() } });
        httpClient.mockResolvedValue(makeResponse({ ok: true, status: 200, blob: new Blob() }));

        await exportBackup("wallet-password", jest.fn());

        expect(httpClient).toHaveBeenCalledWith("/backup/export", expect.objectContaining({
          headers: { "Content-Type": "application/json", "X-Backup-Operation-Id": "operation-1" },
        }));
      });

      it("still exports successfully when no progress channel could connect", async () => {
        const backupBlob = new Blob(["encrypted-zip-bytes"]);
        httpClient.mockResolvedValue(makeResponse({ ok: true, status: 200, blob: backupBlob }));

        await exportBackup("wallet-password", jest.fn());

        expect(downloadBlob).toHaveBeenCalledWith(backupBlob, "ambrosia-backup.zip");
        expect(httpClient).toHaveBeenCalledWith("/backup/export", expect.objectContaining({
          headers: { "Content-Type": "application/json" },
        }));
      });

      it("closes the progress channel once the export call settles", async () => {
        const progressChannel = { operationId: "operation-1", socket: { close: jest.fn() } };
        openBackupProgressChannel.mockResolvedValue(progressChannel);
        httpClient.mockResolvedValue(makeResponse({ ok: true, status: 200, blob: new Blob() }));

        await exportBackup("wallet-password", jest.fn());

        expect(closeBackupProgressChannel).toHaveBeenCalledWith(progressChannel);
      });

      it("closes the progress channel even when the export call fails", async () => {
        const progressChannel = { operationId: "operation-1", socket: { close: jest.fn() } };
        openBackupProgressChannel.mockResolvedValue(progressChannel);
        httpClient.mockResolvedValue(makeResponse({ ok: false, status: 500 }));
        parseJsonResponse.mockResolvedValue(null);

        await expect(exportBackup("wallet-password", jest.fn())).rejects.toThrow();

        expect(closeBackupProgressChannel).toHaveBeenCalledWith(progressChannel);
      });
    });
  });

  describe("importBackup", () => {
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

    it("posts a multipart body with credentials to /api/backup/import", async () => {
      const backupFile = new File(["zip-content"], "backup.zip", { type: "application/zip" });

      const importPromise = importBackup("role-password", "backup-password", backupFile);
      await resolveUpload({ status: 200, body: { message: "Backup imported", businessName: "Awesome Store" } });
      await importPromise;

      const [uploadRequest] = FakeXMLHttpRequest.instances;
      expect(uploadRequest.method).toBe("POST");
      expect(uploadRequest.url).toBe("/api/backup/import");
      expect(uploadRequest.withCredentials).toBe(true);
      expect(uploadRequest.sentBody.get("rolePassword")).toBe("role-password");
      expect(uploadRequest.sentBody.get("backupPassword")).toBe("backup-password");
      expect(uploadRequest.sentBody.get("backup")).toBe(backupFile);
    });

    it("returns the parsed response body on success", async () => {
      const importPromise = importBackup("role-password", "backup-password", new File(["zip"], "backup.zip"));
      await resolveUpload({ status: 200, body: { message: "Backup imported", businessName: "Awesome Store" } });

      await expect(importPromise).resolves.toEqual({ message: "Backup imported", businessName: "Awesome Store" });
    });

    it("throws with the server message when the response is not ok", async () => {
      const importPromise = importBackup("role-password", "wrong-backup-password", new File(["zip"], "backup.zip"));
      await resolveUpload({ status: 400, body: { message: "Incorrect password or corrupted backup file" } });

      await expect(importPromise).rejects.toMatchObject({
        message: "Incorrect password or corrupted backup file",
        status: 400,
      });
    });

    it("dispatches wallet:unauthorized on a 401 response", async () => {
      const importPromise = importBackup("wrong-role-password", "backup-password", new File(["zip"], "backup.zip"));
      await resolveUpload({ status: 401, body: { message: "Unauthorized" } });
      await importPromise.catch(() => {});

      expect(dispatchAuthEvent).toHaveBeenCalledWith("wallet:unauthorized");
    });

    describe("progress reporting", () => {
      it("appends operationId before the backup file when a progress channel connects", async () => {
        openBackupProgressChannel.mockResolvedValue({ operationId: "operation-1", socket: { close: jest.fn() } });

        const importPromise = importBackup(
          "role-password",
          "backup-password",
          new File(["zip"], "backup.zip"),
          jest.fn(),
        );
        await resolveUpload({ status: 200, body: { message: "Backup imported" } });
        await importPromise;

        const [uploadRequest] = FakeXMLHttpRequest.instances;
        const sentFieldNames = [...uploadRequest.sentBody.keys()];
        expect(uploadRequest.sentBody.get("operationId")).toBe("operation-1");
        expect(sentFieldNames.indexOf("operationId")).toBeLessThan(sentFieldNames.indexOf("backup"));
      });

      it("does not append operationId when no progress channel could connect", async () => {
        const importPromise = importBackup(
          "role-password",
          "backup-password",
          new File(["zip"], "backup.zip"),
          jest.fn(),
        );
        await resolveUpload({ status: 200, body: { message: "Backup imported" } });
        await importPromise;

        const [uploadRequest] = FakeXMLHttpRequest.instances;
        expect(uploadRequest.sentBody.has("operationId")).toBe(false);
      });

      it("closes the progress channel once the import call settles", async () => {
        const progressChannel = { operationId: "operation-1", socket: { close: jest.fn() } };
        openBackupProgressChannel.mockResolvedValue(progressChannel);

        const importPromise = importBackup(
          "role-password",
          "backup-password",
          new File(["zip"], "backup.zip"),
          jest.fn(),
        );
        await resolveUpload({ status: 200, body: { message: "Backup imported" } });
        await importPromise;

        expect(closeBackupProgressChannel).toHaveBeenCalledWith(progressChannel);
      });
    });
  });

  describe("confirmPendingImport", () => {
    it("calls POST /backup/confirm-pending-import", async () => {
      httpClient.mockResolvedValue({ ok: true });

      await confirmPendingImport();

      expect(httpClient).toHaveBeenCalledWith("/backup/confirm-pending-import", { method: "POST" });
    });
  });
});
