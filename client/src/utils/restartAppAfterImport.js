import { isElectron } from "@lib/isElectron";

export async function restartAppAfterImport() {
  if (!isElectron) {
    return false;
  }

  await window.electron.ipc.invoke("app:relaunch");
  return true;
}
