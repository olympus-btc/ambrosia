import { isElectron } from "@lib/isElectron";

export async function restartAppAfterImport(includesPhoenixdData) {
  if (!isElectron) {
    return false;
  }

  await window.electron.ipc.invoke("services:restart", "backend");
  if (includesPhoenixdData) {
    await window.electron.ipc.invoke("services:restart", "phoenixd");
  }
  return true;
}
