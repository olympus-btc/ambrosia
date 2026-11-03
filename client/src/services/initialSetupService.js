import { httpClient, parseJsonResponse } from "@/lib/http";

import { closeBackupProgressChannel, openBackupProgressChannel } from "./backupProgressChannel";

export async function getInitialSetupStatus() {
  return await httpClient("/initial-setup", {
    method: "GET",
    skipRefresh: true,
  });
}

export async function submitInitialSetup(payload) {
  return await httpClient("/initial-setup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    skipRefresh: true,
  });
}

function uploadRestoreFile(formData) {
  return new Promise((resolve, reject) => {
    const uploadRequest = new XMLHttpRequest();
    uploadRequest.open("POST", "/api/initial-setup/restore");
    uploadRequest.withCredentials = true;

    uploadRequest.onload = () => resolve(uploadRequest);
    uploadRequest.onerror = () => reject(new Error("Network error while restoring the backup"));

    uploadRequest.send(formData);
  });
}

export async function restoreFromBackup(password, backupFile, onProgress) {
  const progressChannel = await openBackupProgressChannel(onProgress, "/initial-setup/progress-token");

  const restoreFormData = new FormData();
  restoreFormData.append("password", password);
  if (progressChannel) restoreFormData.append("operationId", progressChannel.operationId);
  restoreFormData.append("backup", backupFile);

  let restoreRequest;
  try {
    restoreRequest = await uploadRestoreFile(restoreFormData);
  } finally {
    closeBackupProgressChannel(progressChannel);
  }

  if (restoreRequest.status < 200 || restoreRequest.status >= 300) {
    const restoreResponseLike = { status: restoreRequest.status, text: async () => restoreRequest.responseText };
    const restoreBody = await parseJsonResponse(restoreResponseLike, null);
    return { ok: false, status: restoreRequest.status, message: restoreBody?.message };
  }

  return { ok: true };
}

export async function confirmPendingRestore() {
  await httpClient("/initial-setup/confirm-pending-restore", { method: "POST", skipRefresh: true });
}

export async function testPhoenixdConnection(phoenixdUrl, phoenixdPassword) {
  const testConnectionResponse = await httpClient("/initial-setup/test-phoenixd-connection", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ phoenixdUrl, phoenixdPassword }),
    skipRefresh: true,
  });
  const testConnectionBody = await parseJsonResponse(testConnectionResponse, null);
  if (!testConnectionResponse.ok) {
    throw new Error(testConnectionBody?.message ?? "Could not connect to the phoenixd node");
  }
  return testConnectionBody;
}
