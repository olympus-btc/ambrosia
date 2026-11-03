import { clearUnlockPassword, getStorageBackend, saveUnlockPassword } from "../unlockPasswordStoreService";

let mockIsElectron = false;
jest.mock("@lib/isElectron", () => ({
  get isElectron() {
    return mockIsElectron;
  },
}));

describe("unlockPasswordStoreService", () => {
  beforeEach(() => {
    mockIsElectron = false;
  });

  afterEach(() => {
    delete window.electron;
  });

  describe("getStorageBackend", () => {
    it("returns null without invoking any IPC channel outside Electron", async () => {
      const storageBackend = await getStorageBackend();

      expect(storageBackend).toBe(null);
    });

    it("invokes secrets:get-storage-backend and returns its result inside Electron", async () => {
      mockIsElectron = true;
      const mockInvoke = jest.fn().mockResolvedValue("gnome-libsecret");
      window.electron = { ipc: { invoke: mockInvoke } };

      const storageBackend = await getStorageBackend();

      expect(mockInvoke).toHaveBeenCalledWith("secrets:get-storage-backend");
      expect(storageBackend).toBe("gnome-libsecret");
    });
  });

  describe("saveUnlockPassword", () => {
    it("returns false without invoking any IPC channel outside Electron", async () => {
      const unlockPasswordSaved = await saveUnlockPassword("correct-unlock-password");

      expect(unlockPasswordSaved).toBe(false);
    });

    it("invokes secrets:save-unlock-password with the password and returns true inside Electron", async () => {
      mockIsElectron = true;
      const mockInvoke = jest.fn().mockResolvedValue(undefined);
      window.electron = { ipc: { invoke: mockInvoke } };

      const unlockPasswordSaved = await saveUnlockPassword("correct-unlock-password");

      expect(mockInvoke).toHaveBeenCalledWith("secrets:save-unlock-password", "correct-unlock-password");
      expect(unlockPasswordSaved).toBe(true);
    });
  });

  describe("clearUnlockPassword", () => {
    it("returns false without invoking any IPC channel outside Electron", async () => {
      const unlockPasswordCleared = await clearUnlockPassword();

      expect(unlockPasswordCleared).toBe(false);
    });

    it("invokes secrets:clear-unlock-password and returns true inside Electron", async () => {
      mockIsElectron = true;
      const mockInvoke = jest.fn().mockResolvedValue(undefined);
      window.electron = { ipc: { invoke: mockInvoke } };

      const unlockPasswordCleared = await clearUnlockPassword();

      expect(mockInvoke).toHaveBeenCalledWith("secrets:clear-unlock-password");
      expect(unlockPasswordCleared).toBe(true);
    });
  });
});
