import { restartAppAfterImport } from "../restartAppAfterImport";

let mockIsElectron = false;
jest.mock("@lib/isElectron", () => ({
  get isElectron() {
    return mockIsElectron;
  },
}));

describe("restartAppAfterImport", () => {
  beforeEach(() => {
    mockIsElectron = false;
  });

  afterEach(() => {
    delete window.electron;
  });

  it("returns false without invoking any IPC channel outside Electron", async () => {
    const restartTriggered = await restartAppAfterImport();

    expect(restartTriggered).toBe(false);
  });

  it("restarts only the backend inside Electron when includesPhoenixdData is false", async () => {
    mockIsElectron = true;
    const mockInvoke = jest.fn().mockResolvedValue(undefined);
    window.electron = { ipc: { invoke: mockInvoke } };

    const restartTriggered = await restartAppAfterImport(false);

    expect(mockInvoke).toHaveBeenCalledTimes(1);
    expect(mockInvoke).toHaveBeenCalledWith("services:restart", "backend");
    expect(restartTriggered).toBe(true);
  });

  it("restarts the backend and then phoenixd inside Electron when includesPhoenixdData is true", async () => {
    mockIsElectron = true;
    const mockInvoke = jest.fn().mockResolvedValue(undefined);
    window.electron = { ipc: { invoke: mockInvoke } };

    const restartTriggered = await restartAppAfterImport(true);

    expect(mockInvoke).toHaveBeenNthCalledWith(1, "services:restart", "backend");
    expect(mockInvoke).toHaveBeenNthCalledWith(2, "services:restart", "phoenixd");
    expect(restartTriggered).toBe(true);
  });
});
