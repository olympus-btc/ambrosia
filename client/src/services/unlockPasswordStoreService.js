import { isElectron } from "@lib/isElectron";

export async function getStorageBackend() {
  if (!isElectron) {
    return null;
  }
  return window.electron.ipc.invoke("secrets:get-storage-backend");
}

export async function saveUnlockPassword(unlockPassword) {
  if (!isElectron) {
    return false;
  }
  await window.electron.ipc.invoke("secrets:save-unlock-password", unlockPassword);
  return true;
}

export async function clearUnlockPassword() {
  if (!isElectron) {
    return false;
  }
  await window.electron.ipc.invoke("secrets:clear-unlock-password");
  return true;
}
