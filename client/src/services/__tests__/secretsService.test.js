jest.mock("@/lib/http/httpClient", () => ({
  httpClient: jest.fn(),
}));

jest.mock("@/lib/http/parseJsonResponse", () => ({
  parseJsonResponse: jest.fn(),
}));

import { httpClient } from "@/lib/http/httpClient";
import { parseJsonResponse } from "@/lib/http/parseJsonResponse";

import { activateSecretsEncryption, getSecretsLockStatus, getSecretsStatus, unlockSecrets } from "../secretsService";

function makeResponse(status, ok = true) {
  return { status, ok };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("secretsService", () => {
  describe("getSecretsStatus", () => {
    it("calls GET /secrets/status", async () => {
      httpClient.mockResolvedValue(makeResponse(200));
      parseJsonResponse.mockResolvedValue({ encryptionActive: true, locked: false });

      await getSecretsStatus();

      expect(httpClient).toHaveBeenCalledWith("/secrets/status", { skipForbiddenRedirect: true });
    });

    it("returns the parsed status", async () => {
      const secretsStatus = { encryptionActive: true, locked: false };
      httpClient.mockResolvedValue(makeResponse(200));
      parseJsonResponse.mockResolvedValue(secretsStatus);

      const secretsStatusResult = await getSecretsStatus();

      expect(secretsStatusResult).toEqual(secretsStatus);
    });

    it("throws with the server message when the response is not ok", async () => {
      httpClient.mockResolvedValue(makeResponse(401, false));
      parseJsonResponse.mockResolvedValue({ message: "Invalid credentials" });

      await expect(getSecretsStatus()).rejects.toMatchObject({
        message: "Invalid credentials",
        status: 401,
      });
    });

    it("throws the fallback message when the server provides none", async () => {
      httpClient.mockResolvedValue(makeResponse(500, false));
      parseJsonResponse.mockResolvedValue({});

      await expect(getSecretsStatus()).rejects.toMatchObject({
        message: "Could not load the secrets encryption status",
        status: 500,
      });
    });
  });

  describe("getSecretsLockStatus", () => {
    it("calls GET /secrets/lock-status", async () => {
      httpClient.mockResolvedValue(makeResponse(200));
      parseJsonResponse.mockResolvedValue({ encryptionActive: true, locked: true });

      await getSecretsLockStatus();

      expect(httpClient).toHaveBeenCalledWith("/secrets/lock-status", { skipForbiddenRedirect: true });
    });

    it("returns the parsed lock status", async () => {
      const secretsLockStatus = { encryptionActive: true, locked: true };
      httpClient.mockResolvedValue(makeResponse(200));
      parseJsonResponse.mockResolvedValue(secretsLockStatus);

      const secretsLockStatusResult = await getSecretsLockStatus();

      expect(secretsLockStatusResult).toEqual(secretsLockStatus);
    });

    it("throws with the server message when the response is not ok", async () => {
      httpClient.mockResolvedValue(makeResponse(401, false));
      parseJsonResponse.mockResolvedValue({ message: "Invalid credentials" });

      await expect(getSecretsLockStatus()).rejects.toMatchObject({
        message: "Invalid credentials",
        status: 401,
      });
    });

    it("throws the fallback message when the server provides none", async () => {
      httpClient.mockResolvedValue(makeResponse(500, false));
      parseJsonResponse.mockResolvedValue({});

      await expect(getSecretsLockStatus()).rejects.toMatchObject({
        message: "Could not load the secrets lock status",
        status: 500,
      });
    });
  });

  describe("unlockSecrets", () => {
    it("calls POST /secrets/unlock with the unlock password in the body", async () => {
      httpClient.mockResolvedValue(makeResponse(200));
      parseJsonResponse.mockResolvedValue({ message: "Secrets unlocked" });

      await unlockSecrets("correct-unlock-password");

      expect(httpClient).toHaveBeenCalledWith("/secrets/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unlockPassword: "correct-unlock-password" }),
        skipForbiddenRedirect: true,
      });
    });

    it("returns the parsed response body", async () => {
      httpClient.mockResolvedValue(makeResponse(200));
      parseJsonResponse.mockResolvedValue({ message: "Secrets unlocked" });

      const unlockSecretsResult = await unlockSecrets("correct-unlock-password");

      expect(unlockSecretsResult).toEqual({ message: "Secrets unlocked" });
    });

    it("throws with the server message when the response is not ok", async () => {
      httpClient.mockResolvedValue(makeResponse(401, false));
      parseJsonResponse.mockResolvedValue({ message: "Invalid credentials" });

      await expect(unlockSecrets("wrong-password")).rejects.toMatchObject({
        message: "Invalid credentials",
        status: 401,
      });
    });

    it("throws the fallback message when the server provides none", async () => {
      httpClient.mockResolvedValue(makeResponse(500, false));
      parseJsonResponse.mockResolvedValue({});

      await expect(unlockSecrets("correct-unlock-password")).rejects.toMatchObject({
        message: "Could not unlock secrets",
        status: 500,
      });
    });
  });

  describe("activateSecretsEncryption", () => {
    it("calls POST /secrets/activate with the unlock password in the body", async () => {
      httpClient.mockResolvedValue(makeResponse(200));
      parseJsonResponse.mockResolvedValue({ message: "Secrets encryption activated" });

      await activateSecretsEncryption("correct-unlock-password");

      expect(httpClient).toHaveBeenCalledWith("/secrets/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unlockPassword: "correct-unlock-password" }),
        skipForbiddenRedirect: true,
      });
    });

    it("returns the parsed response body", async () => {
      httpClient.mockResolvedValue(makeResponse(200));
      parseJsonResponse.mockResolvedValue({ message: "Secrets encryption activated" });

      const activateSecretsEncryptionResult = await activateSecretsEncryption("correct-unlock-password");

      expect(activateSecretsEncryptionResult).toEqual({ message: "Secrets encryption activated" });
    });

    it("throws with the server message when the response is not ok", async () => {
      httpClient.mockResolvedValue(makeResponse(409, false));
      parseJsonResponse.mockResolvedValue({ message: "Secrets are locked" });

      await expect(activateSecretsEncryption("correct-unlock-password")).rejects.toMatchObject({
        message: "Secrets are locked",
        status: 409,
      });
    });

    it("throws the fallback message when the server provides none", async () => {
      httpClient.mockResolvedValue(makeResponse(500, false));
      parseJsonResponse.mockResolvedValue({});

      await expect(activateSecretsEncryption("correct-unlock-password")).rejects.toMatchObject({
        message: "Could not activate secrets encryption",
        status: 500,
      });
    });
  });
});
