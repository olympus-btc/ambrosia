import { dispatchAuthEvent, httpClient } from "@/lib/http/httpClient";
import { parseJsonResponse } from "@/lib/http/parseJsonResponse";
import { downloadBlob } from "@/utils/downloadBlob";

import { closeBackupProgressChannel, openBackupProgressChannel } from "./backupProgressChannel";

const BACKUP_OPERATION_ID_HEADER = "X-Backup-Operation-Id";

function createBackupServiceError(message, errorDetails = {}) {
  const error = new Error(message);
  error.status = errorDetails.status;
  error.code = errorDetails.code ?? "unknown";
  return error;
}

function extractFilename(contentDisposition, fallbackFilename) {
  const match = contentDisposition?.match(/filename="?([^"]+)"?/);
  return match?.[1] ?? fallbackFilename;
}

export async function exportBackup(password, onProgress) {
  const progressChannel = await openBackupProgressChannel(onProgress);

  let backupExportResponse;
  try {
    backupExportResponse = await httpClient("/backup/export", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(progressChannel ? { [BACKUP_OPERATION_ID_HEADER]: progressChannel.operationId } : {}),
      },
      body: JSON.stringify({ password }),
      skipForbiddenRedirect: true,
    });
  } finally {
    closeBackupProgressChannel(progressChannel);
  }

  if (!backupExportResponse.ok) {
    const backupExportErrorBody = await parseJsonResponse(backupExportResponse, null);
    throw createBackupServiceError(
      backupExportErrorBody?.message ?? "Could not export the backup",
      { status: backupExportResponse.status },
    );
  }

  const backupBlob = await backupExportResponse.blob();
  const filename = extractFilename(
    backupExportResponse.headers.get("content-disposition"),
    "ambrosia-backup.zip",
  );
  downloadBlob(backupBlob, filename);
}

function uploadBackupFile(formData) {
  return new Promise((resolve, reject) => {
    const uploadRequest = new XMLHttpRequest();
    uploadRequest.open("POST", "/api/backup/import");
    uploadRequest.withCredentials = true;

    uploadRequest.onload = () => {
      if (uploadRequest.status === 401) dispatchAuthEvent("wallet:unauthorized");
      if (uploadRequest.status === 403) dispatchAuthEvent("auth:forbidden");
      resolve(uploadRequest);
    };
    uploadRequest.onerror = () => reject(new Error("Network error while importing the backup"));

    uploadRequest.send(formData);
  });
}

export async function importBackup(rolePassword, backupPassword, backupFile, onProgress) {
  const progressChannel = await openBackupProgressChannel(onProgress);

  const importFormData = new FormData();
  importFormData.append("rolePassword", rolePassword);
  importFormData.append("backupPassword", backupPassword);
  if (progressChannel) importFormData.append("operationId", progressChannel.operationId);
  importFormData.append("backup", backupFile);

  let backupImportRequest;
  try {
    backupImportRequest = await uploadBackupFile(importFormData);
  } finally {
    closeBackupProgressChannel(progressChannel);
  }

  const backupImportResponseLike = {
    status: backupImportRequest.status,
    text: async () => backupImportRequest.responseText,
  };
  const backupImportBody = await parseJsonResponse(backupImportResponseLike, null);

  if (backupImportRequest.status < 200 || backupImportRequest.status >= 300) {
    throw createBackupServiceError(
      backupImportBody?.message ?? "Could not import the backup",
      { status: backupImportRequest.status },
    );
  }

  return backupImportBody;
}

export async function confirmPendingImport() {
  await httpClient("/backup/confirm-pending-import", { method: "POST" });
}
