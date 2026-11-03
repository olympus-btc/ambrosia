import { fireEvent } from "@testing-library/react";

export function selectBackupFile() {
  const backupFile = new File(["zip-content"], "backup.zip", { type: "application/zip" });
  const fileInput = document.querySelector('input[type="file"]');
  fireEvent.change(fileInput, { target: { files: [backupFile] } });
}
