import { httpClient } from "@/lib/http/httpClient";
import { parseJsonResponse } from "@/lib/http/parseJsonResponse";

export const SECRETS_UNLOCKED_EVENT = "secrets:unlocked";

function createSecretsServiceError(message, errorDetails = {}) {
  const secretsServiceError = new Error(message);
  secretsServiceError.status = errorDetails.status;
  return secretsServiceError;
}

async function parseSecretsResponseOrThrow(secretsHttpResponse, fallbackValue, fallbackMessage) {
  const secretsResponseBody = await parseJsonResponse(secretsHttpResponse, fallbackValue);
  if (!secretsHttpResponse.ok) {
    throw createSecretsServiceError(
      secretsResponseBody?.message ?? fallbackMessage,
      { status: secretsHttpResponse.status },
    );
  }
  return secretsResponseBody;
}

export async function getSecretsStatus() {
  const secretsStatusResponse = await httpClient("/secrets/status", { skipForbiddenRedirect: true });
  return await parseSecretsResponseOrThrow(
    secretsStatusResponse,
    null,
    "Could not load the secrets encryption status",
  );
}

export async function getSecretsLockStatus() {
  const secretsLockStatusResponse = await httpClient("/secrets/lock-status", { skipForbiddenRedirect: true });
  return await parseSecretsResponseOrThrow(
    secretsLockStatusResponse,
    null,
    "Could not load the secrets lock status",
  );
}

export async function unlockSecrets(unlockPassword) {
  const unlockSecretsResponse = await httpClient("/secrets/unlock", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ unlockPassword }),
    skipForbiddenRedirect: true,
  });
  return await parseSecretsResponseOrThrow(
    unlockSecretsResponse,
    null,
    "Could not unlock secrets",
  );
}

export async function activateSecretsEncryption(unlockPassword) {
  const activateSecretsEncryptionResponse = await httpClient("/secrets/activate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ unlockPassword }),
    skipForbiddenRedirect: true,
  });
  return await parseSecretsResponseOrThrow(
    activateSecretsEncryptionResponse,
    null,
    "Could not activate secrets encryption",
  );
}
